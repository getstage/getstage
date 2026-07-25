use std::sync::Arc;

use crate::convex_store::app_secrets::AppSecretsRepository;
use crate::convex_store::asset_upload::ConvexAssetUploader;
use crate::convex_store::research_repository::{
    ResearchRepository, enrich_research_artifact, extract_json_object,
    validate_complete_research_artifact,
};
use crate::helpers::time::now_millis;
use crate::models::errors::{EngineError, EngineErrorCode};
use crate::models::runs::{
    RunEvent, RunModelOptionSelection, RunModelOptionValue, RunStatus, StartRunRequest,
};
use crate::providers::adapter::{ProviderRunContext, run_provider_collect};
use crate::providers::process::{ProviderProcessError, ProviderProcessOutcome};
use crate::providers::service::assert_provider_ready_for_run;
use crate::refero::service::ReferoService;
use crate::research::competitive::filter_competitive_analysis;
use crate::research::pipeline::{
    CompetitiveJobOutput, ContextJobOutput, SynthesisJobOutput, assemble_artifact,
};
use crate::research::prompt::{
    build_competitive_prompt, build_context_prompt, build_synthesis_prompt,
};
use crate::research::refero_assets::{apply_engine_ui_patterns, persist_refero_context_images};
use crate::research::section::{
    build_opportunities_prompt, build_section_regenerate_prompt, merge_research_section,
    parse_research_section,
};
use crate::research::service::ResearchService;
use crate::runs::RunEventSink;
use serde::de::DeserializeOwned;
use serde_json::json;
use tokio::time::{Duration, Instant, timeout};

