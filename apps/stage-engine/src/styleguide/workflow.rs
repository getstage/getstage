use std::sync::Arc;

use serde_json::Value as JsonValue;

use crate::convex_store::moodboard_repository::MoodboardRepository;
use crate::convex_store::strategy_repository::StrategyRepository;
use crate::helpers::provider_json::extract_style_guide;
use crate::helpers::time::now_millis;
use crate::models::errors::{EngineError, EngineErrorCode};
use crate::models::runs::{RunAttachment, RunAttachmentKind, RunEvent, RunStatus, StartRunRequest};
use crate::providers::adapter::{ProviderRunContext, run_provider_collect};
use crate::providers::command::provider_cli_working_directory;
use crate::providers::process::ProviderProcessOutcome;
use crate::refero::parse::{infer_image_mime, looks_like_image_bytes};
use crate::runs::RunEventSink;
use crate::styleguide::normalize::{
    direction_reference_metadata, merge_style_guide_into_artifact, normalize_style_guide,
    reference_has_visual_input,
};
use crate::styleguide::prompt::build_styleguide_prompt;

const STYLEGUIDE_MAX_IMAGE_ATTACHMENTS: usize = 6;
const STYLEGUIDE_MAX_IMAGE_BYTES: usize = 2 * 1024 * 1024;

#[derive(Clone, Debug)]
pub struct StyleguideWorkflow {
    moodboard_repository: MoodboardRepository,
    strategy_repository: StrategyRepository,
    r2_public_base_url: Option<String>,
}

impl StyleguideWorkflow {
    pub fn new(
        moodboard_repository: MoodboardRepository,
        strategy_repository: StrategyRepository,
        r2_public_base_url: Option<String>,
    ) -> Self {
        Self {
            moodboard_repository,
            strategy_repository,
            r2_public_base_url,
        }
    }

