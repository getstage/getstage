#![allow(dead_code)]
// Contract mirror for Refero MCP references. The adapter is wired into the
// Research workflow after the shared Stage artifact contracts are stable.

use serde::{Deserialize, Serialize};

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum ReferoReferenceKind {
    Screen,
    Flow,
    Style,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum ReferoPlatform {
    Web,
    Ios,
    Android,
    Unknown,
}

/// Fixed UI Patterns row categories — mirrors `referoUiPatternCategorySchema` in data-ops.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum ReferoUiPatternCategory {
    Onboarding,
    Homepage,
    Pricing,
    Checkout,
    Dashboard,
}

impl ReferoUiPatternCategory {
    pub fn display_title(self) -> &'static str {
        match self {
            Self::Onboarding => "Onboarding",
            Self::Homepage => "Homepage",
            Self::Pricing => "Pricing",
            Self::Checkout => "Checkout",
            Self::Dashboard => "Dashboard",
        }
    }

    pub fn row_id(self) -> String {
        format!("ui-patterns-{}", self.as_str())
    }

    pub fn as_str(self) -> &'static str {
        match self {
            Self::Onboarding => "onboarding",
            Self::Homepage => "homepage",
            Self::Pricing => "pricing",
            Self::Checkout => "checkout",
            Self::Dashboard => "dashboard",
        }
    }

    pub fn all() -> &'static [Self] {
        &[
            Self::Onboarding,
            Self::Homepage,
            Self::Pricing,
            Self::Checkout,
            Self::Dashboard,
        ]
    }
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReferoSearchRequest {
    pub query: String,
    pub platform: ReferoPlatform,
    pub limit: u8,
    #[serde(default)]
    pub tags: Vec<String>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReferoCategorySearchRequest {
    pub category: ReferoUiPatternCategory,
    pub query: String,
    pub platform: ReferoPlatform,
    pub limit: u8,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReferoReference {
    pub id: String,
    pub kind: ReferoReferenceKind,
    pub title: String,
    pub product_name: Option<String>,
    pub product_url: Option<String>,
    pub platform: ReferoPlatform,
    pub source_url: Option<String>,
    pub thumbnail_url: Option<String>,
    pub image_url: Option<String>,
    pub summary: Option<String>,
    #[serde(default)]
    pub tags: Vec<String>,
    pub screen_type: Option<String>,
    pub flow_type: Option<String>,
    pub step_count: Option<u32>,
    pub style_type: Option<String>,
    pub ui_pattern_category: Option<ReferoUiPatternCategory>,
    #[serde(skip)]
    pub raw_image_bytes: Option<Vec<u8>>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReferoCategorySearch {
    pub category: ReferoUiPatternCategory,
    pub query: String,
    #[serde(default)]
    pub references: Vec<ReferoReference>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReferoContext {
    pub query: String,
    #[serde(default)]
    pub references: Vec<ReferoReference>,
    #[serde(default)]
    pub category_searches: Vec<ReferoCategorySearch>,
    pub fetched_at: u128,
}
