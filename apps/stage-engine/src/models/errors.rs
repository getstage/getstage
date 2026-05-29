use serde::{Deserialize, Serialize};

use super::providers::ProviderId;

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum EngineErrorCode {
    MissingBinary,
    VersionTimeout,
    NotAuthenticated,
    ReadinessFailed,
    InvalidRequest,
    RunSpawnFailed,
    RunTimeout,
    RunCancelled,
    ProviderProcessFailed,
    IoError,
    InternalError,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EngineError {
    pub code: EngineErrorCode,
    pub message: String,
    pub provider_id: Option<ProviderId>,
    pub retryable: bool,
    pub detail: Option<String>,
}
