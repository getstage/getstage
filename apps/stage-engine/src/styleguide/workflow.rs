use std::sync::Arc;

use serde_json::Value as JsonValue;

use crate::convex_store::moodboard_repository::MoodboardRepository;
use crate::convex_store::strategy_repository::StrategyRepository;
use crate::helpers::provider_json::extract_style_guide;
use crate::helpers::time::now_millis;
use crate::models::errors::{EngineError, EngineErrorCode};
use crate::models::runs::{RunEvent, RunStatus, StartRunRequest};
use crate::providers::adapter::{ProviderRunContext, run_provider_collect};
use crate::providers::process::ProviderProcessOutcome;
use crate::runs::RunEventSink;
use crate::styleguide::normalize::{
    direction_reference_metadata, merge_style_guide_into_artifact, normalize_style_guide,
};
use crate::styleguide::prompt::build_styleguide_prompt;

#[derive(Clone, Debug)]
pub struct StyleguideWorkflow {
    moodboard_repository: MoodboardRepository,
    strategy_repository: StrategyRepository,
}

impl StyleguideWorkflow {
    pub fn new(
        moodboard_repository: MoodboardRepository,
        strategy_repository: StrategyRepository,
    ) -> Self {
        Self {
            moodboard_repository,
            strategy_repository,
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
                        })
                        .map(direction_reference_metadata)
                        .map(JsonValue::Object)
                        .collect::<Vec<_>>()
                })
                .unwrap_or_default();

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
