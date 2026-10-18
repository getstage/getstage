use tokio::sync::watch;

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
    let context = with_available_model(context).await;
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
    let mut context = with_available_model(context).await;
    let result = collect_once(context.clone(), events.clone(), &mut cancel).await;
    // An older CLI that does not know the structured-output flag fails at once; run again
    // without it so the post-run checks and repair pass still apply.
    match result {
        Err(error) if context.request.output_schema.is_some() && rejects_schema_flag(&error) => {
            tracing::warn!(%error, "provider CLI does not support structured output; retrying without it");
            context.request.output_schema = None;
            collect_once(context, events, &mut cancel).await
        }
        result => result,
    }
}

async fn collect_once(
    context: ProviderRunContext,
    events: RunEventSink,
    cancel: &mut watch::Receiver<bool>,
) -> Result<ProviderProcessOutcome, ProviderProcessError> {
    match context.request.provider_id {
        ProviderId::Claude => run_claude_collect(context, events, cancel).await,
        ProviderId::Codex => run_codex_collect(context, events, cancel).await,
    }
}

fn rejects_schema_flag(error: &ProviderProcessError) -> bool {
    let text = error.to_string().to_lowercase();
    (text.contains("--output-schema") || text.contains("--json-schema"))
        && (text.contains("unexpected argument") || text.contains("unknown option"))
}

/// A saved model can disappear from the user's Codex (e.g. `gpt-5.5` is not offered to
/// ChatGPT accounts any more). Rather than fail the run, fall back to Codex's own default.
async fn with_available_model(mut context: ProviderRunContext) -> ProviderRunContext {
    if context.request.provider_id != ProviderId::Codex {
        return context;
    }
    let available = crate::providers::models::current_codex_model_ids().await;
    if let Some(model_id) = codex_fallback_model(&context.request.model_id, &available) {
        tracing::warn!(
            requested = %context.request.model_id,
            "codex model not available for this account; using the Codex default"
        );
        context.request.model_id = model_id.to_string();
    }
    context
}

fn codex_fallback_model(requested: &str, available: &[String]) -> Option<&'static str> {
    let unknown = requested != "codex-default"
        && !available.is_empty()
        && !available.iter().any(|id| id == requested);
    unknown.then_some("codex-default")
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
    use super::{
        ProviderRunContext, codex_fallback_model, rejects_schema_flag, run_provider_collect,
    };
    use crate::providers::process::ProviderProcessError;

    #[test]
    fn old_cli_schema_flag_errors_are_recognised() {
        let error = |message: &str| ProviderProcessError::Io {
            binary: "codex",
            source: std::io::Error::other(message.to_string()),
        };
        assert!(rejects_schema_flag(&error(
            "error: unexpected argument '--output-schema' found"
        )));
        assert!(rejects_schema_flag(&error(
            "error: unknown option '--json-schema'"
        )));
        assert!(!rejects_schema_flag(&error("Codex usage limit reached")));
    }
    use crate::models::providers::ProviderId;
    use crate::models::runs::{RunMode, StartRunRequest};
    use crate::providers::process::ProviderProcessOutcome;
    use crate::runs::RunEventSink;

    /// Live check against the installed Codex CLI (needs `codex login`):
    /// `cargo test live_codex -- --ignored`. A retired model plus the user's own plugins
    /// and MCP servers must still produce an answer.
    #[tokio::test]
    #[ignore]
    async fn live_codex_run_survives_retired_model_and_user_mcp_setup() {
        let context = ProviderRunContext {
            api_version: "v1",
            run_id: "live-test".to_string(),
            request: StartRunRequest {
                provider_id: ProviderId::Codex,
                model_id: "gpt-5.5".to_string(),
                prompt: "Reply with exactly: STAGE_OK".to_string(),
                mode: RunMode::Research,
                context: Default::default(),
                attachments: vec![],
                model_options: vec![],
                working_directory: None,
                output_schema: None,
            },
        };
        let (_cancel, cancel_rx) = tokio::sync::watch::channel(false);
        let outcome = run_provider_collect(context, RunEventSink::detached(), cancel_rx)
            .await
            .expect("codex run");
        let ProviderProcessOutcome::Completed(text) = outcome else {
            panic!("run was cancelled");
        };
        assert!(text.contains("STAGE_OK"), "{text}");
    }

    #[test]
    fn retired_codex_model_falls_back_to_codex_default() {
        let available = vec!["gpt-6.1-sol".to_string(), "gpt-5.6-terra".to_string()];
        assert_eq!(
            codex_fallback_model("gpt-5.5", &available),
            Some("codex-default")
        );
        assert_eq!(codex_fallback_model("gpt-6.1-sol", &available), None);
        assert_eq!(codex_fallback_model("codex-default", &available), None);
        // Unknown catalog: keep the user's choice.
        assert_eq!(codex_fallback_model("gpt-5.5", &[]), None);
    }
}
