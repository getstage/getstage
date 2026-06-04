use std::sync::Arc;

use crate::convex_store::flows_repository::FlowsRepository;
use crate::flows::normalize::{
    merge_flow_patch, merge_screen_patch, normalize_existing_flows_artifact,
    normalize_flows_artifact,
};
use crate::flows::prompt::{
    build_flow_regenerate_prompt, build_flows_prompt, build_screen_regenerate_prompt,
};
use crate::flows::screen::{FlowsRegenerateTarget, parse_flows_regenerate_target};
use crate::helpers::provider_json::{extract_flows_artifact, extract_json_object};
use crate::helpers::time::now_millis;
use crate::models::errors::{EngineError, EngineErrorCode};
use crate::models::flows::FlowsInput;
use crate::models::providers::ProviderId;
use crate::models::runs::{RunEvent, RunStatus, StartRunRequest};
use crate::providers::adapter::{ProviderRunContext, run_provider_collect};
use crate::providers::process::ProviderProcessOutcome;
use crate::runs::RunEventSink;
use serde_json::json;

#[derive(Clone, Debug)]
pub struct FlowsWorkflow {
    repository: FlowsRepository,
}

impl FlowsWorkflow {
    pub fn new(repository: FlowsRepository) -> Self {
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
            "flows workflow started"
        );

        let result = async {
            let auth_token = auth_token.ok_or_else(|| {
                WorkflowError::InvalidRequest("Missing desktop session for Flows.".to_string())
            })?;
            let project_id = project_id.as_deref().ok_or_else(|| {
                WorkflowError::InvalidRequest("Missing project id for Flows.".to_string())
            })?;

            self.tool_started(
                api_version,
                &run_id,
                provider_id,
                &sink,
                "stage-context",
                "Load Stage flows input",
            );
            let input = self
                .repository
                .fetch_flows_input(&auth_token, project_id)
                .await?;
            self.tool_completed(api_version, &run_id, provider_id, &sink, "stage-context");

            if let Some(target) = parse_flows_regenerate_target(request.context.source.as_deref()) {
                return self
                    .run_regenerate(
                        api_version,
                        &run_id,
                        provider_id,
                        &auth_token,
                        project_id,
                        target,
                        &input,
                        &mut request,
                        sink.clone(),
                        cancel_rx,
                    )
                    .await;
            }

            convex_run_id = self
                .repository
                .create_flows_run(
                    &auth_token,
                    project_id,
                    &run_id,
                    Some(request.prompt.as_str()),
                )
                .await?;

            request.prompt = build_flows_prompt(&input);
            let provider_context = ProviderRunContext {
                api_version,
                run_id: run_id.clone(),
                request,
            };

            tracing::info!(run_id = %run_id, provider_id = ?provider_id, "starting flows provider run");
            let outcome = run_provider_collect(provider_context, sink.clone(), cancel_rx).await?;
            let ProviderProcessOutcome::Completed(final_text) = outcome else {
                tracing::info!(run_id = %run_id, "flows provider run cancelled");
                return Ok(());
            };

            let raw_artifact = extract_flows_artifact(&final_text)?;
            let artifact = normalize_flows_artifact(raw_artifact, &input, now_millis())?;

            self.repository
                .complete_flows_run(
                    &auth_token,
                    project_id,
                    convex_run_id.as_deref(),
                    &artifact,
                    &input,
                    provider_id,
                )
                .await?;

            sink.send(RunEvent::RunCompleted {
                api_version,
                run_id: run_id.clone(),
                provider_id,
                created_at: now_millis(),
                final_text: Some("Flows artifact saved.".to_string()),
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
                "flows workflow failed"
            );
            if let (Some(token), Some(project_id)) =
                (auth_token_for_failure.as_deref(), project_id.as_deref())
                && let Err(mark_failed_error) = self
                    .repository
                    .fail_flows_run(token, project_id, convex_run_id.as_deref(), &error.to_string())
                    .await
            {
                tracing::warn!(%mark_failed_error, "failed to mark Convex flows run failed");
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
    async fn run_regenerate(
        &self,
        api_version: &'static str,
        run_id: &str,
        provider_id: ProviderId,
        auth_token: &str,
        project_id: &str,
        target: FlowsRegenerateTarget,
        input: &FlowsInput,
        request: &mut StartRunRequest,
        sink: RunEventSink,
        cancel_rx: tokio::sync::watch::Receiver<bool>,
    ) -> Result<(), WorkflowError> {
        let (artifact_id, mut artifact) = self
            .repository
            .fetch_latest_flows_artifact(auth_token, project_id)
            .await?
            .ok_or_else(|| {
                WorkflowError::InvalidRequest("No saved flows artifact to regenerate.".to_string())
            })?;

        match &target {
            FlowsRegenerateTarget::Screen(screen_id) => {
                request.prompt = build_screen_regenerate_prompt(screen_id, &artifact, input);
            }
            FlowsRegenerateTarget::Flow(flow_id) => {
                request.prompt = build_flow_regenerate_prompt(flow_id, &artifact, input);
            }
        }

        let provider_context = ProviderRunContext {
            api_version,
            run_id: run_id.to_string(),
            request: request.clone(),
        };
        let outcome = run_provider_collect(provider_context, sink.clone(), cancel_rx).await?;
        let ProviderProcessOutcome::Completed(final_text) = outcome else {
            return Ok(());
        };

        let patch = extract_json_object(&final_text)?;
        match &target {
            FlowsRegenerateTarget::Screen(screen_id) => {
                merge_screen_patch(&mut artifact, screen_id, patch)?;
            }
            FlowsRegenerateTarget::Flow(flow_id) => {
                merge_flow_patch(&mut artifact, flow_id, patch)?;
            }
        }

        if let Some(object) = artifact.as_object_mut() {
            object.insert(
                "updatedAt".to_string(),
                json!(i64::try_from(now_millis()).unwrap_or(i64::MAX)),
            );
        }
        let artifact = normalize_existing_flows_artifact(artifact, input, now_millis())?;

        self.repository
            .update_flows_artifact(auth_token, project_id, &artifact_id, &artifact)
            .await?;

        sink.send(RunEvent::RunCompleted {
            api_version,
            run_id: run_id.to_string(),
            provider_id,
            created_at: now_millis(),
            final_text: Some(match target {
                FlowsRegenerateTarget::Screen(screen_id) => {
                    format!("Regenerated flow screen: {screen_id}")
                }
                FlowsRegenerateTarget::Flow(flow_id) => format!("Regenerated flow: {flow_id}"),
            }),
        });

        Ok(())
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
        let code = match self {
            WorkflowError::InvalidRequest(_) => EngineErrorCode::InvalidRequest,
            WorkflowError::Provider(error) => error.to_engine_error(provider_id).code,
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
            "The selected AI provider could not finish the flows run.".to_string()
        }
        WorkflowError::Convex(_) => "Stage flows data could not be loaded or saved.".to_string(),
        WorkflowError::Serde(_) => {
            "The AI response did not match the Flows artifact format.".to_string()
        }
    }
}
