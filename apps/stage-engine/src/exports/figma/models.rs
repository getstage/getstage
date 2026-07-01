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
    // Editable-layer export: a flat DOM-derived layer tree the plugin rebuilds as
    // native nodes. When present it wins over the flattened preview image.
    #[serde(default)]
    pub hifi_figma_nodes: Option<HifiFigmaNodes>,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HifiFigmaNodes {
    pub width: u16,
    pub height: u16,
    // Typed so serde rejects malformed layers at the trust boundary (the walked
    // DOM is AI-generated). An unknown `type`, missing field, or wrong scalar type
    // fails deserialization instead of flowing on to the plugin.
    pub nodes: Vec<FigmaDomNode>,
}

// `rename_all` at the enum level only renames the variant tags (rect/text/image);
// each struct variant needs its own `rename_all` so the fields round-trip as
// camelCase to match the desktop walker and the plugin.
#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum FigmaDomNode {
    #[serde(rename_all = "camelCase")]
    Rect {
        x: f64,
        y: f64,
        w: f64,
        h: f64,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        fill: Option<String>,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        radius: Option<f64>,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        stroke_color: Option<String>,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        stroke_weight: Option<f64>,
    },
    #[serde(rename_all = "camelCase")]
    Text {
        x: f64,
        y: f64,
        w: f64,
        text: String,
        font_size: f64,
        font_family: String,
        font_weight: u16,
        color: String,
        align: String,
        // Absent when the source used `line-height: normal`; the plugin then
        // leaves Figma's auto line height in place.
        #[serde(default, skip_serializing_if = "Option::is_none")]
        line_height: Option<f64>,
        // False when the browser rendered a single line; the plugin then disables
        // wrapping so a wider Figma font can't spill a second line onto neighbours.
        #[serde(default)]
        multiline: bool,
    },
    #[serde(rename_all = "camelCase")]
    Image {
        x: f64,
        y: f64,
        w: f64,
        h: f64,
        url: String,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        radius: Option<f64>,
        // Tolerated as absent for older/partial payloads; the plugin defaults to FILL.
        #[serde(default, skip_serializing_if = "Option::is_none")]
        fit: Option<String>,
    },
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
#[serde(rename_all = "camelCase")]
pub struct NodesFigmaWritePlan {
    pub api_version: &'static str,
    pub kind: &'static str,
    pub name: String,
    pub width: u16,
    pub height: u16,
    pub nodes: Vec<FigmaDomNode>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(untagged)]
pub enum WireframeFigmaWritePlan {
    Lofi(FigmaWritePlan),
    Hifi(HifiFigmaWritePlan),
    Nodes(NodesFigmaWritePlan),
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
