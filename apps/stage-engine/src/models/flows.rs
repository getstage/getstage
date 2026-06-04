#[derive(Clone, Debug)]
pub struct FlowsInput {
    pub project_id: String,
    pub project_name: String,
    pub research_artifact_id: String,
    pub research_artifact_json: String,
    pub strategy_artifact_id: String,
    pub strategy_artifact_json: String,
    pub moodboard_artifact_id: String,
    pub moodboard_artifact_json: String,
    pub existing_flows_artifact_id: Option<String>,
    pub existing_flows_artifact_json: Option<String>,
}
