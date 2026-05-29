use serde::Deserialize;
use serde_json::Value;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EngineCommand {
    pub api_version: String,
    pub id: String,
    #[serde(rename = "type")]
    pub command_type: EngineCommandType,
    #[allow(dead_code)]
    pub payload: Option<Value>,
    #[allow(dead_code)]
    pub created_at: u128,
}

#[derive(Debug, Deserialize)]
pub enum EngineCommandType {
    #[serde(rename = "engine.ping")]
    EnginePing,
}
