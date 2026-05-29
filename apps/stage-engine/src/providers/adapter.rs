use tokio::sync::watch;
use tokio::time::{Duration, sleep};

use crate::helpers::time::now_millis;
use crate::models::errors::{EngineError, EngineErrorCode};
use crate::models::providers::ProviderId;
use crate::models::runs::{RunEvent, RunMode, StartRunRequest};
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
    run_fake_stream(context, events, &mut cancel).await;
}

async fn run_fake_stream(
    context: ProviderRunContext,
    events: RunEventSink,
    cancel: &mut watch::Receiver<bool>,
) {
    events.send(started_event(&context));

    let provider_label = match context.request.provider_id {
        ProviderId::Claude => "Claude",
        ProviderId::Codex => "Codex",
    };

    let chunks = [
        format!("{provider_label} run pipeline is connected. "),
        "This is the typed streamed run boundary: ".to_string(),
        "React -> Electron -> Stage Engine -> provider adapter. ".to_string(),
        format!("Mode: {}. ", mode_label(context.request.mode)),
        "Next adapter swap: replace this fake stream with the real CLI child process.".to_string(),
    ];

    let mut final_text = String::new();
    for chunk in chunks {
        tokio::select! {
            _ = cancel.changed() => {
                events.send(cancelled_event(&context, Some("Run cancelled by user.".to_string())));
                return;
            }
            _ = sleep(Duration::from_millis(180)) => {
                final_text.push_str(&chunk);
                events.send(RunEvent::OutputDelta {
                    api_version: context.api_version,
                    run_id: context.run_id.clone(),
                    provider_id: context.request.provider_id,
                    created_at: now_millis(),
                    text: chunk,
                });
            }
        }
    }

    events.send(RunEvent::RunCompleted {
        api_version: context.api_version,
        run_id: context.run_id,
        provider_id: context.request.provider_id,
        created_at: now_millis(),
        final_text: Some(final_text),
    });
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

fn started_event(context: &ProviderRunContext) -> RunEvent {
    RunEvent::RunStarted {
        api_version: context.api_version,
        run_id: context.run_id.clone(),
        provider_id: context.request.provider_id,
        created_at: now_millis(),
        model_id: context.request.model_id.clone(),
        mode: context.request.mode,
    }
}

fn cancelled_event(context: &ProviderRunContext, reason: Option<String>) -> RunEvent {
    RunEvent::RunCancelled {
        api_version: context.api_version,
        run_id: context.run_id.clone(),
        provider_id: context.request.provider_id,
        created_at: now_millis(),
        reason,
    }
}

fn mode_label(mode: RunMode) -> &'static str {
    match mode {
        RunMode::Chat => "chat",
        RunMode::Voice => "voice",
        RunMode::Research => "research",
        RunMode::Generation => "generation",
        RunMode::Critique => "critique",
        RunMode::Styleguide => "styleguide",
    }
}
