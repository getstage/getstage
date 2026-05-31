#![allow(dead_code)]
// Contract mirror for Refero MCP references. The adapter is wired into the
// Research workflow after the shared Stage artifact contracts are stable.

use serde::{Deserialize, Serialize};

#[derive(Clone, Copy, Debug, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum ReferoReferenceKind {
    Screen,
    Flow,
    Style,
}

#[derive(Clone, Copy, Debug, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum ReferoPlatform {
    Web,
    Ios,
    Android,
    Unknown,
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
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReferoContext {
    pub query: String,
    #[serde(default)]
    pub references: Vec<ReferoReference>,
    pub fetched_at: u128,
}
