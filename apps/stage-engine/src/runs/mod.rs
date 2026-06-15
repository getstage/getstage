use std::collections::HashMap;
use std::sync::Arc;
use std::sync::Mutex;

use thiserror::Error;
use tokio::sync::{RwLock, broadcast, watch};
use tokio::time::{Duration, sleep};
use uuid::Uuid;

use crate::chat::workflow::ChatWorkflow;
use crate::flows::workflow::FlowsWorkflow;
use crate::models::errors::{EngineError, EngineErrorCode};
use crate::models::providers::ProviderId;
use crate::models::runs::{
    CancelRunResponse, RunEvent, RunMode, RunStatus, StartRunRequest, StartRunResponse,
};
use crate::moodboard::workflow::MoodboardWorkflow;
use crate::providers::adapter::{ProviderRunContext, provider_unavailable_event, run_provider};
use crate::providers::service::assert_provider_ready_for_run;
use crate::research::workflow::ResearchWorkflow;
use crate::strategy::workflow::StrategyWorkflow;
use crate::styleguide::StyleguideWorkflow;
use crate::wireframes::workflow::WireframesWorkflow;

const RUN_EVENT_CAPACITY: usize = 256;
const COMPLETED_RUN_RETENTION: Duration = Duration::from_secs(300);

type ProjectRunDedupeKey = (String, RunMode, Option<String>);

fn project_run_dedupe_key(request: &StartRunRequest) -> Option<ProjectRunDedupeKey> {
    if request.context.source.is_some() {
        return None;
    }

    let project_id = request.context.project_id.as_ref()?;
    match request.mode {
        RunMode::Research
        | RunMode::Strategy
        | RunMode::Moodboard
        | RunMode::Flows
        | RunMode::Wireframes => Some((project_id.clone(), request.mode, None)),
        RunMode::Styleguide => Some((
            project_id.clone(),
            request.mode,
            request.context.direction_id.clone(),
        )),
        _ => None,
    }
}

#[derive(Clone, Debug)]
struct ActiveRun {
    provider_id: ProviderId,
    events: broadcast::Sender<RunEvent>,
    history: Arc<Mutex<Vec<RunEvent>>>,
    cancel: watch::Sender<bool>,
}

#[derive(Clone, Debug)]
pub struct RunEventSink {
    events: broadcast::Sender<RunEvent>,
    history: Arc<Mutex<Vec<RunEvent>>>,
}

impl RunEventSink {
    pub fn send(&self, event: RunEvent) {
        match self.history.lock() {
            Ok(mut history) => history.push(event.clone()),
            Err(error) => {
                tracing::error!(%error, "run event history lock was poisoned");
            }
        }

        if let Err(error) = self.events.send(event) {
            tracing::debug!(%error, "run event had no active receivers");
        }
    }
}

#[derive(Debug)]
pub struct RunSubscription {
    pub history: Vec<RunEvent>,
    pub receiver: broadcast::Receiver<RunEvent>,
}

#[derive(Debug)]
pub struct RunManager {
    api_version: &'static str,
    runs: Arc<RwLock<HashMap<String, ActiveRun>>>,
    project_run_dedupe: Arc<RwLock<HashMap<ProjectRunDedupeKey, String>>>,
    chat: Option<Arc<ChatWorkflow>>,
    research: Option<Arc<ResearchWorkflow>>,
    strategy: Option<Arc<StrategyWorkflow>>,
    styleguide: Option<Arc<StyleguideWorkflow>>,
    moodboard: Option<Arc<MoodboardWorkflow>>,
    flows: Option<Arc<FlowsWorkflow>>,
    wireframes: Option<Arc<WireframesWorkflow>>,
}

