use axum::{Json, extract::State};

use crate::app::AppState;
use crate::helpers::time::now_millis;
use crate::models::providers::{
    ProviderAuthStatus, ProviderId, ProviderKind, ProviderListResponse, ProviderModel,
    ProviderModelSource, ProviderStatus, ProviderStatusRecord,
};

pub async fn list_providers(State(state): State<AppState>) -> Json<ProviderListResponse> {
    Json(provider_snapshot(state.api_version))
}

pub async fn refresh_providers(State(state): State<AppState>) -> Json<ProviderListResponse> {
    Json(provider_snapshot(state.api_version))
}

fn provider_snapshot(api_version: &'static str) -> ProviderListResponse {
    let checked_at = now_millis();

    ProviderListResponse {
        api_version,
        providers: vec![
            ProviderStatusRecord {
                id: ProviderId::Claude,
                label: "Claude".to_string(),
                kind: ProviderKind::Cli,
                installed: false,
                authenticated: false,
                auth_status: ProviderAuthStatus::Unknown,
                enabled: true,
                version: None,
                status: ProviderStatus::Checking,
                checked_at,
                models: vec![
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
                setup_hint: Some("Install Claude Code and run `claude auth login`.".to_string()),
                message: Some("Provider detection is not implemented yet.".to_string()),
                error: None,
            },
            ProviderStatusRecord {
                id: ProviderId::Codex,
                label: "Codex".to_string(),
                kind: ProviderKind::Cli,
                installed: false,
                authenticated: false,
                auth_status: ProviderAuthStatus::Unknown,
                enabled: true,
                version: None,
                status: ProviderStatus::Checking,
                checked_at,
                models: vec![ProviderModel {
                    id: "codex-default".to_string(),
                    label: "Codex Default".to_string(),
                    source: ProviderModelSource::Fallback,
                    is_default: Some(true),
                    options: Vec::new(),
                }],
                setup_hint: Some("Install Codex CLI and run `codex login`.".to_string()),
                message: Some("Provider detection is not implemented yet.".to_string()),
                error: None,
            },
        ],
    }
}
