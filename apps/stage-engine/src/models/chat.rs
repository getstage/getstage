use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatProjectContext {
    pub api_version: String,
    pub project: ChatProject,
    pub brief: Option<String>,
    pub notes: Option<String>,
    pub phases: Vec<ChatPhase>,
    pub tasks: Vec<ChatTask>,
    pub artifacts: Vec<ChatArtifact>,
    pub omitted: ChatOmittedCounts,
    pub updated_at: u64,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatProject {
    pub project_id: String,
    pub project_name: String,
    pub client_name: String,
    pub status: String,
    pub updated_at: u64,
    pub r#type: String,
    pub progress: f64,
    pub start_date: u64,
    pub end_date: u64,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatPhase {
    pub id: String,
    pub name: String,
    pub status: String,
    pub progress: f64,
    pub task_count: u64,
    pub included_task_count: u64,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatTask {
    pub id: String,
    pub phase_id: String,
    pub phase_name: String,
    pub title: String,
    pub status: String,
    pub summary: Option<String>,
    pub priority: Option<String>,
    pub due_date: Option<u64>,
    pub updated_at: u64,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatArtifact {
    pub id: String,
    pub module: String,
    pub kind: String,
    pub title: String,
    pub summary: Option<String>,
    pub status: String,
    pub excerpt: Option<String>,
    pub updated_at: u64,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct ChatOmittedCounts {
    pub phases: u64,
    pub tasks: u64,
    pub artifacts: u64,
}
