use tokio::sync::watch;

use crate::helpers::time::now_millis;
use crate::models::errors::{EngineError, EngineErrorCode};
use crate::models::providers::ProviderId;
use crate::models::runs::{RunEvent, StartRunRequest};
use crate::providers::claude::run_claude;
use crate::providers::codex::run_codex;
use crate::runs::RunEventSink;

#[derive(Clone, Debug)]
pub struct ProviderRunContext {
    pub api_version: &'static str,
    pub run_id: String,
    pub request: StartRunRequest,
}

pub async fn run_provider(
    context: ProviderRunContext,
    events: RunEventSink,
    mut cancel: watch::Receiver<bool>,
) {
    match context.request.provider_id {
        ProviderId::Claude => run_claude(context, events, &mut cancel).await,
        ProviderId::Codex => run_codex(context, events, &mut cancel).await,
    }
}

pub fn provider_unavailable_event(
    api_version: &'static str,
    run_id: String,
    provider_id: ProviderId,
    message: String,
) -> RunEvent {
    RunEvent::RunFailed {
        api_version,
        run_id,
        provider_id,
        created_at: now_millis(),
        error: EngineError {
            code: EngineErrorCode::ReadinessFailed,
            message,
            provider_id: Some(provider_id),
            retryable: true,
            detail: None,
        },
    }
}
