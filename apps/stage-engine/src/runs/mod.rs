use std::collections::HashMap;
use std::sync::Arc;
use std::sync::Mutex;

use thiserror::Error;
use tokio::sync::{RwLock, broadcast, watch};
use tokio::time::{Duration, sleep};
use uuid::Uuid;

use crate::models::errors::{EngineError, EngineErrorCode};
use crate::models::providers::{ProviderId, ProviderStatus};
use crate::models::runs::{
    CancelRunResponse, RunEvent, RunStatus, StartRunRequest, StartRunResponse,
};
use crate::providers::adapter::{ProviderRunContext, provider_unavailable_event, run_provider};
use crate::providers::service::provider_snapshot;

const RUN_EVENT_CAPACITY: usize = 256;
const COMPLETED_RUN_RETENTION: Duration = Duration::from_secs(300);

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
}

impl RunManager {
    pub fn new(api_version: &'static str) -> Self {
        Self {
            api_version,
            runs: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    pub async fn start_run(&self, request: StartRunRequest) -> StartRunResponse {
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

        let api_version = self.api_version;
        let runs = Arc::clone(&self.runs);
        let context = ProviderRunContext {
            api_version,
            run_id: run_id.clone(),
            request,
        };
        let sink = RunEventSink { events, history };

        tokio::spawn(async move {
            if let Some(error_event) = provider_readiness_error(api_version, &context).await {
                sink.send(error_event);
            } else {
                run_provider(context.clone(), sink, cancel_rx).await;
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
    let snapshot = provider_snapshot(api_version).await;
    let provider = snapshot
        .providers
        .into_iter()
        .find(|provider| provider.id == context.request.provider_id)?;

    if matches!(provider.status, ProviderStatus::Ready) {
        return None;
    }

    Some(provider_unavailable_event(
        api_version,
        context.run_id.clone(),
        context.request.provider_id,
        provider
            .message
            .unwrap_or_else(|| "Provider is not ready for runs.".to_string()),
    ))
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
