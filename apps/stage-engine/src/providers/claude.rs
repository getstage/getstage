use tokio::sync::watch;

use crate::models::runs::RunEvent;
use crate::providers::adapter::ProviderRunContext;
use crate::providers::process::{
    ProviderProcessError, ProviderProcessOutcome, ProviderProcessSpec, run_provider_process,
    run_provider_process_collect,
};
use crate::providers::run_model_options::apply_claude_run_options;
use crate::runs::RunEventSink;

pub async fn run_claude(
    context: ProviderRunContext,
    events: RunEventSink,
    cancel: &mut watch::Receiver<bool>,
) {
    events.send(RunEvent::RunStarted {
        api_version: context.api_version,
        run_id: context.run_id.clone(),
        provider_id: context.request.provider_id,
        created_at: crate::helpers::time::now_millis(),
        model_id: context.request.model_id.clone(),
        mode: context.request.mode,
    });

    let spec = ProviderProcessSpec {
        binary: "claude",
        args: claude_args(&context),
        stdin: None,
        working_directory: context.request.working_directory.clone(),
    };

    run_provider_process(context, spec, events, cancel).await;
}

pub async fn run_claude_collect(
    context: ProviderRunContext,
    events: RunEventSink,
    cancel: &mut watch::Receiver<bool>,
) -> Result<ProviderProcessOutcome, ProviderProcessError> {
    events.send(RunEvent::RunStarted {
        api_version: context.api_version,
        run_id: context.run_id.clone(),
        provider_id: context.request.provider_id,
        created_at: crate::helpers::time::now_millis(),
        model_id: context.request.model_id.clone(),
        mode: context.request.mode,
    });

    let spec = ProviderProcessSpec {
        binary: "claude",
        args: claude_args(&context),
        stdin: None,
        working_directory: context.request.working_directory.clone(),
    };

    run_provider_process_collect(&context, spec, events, cancel).await
}

fn claude_args(context: &ProviderRunContext) -> Vec<String> {
    let mut args = vec![
        "--print".to_string(),
        "--output-format".to_string(),
        "text".to_string(),
        "--no-session-persistence".to_string(),
        "--tools".to_string(),
        String::new(),
        "--model".to_string(),
        claude_model_id(&context.request.model_id).to_string(),
    ];

    apply_claude_run_options(&mut args, &context.request.model_options);
    args.push(context.request.prompt.clone());
    args
}

fn claude_model_id(model_id: &str) -> &str {
    match model_id {
        "claude-sonnet" => "sonnet",
        "claude-opus" => "opus",
        other => other,
    }
}

#[cfg(test)]
mod tests {
    use super::claude_model_id;

    #[test]
    fn claude_model_id_should_map_stage_fallback_sonnet_alias() {
        assert_eq!(claude_model_id("claude-sonnet"), "sonnet");
    }

    #[test]
    fn claude_model_id_should_keep_provider_owned_model_ids() {
        assert_eq!(claude_model_id("claude-opus-4-8"), "claude-opus-4-8");
    }
}
