use std::sync::Arc;

use crate::convex_store::app_secrets::AppSecretsRepository;
use crate::convex_store::asset_upload::ConvexAssetUploader;
use crate::convex_store::research_repository::{
    ResearchRepository, enrich_research_artifact, extract_json_object, extract_research_artifact,
};
use crate::helpers::time::now_millis;
use crate::models::errors::{EngineError, EngineErrorCode};
use crate::models::runs::{RunEvent, RunStatus, StartRunRequest};
use crate::providers::adapter::{ProviderRunContext, run_provider_collect};
use crate::providers::process::ProviderProcessOutcome;
use crate::research::competitive::filter_competitive_analysis;
use crate::research::prompt::build_research_prompt;
use crate::research::refero_assets::{apply_engine_ui_patterns, persist_refero_context_images};
use crate::research::section::{
    build_section_regenerate_prompt, merge_research_section, parse_research_section,
};
use crate::research::service::ResearchService;
use crate::refero::service::ReferoService;
use crate::runs::RunEventSink;
use serde_json::json;

#[derive(Clone, Debug)]
pub struct ResearchWorkflow {
    repository: ResearchRepository,
    secrets: AppSecretsRepository,
    research: ResearchService,
}

impl ResearchWorkflow {
    pub fn new(
        repository: ResearchRepository,
        secrets: AppSecretsRepository,
        research: ResearchService,
    ) -> Self {
        Self {
            repository,
            secrets,
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
            let auth_token = auth_token.ok_or_else(|| {
                WorkflowError::InvalidRequest("Missing desktop session for Research.".to_string())
            })?;
            let project_id = project_id.as_deref().ok_or_else(|| {
                WorkflowError::InvalidRequest("Missing project id for Research.".to_string())
            })?;

            self.tool_started(
                api_version,
                &run_id,
                provider_id,
                &sink,
                "stage-context",
                "Load Stage project context",
            );
            tracing::info!(run_id = %run_id, project_id, "loading research input from Convex");
            let input = self
                .repository
                .fetch_research_input(&auth_token, project_id)
                .await?;
            tracing::info!(
                run_id = %run_id,
                project_id,
                competitor_count = input.competitor_urls.len(),
                competitive_targets = ?crate::research::competitive::allowed_competitive_targets(&input),
                "loaded research input"
            );
            self.tool_completed(api_version, &run_id, provider_id, &sink, "stage-context");

            let section =
                parse_research_section(request.context.source.as_deref()).map(str::to_string);
            if let Some(section_name) = section {
                return self
                    .run_section_regenerate(
                        api_version,
                        &run_id,
                        provider_id,
                        &auth_token,
                        project_id,
                        &section_name,
                        &mut request,
                        sink.clone(),
                        cancel_rx,
                    )
                    .await;
            }

            convex_run_id = self
                .repository
                .create_research_run(
                    &auth_token,
                    project_id,
                    &run_id,
                    Some(request.prompt.as_str()),
                )
                .await?;

            self.tool_started(
                api_version,
                &run_id,
                provider_id,
                &sink,
                "refero-context",
                "Search Refero examples",
            );
            tracing::info!(run_id = %run_id, project_id, "building Refero context");
            let refero = self.resolve_refero(&auth_token).await?;
            let research = ResearchService::new(refero.clone());
            let mut bundle = research.build_prompt_bundle(input.clone()).await?;

            let uploader = ConvexAssetUploader::new(self.repository.deployment_url().to_string());
            let image_keys = persist_refero_context_images(
                &refero,
                &uploader,
                &auth_token,
                project_id,
                &mut bundle.refero_context,
            )
            .await?;
            tracing::info!(
                run_id = %run_id,
                project_id,
                refero_images = image_keys.len(),
                "Refero images persisted to R2"
            );

            bundle.prompt = build_research_prompt(&input, &bundle.refero_context);
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
            let mut raw_artifact = extract_research_artifact(&final_text)?;
            apply_engine_ui_patterns(&mut raw_artifact, &bundle.refero_context, &image_keys);
            let refero_context = serde_json::to_value(&bundle.refero_context)?;
            let artifact =
                enrich_research_artifact(raw_artifact, &input, refero_context, now_millis())?;

            self.repository
                .complete_research_run(
                    &auth_token,
                    project_id,
                    convex_run_id.as_deref(),
                    &artifact,
                    provider_id,
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
                    .fail_research_run(
                        token,
                        project_id,
                        convex_run_id.as_deref(),
                        &error.to_string(),
                    )
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

    async fn resolve_refero(&self, auth_token: &str) -> Result<ReferoService, WorkflowError> {
        if self.research.refero().is_configured() {
            return Ok(self.research.refero().clone());
        }

        let token = self
            .secrets
            .fetch_refero_mcp_token(auth_token)
            .await?
            .ok_or_else(|| {
                WorkflowError::InvalidRequest(
                    "Refero is not configured for this Stage deployment.".to_string(),
                )
            })?;

        self.research
            .refero()
            .with_token(token)
            .map_err(|error| WorkflowError::InvalidRequest(error.to_string()))
    }

    async fn run_section_regenerate(
        &self,
        api_version: &'static str,
        run_id: &str,
        provider_id: crate::models::providers::ProviderId,
        auth_token: &str,
        project_id: &str,
        section: &str,
        request: &mut StartRunRequest,
        sink: RunEventSink,
        cancel_rx: tokio::sync::watch::Receiver<bool>,
    ) -> Result<(), WorkflowError> {
        let (artifact_id, mut artifact) = self
            .repository
            .fetch_latest_research_artifact(auth_token, project_id)
            .await?
            .ok_or_else(|| {
                WorkflowError::InvalidRequest(
                    "No saved research artifact to regenerate.".to_string(),
                )
            })?;

        let input = self
            .repository
            .fetch_research_input(auth_token, project_id)
            .await?;
        request.prompt = build_section_regenerate_prompt(section, &artifact, &input);

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
        merge_research_section(&mut artifact, section, section_patch)?;
        if let Some(object) = artifact.as_object_mut() {
            crate::research::normalize::normalize_research_artifact_fields(object, &input);
            filter_competitive_analysis(object, &input);
            object.insert("generatedAt".to_string(), json!(now_millis()));
        }

        self.repository
            .update_research_artifact(auth_token, project_id, &artifact_id, &artifact)
            .await?;

        sink.send(RunEvent::RunCompleted {
            api_version,
            run_id: run_id.to_string(),
            provider_id,
            created_at: now_millis(),
            final_text: Some(format!("Regenerated research section: {section}")),
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
        WorkflowError::Provider(_) => {
            "The selected AI provider could not finish the research run.".to_string()
        }
        WorkflowError::Research(_) => "Research context could not be prepared.".to_string(),
        WorkflowError::Convex(_) => {
            "Stage project context could not be loaded or saved.".to_string()
        }
        WorkflowError::Serde(_) => {
            "The AI response did not match the Research artifact format.".to_string()
        }
    }
}