impl RunManager {
    pub fn new(
        api_version: &'static str,
        chat: Option<Arc<ChatWorkflow>>,
        research: Option<Arc<ResearchWorkflow>>,
        strategy: Option<Arc<StrategyWorkflow>>,
        styleguide: Option<Arc<StyleguideWorkflow>>,
        moodboard: Option<Arc<MoodboardWorkflow>>,
        flows: Option<Arc<FlowsWorkflow>>,
        wireframes: Option<Arc<WireframesWorkflow>>,
    ) -> Self {
        Self {
            api_version,
            runs: Arc::new(RwLock::new(HashMap::new())),
            project_run_dedupe: Arc::new(RwLock::new(HashMap::new())),
            chat,
            research,
            strategy,
            styleguide,
            moodboard,
            flows,
            wireframes,
        }
    }

    pub async fn start_run(
        &self,
        request: StartRunRequest,
        auth_token: Option<String>,
    ) -> StartRunResponse {
        if let Some(dedupe_key) = project_run_dedupe_key(&request) {
            let existing_run_id = {
                let dedupe = self.project_run_dedupe.read().await;
                dedupe.get(&dedupe_key).cloned()
            };

            if let Some(existing_run_id) = existing_run_id {
                let runs = self.runs.read().await;
                if runs.contains_key(&existing_run_id) {
                    tracing::info!(
                        existing_run_id = %existing_run_id,
                        project_id = %dedupe_key.0,
                        mode = ?dedupe_key.1,
                        direction_id = ?dedupe_key.2,
                        "deduped duplicate project run start"
                    );
                    return StartRunResponse {
                        api_version: self.api_version,
                        run_id: existing_run_id,
                        status: RunStatus::Started,
                    };
                }
            }
        }

        let run_id = Uuid::new_v4().to_string();
        let (events, _) = broadcast::channel(RUN_EVENT_CAPACITY);
        let history = Arc::new(Mutex::new(Vec::new()));
        let (cancel, cancel_rx) = watch::channel(false);
        let active_run = ActiveRun {
            provider_id: request.provider_id,
            events: events.clone(),
            history: Arc::clone(&history),
            cancel,
        };

        self.runs.write().await.insert(run_id.clone(), active_run);

        if let Some(dedupe_key) = project_run_dedupe_key(&request) {
            self.project_run_dedupe
                .write()
                .await
                .insert(dedupe_key, run_id.clone());
        }

        tracing::info!(
            run_id = %run_id,
            provider_id = ?request.provider_id,
            mode = ?request.mode,
            project_id = ?request.context.project_id,
            has_auth_token = auth_token.is_some(),
            "run started"
        );

        let api_version = self.api_version;
        let runs = Arc::clone(&self.runs);
        let project_run_dedupe = Arc::clone(&self.project_run_dedupe);
        let chat = self.chat.clone();
        let research = self.research.clone();
        let strategy = self.strategy.clone();
        let styleguide = self.styleguide.clone();
        let moodboard = self.moodboard.clone();
        let flows = self.flows.clone();
        let wireframes = self.wireframes.clone();
        let context = ProviderRunContext {
            api_version,
            run_id: run_id.clone(),
            request,
        };
        let sink = RunEventSink { events, history };

        tokio::spawn(async move {
            if matches!(context.request.mode, RunMode::Moodboard) {
                if let Some(moodboard) = moodboard {
                    moodboard
                        .run(
                            api_version,
                            context.run_id.clone(),
                            context.request.clone(),
                            auth_token,
                            sink,
                            cancel_rx,
                        )
                        .await;
                } else {
                    sink.send(RunEvent::RunFailed {
                        api_version,
                        run_id: context.run_id.clone(),
                        provider_id: context.request.provider_id,
                        created_at: crate::helpers::time::now_millis(),
                        error: EngineError {
                            code: EngineErrorCode::InternalError,
                            message: "Moodboard workflow is not configured.".to_string(),
                            provider_id: Some(context.request.provider_id),
                            retryable: true,
                            detail: None,
                        },
                    });
                }
            } else if let Some(error_event) = provider_readiness_error(api_version, &context).await
            {
                if let RunEvent::RunFailed { ref error, .. } = error_event {
                    tracing::error!(
                        run_id = %context.run_id,
                        provider_id = ?context.request.provider_id,
                        code = ?error.code,
                        message = %error.message,
                        detail = ?error.detail,
                        "run failed before provider execution"
                    );
                }
                sink.send(error_event);
            } else if matches!(context.request.mode, RunMode::Chat) {
                if let Some(chat) = chat {
                    chat.run(
                        api_version,
                        context.run_id.clone(),
                        context.request.clone(),
                        auth_token,
                        sink,
                        cancel_rx,
                    )
                    .await;
                } else {
                    run_provider(context.clone(), sink, cancel_rx).await;
                }
            } else if matches!(context.request.mode, RunMode::Research) {
                if let Some(research) = research {
                    research
                        .run(
                            api_version,
                            context.run_id.clone(),
                            context.request.clone(),
                            auth_token,
                            sink,
                            cancel_rx,
                        )
                        .await;
                } else {
                    sink.send(RunEvent::RunFailed {
                        api_version,
                        run_id: context.run_id.clone(),
                        provider_id: context.request.provider_id,
                        created_at: crate::helpers::time::now_millis(),
                        error: EngineError {
                            code: EngineErrorCode::InternalError,
                            message: "Research workflow is not configured.".to_string(),
                            provider_id: Some(context.request.provider_id),
                            retryable: true,
                            detail: None,
                        },
                    });
                }
            } else if matches!(context.request.mode, RunMode::Strategy) {
                if let Some(strategy) = strategy {
                    strategy
                        .run(
                            api_version,
                            context.run_id.clone(),
                            context.request.clone(),
                            auth_token,
                            sink,
                            cancel_rx,
                        )
                        .await;
                } else {
                    sink.send(RunEvent::RunFailed {
                        api_version,
                        run_id: context.run_id.clone(),
                        provider_id: context.request.provider_id,
                        created_at: crate::helpers::time::now_millis(),
                        error: EngineError {
                            code: EngineErrorCode::InternalError,
                            message: "Strategy workflow is not configured.".to_string(),
                            provider_id: Some(context.request.provider_id),
                            retryable: true,
                            detail: None,
                        },
                    });
                }
            } else if matches!(context.request.mode, RunMode::Flows) {
                if let Some(flows) = flows {
                    flows
                        .run(
                            api_version,
                            context.run_id.clone(),
                            context.request.clone(),
                            auth_token,
                            sink,
                            cancel_rx,
                        )
                        .await;
                } else {
                    sink.send(RunEvent::RunFailed {
                        api_version,
                        run_id: context.run_id.clone(),
                        provider_id: context.request.provider_id,
                        created_at: crate::helpers::time::now_millis(),
                        error: EngineError {
                            code: EngineErrorCode::InternalError,
                            message: "Flows workflow is not configured.".to_string(),
                            provider_id: Some(context.request.provider_id),
                            retryable: true,
                            detail: None,
                        },
                    });
                }
            } else if matches!(context.request.mode, RunMode::Styleguide) {
                if let Some(styleguide) = styleguide {
                    styleguide
                        .run(
                            api_version,
                            context.run_id.clone(),
                            context.request.clone(),
                            auth_token,
                            sink,
                            cancel_rx,
                        )
                        .await;
                } else {
                    sink.send(RunEvent::RunFailed {
                        api_version,
                        run_id: context.run_id.clone(),
                        provider_id: context.request.provider_id,
                        created_at: crate::helpers::time::now_millis(),
                        error: EngineError {
                            code: EngineErrorCode::InternalError,
                            message: "Style guide workflow is not configured.".to_string(),
                            provider_id: Some(context.request.provider_id),
                            retryable: true,
                            detail: None,
                        },
                    });
                }
            } else if matches!(context.request.mode, RunMode::Wireframes) {
                if let Some(wireframes) = wireframes {
                    wireframes
                        .run(
                            api_version,
                            context.run_id.clone(),
                            context.request.clone(),
                            auth_token,
                            sink,
                            cancel_rx,
                        )
                        .await;
                } else {
                    sink.send(RunEvent::RunFailed {
                        api_version,
                        run_id: context.run_id.clone(),
                        provider_id: context.request.provider_id,
                        created_at: crate::helpers::time::now_millis(),
                        error: EngineError {
                            code: EngineErrorCode::InternalError,
                            message: "Wireframes workflow is not configured.".to_string(),
                            provider_id: Some(context.request.provider_id),
                            retryable: true,
                            detail: None,
                        },
                    });
                }
            } else {
                run_provider(context.clone(), sink, cancel_rx).await;
            }

            if let Some(dedupe_key) = project_run_dedupe_key(&context.request) {
                let mut dedupe = project_run_dedupe.write().await;
                if dedupe
                    .get(&dedupe_key)
                    .is_some_and(|active_id| active_id == &context.run_id)
                {
                    dedupe.remove(&dedupe_key);
                }
            }

            sleep(COMPLETED_RUN_RETENTION).await;
            runs.write().await.remove(&context.run_id);
        });

        StartRunResponse {
            api_version: self.api_version,
            run_id,
            status: RunStatus::Started,
        }
    }