    pub async fn run(
        self: Arc<Self>,
        api_version: &'static str,
        run_id: String,
        mut request: StartRunRequest,
        auth_token: Option<String>,
        sink: RunEventSink,
        cancel_rx: tokio::sync::watch::Receiver<bool>,
    ) {
        let provider_id = request.provider_id;
        let project_id = request.context.project_id.clone();
        let direction_id = request.context.direction_id.clone();
        let auth_token_for_failure = auth_token.clone();
        let mut convex_run_id: Option<String> = None;

        tracing::info!(
            run_id = %run_id,
            provider_id = ?provider_id,
            project_id = ?project_id,
            direction_id = ?direction_id,
            has_auth_token = auth_token.is_some(),
            "styleguide workflow started"
        );

        let result = async {
            let auth_token = auth_token.ok_or_else(|| {
                WorkflowError::InvalidRequest("Missing desktop session for Style Guide.".to_string())
            })?;
            let project_id = project_id.as_deref().ok_or_else(|| {
                WorkflowError::InvalidRequest("Missing project id for Style Guide.".to_string())
            })?;
            let direction_id = direction_id.as_deref().ok_or_else(|| {
                WorkflowError::InvalidRequest("Missing direction id for Style Guide.".to_string())
            })?;

            // Persist the run as "running" so the moodboard tab can restore the generating
            // screen (for this direction) after it unmounts. Terminal status is written below.
            convex_run_id = self
                .moodboard_repository
                .create_styleguide_run(&auth_token, project_id, &run_id, direction_id)
                .await?;

            self.tool_started(
                api_version,
                &run_id,
                provider_id,
                &sink,
                "stage-styleguide",
                "Load moodboard direction context",
            );

            let mut artifact = self
                .moodboard_repository
                .fetch_latest_moodboard_artifact(&auth_token, project_id)
                .await?
                .ok_or_else(|| {
                    WorkflowError::InvalidRequest(
                        "Create a moodboard before generating a style guide.".to_string(),
                    )
                })?;

            let directions = artifact
                .get("directions")
                .and_then(JsonValue::as_array)
                .ok_or_else(|| {
                    WorkflowError::InvalidArtifact("Moodboard artifact missing directions.".to_string())
                })?;

            let direction = directions
                .iter()
                .find(|entry| entry.get("id").and_then(JsonValue::as_str) == Some(direction_id))
                .ok_or_else(|| {
                    WorkflowError::InvalidRequest(format!(
                        "Direction {direction_id} was not found on the moodboard."
                    ))
                })?;

            let direction_name = direction
                .get("name")
                .and_then(JsonValue::as_str)
                .unwrap_or("Direction");

            let existing_style_guide_id = artifact
                .get("styleGuides")
                .and_then(JsonValue::as_array)
                .and_then(|guides| {
                    guides.iter().find_map(|guide| {
                        if guide.get("directionId").and_then(JsonValue::as_str) == Some(direction_id)
                        {
                            guide.get("id").and_then(JsonValue::as_str)
                        } else {
                            None
                        }
                    })
                });

            let references = artifact
                .get("references")
                .and_then(JsonValue::as_array)
                .map(|entries| {
                    entries
                        .iter()
                        .filter(|entry| {
                            entry.get("directionId").and_then(JsonValue::as_str)
                                == Some(direction_id)
                                && entry
                                    .get("isInMoodboard")
                                    .and_then(JsonValue::as_bool)
                                    .unwrap_or(true)
                                && reference_has_visual_input(entry)
                        })
                        .map(direction_reference_metadata)
                        .map(JsonValue::Object)
                        .collect::<Vec<_>>()
                })
                .unwrap_or_default();

            if references.is_empty() {
                return Err(WorkflowError::InvalidRequest(
                    "Add at least one image to this Direction before generating a style guide."
                        .to_string(),
                ));
            }

            let strategy_artifact = self
                .strategy_repository
                .fetch_latest_strategy_artifact(&auth_token, project_id)
                .await
                .ok()
                .flatten();
            let strategy_input = self
                .strategy_repository
                .fetch_strategy_input(&auth_token, project_id)
                .await
                .ok();

            self.tool_completed(api_version, &run_id, provider_id, &sink, "stage-styleguide");

            let project_name = artifact
                .get("title")
                .and_then(JsonValue::as_str)
                .or(strategy_input.as_ref().map(|input| input.project_name.as_str()))
                .unwrap_or("Project");

            // `references` is guaranteed non-empty above, so if not a single image can be
            // fetched (missing asset config, expired URLs, 404s) we fail instead of silently
            // saving a style guide the model derived without ever seeing the direction images.
            let image_attachments = self.fetch_reference_images(&references).await?;
            if image_attachments.is_empty() {
                return Err(WorkflowError::InvalidRequest(
                    "Could not load this Direction's images. Check the moodboard assets and try again.".to_string(),
                ));
            }
            let has_attached_images = true;
            tracing::info!(
                run_id = %run_id,
                count = image_attachments.len(),
                "fetched moodboard reference images for styleguide provider run"
            );
            request.attachments.extend(image_attachments);

            request.prompt = build_styleguide_prompt(
                project_name,
                direction_name,
                strategy_artifact
                    .as_ref()
                    .map(|(_, value)| value.to_string())
                    .as_deref(),
                strategy_input
                    .as_ref()
                    .map(|input| input.research_artifact_json.as_str()),
                &references,
                has_attached_images,
            );

            let provider_context = ProviderRunContext {
                api_version,
                run_id: run_id.clone(),
                request,
            };

            tracing::info!(run_id = %run_id, provider_id = ?provider_id, "starting styleguide provider run");
            let outcome = run_provider_collect(provider_context, sink.clone(), cancel_rx).await?;
            let ProviderProcessOutcome::Completed(final_text) = outcome else {
                tracing::info!(run_id = %run_id, "styleguide provider run cancelled");
                return Ok(());
            };

            let raw_style_guide = extract_style_guide(&final_text)?;
            let style_guide = normalize_style_guide(
                raw_style_guide,
                direction_id,
                direction_name,
                existing_style_guide_id,
                now_millis(),
            );

            merge_style_guide_into_artifact(&mut artifact, style_guide, direction_id)?;

            self.moodboard_repository
                .save_moodboard_artifact(&auth_token, project_id, &artifact)
                .await?;

            // The guide is already saved; marking the durable run complete is bookkeeping.
            // If it fails, log and continue (the stale-run TTL reconciles) rather than
            // propagating an error that would flip a successfully-saved guide to "failed".
            if let Err(error) = self
                .moodboard_repository
                .complete_moodboard_run(&auth_token, project_id, convex_run_id.as_deref())
                .await
            {
                tracing::warn!(
                    run_id = %run_id,
                    %error,
                    "style guide saved but marking the Convex run complete failed; stale TTL will reconcile"
                );
            }

            sink.send(RunEvent::RunCompleted {
                api_version,
                run_id: run_id.clone(),
                provider_id,
                created_at: now_millis(),
                final_text: Some("Style guide saved.".to_string()),
            });

            Ok::<(), WorkflowError>(())
        }
        .await;

        if let Err(error) = result {
            tracing::error!(
                run_id = %run_id,
                provider_id = ?provider_id,
                project_id = ?project_id,
                direction_id = ?direction_id,
                error = %error,
                "styleguide workflow failed"
            );

            if let (Some(token), Some(project_id)) =
                (auth_token_for_failure.as_deref(), project_id.as_deref())
            {
                if let Err(mark_failed_error) = self
                    .moodboard_repository
                    .fail_moodboard_run(
                        token,
                        project_id,
                        convex_run_id.as_deref(),
                        &error.to_string(),
                    )
                    .await
                {
                    tracing::warn!(%mark_failed_error, "failed to mark Convex styleguide run failed");
                }
            }

            sink.send(RunEvent::RunFailed {
                api_version,
                run_id,
                provider_id,
                created_at: now_millis(),
                error: error.to_engine_error(provider_id),
            });
        }
    }

