#[derive(Clone, Debug)]
#[allow(dead_code)]
pub struct WireframesInput {
    pub project_id: String,
    pub project_name: String,
    /// Project type chosen at creation: `branding` | `web-design` | `product-design`
    /// | `app-design` | `web-app` | `packaging` | `motion-design` | `illustration` | `other`.
    pub project_type: String,
    /// Free text, only set when `project_type` is `other`.
    pub project_type_label: Option<String>,
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

/// The frame a screen is designed for, derived from the project type rather than stored:
/// a mobile app project rendered at desktop width is the clearest sign the output ignored
/// the brief, and there is no second place the answer could come from.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum WireframeViewport {
    Mobile,
    Desktop,
}

impl WireframeViewport {
    pub fn from_project_type(project_type: &str) -> Self {
        match project_type.trim() {
            "app-design" => WireframeViewport::Mobile,
            _ => WireframeViewport::Desktop,
        }
    }

    pub fn as_str(self) -> &'static str {
        match self {
            WireframeViewport::Mobile => "mobile",
            WireframeViewport::Desktop => "desktop",
        }
    }

    pub fn frame_width(self) -> u32 {
        match self {
            WireframeViewport::Mobile => 390,
            WireframeViewport::Desktop => 1440,
        }
    }

    /// What the model must design to. Kept next to the width so the two can never drift.
    pub fn prompt_guidance(self) -> &'static str {
        match self {
            WireframeViewport::Mobile => {
                "This is a MOBILE app project. Design every screen for a 390px-wide phone frame: one column, full-width stacked cards, a bottom tab bar or a top app bar instead of a desktop sidebar, tap targets at least 44px tall, and no multi-column dashboards or wide marketing heroes. Never use a desktop layout."
            }
            WireframeViewport::Desktop => {
                "This is a DESKTOP project. Design every screen for a 1440px-wide frame with desktop layout conventions."
            }
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
