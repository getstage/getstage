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
        // Desktop chat/research often runs outside a git checkout (packaged app cwd).
        "--skip-git-repo-check".to_string(),
    ];

    if let Some(working_directory) = context.request.working_directory.as_ref() {
        args.push("--cd".to_string());
        args.push(working_directory.clone());
    }

    if let Some(model_id) =
        resolve_codex_model_id(&context.request.model_id, &context.request.model_options)
            .or_else(|| codex_model_id(&context.request.model_id).map(str::to_string))
    {
        args.push("--model".to_string());
        args.push(model_id);
    }

    for attachment in &context.request.attachments {
        if let Some(local_path) = attachment.local_path.as_ref() {
            args.push("--image".to_string());
            args.push(local_path.clone());
        }
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
    use super::{codex_args, codex_model_id};
    use crate::models::providers::ProviderId;
    use crate::models::runs::{RunAttachment, RunAttachmentKind, RunMode, StartRunRequest};
    use crate::providers::adapter::ProviderRunContext;

    fn sample_context() -> ProviderRunContext {
        ProviderRunContext {
            api_version: "v1",
            run_id: "run-test".to_string(),
            request: StartRunRequest {
                provider_id: ProviderId::Codex,
                model_id: "gpt-5.5".to_string(),
                prompt: "hello".to_string(),
                mode: RunMode::Chat,
                context: Default::default(),
                attachments: vec![],
                model_options: vec![],
                working_directory: None,
            },
        }
    }

    #[test]
    fn codex_args_includes_skip_git_repo_check_for_desktop_runs() {
        let args = codex_args(&sample_context());
        assert!(args.iter().any(|arg| arg == "--skip-git-repo-check"));
    }

    #[test]
    fn codex_args_includes_local_images() {
        let mut context = sample_context();
        context.request.attachments.push(RunAttachment {
            id: "image-1".to_string(),
            kind: RunAttachmentKind::Image,
            name: Some("layout.png".to_string()),
            url: None,
            mime_type: Some("image/png".to_string()),
            local_path: Some("/tmp/layout.png".to_string()),
        });

        let args = codex_args(&context);
        assert!(
            args.windows(2)
                .any(|pair| pair == ["--image", "/tmp/layout.png"])
        );
    }

    #[test]
    fn codex_model_id_should_omit_stage_default_alias() {
        assert_eq!(codex_model_id("codex-default"), None);
    }

    #[test]
    fn codex_model_id_should_keep_provider_owned_model_ids() {
        assert_eq!(codex_model_id("gpt-5.1-codex"), Some("gpt-5.1-codex"));
    }
}
