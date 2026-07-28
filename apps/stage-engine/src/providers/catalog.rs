use crate::models::providers::{
    ProviderId, ProviderModel, ProviderModelSource, ProviderOptionChoice, ProviderOptionDescriptor,
};

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
            claude_fallback_model("claude-opus-5", "Claude Opus 5", Some(true)),
            claude_fallback_model("claude-fable-5", "Claude Fable 5", None),
            claude_fallback_model("claude-sonnet-5", "Claude Sonnet 5", None),
            claude_fallback_model("claude-opus-4.8", "Claude Opus 4.8", None),
            claude_fallback_model("claude-haiku-4.5", "Claude Haiku 4.5", None),
            claude_fallback_model("claude-sonnet-4.6", "Claude Sonnet 4.6", None),
            claude_fallback_model("claude-opus-4.7", "Claude Opus 4.7", None),
        ],
        ProviderId::Codex => vec![
            codex_fallback_model("gpt-5.6-sol", "GPT-5.6 Sol", None),
            codex_fallback_model("gpt-5.6-terra", "GPT-5.6 Terra", None),
            codex_fallback_model("gpt-5.6-luna", "GPT-5.6 Luna", None),
            codex_fallback_model("gpt-5.5", "GPT-5.5", Some(true)),
            ProviderModel {
                id: "codex-default".to_string(),
                label: "Codex Default".to_string(),
                source: ProviderModelSource::Fallback,
                is_default: None,
                options: Vec::new(),
            },
        ],
    }
}

fn claude_fallback_model(id: &str, label: &str, is_default: Option<bool>) -> ProviderModel {
    ProviderModel {
        id: id.to_string(),
        label: label.to_string(),
        source: ProviderModelSource::Fallback,
        is_default,
        options: vec![ProviderOptionDescriptor::Select {
            id: "reasoning_effort".to_string(),
            label: "Reasoning effort".to_string(),
            description: None,
            options: vec![
                effort_choice("low", "Low", false),
                effort_choice("medium", "Medium", true),
                effort_choice("high", "High", false),
                effort_choice("extra-high", "Extra High", false),
            ],
            current_value: Some("medium".to_string()),
        }],
    }
}

fn codex_fallback_model(id: &str, label: &str, is_default: Option<bool>) -> ProviderModel {
    ProviderModel {
        id: id.to_string(),
        label: label.to_string(),
        source: ProviderModelSource::Fallback,
        is_default,
        options: Vec::new(),
    }
}

fn effort_choice(id: &str, label: &str, is_default: bool) -> ProviderOptionChoice {
    ProviderOptionChoice {
        id: id.to_string(),
        label: label.to_string(),
        description: None,
        is_default: is_default.then_some(true),
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
    update_args: &["update"],
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
    setup_hint: "Install Codex CLI, run `codex`, and sign in with ChatGPT.",
    update_hint: "Runs `codex update` when requested.",
};
