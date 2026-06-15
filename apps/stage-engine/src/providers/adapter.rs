use tokio::sync::watch;
use tokio::time::{Duration, timeout};

use crate::helpers::time::now_millis;
use crate::models::errors::{EngineError, EngineErrorCode};
use crate::models::providers::ProviderId;
use crate::models::runs::{RunEvent, StartRunRequest};
use crate::providers::claude::{run_claude, run_claude_collect};
use crate::providers::codex::{run_codex, run_codex_collect};
use crate::providers::process::{ProviderProcessError, ProviderProcessOutcome};
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

pub async fn run_provider_collect(
    context: ProviderRunContext,
    events: RunEventSink,
    mut cancel: watch::Receiver<bool>,
) -> Result<ProviderProcessOutcome, ProviderProcessError> {
    match context.request.provider_id {
        ProviderId::Claude => run_claude_collect(context, events, &mut cancel).await,
        ProviderId::Codex => run_codex_collect(context, events, &mut cancel).await,
    }
}

pub async fn smoke_test_provider(
    mut context: ProviderRunContext,
    cancel: watch::Receiver<bool>,
) -> Result<(), ProviderProcessError> {
    context.run_id = format!("{}-preflight", context.run_id);
    context.request.prompt =
        "Provider preflight. Reply with exactly the uppercase word OK and nothing else."
            .to_string();
    context.request.context.source = Some("provider-preflight".to_string());

    let provider_id = context.request.provider_id;
    let binary = match provider_id {
        ProviderId::Claude => "claude",
        ProviderId::Codex => "codex",
    };
    let outcome = timeout(
        Duration::from_secs(45),
        run_provider_collect(context, RunEventSink::detached(), cancel),
    )
    .await
    .map_err(|_| ProviderProcessError::Io {
        binary,
        source: std::io::Error::other("provider preflight timed out after 45 seconds"),
    })??;

    match outcome {
        ProviderProcessOutcome::Completed(output)
            if output.split_whitespace().any(|word| word == "OK") =>
        {
            Ok(())
        }
        ProviderProcessOutcome::Completed(_) => Err(ProviderProcessError::Io {
            binary,
            source: std::io::Error::other("provider preflight did not return OK"),
        }),
        ProviderProcessOutcome::Cancelled => Err(ProviderProcessError::Io {
            binary,
            source: std::io::Error::other("provider preflight was cancelled"),
        }),
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
