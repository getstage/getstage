use std::sync::Arc;
use std::time::Instant;

use crate::convex_store::wireframes_repository::WireframesRepository;
use crate::helpers::provider_json::extract_wireframes_artifact;
use crate::helpers::time::now_millis;
use crate::models::errors::{EngineError, EngineErrorCode};
use crate::models::providers::ProviderId;
use crate::models::runs::{RunAttachment, RunAttachmentKind, RunEvent, RunStatus, StartRunRequest};
use crate::models::wireframes::{WireframeBrandSource, WireframeKind};
use crate::providers::adapter::{ProviderRunContext, run_provider_collect};
use crate::providers::command::provider_cli_working_directory;
use crate::providers::process::ProviderProcessOutcome;
use crate::runs::RunEventSink;
use crate::wireframes::normalize::normalize_wireframes_artifact;
use crate::wireframes::prompt::{build_wireframes_prompt, resolve_hifi_prompt_preferences};
use crate::wireframes::render::{
    apply_react_render, react_render_enabled, repair_prompt_for_failures,
    resolve_renderer_libraries,
};
use crate::wireframes::{MAX_BRAND_KIT_BYTES, MAX_BRAND_KIT_FILES};

const GENERATED_AT_LABEL: &str = "just now";

#[derive(Clone, Debug)]
pub struct WireframesWorkflow {
    repository: WireframesRepository,
    r2_public_base_url: Option<String>,
}

