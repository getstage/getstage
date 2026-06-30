use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateFigmaExportRequest {
    pub project_id: String,
    pub artifact_id: String,
    pub screen_id: String,
    #[serde(default)]
    pub hifi_preview_data_url: Option<String>,
    #[serde(default)]
    pub hifi_preview_width: Option<u16>,
    #[serde(default)]
    pub hifi_preview_height: Option<u16>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateFigmaExportResponse {
    pub api_version: &'static str,
    pub job_id: String,
    pub pairing_code: String,
    pub expires_at: u128,
    pub status: String,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WireframeArtifactRecord {
    pub id: String,
    pub content_json: Option<String>,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WireframesArtifact {
    pub generated_screens: Vec<GeneratedScreen>,
}

#[derive(Clone, Debug, Deserialize)]
pub struct GeneratedScreen {
    pub id: String,
    pub title: String,
    #[serde(default)]
    pub sections: Vec<GeneratedSection>,
    // Hi-Fi source of truth: a self-contained HTML fragment rendering the final
    // design. Absent for Lo-Fi screens, which compile from `sections`/`blocks`.
    #[serde(default)]
    pub html: Option<String>,
}

#[derive(Clone, Debug, Deserialize)]
pub struct GeneratedSection {
    pub id: String,
    pub title: String,
    #[serde(default)]
    pub blocks: Vec<GeneratedBlock>,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GeneratedBlock {
    pub id: String,
    pub kind: String,
    pub intent: String,
    #[serde(default)]
    pub copy_slots: std::collections::BTreeMap<String, String>,
    pub emphasis: String,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FigmaWritePlan {
    pub api_version: &'static str,
    pub kind: &'static str,
    pub name: String,
    pub width: u16,
    pub sections: Vec<FigmaWriteSection>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HifiFigmaWritePlan {
    pub api_version: &'static str,
    pub kind: &'static str,
    pub name: String,
    pub width: u16,
    pub height: u16,
    pub image_url: String,
}

#[derive(Clone, Debug, Serialize)]
#[serde(untagged)]
pub enum WireframeFigmaWritePlan {
    Lofi(FigmaWritePlan),
    Hifi(HifiFigmaWritePlan),
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateFigJamExportRequest {
    pub project_id: String,
    pub artifact_id: String,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FlowsArtifact {
    pub title: String,
    #[serde(default)]
    pub flows: Vec<Flow>,
}

#[derive(Clone, Debug, Deserialize)]
pub struct Flow {
    pub id: String,
    pub title: String,
    pub description: String,
    #[serde(default)]
    pub steps: Vec<FlowStep>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct FlowStep {
    pub id: String,
    pub label: String,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FigJamWritePlan {
    pub api_version: &'static str,
    pub kind: &'static str,
    pub name: String,
    pub flows: Vec<FigJamWriteFlow>,
}

#[derive(Clone, Debug, Serialize)]
pub struct FigJamWriteFlow {
    pub id: String,
    pub title: String,
    pub description: String,
    pub steps: Vec<FlowStep>,
}

#[derive(Clone, Debug, Serialize)]
pub struct FigmaWriteSection {
    pub id: String,
    pub title: String,
    pub blocks: Vec<FigmaWriteBlock>,
}

#[derive(Clone, Debug, Serialize)]
pub struct FigmaWriteBlock {
    pub id: String,
    pub kind: String,
    pub label: String,
    pub height: u16,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateJobResult {
    pub job_id: String,
    pub status: String,
}

#[derive(Clone, Debug)]
pub struct CreateJobInput {
    pub project_id: String,
    pub artifact_id: String,
    pub screen_id: String,
    pub write_plan_json: String,
    pub pairing_code_hash: String,
    pub pairing_expires_at: u128,
    pub export_kind: &'static str,
}