    fn tool_started(
        &self,
        api_version: &'static str,
        run_id: &str,
        provider_id: crate::models::providers::ProviderId,
        sink: &RunEventSink,
        tool_call_id: &str,
        label: &str,
    ) {
        sink.send(RunEvent::ToolCallStarted {
            api_version,
            run_id: run_id.to_string(),
            provider_id,
            created_at: now_millis(),
            tool_call_id: tool_call_id.to_string(),
            label: label.to_string(),
        });
    }

    fn tool_completed(
        &self,
        api_version: &'static str,
        run_id: &str,
        provider_id: crate::models::providers::ProviderId,
        sink: &RunEventSink,
        tool_call_id: &str,
    ) {
        sink.send(RunEvent::ToolCallCompleted {
            api_version,
            run_id: run_id.to_string(),
            provider_id,
            created_at: now_millis(),
            tool_call_id: tool_call_id.to_string(),
            status: RunStatus::Completed,
        });
    }

    async fn fetch_reference_images(
        &self,
        references: &[JsonValue],
    ) -> Result<Vec<RunAttachment>, WorkflowError> {
        let working_dir = provider_cli_working_directory().map_err(|error| {
            WorkflowError::InvalidRequest(format!(
                "Could not prepare provider working directory: {error}"
            ))
        })?;

        let mut attachments = Vec::new();
        for (index, reference) in references
            .iter()
            .take(STYLEGUIDE_MAX_IMAGE_ATTACHMENTS)
            .enumerate()
        {
            let Some(url) =
                resolve_reference_image_url(reference, self.r2_public_base_url.as_deref())
            else {
                continue;
            };

            let bytes = match fetch_image_bytes(&url).await {
                Ok(bytes) if looks_like_image_bytes(&bytes) => bytes,
                _ => {
                    tracing::warn!(url = %url, "could not fetch or validate reference image");
                    continue;
                }
            };

            if bytes.len() > STYLEGUIDE_MAX_IMAGE_BYTES {
                tracing::warn!(
                    url = %url,
                    size = bytes.len(),
                    "skipping oversize reference image"
                );
                continue;
            }

            let mime_type = infer_image_mime(&bytes);
            let extension = crate::refero::parse::infer_extension(mime_type);
            let file_name = format!("styleguide-ref-{index}.{extension}");
            let file_path = working_dir.join(&file_name);

            if let Err(error) = tokio::fs::write(&file_path, &bytes).await {
                tracing::warn!(%error, "could not write reference image to temp file");
                continue;
            }

            attachments.push(RunAttachment {
                id: format!("styleguide-ref-{index}"),
                kind: RunAttachmentKind::Image,
                name: Some(file_name),
                url: Some(url),
                mime_type: Some(mime_type.to_string()),
                local_path: Some(file_path.to_string_lossy().to_string()),
            });
        }

        Ok(attachments)
    }
}

fn resolve_reference_image_url(
    reference: &JsonValue,
    r2_public_base_url: Option<&str>,
) -> Option<String> {
    for field in ["thumbnailUrl", "imageUrl"] {
        if let Some(url) = reference
            .get(field)
            .and_then(JsonValue::as_str)
            .filter(|value| value.starts_with("https://") && !value.trim().is_empty())
        {
            return Some(url.to_string());
        }
    }

    let base = r2_public_base_url
        .filter(|base| !base.trim().is_empty())?
        .trim_end_matches('/');

    for field in ["thumbnailAssetKey", "imageAssetKey"] {
        if let Some(key) = reference
            .get(field)
            .and_then(JsonValue::as_str)
            .filter(|value| !value.trim().is_empty())
        {
            return Some(format!("{base}/{key}"));
        }
    }

    None
}