impl WireframesWorkflow {
    pub fn new(repository: WireframesRepository, r2_public_base_url: Option<String>) -> Self {
        Self {
            repository,
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
        let auth_token_for_failure = auth_token.clone();
        let mut convex_run_id: Option<String> = None;

        let wireframe_kind = WireframeKind::parse(
            request
                .context
                .source
                .as_deref()
                .and_then(parse_kind_from_source),
        );
        let brand_source = WireframeBrandSource::parse(
            request
                .context
                .source
                .as_deref()
                .and_then(parse_brand_source_from_source),
        );
        let style_direction_id = request
            .context
            .source
            .as_deref()
            .and_then(parse_style_direction_from_source)
            .map(ToOwned::to_owned);
        let brand_kit_keys = request.context.brand_kit_keys.clone().unwrap_or_default();
        let regenerate_screen_ids = request
            .context
            .source
            .as_deref()
            .and_then(parse_screens_from_source);

        let workflow_started = Instant::now();
        tracing::info!(
            run_id = %run_id,
            provider_id = ?provider_id,
            project_id = ?project_id,
            kind = wireframe_kind.as_str(),
            "wireframes workflow started"
        );

        let result = async {
            let auth_token = auth_token.ok_or_else(|| {
                WorkflowError::InvalidRequest("Missing desktop session for Wireframes.".to_string())
            })?;
            let project_id = project_id.as_deref().ok_or_else(|| {
                WorkflowError::InvalidRequest("Missing project id for Wireframes.".to_string())
            })?;

            self.tool_started(
                api_version,
                &run_id,
                provider_id,
                &sink,
                "stage-context",
                "Load Stage wireframes input",
            );
            let input = self
                .repository
                .fetch_wireframes_input(&auth_token, project_id)
                .await?;
            self.tool_completed(api_version, &run_id, provider_id, &sink, "stage-context");
            if matches!(wireframe_kind, WireframeKind::Hifi) {
                let preferences = resolve_hifi_prompt_preferences(&input);
                tracing::info!(
                    run_id = %run_id,
                    configured_skill_ids = ?input.enabled_skill_ids,
                    configured_component_pack_ids = ?input.enabled_component_pack_ids,
                    effective_skill_ids = ?preferences.skill_ids,
                    effective_component_pack_ids = ?preferences.component_pack_ids,
                    "resolved Hi-Fi wireframes skills and component libraries"
                );
            } else {
                tracing::info!(
                    run_id = %run_id,
                    kind = wireframe_kind.as_str(),
                    "wireframes skills and component libraries are not applied to Lo-Fi generation"
                );
            }

            convex_run_id = self
                .repository
                .create_wireframes_run(
                    &auth_token,
                    project_id,
                    &run_id,
                    Some(request.prompt.as_str()),
                )
                .await?;

            // For a brand-kit Hi-Fi run, fetch the uploaded brand kit files and attach them so
            // the model derives palette/typography/logo from the real brand kit. The user
            // uploaded files expecting them used, so if none can be loaded (R2 base unset,
            // expired URLs, 404s) we fail loudly rather than silently produce a generic result.
            let brand_kit_requested = matches!(brand_source, Some(WireframeBrandSource::BrandKit))
                && !brand_kit_keys.is_empty();
            let brand_kit_attached = if brand_kit_requested {
                let attachments = self.fetch_brand_kit_attachments(&brand_kit_keys).await?;
                if attachments.is_empty() {
                    return Err(WorkflowError::InvalidRequest(
                        "Could not load the uploaded brand kit files. Check R2 configuration and the uploads, then try again.".to_string(),
                    ));
                }
                tracing::info!(
                    run_id = %run_id,
                    count = attachments.len(),
                    "attached brand kit files for wireframes provider run"
                );
                request.attachments.extend(attachments);
                true
            } else {
                false
            };

            request.prompt = build_wireframes_prompt(
                &input,
                wireframe_kind,
                brand_source,
                style_direction_id.as_deref(),
                None,
                brand_kit_attached,
                regenerate_screen_ids.as_deref(),
            );
            let repair_request_template = request.clone();
            let provider_context = ProviderRunContext {
                api_version,
                run_id: run_id.clone(),
                request,
            };

            tracing::info!(
                run_id = %run_id,
                provider_id = ?provider_id,
                kind = wireframe_kind.as_str(),
                "starting wireframes provider run"
            );
            let provider_started = Instant::now();
            let outcome =
                run_provider_collect(provider_context, sink.clone(), cancel_rx.clone()).await?;
            tracing::info!(
                run_id = %run_id,
                provider_id = ?provider_id,
                kind = wireframe_kind.as_str(),
                provider_elapsed_ms = provider_started.elapsed().as_millis(),
                "wireframes provider run finished"
            );
            let ProviderProcessOutcome::Completed(final_text) = outcome else {
                tracing::info!(run_id = %run_id, "wireframes provider run cancelled");
                return Ok(());
            };

            // "did not contain a valid artifact" cannot distinguish a truncated response
            // from one wrapped in prose or code fences. Log the size and tail so the next
            // failure is diagnosable from the log instead of another 17-minute rerun.
            let raw_artifact = extract_wireframes_artifact(&final_text).inspect_err(|error| {
                let char_count = final_text.chars().count();
                let tail: String = final_text.chars().skip(char_count.saturating_sub(400)).collect();
                tracing::error!(
                    run_id = %run_id,
                    output_chars = char_count,
                    %error,
                    output_tail = %tail,
                    "wireframes provider output could not be parsed"
                );
            })?;
            let mut artifact = normalize_wireframes_artifact(
                raw_artifact,
                &input,
                wireframe_kind,
                brand_source,
                style_direction_id.as_deref(),
                now_millis(),
                GENERATED_AT_LABEL,
            )?;
            if let Some(screen_ids) = regenerate_screen_ids.as_ref() {
                let Some(existing_json) = input.existing_wireframes_artifact_json.as_deref() else {
                    return Err(WorkflowError::InvalidRequest(
                        "Cannot regenerate wireframe screens without an existing wireframes artifact."
                            .to_string(),
                    ));
                };
                artifact = crate::wireframes::normalize::merge_regenerated_screens(
                    existing_json,
                    artifact,
                    screen_ids,
                    wireframe_kind,
                )
                .map_err(|error| WorkflowError::InvalidRequest(error.to_string()))?;
            }

            if matches!(wireframe_kind, WireframeKind::Hifi) && react_render_enabled() {
                let pack_ids = resolve_hifi_prompt_preferences(&input).component_pack_ids;
                let libraries = resolve_renderer_libraries(&pack_ids);
                let failures = apply_react_render(&mut artifact, &libraries)
                    .await
                    .unwrap_or_default();
                if !failures.is_empty() {
                    tracing::info!(
                        run_id = %run_id,
                        failed = failures.len(),
                        "retrying failed wireframe TSX screens once"
                    );
                    let mut repair_request = repair_request_template;
                    repair_request.prompt = repair_prompt_for_failures(&failures, &libraries);
                    let repair_context = ProviderRunContext {
                        api_version,
                        run_id: run_id.clone(),
                        request: repair_request,
                    };
                    if let Ok(ProviderProcessOutcome::Completed(repair_text)) =
                        run_provider_collect(repair_context, sink.clone(), cancel_rx).await
                    {
                        if let Ok(repair_raw) = extract_wireframes_artifact(&repair_text) {
                            if let Ok(repair_normalized) = normalize_wireframes_artifact(
                                repair_raw,
                                &input,
                                wireframe_kind,
                                brand_source,
                                style_direction_id.as_deref(),
                                now_millis(),
                                GENERATED_AT_LABEL,
                            ) {
                                merge_tsx_screens(&mut artifact, &repair_normalized);
                                let _ = apply_react_render(&mut artifact, &libraries).await;
                            }
                        }
                    }
                }
            }

            self.repository
                .complete_wireframes_run(
                    &auth_token,
                    project_id,
                    convex_run_id.as_deref(),
                    &artifact,
                    &input,
                    provider_id,
                )
                .await?;

            tracing::info!(
                run_id = %run_id,
                provider_id = ?provider_id,
                kind = wireframe_kind.as_str(),
                total_elapsed_ms = workflow_started.elapsed().as_millis(),
                "wireframes artifact saved to Convex"
            );

            // Regen runs touch only the selected screens; a count-based message keeps
            // the success copy honest instead of implying a full rebuild.
            let final_text = match regenerate_screen_ids.as_ref() {
                Some(ids) => format!("Updated {} wireframe screen(s).", ids.len()),
                None => "Wireframes generated.".to_string(),
            };
            sink.send(RunEvent::RunCompleted {
                api_version,
                run_id: run_id.clone(),
                provider_id,
                created_at: now_millis(),
                final_text: Some(final_text),
            });

            Ok::<(), WorkflowError>(())
        }
        .await;

        if let Err(error) = result {
            tracing::error!(
                run_id = %run_id,
                provider_id = ?provider_id,
                project_id = ?project_id,
                error = %error,
                "wireframes workflow failed"
            );
            if let (Some(token), Some(project_id)) =
                (auth_token_for_failure.as_deref(), project_id.as_deref())
                && let Err(mark_failed_error) = self
                    .repository
                    .fail_wireframes_run(
                        token,
                        project_id,
                        convex_run_id.as_deref(),
                        &error.to_string(),
                    )
                    .await
            {
                tracing::warn!(%mark_failed_error, "failed to mark Convex wireframes run failed");
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
        provider_id: ProviderId,
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
        provider_id: ProviderId,
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

    async fn fetch_brand_kit_attachments(
        &self,
        keys: &[String],
    ) -> Result<Vec<RunAttachment>, WorkflowError> {
        let working_dir = provider_cli_working_directory().map_err(|error| {
            WorkflowError::InvalidRequest(format!(
                "Could not prepare provider working directory: {error}"
            ))
        })?;

        let mut attachments = Vec::new();
        for (index, key) in keys.iter().take(MAX_BRAND_KIT_FILES).enumerate() {
            let Some(url) = resolve_brand_kit_url(key, self.r2_public_base_url.as_deref()) else {
                tracing::warn!(key = %key, "could not resolve brand kit url");
                continue;
            };

            let bytes = match fetch_url_bytes(&url).await {
                Ok(bytes) => bytes,
                Err(error) => {
                    tracing::warn!(url = %url, %error, "could not fetch brand kit file");
                    continue;
                }
            };

            if bytes.len() > MAX_BRAND_KIT_BYTES {
                tracing::warn!(url = %url, size = bytes.len(), "skipping oversize brand kit file");
                continue;
            }

            let extension = extension_from_key(key);
            let file_name = format!("brand-kit-{index}.{extension}");
            let file_path = working_dir.join(&file_name);

            if let Err(error) = tokio::fs::write(&file_path, &bytes).await {
                tracing::warn!(%error, "could not write brand kit file to temp file");
                continue;
            }

            attachments.push(RunAttachment {
                id: format!("brand-kit-{index}"),
                kind: brand_kit_attachment_kind(extension),
                name: Some(file_name),
                url: Some(url),
                mime_type: None,
                local_path: Some(file_path.to_string_lossy().to_string()),
            });
        }

        Ok(attachments)
    }
}

fn resolve_brand_kit_url(key: &str, r2_public_base_url: Option<&str>) -> Option<String> {
    let trimmed = key.trim();
    // Default-deny: accept only a relative R2 object key, never a caller-supplied URL,
    // absolute path, or traversal. Otherwise a run could make the local engine fetch
    // arbitrary or internal network URLs (SSRF).
    if trimmed.is_empty()
        || trimmed.contains("://")
        || trimmed.starts_with('/')
        || trimmed.contains("..")
    {
        return None;
    }

    let base = r2_public_base_url
        .filter(|base| !base.trim().is_empty())?
        .trim_end_matches('/');
    Some(format!("{base}/{trimmed}"))
}

fn extension_from_key(key: &str) -> &str {
    key.rsplit('/')
        .next()
        .and_then(|name| name.rsplit_once('.'))
        .map(|(_, ext)| ext)
        .filter(|ext| {
            !ext.is_empty() && ext.len() <= 5 && ext.chars().all(|c| c.is_ascii_alphanumeric())
        })
        .unwrap_or("bin")
}

fn brand_kit_attachment_kind(extension: &str) -> RunAttachmentKind {
    match extension.to_ascii_lowercase().as_str() {
        "jpg" | "jpeg" | "png" | "webp" | "gif" | "svg" => RunAttachmentKind::Image,
        _ => RunAttachmentKind::Document,
    }
}

async fn fetch_url_bytes(url: &str) -> Result<Vec<u8>, WorkflowError> {
    let response = reqwest::Client::builder()
        .redirect(reqwest::redirect::Policy::limited(3))
        .build()
        .map_err(|error| {
            WorkflowError::InvalidRequest(format!("Could not prepare brand kit fetch: {error}"))
        })?
        .get(url)
        .send()
        .await
        .map_err(|error| {
            WorkflowError::InvalidRequest(format!("Could not fetch brand kit file: {error}"))
        })?
        .error_for_status()
        .map_err(|error| {
            WorkflowError::InvalidRequest(format!("Brand kit fetch failed: {error}"))
        })?;

    let bytes = response.bytes().await.map_err(|error| {
        WorkflowError::InvalidRequest(format!("Could not read brand kit bytes: {error}"))
    })?;
    Ok(bytes.to_vec())
}

fn parse_kind_from_source(source: &str) -> Option<&str> {
    parse_token(source, "kind:")
}

fn parse_brand_source_from_source(source: &str) -> Option<&str> {
    parse_token(source, "brand:")
}

fn parse_style_direction_from_source(source: &str) -> Option<&str> {
    parse_token(source, "style-direction:")
}

fn parse_screens_from_source(source: &str) -> Option<Vec<String>> {
    let raw = parse_token(source, "screens:")?;
    let ids = raw
        .split(';')
        .map(str::trim)
        .filter(|segment| !segment.is_empty())
        .map(ToOwned::to_owned)
        .collect::<Vec<_>>();
    if ids.is_empty() { None } else { Some(ids) }
}

fn parse_token<'a>(source: &'a str, prefix: &str) -> Option<&'a str> {
    source
        .split(',')
        .map(str::trim)
        .find(|segment| segment.starts_with(prefix))
        .map(|segment| &segment[prefix.len()..])
}

#[derive(Debug, thiserror::Error)]
enum WorkflowError {
    #[error("{0}")]
    InvalidRequest(String),

    #[error(transparent)]
    Convex(#[from] anyhow::Error),

    #[error(transparent)]
    Provider(#[from] crate::providers::process::ProviderProcessError),

    #[error(transparent)]
    Serde(#[from] serde_json::Error),
}

impl WorkflowError {
    fn to_engine_error(&self, provider_id: ProviderId) -> EngineError {
        // Provider failures already carry a short user-facing message (usage limit,
        // auth, model). Keep that instead of wrapping everything in a generic
        // "could not finish the wireframes run" that hides the real cause in detail.
        if let WorkflowError::Provider(error) = self {
            return error.to_engine_error(provider_id);
        }

        let code = match self {
            WorkflowError::InvalidRequest(_) => EngineErrorCode::InvalidRequest,
            WorkflowError::Provider(_) => unreachable!("handled above"),
            WorkflowError::Convex(_) | WorkflowError::Serde(_) => EngineErrorCode::InternalError,
        };

        EngineError {
            code,
            message: user_message(self),
            provider_id: Some(provider_id),
            retryable: !matches!(self, WorkflowError::InvalidRequest(_)),
            detail: Some(self.to_string()),
        }
    }
}

fn user_message(error: &WorkflowError) -> String {
    match error {
        WorkflowError::InvalidRequest(message) => message.clone(),
        WorkflowError::Provider(_) => {
            "The selected AI provider could not finish the wireframes run.".to_string()
        }
        WorkflowError::Convex(_) => {
            "Stage wireframes data could not be loaded or saved.".to_string()
        }
        WorkflowError::Serde(_) => {
            "The AI response did not match the Wireframes artifact format.".to_string()
        }
    }
}

fn merge_tsx_screens(target: &mut serde_json::Value, repair: &serde_json::Value) {
    let Some(target_screens) = target
        .get_mut("generatedScreens")
        .and_then(serde_json::Value::as_array_mut)
    else {
        return;
    };
    let Some(repair_screens) = repair
        .get("generatedScreens")
        .and_then(serde_json::Value::as_array)
    else {
        return;
    };
    for repaired in repair_screens {
        let Some(id) = repaired.get("id").and_then(serde_json::Value::as_str) else {
            continue;
        };
        let Some(tsx) = repaired.get("tsx").cloned() else {
            continue;
        };
        if let Some(screen) = target_screens
            .iter_mut()
            .find(|s| s.get("id").and_then(serde_json::Value::as_str) == Some(id))
        {
            if let Some(obj) = screen.as_object_mut() {
                obj.insert("tsx".to_string(), tsx);
                if let Some(html) = repaired.get("html") {
                    obj.insert("html".to_string(), html.clone());
                }
            }
        }
    }
}

#[cfg(test)]
#[path = "../testing/wireframes/workflow.rs"]
mod tests;
