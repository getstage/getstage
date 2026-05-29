use crate::models::providers::{ProviderId, ProviderModel, ProviderModelSource};

#[derive(Clone, Copy)]
pub struct AuthFileSpec {
    pub env_home: Option<&'static str>,
    pub relative_path: &'static str,
}

#[derive(Clone, Copy)]
pub struct ProviderRuntimeSpec {
    pub id: ProviderId,
    pub label: &'static str,
    pub binary: &'static str,
    pub version_args: &'static [&'static str],
    pub update_args: &'static [&'static str],
    pub auth_files: &'static [AuthFileSpec],
    pub setup_hint: &'static str,
    pub update_hint: &'static str,
}

pub fn all_provider_specs() -> [ProviderRuntimeSpec; 2] {
    [CLAUDE_SPEC, CODEX_SPEC]
}

pub fn spec_by_route_id(provider_id: &str) -> Option<ProviderRuntimeSpec> {
    match provider_id {
        "claude" => Some(CLAUDE_SPEC),
        "codex" => Some(CODEX_SPEC),
        _ => None,
    }
}

pub fn fallback_models(provider_id: ProviderId) -> Vec<ProviderModel> {
    match provider_id {
        ProviderId::Claude => vec![
            ProviderModel {
                id: "claude-sonnet".to_string(),
                label: "Claude Sonnet".to_string(),
                source: ProviderModelSource::Fallback,
                is_default: Some(true),
                options: Vec::new(),
            },
            ProviderModel {
                id: "claude-opus".to_string(),
                label: "Claude Opus".to_string(),
                source: ProviderModelSource::Fallback,
                is_default: None,
                options: Vec::new(),
            },
        ],
        ProviderId::Codex => vec![ProviderModel {
            id: "codex-default".to_string(),
            label: "Codex Default".to_string(),
            source: ProviderModelSource::Fallback,
            is_default: Some(true),
            options: Vec::new(),
        }],
    }
}

const CLAUDE_SPEC: ProviderRuntimeSpec = ProviderRuntimeSpec {
    id: ProviderId::Claude,
    label: "Claude",
    binary: "claude",
    version_args: &["--version"],
    update_args: &["update"],
    auth_files: &[
        AuthFileSpec {
            env_home: None,
            relative_path: ".claude/.credentials.json",
        },
        AuthFileSpec {
            env_home: None,
            relative_path: ".claude.json",
        },
    ],
    setup_hint: "Install Claude Code and run `claude auth login`.",
    update_hint: "Runs `claude update` when requested.",
};

const CODEX_SPEC: ProviderRuntimeSpec = ProviderRuntimeSpec {
    id: ProviderId::Codex,
    label: "Codex",
    binary: "codex",
    version_args: &["--version"],
    update_args: &["--upgrade"],
    auth_files: &[
        AuthFileSpec {
            env_home: Some("CODEX_HOME"),
            relative_path: "auth.json",
        },
        AuthFileSpec {
            env_home: None,
            relative_path: ".codex/auth.json",
        },
    ],
    setup_hint: "Install Codex CLI and run `codex login`.",
    update_hint: "Runs `codex --upgrade` when requested.",
};