async fn fetch_image_bytes(url: &str) -> Result<Vec<u8>, WorkflowError> {
    let response = reqwest::Client::builder()
        .redirect(reqwest::redirect::Policy::limited(3))
        .build()
        .map_err(|error| {
            WorkflowError::InvalidRequest(format!("Could not prepare image fetch: {error}"))
        })?
        .get(url)
        .send()
        .await
        .map_err(|error| {
            WorkflowError::InvalidRequest(format!("Could not fetch reference image: {error}"))
        })?
        .error_for_status()
        .map_err(|error| {
            WorkflowError::InvalidRequest(format!("Reference image fetch failed: {error}"))
        })?;

    let bytes = response.bytes().await.map_err(|error| {
        WorkflowError::InvalidRequest(format!("Could not read image bytes: {error}"))
    })?;
    Ok(bytes.to_vec())
}

#[derive(Debug, thiserror::Error)]
enum WorkflowError {
    #[error("{0}")]
    InvalidRequest(String),

    #[error("{0}")]
    InvalidArtifact(String),

    #[error(transparent)]
    Convex(#[from] anyhow::Error),

    #[error(transparent)]
    Provider(#[from] crate::providers::process::ProviderProcessError),
}

impl WorkflowError {
    fn to_engine_error(&self, provider_id: crate::models::providers::ProviderId) -> EngineError {
        let code = match self {
            WorkflowError::InvalidRequest(_) | WorkflowError::InvalidArtifact(_) => {
                EngineErrorCode::InvalidRequest
            }
            WorkflowError::Provider(error) => error.to_engine_error(provider_id).code,
            WorkflowError::Convex(_) => EngineErrorCode::InternalError,
        };

        EngineError {
            code,
            message: self.to_string(),
            provider_id: Some(provider_id),
            retryable: !matches!(self, WorkflowError::InvalidRequest(_)),
            detail: Some(self.to_string()),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::resolve_reference_image_url;
    use serde_json::json;

    #[test]
    fn resolves_public_thumbnail_url_first() {
        let reference = json!({
            "thumbnailUrl": "https://cdn.example.com/thumb.jpg",
            "imageUrl": "https://cdn.example.com/full.jpg",
            "imageAssetKey": "moodboard/projects/abc/upload/uuid.jpg",
        });

        let url =
            resolve_reference_image_url(&reference, Some("https://assets-testing.getstage.co"));
        assert_eq!(url.as_deref(), Some("https://cdn.example.com/thumb.jpg"));
    }

    #[test]
    fn resolves_public_image_url_when_no_thumbnail_url() {
        let reference = json!({
            "imageUrl": "https://cdn.example.com/full.jpg",
            "imageAssetKey": "moodboard/projects/abc/upload/uuid.jpg",
        });

        let url =
            resolve_reference_image_url(&reference, Some("https://assets-testing.getstage.co"));
        assert_eq!(url.as_deref(), Some("https://cdn.example.com/full.jpg"));
    }

    #[test]
    fn constructs_url_from_asset_key_when_no_public_url() {
        let reference = json!({
            "imageUrl": "moodboard/projects/abc/upload/uuid.jpg",
            "imageAssetKey": "moodboard/projects/abc/upload/uuid.jpg",
            "thumbnailAssetKey": "moodboard/projects/abc/upload/uuid-thumb.jpg",
        });

        let url =
            resolve_reference_image_url(&reference, Some("https://assets-testing.getstage.co"));
        assert_eq!(
            url.as_deref(),
            Some("https://assets-testing.getstage.co/moodboard/projects/abc/upload/uuid-thumb.jpg")
        );
    }

    #[test]
    fn returns_none_when_no_url_and_no_base() {
        let reference = json!({
            "imageUrl": "moodboard/projects/abc/upload/uuid.jpg",
            "imageAssetKey": "moodboard/projects/abc/upload/uuid.jpg",
        });

        let url = resolve_reference_image_url(&reference, None);
        assert!(url.is_none());
    }

    #[test]
    fn returns_none_when_reference_has_no_image_fields() {
        let reference = json!({ "id": "ref-1", "title": "No image" });
        let url =
            resolve_reference_image_url(&reference, Some("https://assets-testing.getstage.co"));
        assert!(url.is_none());
    }
}
