#[derive(Clone, Debug)]
pub struct StrategyInput {
    pub project_id: String,
    pub project_name: String,
    pub research_artifact_id: String,
    pub research_artifact_json: String,
    pub focus_areas: Vec<String>,
    pub additional_notes: Option<String>,
}
