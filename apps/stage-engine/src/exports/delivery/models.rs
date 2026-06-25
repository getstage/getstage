use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WireframeDeliveryRequest {
    pub project_id: String,
    pub artifact_id: String,
    pub screen_id: String,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CodeExportResponse {
    pub api_version: &'static str,
    pub suggested_directory_name: String,
    pub files: Vec<CodeExportFile>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CodeExportFile {
    pub relative_path: String,
    pub content: String,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PaperExportResponse {
    pub api_version: &'static str,
    pub status: &'static str,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub artboard_id: Option<String>,
    pub message: String,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PaperConnectionStatusResponse {
    pub api_version: &'static str,
    pub ready: bool,
    pub status: &'static str,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub file_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub page_name: Option<String>,
}
