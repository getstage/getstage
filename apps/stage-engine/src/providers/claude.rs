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
        stdin: Some(context.request.prompt.clone()),
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
        stdin: Some(context.request.prompt.clone()),
        working_directory: context.request.working_directory.clone(),
    };

    run_provider_process_collect(&context, spec, events, cancel).await
}

fn claude_args(context: &ProviderRunContext) -> Vec<String> {
    let allowed_reads = context
        .request
        .attachments
        .iter()
        .filter_map(|attachment| attachment.local_path.as_ref())
        .map(|path| format!("Read({path})"))
        .collect::<Vec<_>>();
    let tools = if allowed_reads.is_empty() { "" } else { "Read" };
    let mut args = vec![
        "--print".to_string(),
        "--output-format".to_string(),
        "text".to_string(),
        "--no-session-persistence".to_string(),
        "--tools".to_string(),
        tools.to_string(),
        "--permission-mode".to_string(),
        "dontAsk".to_string(),
        "--model".to_string(),
        claude_model_id(&context.request.model_id).to_string(),
    ];

    if !allowed_reads.is_empty() {
        args.push("--allowedTools".to_string());
        args.push(allowed_reads.join(","));
    }

    apply_claude_run_options(&mut args, &context.request.model_options);
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
    use super::{claude_args, claude_model_id};
    use crate::models::providers::ProviderId;
    use crate::models::runs::{RunAttachment, RunAttachmentKind, RunMode, StartRunRequest};
    use crate::providers::adapter::ProviderRunContext;

    fn sample_context(prompt: &str) -> ProviderRunContext {
        ProviderRunContext {
            api_version: "v1",
            run_id: "run-test".to_string(),
            request: StartRunRequest {
                provider_id: ProviderId::Claude,
                model_id: "claude-sonnet".to_string(),
                prompt: prompt.to_string(),
                mode: RunMode::Research,
                context: Default::default(),
                attachments: vec![],
                model_options: vec![],
                working_directory: None,
            },
        }
    }

    #[test]
    fn claude_model_id_should_map_stage_fallback_sonnet_alias() {
        assert_eq!(claude_model_id("claude-sonnet"), "sonnet");
    }

    #[test]
    fn claude_model_id_should_keep_provider_owned_model_ids() {
        assert_eq!(claude_model_id("claude-opus-4-8"), "claude-opus-4-8");
    }

    #[test]
    fn claude_args_should_not_embed_prompt_in_argv() {
        let prompt = "x".repeat(8_192);
        let args = claude_args(&sample_context(&prompt));

        assert!(!args.iter().any(|arg| arg.len() > 256));
        assert!(args.contains(&"--print".to_string()));
        assert!(args.contains(&"sonnet".to_string()));
    }

    #[test]
    fn claude_args_allows_read_for_explicit_attachments() {
        let mut context = sample_context("Critique this layout.");
        context.request.attachments.push(RunAttachment {
            id: "image-1".to_string(),
            kind: RunAttachmentKind::Image,
            name: Some("layout.png".to_string()),
            url: None,
            mime_type: Some("image/png".to_string()),
            local_path: Some("/tmp/layout.png".to_string()),
        });

        let args = claude_args(&context);
        assert!(args.windows(2).any(|pair| pair == ["--tools", "Read"]));
        assert!(
            args.windows(2)
                .any(|pair| pair == ["--allowedTools", "Read(/tmp/layout.png)"])
        );
    }
}
