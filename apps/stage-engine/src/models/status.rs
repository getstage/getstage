use serde::Serialize;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HealthResponse {
    pub api_version: &'static str,
    pub service: &'static str,
    pub status: ServiceStatus,
    pub timestamp_ms: u128,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReadinessResponse {
    pub api_version: &'static str,
    pub service: &'static str,
    pub ready: bool,
    pub checks: ReadinessChecks,
    pub timestamp_ms: u128,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReadinessChecks {
    pub server_started: bool,
    pub provider_runtime_ready: bool,
    pub websocket_ready: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VersionResponse {
    pub api_version: &'static str,
    pub service: &'static str,
    pub version: &'static str,
    pub rust_edition: &'static str,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum ServiceStatus {
    Ok,
}
