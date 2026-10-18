use tokio::sync::watch;

use crate::helpers::time::now_millis;
use crate::models::runs::RunEvent;
use crate::providers::adapter::ProviderRunContext;
use crate::providers::process::{
    ProviderProcessError, ProviderProcessOutcome, ProviderProcessSpec, run_provider_process,
    run_provider_process_collect,
};
use crate::providers::run_model_options::{apply_codex_run_options, resolve_codex_model_id};
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
    let mut args = vec!["--ask-for-approval".to_string(), "never".to_string()];

    if research_web_search_enabled(context) {
        args.push("--search".to_string());
    }

    args.extend([
        "exec".to_string(),
        "--color".to_string(),
        "never".to_string(),
        "--sandbox".to_string(),
        "read-only".to_string(),
        // Desktop chat/research often runs outside a git checkout (packaged app cwd).
        "--skip-git-repo-check".to_string(),
    ]);

    // Config overrides and ephemeral belong on `codex exec`, not the parent command.
    args.extend(codex_isolation_args(read_codex_user_config().as_deref()));
    apply_codex_run_options(&mut args, &context.request.model_options);
    if context.request.mode == crate::models::runs::RunMode::Research {
        args.push("--ephemeral".to_string());
    }

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

/// Stage runs must not depend on the user's own Codex setup: a plugin or MCP server that
/// needs sign-in (e.g. Firecrawl) prints auth errors that used to surface as "Codex is not
/// logged in". Plugins are switched off and every `[mcp_servers.<name>]` in the user's
/// config.toml is disabled for this run only; their config file is never modified.
fn codex_isolation_args(user_config: Option<&str>) -> Vec<String> {
    let mut args = vec!["-c".to_string(), "features.plugins=false".to_string()];
    let mut names: Vec<&str> = Vec::new();
    for line in user_config.unwrap_or_default().lines() {
        let Some(name) = line
            .trim()
            .strip_prefix("[mcp_servers.")
            .and_then(|rest| rest.split(['.', ']']).next())
        else {
            continue;
        };
        let safe = !name.is_empty()
            && name.len() <= 64
            && name
                .bytes()
                .all(|byte| byte.is_ascii_alphanumeric() || byte == b'_' || byte == b'-');
        if safe && !names.contains(&name) {
            names.push(name);
        }
    }
    for name in names {
        args.push("-c".to_string());
        args.push(format!("mcp_servers.{name}.enabled=false"));
    }
    args
}

fn read_codex_user_config() -> Option<String> {
    let home = std::env::var_os("CODEX_HOME")
        .map(std::path::PathBuf::from)
        .or_else(|| {
            std::env::var_os("HOME")
                .or_else(|| std::env::var_os("USERPROFILE"))
                .map(|home| std::path::PathBuf::from(home).join(".codex"))
        })?;
    let text = std::fs::read_to_string(home.join("config.toml")).ok()?;
    (text.len() <= 1024 * 1024).then_some(text)
}

fn research_web_search_enabled(context: &ProviderRunContext) -> bool {
    context.request.mode == crate::models::runs::RunMode::Research
        && !matches!(
            context.request.context.source.as_deref(),
            Some(
                "provider-preflight"
                    | "research-opportunities"
                    | "research-context"
                    | "research-synthesis"
                    | "research-repair"
                    | "section:opportunities"
            )
        )
}

fn codex_model_id(model_id: &str) -> Option<&str> {
    match model_id {
        "codex-default" => None,
        other if crate::providers::models::is_safe_provider_model_id(other) => Some(other),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::{codex_args, codex_isolation_args, codex_model_id};
    use crate::models::providers::ProviderId;
    use crate::models::runs::{
        RunAttachment, RunAttachmentKind, RunMode, RunModelOptionSelection, RunModelOptionValue,
        StartRunRequest,
    };
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

    #[test]
    fn codex_research_enables_live_web_search() {
        let mut context = sample_context();
        context.request.mode = RunMode::Research;
        let args = codex_args(&context);
        assert!(args.contains(&"--search".to_string()));
        assert!(args.contains(&"--ephemeral".to_string()));
    }

    #[test]
    fn codex_research_applies_fast_run_options() {
        let mut context = sample_context();
        context.request.mode = RunMode::Research;
        context.request.model_options = vec![RunModelOptionSelection {
            id: "response_speed".to_string(),
            value: RunModelOptionValue::String("fast".to_string()),
        }];

        let args = codex_args(&context);
        assert!(
            args.windows(2)
                .any(|pair| { pair[0] == "-c" && pair[1] == "model_reasoning_effort=\"low\"" })
        );
        assert!(
            args.windows(2)
                .any(|pair| pair[0] == "-c" && pair[1] == "model_verbosity=\"low\"")
        );
    }

    #[test]
    fn codex_opportunities_pass_disables_live_web_search() {
        let mut context = sample_context();
        context.request.mode = RunMode::Research;
        context.request.context.source = Some("section:opportunities".to_string());
        let args = codex_args(&context);
        assert!(!args.contains(&"--search".to_string()));
    }

    #[test]
    fn codex_context_and_synthesis_jobs_disable_live_web_search() {
        for source in ["research-context", "research-synthesis"] {
            let mut context = sample_context();
            context.request.mode = RunMode::Research;
            context.request.context.source = Some(source.to_string());
            let args = codex_args(&context);
            assert!(
                !args.contains(&"--search".to_string()),
                "{source} should not enable web search"
            );
        }
    }

    #[test]
    fn codex_competitive_evidence_job_enables_live_web_search() {
        let mut context = sample_context();
        context.request.mode = RunMode::Research;
        context.request.context.source = Some("research-web-evidence".to_string());
        let args = codex_args(&context);
        assert!(args.contains(&"--search".to_string()));
    }

    #[test]
    fn codex_runs_switch_off_plugins_and_user_mcp_servers() {
        let config = "model = \"gpt-6\"\n[mcp_servers.firecrawl]\nurl = \"https://mcp.firecrawl.dev/v2/mcp\"\n[mcp_servers.railway]\ncommand = \"railway\"\n[mcp_servers.railway.env]\nA = \"1\"\n[mcp_servers.\"bad name\"]\n";
        assert_eq!(
            codex_isolation_args(Some(config)),
            [
                "-c",
                "features.plugins=false",
                "-c",
                "mcp_servers.firecrawl.enabled=false",
                "-c",
                "mcp_servers.railway.enabled=false",
            ]
        );
        assert_eq!(codex_isolation_args(None), ["-c", "features.plugins=false"]);
    }

    #[test]
    fn codex_isolation_args_come_after_exec() {
        let args = codex_args(&sample_context());
        let exec = args.iter().position(|arg| arg == "exec").unwrap();
        let plugins = args
            .iter()
            .position(|arg| arg == "features.plugins=false")
            .unwrap();
        assert!(plugins > exec);
    }
}