const SECTION_PROVIDER_TIMEOUT: Duration = Duration::from_secs(300);
const CONTEXT_JOB_TIMEOUT: Duration = Duration::from_secs(120);
const COMPETITIVE_JOB_TIMEOUT: Duration = Duration::from_secs(180);
const SYNTHESIS_JOB_TIMEOUT: Duration = Duration::from_secs(120);
const RESEARCH_WORKFLOW_TIMEOUT: Duration = Duration::from_secs(360);
/// Leave headroom for merge/publish after the last provider job.
const WORKFLOW_TAIL_RESERVE: Duration = Duration::from_secs(30);

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
        let mut uploaded_research_asset_keys: Vec<String> = Vec::new();

        tracing::info!(
            run_id = %run_id,
            provider_id = ?provider_id,
            project_id = ?project_id,
            has_auth_token = auth_token.is_some(),
            "research workflow started"
        );

        let result = match timeout(RESEARCH_WORKFLOW_TIMEOUT, async {
            let workflow_started = Instant::now();
            let workflow_deadline = workflow_started + RESEARCH_WORKFLOW_TIMEOUT;
            let auth_token = auth_token.ok_or_else(|| {
                WorkflowError::InvalidRequest("Missing desktop session for Research.".to_string())
            })?;
            let project_id = project_id.as_deref().ok_or_else(|| {
                WorkflowError::InvalidRequest("Missing project id for Research.".to_string())
            })?;

            let readiness_started = std::time::Instant::now();
            self.tool_started(
                api_version,
                &run_id,
                provider_id,
                &sink,
                "verify-provider",
                "Verify AI provider login",
            );
            // Auth/binary readiness only — a live model smoke call duplicated
            // RunManager checks and burned up to 45s before Refero even started.
            assert_provider_ready_for_run(provider_id)
                .await
                .map_err(|blocked| WorkflowError::InvalidRequest(blocked.message))?;
            tracing::info!(
                run_id = %run_id,
                readiness_elapsed_ms = readiness_started.elapsed().as_millis(),
                "research provider readiness completed"
            );
            self.tool_completed(api_version, &run_id, provider_id, &sink, "verify-provider");

            let context_started = std::time::Instant::now();
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
                context_elapsed_ms = context_started.elapsed().as_millis(),
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
            let refero_started = std::time::Instant::now();
            let refero = self.resolve_refero(&auth_token).await?;
            let research = ResearchService::new(refero.clone());
            let mut bundle = research.build_evidence_bundle(input.clone()).await?;

            let uploader = ConvexAssetUploader::new(self.repository.deployment_url().to_string());
            let image_keys = persist_refero_context_images(
                &refero,
                &uploader,
                &auth_token,
                project_id,
                &mut bundle.refero_context,
            )
            .await?;
            uploaded_research_asset_keys = image_keys.values().cloned().collect();
            tracing::info!(
                run_id = %run_id,
                project_id,
                refero_images = image_keys.len(),
                refero_mcp_calls = refero.call_count(),
                refero_elapsed_ms = refero_started.elapsed().as_millis(),
                "Refero images persisted to R2"
            );

            self.tool_completed(api_version, &run_id, provider_id, &sink, "refero-context");

            self.tool_started(
                api_version,
                &run_id,
                provider_id,
                &sink,
                "research-context-job",
                "Generate company and user context",
            );
            self.tool_started(
                api_version,
                &run_id,
                provider_id,
                &sink,
                "research-competitive-job",
                "Analyze competitor evidence",
            );

            let context_request = job_request(
                &request,
                build_context_prompt(&input),
                "research-context",
                "low",
            );
            let competitive_request = job_request(
                &request,
                build_competitive_prompt(&input, &bundle.competitor_evidence),
                "research-web-evidence",
                "low",
            );
            let initial_jobs_started = Instant::now();
            let (context_output, competitive_output) = tokio::try_join!(
                run_research_job::<ContextJobOutput>(
                    api_version,
                    &run_id,
                    "context",
                    context_request,
                    sink.clone(),
                    cancel_rx.clone(),
                    CONTEXT_JOB_TIMEOUT,
                    workflow_deadline,
                ),
                run_research_job::<CompetitiveJobOutput>(
                    api_version,
                    &run_id,
                    "competitive analysis",
                    competitive_request,
                    sink.clone(),
                    cancel_rx.clone(),
                    COMPETITIVE_JOB_TIMEOUT,
                    workflow_deadline,
                ),
            )?;
            let (Some(context_output), Some(competitive_output)) =
                (context_output, competitive_output)
            else {
                tracing::info!(run_id = %run_id, "research provider run cancelled");
                self.mark_research_cancelled(
                    &auth_token,
                    project_id,
                    convex_run_id.as_deref(),
                    &uploaded_research_asset_keys,
                )
                .await;
                return Ok(());
            };

            let requires_competitors =
                !crate::research::competitive::allowed_competitive_targets(&input).is_empty();
            context_output
                .validate()
                .map_err(|source| WorkflowError::JobOutput {
                    phase: "context",
                    source,
                })?;
            competitive_output
                .validate(requires_competitors)
                .map_err(|source| WorkflowError::JobOutput {
                    phase: "competitive analysis",
                    source,
                })?;
            self.tool_completed(
                api_version,
                &run_id,
                provider_id,
                &sink,
                "research-context-job",
            );
            self.tool_completed(
                api_version,
                &run_id,
                provider_id,
                &sink,
                "research-competitive-job",
            );
            tracing::info!(
                run_id = %run_id,
                initial_jobs_elapsed_ms = initial_jobs_started.elapsed().as_millis(),
                "parallel Research jobs completed"
            );

            self.tool_started(
                api_version,
                &run_id,
                provider_id,
                &sink,
                "research-synthesis-job",
                "Synthesize findings and opportunities",
            );
            let context_json = serde_json::to_string(&context_output)?;
            let competitive_json = serde_json::to_string(&competitive_output)?;
            let synthesis_request = job_request(
                &request,
                build_synthesis_prompt(&input, &context_json, &competitive_json),
                "research-synthesis",
                "medium",
            );
            let Some(synthesis_output) = run_research_job::<SynthesisJobOutput>(
                api_version,
                &run_id,
                "synthesis",
                synthesis_request,
                sink.clone(),
                cancel_rx.clone(),
                SYNTHESIS_JOB_TIMEOUT,
                workflow_deadline,
            )
            .await?
            else {
                self.mark_research_cancelled(
                    &auth_token,
                    project_id,
                    convex_run_id.as_deref(),
                    &uploaded_research_asset_keys,
                )
                .await;
                return Ok(());
            };
            synthesis_output
                .validate()
                .map_err(|source| WorkflowError::JobOutput {
                    phase: "synthesis",
                    source,
                })?;
            self.tool_completed(
                api_version,
                &run_id,
                provider_id,
                &sink,
                "research-synthesis-job",
            );

            let mut raw_artifact =
                assemble_artifact(&input, context_output, competitive_output, synthesis_output);
            apply_engine_ui_patterns(&mut raw_artifact, &bundle.refero_context, &image_keys);
            let refero_context = serde_json::to_value(&bundle.refero_context)?;
            let artifact =
                enrich_research_artifact(raw_artifact, &input, refero_context, now_millis())?;

            let parsed_artifact =
                serde_json::from_value::<crate::models::research::ResearchArtifact>(
                    artifact.clone(),
                )?;
            validate_complete_research_artifact(&parsed_artifact, &input)
                .map_err(|error| WorkflowError::IncompleteArtifact(error.to_string()))?;

            let publish_started = std::time::Instant::now();
            self.repository
                .complete_research_run(
                    &auth_token,
                    project_id,
                    convex_run_id.as_deref(),
                    &artifact,
                    provider_id,
                )
                .await?;

            tracing::info!(
                run_id = %run_id,
                project_id,
                publish_elapsed_ms = publish_started.elapsed().as_millis(),
                workflow_elapsed_ms = workflow_started.elapsed().as_millis(),
                "research artifact saved to Convex"
            );

            sink.send(RunEvent::RunCompleted {
                api_version,
                run_id: run_id.clone(),
                provider_id,
                created_at: now_millis(),
                final_text: Some("Research artifact saved.".to_string()),
            });

            Ok::<(), WorkflowError>(())
        })
        .await
        {
            Ok(result) => result,
            Err(_) => Err(WorkflowError::WorkflowTimeout),
        };

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

                if let Err(cleanup_error) = self
                    .repository
                    .cleanup_research_asset_keys(token, project_id, &uploaded_research_asset_keys)
                    .await
                {
                    tracing::warn!(%cleanup_error, "failed to clean up uploaded research assets");
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
            return Ok(self.research.refero().with_fresh_call_counter());
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

    async fn mark_research_cancelled(
        &self,
        auth_token: &str,
        project_id: &str,
        convex_run_id: Option<&str>,
        uploaded_research_asset_keys: &[String],
    ) {
        if let Err(error) = self
            .repository
            .fail_research_run(
                auth_token,
                project_id,
                convex_run_id,
                "Run cancelled by user.",
            )
            .await
        {
            tracing::warn!(%error, "failed to mark cancelled Convex research run failed");
        }

        if let Err(error) = self
            .repository
            .cleanup_research_asset_keys(auth_token, project_id, uploaded_research_asset_keys)
            .await
        {
            tracing::warn!(%error, "failed to clean up cancelled research assets");
        }
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
        request.prompt = if section == "opportunities" {
            build_opportunities_prompt(&artifact, &input)
        } else {
            build_section_regenerate_prompt(section, &artifact, &input)
        };

        let provider_context = ProviderRunContext {
            api_version,
            run_id: run_id.to_string(),
            request: request.clone(),
        };

        let outcome = collect_provider_with_timeout(
            provider_context,
            sink.clone(),
            cancel_rx,
            SECTION_PROVIDER_TIMEOUT,
        )
        .await?;
        let ProviderProcessOutcome::Completed(final_text) = outcome else {
            return Ok(());
        };

        let section_patch = if section == "opportunities" {
            extract_json_object(&final_text)?
                .get("opportunities")
                .cloned()
                .ok_or_else(|| {
                    WorkflowError::InvalidRequest(
                        "Opportunities response did not contain an opportunities array."
                            .to_string(),
                    )
                })?
        } else {
            extract_json_object(&final_text)?
        };
        merge_research_section(&mut artifact, section, section_patch)?;
        if let Some(object) = artifact.as_object_mut() {
            crate::research::normalize::normalize_research_artifact_fields(object, &input);
            filter_competitive_analysis(object, &input);
            let repair_report =
                crate::research::competitive::repair_competitive_analysis(object, &input);
            crate::research::competitive::complete_competitive_matrix(object);
            crate::research::competitive::append_competitive_quality_warnings(
                object,
                &repair_report,
            );
            crate::research::competitive::validate_competitive_analysis(object, &input)?;
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

fn job_request(
    base: &StartRunRequest,
    prompt: String,
    source: &str,
    reasoning_effort: &str,
) -> StartRunRequest {
    let mut request = base.clone();
    request.prompt = prompt;
    request.context.source = Some(source.to_string());
    request
        .model_options
        .retain(|option| option.id != "reasoning_effort" && option.id != "response_speed");
    request.model_options.push(RunModelOptionSelection {
        id: "reasoning_effort".to_string(),
        value: RunModelOptionValue::String(reasoning_effort.to_string()),
    });
    if reasoning_effort == "low" {
        request.model_options.push(RunModelOptionSelection {
            id: "response_speed".to_string(),
            value: RunModelOptionValue::String("fast".to_string()),
        });
    }
    request
}

async fn run_research_job<T: DeserializeOwned>(
    api_version: &'static str,
    run_id: &str,
    phase: &'static str,
    mut request: StartRunRequest,
    sink: RunEventSink,
    cancel_rx: tokio::sync::watch::Receiver<bool>,
    duration: Duration,
    workflow_deadline: Instant,
) -> Result<Option<T>, WorkflowError> {
    let first_budget = job_attempt_budget(duration, workflow_deadline)?;
    match run_research_job_once(
        api_version,
        run_id,
        phase,
        request.clone(),
        sink.clone(),
        cancel_rx.clone(),
        first_budget,
    )
    .await
    {
        Ok(outcome) => Ok(outcome),
        Err(error) if error.is_retryable_job_failure() => {
            let retry_budget = job_attempt_budget(duration / 2, workflow_deadline)?;
            tracing::warn!(
                run_id,
                phase,
                error = %error,
                retry_timeout_seconds = retry_budget.as_secs(),
                "Research job failed; retrying once at low effort"
            );
            force_low_effort(&mut request);
            run_research_job_once(
                api_version,
                run_id,
                phase,
                request,
                sink,
                cancel_rx,
                retry_budget,
            )
            .await
        }
        Err(error) => Err(error),
    }
}

fn job_attempt_budget(
    preferred: Duration,
    workflow_deadline: Instant,
) -> Result<Duration, WorkflowError> {
    let remaining = workflow_deadline
        .saturating_duration_since(Instant::now())
        .saturating_sub(WORKFLOW_TAIL_RESERVE);
    if remaining.is_zero() {
        return Err(WorkflowError::WorkflowTimeout);
    }
    Ok(preferred.min(remaining))
}

async fn run_research_job_once<T: DeserializeOwned>(
    api_version: &'static str,
    run_id: &str,
    phase: &'static str,
    request: StartRunRequest,
    sink: RunEventSink,
    cancel_rx: tokio::sync::watch::Receiver<bool>,
    duration: Duration,
) -> Result<Option<T>, WorkflowError> {
    let prompt_chars = request.prompt.len();
    let provider_context = ProviderRunContext {
        api_version,
        run_id: run_id.to_string(),
        request,
    };
    tracing::info!(
        run_id,
        phase,
        prompt_chars,
        timeout_seconds = duration.as_secs(),
        "starting Research provider job"
    );
    let started = std::time::Instant::now();
    let outcome = collect_provider_with_timeout(provider_context, sink, cancel_rx, duration)
        .await
        .map_err(|source| WorkflowError::ProviderPhase { phase, source })?;
    let ProviderProcessOutcome::Completed(final_text) = outcome else {
        return Ok(None);
    };
    tracing::info!(
        run_id,
        phase,
        output_chars = final_text.len(),
        elapsed_ms = started.elapsed().as_millis(),
        "Research provider job completed"
    );

    let value = extract_json_object(&final_text)
        .map_err(|source| WorkflowError::JobOutput { phase, source })?;
    let output = serde_json::from_value(value).map_err(|source| WorkflowError::JobOutput {
        phase,
        source: source.into(),
    })?;
    Ok(Some(output))
}

fn force_low_effort(request: &mut StartRunRequest) {
    request
        .model_options
        .retain(|option| option.id != "reasoning_effort" && option.id != "response_speed");
    request.model_options.push(RunModelOptionSelection {
        id: "reasoning_effort".to_string(),
        value: RunModelOptionValue::String("low".to_string()),
    });
    request.model_options.push(RunModelOptionSelection {
        id: "response_speed".to_string(),
        value: RunModelOptionValue::String("fast".to_string()),
    });
}

async fn collect_provider_with_timeout(
    context: ProviderRunContext,
    sink: RunEventSink,
    cancel_rx: tokio::sync::watch::Receiver<bool>,
    duration: Duration,
) -> Result<ProviderProcessOutcome, ProviderProcessError> {
    let binary = match context.request.provider_id {
        crate::models::providers::ProviderId::Claude => "claude",
        crate::models::providers::ProviderId::Codex => "codex",
    };

    timeout(duration, run_provider_collect(context, sink, cancel_rx))
        .await
        .map_err(|_| ProviderProcessError::Timeout {
            binary,
            seconds: duration.as_secs(),
        })?
}

#[derive(Debug, thiserror::Error)]
enum WorkflowError {
    #[error("{0}")]
    InvalidRequest(String),

    #[error("{0}")]
    IncompleteArtifact(String),

    #[error(transparent)]
    Convex(#[from] anyhow::Error),

    #[error(transparent)]
    Research(#[from] crate::research::service::ResearchServiceError),

    #[error(transparent)]
    Provider(#[from] crate::providers::process::ProviderProcessError),

    #[error("Research {phase} failed: {source}")]
    ProviderPhase {
        phase: &'static str,
        #[source]
        source: crate::providers::process::ProviderProcessError,
    },

    #[error("Research {phase} returned invalid output: {source}")]
    JobOutput {
        phase: &'static str,
        #[source]
        source: anyhow::Error,
    },

    #[error("Research exceeded the six-minute workflow deadline")]
    WorkflowTimeout,

    #[error(transparent)]
    Serde(#[from] serde_json::Error),
}

impl WorkflowError {
    fn is_retryable_job_failure(&self) -> bool {
        match self {
            WorkflowError::ProviderPhase { source, .. } => {
                !source.is_auth_failure() && !matches!(source, ProviderProcessError::Spawn { .. })
            }
            WorkflowError::JobOutput { .. } => true,
            _ => false,
        }
    }

    fn to_engine_error(&self, provider_id: crate::models::providers::ProviderId) -> EngineError {
        if let WorkflowError::Provider(error) = self {
            return error.to_engine_error(provider_id);
        }
        if let WorkflowError::ProviderPhase { phase, source } = self {
            let mut error = source.to_engine_error(provider_id);
            error.message = format!("Research {phase} failed. {}", error.message);
            error.detail = Some(self.to_string());
            return error;
        }

        let code = match self {
            WorkflowError::InvalidRequest(_) => EngineErrorCode::InvalidRequest,
            WorkflowError::IncompleteArtifact(_)
            | WorkflowError::JobOutput { .. }
            | WorkflowError::WorkflowTimeout => EngineErrorCode::ProviderProcessFailed,
            WorkflowError::Convex(_) | WorkflowError::Research(_) | WorkflowError::Serde(_) => {
                EngineErrorCode::InternalError
            }
            WorkflowError::Provider(_) | WorkflowError::ProviderPhase { .. } => {
                unreachable!("handled above")
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
        WorkflowError::IncompleteArtifact(_) => {
            "Research finished but the result was incomplete. Please run Research again."
                .to_string()
        }
        WorkflowError::Provider(_) => {
            unreachable!("provider errors use ProviderProcessError::to_engine_error")
        }
        WorkflowError::ProviderPhase { .. } => {
            unreachable!("provider phase errors use ProviderProcessError::to_engine_error")
        }
        WorkflowError::JobOutput { phase, .. } => {
            format!("Research {phase} returned an invalid result. Please retry Research.")
        }
        WorkflowError::WorkflowTimeout => {
            "Research exceeded its six-minute safety limit. Please retry Research.".to_string()
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
