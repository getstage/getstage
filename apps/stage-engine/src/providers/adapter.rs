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

const PROVIDER_PREFLIGHT_TIMEOUT_SECS: u64 = 45;

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
        Duration::from_secs(PROVIDER_PREFLIGHT_TIMEOUT_SECS),
        run_provider_collect(context, RunEventSink::detached(), cancel),
    )
    .await
    .map_err(|_| ProviderProcessError::Timeout {
        binary,
        seconds: PROVIDER_PREFLIGHT_TIMEOUT_SECS,
    })??;

    match outcome {
        ProviderProcessOutcome::Completed(output) if preflight_output_is_ok(&output) => Ok(()),
        ProviderProcessOutcome::Completed(_) => Err(ProviderProcessError::Io {
            binary,
            source: std::io::Error::other("provider preflight did not return OK"),
        }),
        // User cancelled mid-preflight. The caller's `start-run` flow already treats
        // cancellation as a clean skip, so we propagate as `Ok(())` rather than surface
        // it as a provider error (which would mislead users into running `auth login`).
        ProviderProcessOutcome::Cancelled => Ok(()),
    }
}

/// Whether a preflight response counts as "OK". The prompt asks for the exact
/// uppercase word, but LLMs often add punctuation (`"OK."`, `"OK!"`) or casing
/// variants. Strip non-alphabetic trim chars and match case-insensitively so a
/// harmless formatting tic doesn't block every research run.
fn preflight_output_is_ok(output: &str) -> bool {
    output.split_whitespace().any(|word| {
        word.trim_matches(|c: char| !c.is_alphabetic())
            .eq_ignore_ascii_case("ok")
    })
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

#[cfg(test)]
mod tests {
    use super::preflight_output_is_ok;

    #[test]
    fn preflight_accepts_bare_ok() {
        assert!(preflight_output_is_ok("OK"));
    }

    #[test]
    fn preflight_accepts_ok_with_trailing_punctuation() {
        assert!(preflight_output_is_ok("OK."));
        assert!(preflight_output_is_ok("OK!"));
        assert!(preflight_output_is_ok("OK,"));
    }

    #[test]
    fn preflight_accepts_ok_in_lowercase_or_mixed_case() {
        assert!(preflight_output_is_ok("ok"));
        assert!(preflight_output_is_ok("Ok."));
    }

    #[test]
    fn preflight_accepts_ok_inside_longer_response() {
        // LLM occasionally wraps with whitespace or surrounding words.
        assert!(preflight_output_is_ok("  OK\n"));
        assert!(preflight_output_is_ok("Sure, OK!"));
    }

    #[test]
    fn preflight_rejects_responses_without_ok() {
        assert!(!preflight_output_is_ok(""));
        assert!(!preflight_output_is_ok("ready"));
        assert!(!preflight_output_is_ok("oko"));
    }
}
