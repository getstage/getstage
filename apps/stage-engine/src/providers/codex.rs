use tokio::sync::watch;

use crate::helpers::time::now_millis;
use crate::models::runs::RunEvent;
use crate::providers::adapter::ProviderRunContext;
use crate::providers::process::{
    ProviderProcessError, ProviderProcessOutcome, ProviderProcessSpec, run_provider_process,
    run_provider_process_collect,
};
use crate::providers::run_model_options::resolve_codex_model_id;
use crate::runs::RunEventSink;

pub async fn run_codex(
    context: ProviderRunContext,
    events: RunEventSink,
    cancel: &mut watch::Receiver<bool>,
) {
    events.send(RunEvent::RunStarted {
        api_version: context.api_version,
        run_id: context.run_id.clone(),
        provider_id: context.request.provider_id,
        created_at: now_millis(),
        model_id: context.request.model_id.clone(),
        mode: context.request.mode,
    });

    let spec = ProviderProcessSpec {
        binary: "codex",
        args: codex_args(&context),
        stdin: Some(context.request.prompt.clone()),
        working_directory: None,
    };

    run_provider_process(context, spec, events, cancel).await;
}

pub async fn run_codex_collect(
    context: ProviderRunContext,
    events: RunEventSink,
    cancel: &mut watch::Receiver<bool>,
) -> Result<ProviderProcessOutcome, ProviderProcessError> {
    events.send(RunEvent::RunStarted {
        api_version: context.api_version,
        run_id: context.run_id.clone(),
        provider_id: context.request.provider_id,
        created_at: now_millis(),
        model_id: context.request.model_id.clone(),
        mode: context.request.mode,
    });

    let spec = ProviderProcessSpec {
        binary: "codex",
        args: codex_args(&context),
        stdin: Some(context.request.prompt.clone()),
        working_directory: None,
    };

    run_provider_process_collect(&context, spec, events, cancel).await
}

fn codex_args(context: &ProviderRunContext) -> Vec<String> {
    let mut args = vec![
        "--ask-for-approval".to_string(),
        "never".to_string(),
        "exec".to_string(),
        "--color".to_string(),
        "never".to_string(),
        "--sandbox".to_string(),
        "read-only".to_string(),
    ];

    if let Some(working_directory) = context.request.working_directory.as_ref() {
        args.push("--cd".to_string());
        args.push(working_directory.clone());
    }

    if let Some(model_id) = resolve_codex_model_id(&context.request.model_id, &context.request.model_options)
        .or_else(|| codex_model_id(&context.request.model_id).map(str::to_string))
    {
        args.push("--model".to_string());
        args.push(model_id);
    }

    args
}

fn codex_model_id(model_id: &str) -> Option<&str> {
    match model_id {
        "codex-default" => None,
        other => Some(other),
    }
}

#[cfg(test)]
mod tests {
    use super::codex_model_id;

    #[test]
    fn codex_model_id_should_omit_stage_default_alias() {
        assert_eq!(codex_model_id("codex-default"), None);
    }

    #[test]
    fn codex_model_id_should_keep_provider_owned_model_ids() {
        assert_eq!(codex_model_id("gpt-5.1-codex"), Some("gpt-5.1-codex"));
    }
}
