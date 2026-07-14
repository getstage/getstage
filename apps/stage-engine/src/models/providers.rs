use serde::{Deserialize, Serialize};

use super::errors::EngineError;

#[derive(Clone, Copy, Debug, Deserialize, Eq, Hash, PartialEq, Serialize)]
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

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
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

#[derive(Clone, Copy, Debug, Deserialize, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum ProviderUpdateStatus {
    Idle,
    Checking,
    Updating,
    Updated,
    Failed,
    Unsupported,
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
    pub auth_label: Option<String>,
    pub account_email: Option<String>,
    pub enabled: bool,
    pub version: Option<String>,
    pub status: ProviderStatus,
    pub update_available: Option<bool>,
    pub update_status: ProviderUpdateStatus,
    pub update_hint: Option<String>,
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

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderUpdateResponse {
    pub api_version: &'static str,
    pub provider_id: ProviderId,
    pub status: ProviderUpdateStatus,
    pub version_before: Option<String>,
    pub version_after: Option<String>,
    pub message: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub command: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub output: Option<String>,
    pub error: Option<EngineError>,
}
