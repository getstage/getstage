use serde::Serialize;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EngineEvent {
    pub api_version: &'static str,
    pub id: String,
    pub command_id: Option<String>,
    pub job_id: Option<String>,
    #[serde(rename = "type")]
    pub event_type: EngineEventType,
    pub payload: EngineEventPayload,
    pub created_at: u128,
}

#[derive(Debug, Serialize)]
pub enum EngineEventType {
    #[serde(rename = "engine.ready")]
    EngineReady,
    #[serde(rename = "engine.error")]
    EngineError,
}

#[derive(Debug, Serialize)]
#[serde(
    tag = "kind",
    rename_all = "camelCase",
    rename_all_fields = "camelCase"
)]
pub enum EngineEventPayload {
    Ready {
        service: &'static str,
        ready: bool,
        timestamp_ms: u128,
    },
    Error {
        code: &'static str,
        message: String,
        timestamp_ms: u128,
    },
}
