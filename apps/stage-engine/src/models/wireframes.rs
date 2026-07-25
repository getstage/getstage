#[derive(Clone, Debug)]
#[allow(dead_code)]
pub struct WireframesInput {
    pub project_id: String,
    pub project_name: String,
    pub strategy_artifact_id: String,
    pub strategy_artifact_json: String,
    pub research_artifact_id: Option<String>,
    pub research_artifact_json: Option<String>,
    pub moodboard_artifact_id: Option<String>,
    pub moodboard_artifact_json: Option<String>,
    pub flows_artifact_id: Option<String>,
    pub flows_artifact_json: Option<String>,
    pub existing_wireframes_artifact_id: Option<String>,
    pub existing_wireframes_artifact_json: Option<String>,
    /// `None` = user never set prefs (engine defaults). `Some([])` = all disabled.
    pub enabled_skill_ids: Option<Vec<String>>,
    pub enabled_component_pack_ids: Option<Vec<String>>,
}

#[derive(Clone, Copy, Debug)]
pub enum WireframeKind {
    Lofi,
    Hifi,
}

impl WireframeKind {
    pub fn as_str(&self) -> &'static str {
        match self {
            WireframeKind::Lofi => "lofi",
            WireframeKind::Hifi => "hifi",
        }
    }

    pub fn parse(value: Option<&str>) -> Self {
        match value {
            Some("hifi") => WireframeKind::Hifi,
            _ => WireframeKind::Lofi,
        }
    }
}

#[derive(Clone, Copy, Debug)]
pub enum WireframeBrandSource {
    StyleGuide,
    BrandKit,
}

impl WireframeBrandSource {
    pub fn parse(value: Option<&str>) -> Option<Self> {
        match value {
            Some("style-guide") => Some(WireframeBrandSource::StyleGuide),
            Some("brand-kit") => Some(WireframeBrandSource::BrandKit),
            _ => None,
        }
    }
}
