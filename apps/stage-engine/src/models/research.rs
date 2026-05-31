#![allow(dead_code)]
// Contract mirror for Research artifacts. The endpoint wiring lands after the
// Refero and Claude/Codex boundaries are validated.

use serde::{Deserialize, Serialize};

use super::refero::ReferoContext;

#[derive(Clone, Copy, Debug, Deserialize, Serialize)]
pub enum ResearchMatrixScore {
    Strong,
    OK,
    Weak,
}

#[derive(Clone, Copy, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum ResearchArtifactSection {
    Summary,
    CompanySnapshot,
    CompetitiveAnalysis,
    UiPatterns,
    TargetUsers,
    Opportunities,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ResearchInput {
    pub project_id: String,
    pub project_name: String,
    pub client_name: Option<String>,
    pub industry: String,
    pub website: Option<String>,
    pub project_brief: Option<String>,
    #[serde(default)]
    pub competitor_urls: Vec<String>,
    pub target_users: Option<String>,
    pub additional_notes: Option<String>,
    #[serde(default)]
    pub uploaded_asset_ids: Vec<String>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ResearchCompanySnapshotRow {
    pub label: String,
    pub value: String,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ResearchCompetitor {
    pub id: String,
    pub name: String,
    pub url: Option<String>,
    pub logo_url: Option<String>,
    pub mark: Option<String>,
    pub color: Option<String>,
    pub positioning: Option<String>,
    pub summary: Option<String>,
    #[serde(default)]
    pub strengths: Vec<String>,
    #[serde(default)]
    pub weaknesses: Vec<String>,
    #[serde(default)]
    pub source_reference_ids: Vec<String>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ResearchCompetitiveMatrixCell {
    pub competitor_id: String,
    pub score: ResearchMatrixScore,
    pub note: Option<String>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ResearchCompetitiveMatrixRow {
    pub id: String,
    pub label: String,
    #[serde(default)]
    pub cells: Vec<ResearchCompetitiveMatrixCell>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ResearchCompetitiveAnalysis {
    #[serde(default)]
    pub competitors: Vec<ResearchCompetitor>,
    #[serde(default)]
    pub matrix_rows: Vec<ResearchCompetitiveMatrixRow>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ResearchUiPatternExample {
    pub id: String,
    pub title: String,
    pub image_url: Option<String>,
    pub source_product: Option<String>,
    pub source_reference_id: Option<String>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ResearchUiPatternGroup {
    pub id: String,
    pub title: String,
    pub summary: Option<String>,
    pub pattern_count_label: Option<String>,
    #[serde(default)]
    pub recognized_patterns: Vec<String>,
    #[serde(default)]
    pub examples: Vec<ResearchUiPatternExample>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ResearchTargetUser {
    pub id: String,
    pub name: String,
    pub role: String,
    #[serde(default)]
    pub goals: Vec<String>,
    #[serde(default)]
    pub frustrations: Vec<String>,
    pub context: Option<String>,
    pub relevance: Option<String>,
    #[serde(default)]
    pub assumptions: Vec<String>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ResearchOpportunity {
    pub id: String,
    pub title: Option<String>,
    pub description: String,
    pub source_section: Option<ResearchArtifactSection>,
}

#[derive(Clone, Copy, Debug, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum ResearchSourceProvider {
    Refero,
    Figma,
    Notion,
    Sheets,
    Website,
    User,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ResearchSourceReference {
    pub id: String,
    pub provider: ResearchSourceProvider,
    pub label: String,
    pub url: Option<String>,
    pub external_id: Option<String>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ResearchArtifact {
    pub api_version: String,
    pub artifact_kind: String,
    pub project_id: String,
    pub title: String,
    #[serde(default)]
    pub summary: Vec<String>,
    #[serde(default)]
    pub company_snapshot: Vec<ResearchCompanySnapshotRow>,
    pub competitive_analysis: ResearchCompetitiveAnalysis,
    #[serde(default)]
    pub ui_patterns: Vec<ResearchUiPatternGroup>,
    #[serde(default)]
    pub target_users: Vec<ResearchTargetUser>,
    #[serde(default)]
    pub opportunities: Vec<ResearchOpportunity>,
    #[serde(default)]
    pub open_questions: Vec<String>,
    #[serde(default)]
    pub source_references: Vec<ResearchSourceReference>,
    pub refero_context: Option<ReferoContext>,
    pub generated_at: u128,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ResearchArtifactPatch {
    pub artifact_id: String,
    pub section: ResearchArtifactSection,
    pub patch: serde_json::Value,
    pub reason: Option<String>,
}
