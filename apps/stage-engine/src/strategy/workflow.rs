use std::sync::Arc;

use crate::convex_store::research_repository::{extract_json_object, extract_strategy_artifact};
use crate::convex_store::strategy_repository::{StrategyRepository, normalize_strategy_artifact};
use crate::helpers::time::now_millis;
use crate::models::errors::{EngineError, EngineErrorCode};
use crate::models::runs::{RunEvent, RunStatus, StartRunRequest};
use crate::providers::adapter::{ProviderRunContext, run_provider_collect};
use crate::providers::process::ProviderProcessOutcome;
use crate::runs::RunEventSink;
use crate::strategy::prompt::build_strategy_prompt;
use crate::strategy::section::{
    build_section_regenerate_prompt, merge_strategy_section, parse_strategy_section,
};
use serde_json::json;

#[derive(Clone, Debug)]
pub struct StrategyWorkflow {
    repository: StrategyRepository,
}

impl StrategyWorkflow {
    pub fn new(repository: StrategyRepository) -> Self {
        Self { repository }
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

        tracing::info!(
            run_id = %run_id,
            provider_id = ?provider_id,
            project_id = ?project_id,
            has_auth_token = auth_token.is_some(),
            "strategy workflow started"
        );

        let result = async {
            let auth_token = auth_token.ok_or_else(|| {
                WorkflowError::InvalidRequest("Missing desktop session for Strategy.".to_string())
            })?;
            let project_id = project_id.as_deref().ok_or_else(|| {
                WorkflowError::InvalidRequest("Missing project id for Strategy.".to_string())
            })?;

            self.tool_started(
                api_version,
                &run_id,
                provider_id,
                &sink,
                "stage-context",
                "Load Stage strategy input",
            );
            let input = self
                .repository
                .fetch_strategy_input(&auth_token, project_id)
                .await?;
            self.tool_completed(api_version, &run_id, provider_id, &sink, "stage-context");

            let section_id =
                parse_strategy_section(request.context.source.as_deref()).map(str::to_string);
            if let Some(section_id) = section_id {
                return self
                    .run_section_regenerate(
                        api_version,
                        &run_id,
                        provider_id,
                        &auth_token,
                        project_id,
                        &section_id,
                        &input,
                        &mut request,
                        sink.clone(),
                        cancel_rx,
                    )
                    .await;
            }

            convex_run_id = self
                .repository
                .create_strategy_run(
                    &auth_token,
                    project_id,
                    &run_id,
                    Some(request.prompt.as_str()),
                )
                .await?;

            request.prompt = build_strategy_prompt(&input);
            let provider_context = ProviderRunContext {
                api_version,
                run_id: run_id.clone(),
                request,
            };

            tracing::info!(run_id = %run_id, provider_id = ?provider_id, "starting strategy provider run");
            let outcome = run_provider_collect(provider_context, sink.clone(), cancel_rx).await?;
            let ProviderProcessOutcome::Completed(final_text) = outcome else {
                tracing::info!(run_id = %run_id, "strategy provider run cancelled");
                return Ok(());
            };

            let raw_artifact =
                extract_strategy_artifact(&final_text).map_err(map_strategy_provider_error)?;
            let artifact = normalize_strategy_artifact(raw_artifact, &input, now_millis())
                .map_err(map_strategy_provider_error)?;

            self.repository
                .complete_strategy_run(
                    &auth_token,
                    project_id,
                    convex_run_id.as_deref(),
                    &artifact,
                    Some(input.research_artifact_id.as_str()),
                    provider_id,
                )
                .await?;

            sink.send(RunEvent::RunCompleted {
                api_version,
                run_id: run_id.clone(),
                provider_id,
                created_at: now_millis(),
                final_text: Some("Strategy artifact saved.".to_string()),
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
                "strategy workflow failed"
            );
            if let (Some(token), Some(project_id)) =
                (auth_token_for_failure.as_deref(), project_id.as_deref())
                && let Err(mark_failed_error) = self
                    .repository
                    .fail_strategy_run(
                        token,
                        project_id,
                        convex_run_id.as_deref(),
                        &error.to_string(),
                    )
                    .await
            {
                tracing::warn!(%mark_failed_error, "failed to mark Convex strategy run failed");
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

    #[allow(clippy::too_many_arguments)]
    async fn run_section_regenerate(
        &self,
        api_version: &'static str,
        run_id: &str,
        provider_id: crate::models::providers::ProviderId,
        auth_token: &str,
        project_id: &str,
        section_id: &str,
        input: &crate::models::strategy::StrategyInput,
        request: &mut StartRunRequest,
        sink: RunEventSink,
        cancel_rx: tokio::sync::watch::Receiver<bool>,
    ) -> Result<(), WorkflowError> {
        let (artifact_id, mut artifact) = self
            .repository
            .fetch_latest_strategy_artifact(auth_token, project_id)
            .await?
            .ok_or_else(|| {
                WorkflowError::InvalidRequest(
                    "No saved strategy artifact to regenerate.".to_string(),
                )
            })?;

        request.prompt = build_section_regenerate_prompt(section_id, &artifact, input);
        let provider_context = ProviderRunContext {
            api_version,
            run_id: run_id.to_string(),
            request: request.clone(),
        };

        let outcome = run_provider_collect(provider_context, sink.clone(), cancel_rx).await?;
        let ProviderProcessOutcome::Completed(final_text) = outcome else {
            return Ok(());
        };

        let section_patch = extract_json_object(&final_text)?;
        merge_strategy_section(&mut artifact, section_id, section_patch)?;
        if let Some(object) = artifact.as_object_mut() {
            object.insert("generatedAt".to_string(), json!(now_millis()));
        }

        self.repository
            .update_strategy_artifact(auth_token, project_id, &artifact_id, &artifact)
            .await?;

        sink.send(RunEvent::RunCompleted {
            api_version,
            run_id: run_id.to_string(),
            provider_id,
            created_at: now_millis(),
            final_text: Some(format!("Regenerated strategy section: {section_id}")),
        });

        Ok(())
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

    #[error(transparent)]
    Convex(#[from] anyhow::Error),

    #[error(transparent)]
    Provider(#[from] crate::providers::process::ProviderProcessError),

    #[error(transparent)]
    Serde(#[from] serde_json::Error),
}

impl WorkflowError {
    fn to_engine_error(&self, provider_id: crate::models::providers::ProviderId) -> EngineError {
        if let WorkflowError::Provider(error) = self {
            return error.to_engine_error(provider_id);
        }

        let code = match self {
            WorkflowError::InvalidRequest(_) => EngineErrorCode::InvalidRequest,
            WorkflowError::Convex(_) | WorkflowError::Serde(_) => EngineErrorCode::InternalError,
            WorkflowError::Provider(_) => unreachable!("handled above"),
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
            unreachable!("provider errors use ProviderProcessError::to_engine_error")
        }
        WorkflowError::Convex(_) => "Stage strategy data could not be loaded or saved.".to_string(),
        WorkflowError::Serde(_) => {
            "The AI response did not match the Strategy artifact format.".to_string()
        }
    }
}

fn map_strategy_provider_error(error: anyhow::Error) -> WorkflowError {
    let detail = error.to_string();
    if detail.contains("did not contain a valid strategyArtifact artifact")
        || detail.contains("provider output was empty")
        || detail.contains("provider output did not contain a JSON object")
    {
        return WorkflowError::InvalidRequest(
            "The AI provider did not return a parseable Strategy artifact. Try running Strategy again."
                .to_string(),
        );
    }

    if detail.contains("strategy artifact missing") || detail.contains("strategy section") {
        return WorkflowError::InvalidRequest(
            "The AI response was missing required Strategy sections. Try running Strategy again."
                .to_string(),
        );
    }

    WorkflowError::Convex(error)
}