    pub async fn subscribe(&self, run_id: &str) -> Result<RunSubscription, RunError> {
        let runs = self.runs.read().await;
        let Some(run) = runs.get(run_id) else {
            return Err(RunError::NotFound {
                run_id: run_id.to_string(),
            });
        };
        let history = run
            .history
            .lock()
            .map_err(|_| RunError::HistoryUnavailable {
                run_id: run_id.to_string(),
            })?
            .clone();

        Ok(RunSubscription {
            history,
            receiver: run.events.subscribe(),
        })
    }

    pub async fn cancel_run(&self, run_id: &str) -> Result<CancelRunResponse, RunError> {
        let runs = self.runs.read().await;
        let Some(run) = runs.get(run_id) else {
            return Err(RunError::NotFound {
                run_id: run_id.to_string(),
            });
        };

        run.cancel
            .send(true)
            .map_err(|_| RunError::AlreadyFinished {
                run_id: run_id.to_string(),
                provider_id: run.provider_id,
            })?;

        Ok(CancelRunResponse {
            api_version: self.api_version,
            run_id: run_id.to_string(),
            status: RunStatus::Cancelled,
        })
    }
}

async fn provider_readiness_error(
    api_version: &'static str,
    context: &ProviderRunContext,
) -> Option<RunEvent> {
    match assert_provider_ready_for_run(context.request.provider_id).await {
        Ok(()) => None,
        Err(blocked) => Some(provider_unavailable_event(
            api_version,
            context.run_id.clone(),
            context.request.provider_id,
            blocked.message,
        )),
    }
}

#[derive(Debug, Error)]
pub enum RunError {
    #[error("run `{run_id}` was not found")]
    NotFound { run_id: String },

    #[error("run `{run_id}` already finished")]
    AlreadyFinished {
        run_id: String,
        provider_id: ProviderId,
    },

    #[error("run `{run_id}` history is unavailable")]
    HistoryUnavailable { run_id: String },
}

impl RunError {
    pub fn to_engine_error(&self) -> EngineError {
        match self {
            RunError::NotFound { run_id } => EngineError {
                code: EngineErrorCode::InvalidRequest,
                message: format!("Run `{run_id}` was not found."),
                provider_id: None,
                retryable: false,
                detail: None,
            },
            RunError::AlreadyFinished {
                run_id,
                provider_id,
            } => EngineError {
                code: EngineErrorCode::RunCancelled,
                message: format!("Run `{run_id}` already finished."),
                provider_id: Some(*provider_id),
                retryable: false,
                detail: None,
            },
            RunError::HistoryUnavailable { run_id } => EngineError {
                code: EngineErrorCode::InternalError,
                message: format!("Run `{run_id}` history is unavailable."),
                provider_id: None,
                retryable: true,
                detail: None,
            },
        }
    }
}
