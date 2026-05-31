use std::sync::Arc;

use crate::convex_store::research_repository::{
    ResearchRepository, enrich_research_artifact, extract_json_object,
};
use crate::helpers::time::now_millis;
use crate::models::errors::{EngineError, EngineErrorCode};
use crate::models::runs::{RunEvent, RunStatus, StartRunRequest};
use crate::providers::adapter::{ProviderRunContext, run_provider_collect};
use crate::providers::process::ProviderProcessOutcome;
use crate::research::service::ResearchService;
use crate::runs::RunEventSink;

#[derive(Clone, Debug)]
pub struct ResearchWorkflow {
    repository: ResearchRepository,
    research: ResearchService,
}

impl ResearchWorkflow {
    pub fn new(repository: ResearchRepository, research: ResearchService) -> Self {
        Self {
            repository,
            research,
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

        tracing::info!(
            run_id = %run_id,
            provider_id = ?provider_id,
            project_id = ?project_id,
            has_auth_token = auth_token.is_some(),
            "research workflow started"
        );

        let result = async {
            let auth_token =
                auth_token.ok_or_else(|| WorkflowError::InvalidRequest("Missing desktop session for Research.".to_string()))?;
            let project_id = project_id
                .as_deref()
                .ok_or_else(|| WorkflowError::InvalidRequest("Missing project id for Research.".to_string()))?;

            self.tool_started(api_version, &run_id, provider_id, &sink, "stage-context", "Load Stage project context");
            tracing::info!(run_id = %run_id, project_id, "loading research input from Convex");
            let input = self.repository.fetch_research_input(&auth_token, project_id).await?;
            tracing::info!(
                run_id = %run_id,
                project_id,
                industry = %input.industry,
                competitor_count = input.competitor_urls.len(),
                "research input loaded"
            );
            self.tool_completed(api_version, &run_id, provider_id, &sink, "stage-context");

            convex_run_id = self
                .repository
                .create_research_run(
                    &auth_token,
                    project_id,
                    &run_id,
                    Some(request.prompt.as_str()),
                )
                .await?;

            self.tool_started(api_version, &run_id, provider_id, &sink, "refero-context", "Search Refero examples");
            tracing::info!(run_id = %run_id, project_id, "building Refero context");
            let bundle = self.research.build_prompt_bundle(input.clone()).await?;
            tracing::info!(run_id = %run_id, project_id, "Refero context ready");
            self.tool_completed(api_version, &run_id, provider_id, &sink, "refero-context");

            request.prompt = bundle.prompt;
            let provider_context = ProviderRunContext {
                api_version,
                run_id: run_id.clone(),
                request,
            };

            tracing::info!(run_id = %run_id, provider_id = ?provider_id, "starting provider run");
            let outcome = run_provider_collect(provider_context, sink.clone(), cancel_rx).await?;
            let ProviderProcessOutcome::Completed(final_text) = outcome else {
                tracing::info!(run_id = %run_id, "research provider run cancelled");
                return Ok(());
            };

            tracing::info!(
                run_id = %run_id,
                output_chars = final_text.len(),
                "provider run completed, parsing research artifact"
            );
            let raw_artifact = extract_json_object(&final_text)?;
            let refero_context = serde_json::to_value(&bundle.refero_context)?;
            let artifact = enrich_research_artifact(raw_artifact, &input, refero_context, now_millis())?;

            self.repository
                .complete_research_run(
                    &auth_token,
                    project_id,
                    convex_run_id.as_deref(),
                    &artifact,
                )
                .await?;

            tracing::info!(run_id = %run_id, project_id, "research artifact saved to Convex");

            sink.send(RunEvent::RunCompleted {
                api_version,
                run_id: run_id.clone(),
                provider_id,
                created_at: now_millis(),
                final_text: Some("Research artifact saved.".to_string()),
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
                "research workflow failed"
            );
            if let (Some(token), Some(project_id)) =
                (auth_token_for_failure.as_deref(), project_id.as_deref())
            {
                if let Err(mark_failed_error) = self
                    .repository
                    .fail_research_run(token, project_id, convex_run_id.as_deref(), &error.to_string())
                    .await
                {
                    tracing::warn!(%mark_failed_error, "failed to mark Convex research run failed");
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
}

#[derive(Debug, thiserror::Error)]
enum WorkflowError {
    #[error("{0}")]
    InvalidRequest(String),

    #[error(transparent)]
    Convex(#[from] anyhow::Error),

    #[error(transparent)]
    Research(#[from] crate::research::service::ResearchServiceError),

    #[error(transparent)]
    Provider(#[from] crate::providers::process::ProviderProcessError),

    #[error(transparent)]
    Serde(#[from] serde_json::Error),
}

impl WorkflowError {
    fn to_engine_error(&self, provider_id: crate::models::providers::ProviderId) -> EngineError {
        let code = match self {
            WorkflowError::InvalidRequest(_) => EngineErrorCode::InvalidRequest,
            WorkflowError::Provider(error) => error.to_engine_error(provider_id).code,
            WorkflowError::Convex(_) | WorkflowError::Research(_) | WorkflowError::Serde(_) => {
                EngineErrorCode::InternalError
            }
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
        WorkflowError::Provider(_) => "The selected AI provider could not finish the research run.".to_string(),
        WorkflowError::Research(_) => "Research context could not be prepared.".to_string(),
        WorkflowError::Convex(_) => "Stage project context could not be loaded or saved.".to_string(),
        WorkflowError::Serde(_) => "The AI response did not match the Research artifact format.".to_string(),
    }
}
