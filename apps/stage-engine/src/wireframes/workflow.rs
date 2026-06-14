use std::sync::Arc;

use crate::convex_store::wireframes_repository::WireframesRepository;
use crate::helpers::provider_json::extract_wireframes_artifact;
use crate::helpers::time::now_millis;
use crate::models::errors::{EngineError, EngineErrorCode};
use crate::models::providers::ProviderId;
use crate::models::runs::{RunEvent, RunStatus, StartRunRequest};
use crate::models::wireframes::{WireframeBrandSource, WireframeKind};
use crate::providers::adapter::{ProviderRunContext, run_provider_collect};
use crate::providers::process::ProviderProcessOutcome;
use crate::runs::RunEventSink;
use crate::wireframes::normalize::normalize_wireframes_artifact;
use crate::wireframes::prompt::build_wireframes_prompt;

const GENERATED_AT_LABEL: &str = "just now";

#[derive(Clone, Debug)]
pub struct WireframesWorkflow {
    repository: WireframesRepository,
}

impl WireframesWorkflow {
    pub fn new(repository: WireframesRepository) -> Self {
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

            convex_run_id = self
                .repository
                .create_wireframes_run(
                    &auth_token,
                    project_id,
                    &run_id,
                    Some(request.prompt.as_str()),
                )
                .await?;

            request.prompt = build_wireframes_prompt(
                &input,
                wireframe_kind,
                brand_source,
                style_direction_id.as_deref(),
                None,
            );
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
            let outcome = run_provider_collect(provider_context, sink.clone(), cancel_rx).await?;
            let ProviderProcessOutcome::Completed(final_text) = outcome else {
                tracing::info!(run_id = %run_id, "wireframes provider run cancelled");
                return Ok(());
            };

            let raw_artifact = extract_wireframes_artifact(&final_text)?;
            let artifact = normalize_wireframes_artifact(
                raw_artifact,
                &input,
                wireframe_kind,
                brand_source,
                style_direction_id.as_deref(),
                now_millis(),
                GENERATED_AT_LABEL,
            )?;

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
                "wireframes artifact saved to Convex"
            );

            sink.send(RunEvent::RunCompleted {
                api_version,
                run_id: run_id.clone(),
                provider_id,
                created_at: now_millis(),
                final_text: Some("Wireframes generated.".to_string()),
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

fn parse_token<'a>(source: &'a str, prefix: &str) -> Option<&'a str> {
    source
        .split(|c: char| c == ',' || c == ';' || c.is_whitespace())
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
