use serde::{Deserialize, Serialize};

use super::errors::EngineError;

#[derive(Clone, Copy, Debug, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum ProviderId {
    Claude,
    Codex,
}

#[derive(Clone, Copy, Debug, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum ProviderKind {
    Cli,
}

#[derive(Clone, Copy, Debug, Deserialize, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum ProviderStatus {
    Ready,
    Missing,
    NotAuthenticated,
    Checking,
    Warning,
    Disabled,
    Error,
}

#[derive(Clone, Copy, Debug, Deserialize, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum ProviderAuthStatus {
    Authenticated,
    NotAuthenticated,
    Unknown,
}

#[derive(Clone, Copy, Debug, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum ProviderModelSource {
    Provider,
    Fallback,
    Custom,
    Unknown,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderOptionChoice {
    pub id: String,
    pub label: String,
    pub description: Option<String>,
    pub is_default: Option<bool>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(
    tag = "type",
    rename_all = "lowercase",
    rename_all_fields = "camelCase"
)]
pub enum ProviderOptionDescriptor {
    Select {
        id: String,
        label: String,
        description: Option<String>,
        options: Vec<ProviderOptionChoice>,
        current_value: Option<String>,
    },
    Boolean {
        id: String,
        label: String,
        description: Option<String>,
        current_value: Option<bool>,
    },
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderModel {
    pub id: String,
    pub label: String,
    pub source: ProviderModelSource,
    pub is_default: Option<bool>,
    #[serde(default)]
    pub options: Vec<ProviderOptionDescriptor>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderStatusRecord {
    pub id: ProviderId,
    pub label: String,
    pub kind: ProviderKind,
    pub installed: bool,
    pub authenticated: bool,
    pub auth_status: ProviderAuthStatus,
    pub enabled: bool,
    pub version: Option<String>,
    pub status: ProviderStatus,
    pub checked_at: u128,
    pub models: Vec<ProviderModel>,
    pub setup_hint: Option<String>,
    pub message: Option<String>,
    pub error: Option<EngineError>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderListResponse {
    pub api_version: &'static str,
    pub providers: Vec<ProviderStatusRecord>,
}
