#![allow(dead_code)]
// Contract mirror for the upcoming /v1/runs API. The endpoint lands after the
// provider status boundary, but the wire types are defined first.

use serde::{Deserialize, Serialize};

use super::errors::EngineError;
use super::providers::{ProviderId, ProviderOptionChoice};

#[derive(Clone, Copy, Debug, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum RunMode {
    Chat,
    Voice,
    Research,
    Generation,
    Critique,
    Styleguide,
}

#[derive(Clone, Copy, Debug, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum RunStatus {
    Accepted,
    Started,
    Running,
    Completed,
    Failed,
    Cancelled,
}

#[derive(Clone, Debug, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RunContext {
    pub project_id: Option<String>,
    pub direction_id: Option<String>,
    pub phase_id: Option<String>,
    pub task_id: Option<String>,
    pub source: Option<String>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(untagged)]
pub enum RunModelOptionValue {
    String(String),
    Boolean(bool),
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RunModelOptionSelection {
    pub id: String,
    pub value: RunModelOptionValue,
}

#[derive(Clone, Copy, Debug, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum RunAttachmentKind {
    Image,
    Document,
    Figma,
    Url,
    Audio,
    Other,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RunAttachment {
    pub id: String,
    pub kind: RunAttachmentKind,
    pub name: Option<String>,
    pub url: Option<String>,
    pub mime_type: Option<String>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StartRunRequest {
    pub provider_id: ProviderId,
    pub model_id: String,
    #[serde(default)]
    pub model_options: Vec<RunModelOptionSelection>,
    pub working_directory: Option<String>,
    pub prompt: String,
    pub mode: RunMode,
    #[serde(default)]
    pub context: RunContext,
    #[serde(default)]
    pub attachments: Vec<RunAttachment>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StartRunResponse {
    pub api_version: &'static str,
    pub run_id: String,
    pub status: RunStatus,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(
    tag = "type",
    rename_all = "snake_case",
    rename_all_fields = "camelCase"
)]
pub enum RunEvent {
    RunStarted {
        api_version: &'static str,
        run_id: String,
        provider_id: ProviderId,
        created_at: u128,
        model_id: String,
        mode: RunMode,
    },
    OutputDelta {
        api_version: &'static str,
        run_id: String,
        provider_id: ProviderId,
        created_at: u128,
        text: String,
    },
    ToolCallStarted {
        api_version: &'static str,
        run_id: String,
        provider_id: ProviderId,
        created_at: u128,
        tool_call_id: String,
        label: String,
    },
    ToolCallDelta {
        api_version: &'static str,
        run_id: String,
        provider_id: ProviderId,
        created_at: u128,
        tool_call_id: String,
        text: String,
    },
    ToolCallCompleted {
        api_version: &'static str,
        run_id: String,
        provider_id: ProviderId,
        created_at: u128,
        tool_call_id: String,
        status: RunStatus,
    },
    FileReference {
        api_version: &'static str,
        run_id: String,
        provider_id: ProviderId,
        created_at: u128,
        path: String,
        line: Option<u64>,
    },
    ProviderWarning {
        api_version: &'static str,
        run_id: String,
        provider_id: ProviderId,
        created_at: u128,
        message: String,
    },
    ModelRerouted {
        api_version: &'static str,
        run_id: String,
        provider_id: ProviderId,
        created_at: u128,
        from_model_id: String,
        to_model_id: String,
        reason: Option<String>,
    },
    ModelOptions {
        api_version: &'static str,
        run_id: String,
        provider_id: ProviderId,
        created_at: u128,
        options: Vec<ProviderOptionChoice>,
    },
    RunCompleted {
        api_version: &'static str,
        run_id: String,
        provider_id: ProviderId,
        created_at: u128,
        final_text: Option<String>,
    },
    RunFailed {
        api_version: &'static str,
        run_id: String,
        provider_id: ProviderId,
        created_at: u128,
        error: EngineError,
    },
    RunCancelled {
        api_version: &'static str,
        run_id: String,
        provider_id: ProviderId,
        created_at: u128,
        reason: Option<String>,
    },
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CancelRunResponse {
    pub api_version: &'static str,
    pub run_id: String,
    pub status: RunStatus,
}
