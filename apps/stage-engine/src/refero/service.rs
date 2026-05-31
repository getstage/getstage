#![allow(dead_code)]
// Refero normalization service. This stays separate from Research so other
// workflows can reuse the adapter without copying MCP logic into UI code.

use serde_json::{Value, json};
use thiserror::Error;

use crate::helpers::time::now_millis;
use crate::models::refero::{
    ReferoContext, ReferoPlatform, ReferoReference, ReferoReferenceKind, ReferoSearchRequest,
};

use super::client::{ReferoClient, ReferoClientError};

#[derive(Clone, Debug)]
pub struct ReferoService {
    client: ReferoClient,
}

impl ReferoService {
    pub fn new(client: ReferoClient) -> Self {
        Self { client }
    }

    pub async fn research_context(
        &self,
        request: &ReferoSearchRequest,
    ) -> Result<ReferoContext, ReferoServiceError> {
        let screens = self.search_screens(request).await?;
        let flows = self.search_flows(request).await?;

        let mut references = Vec::with_capacity(screens.len() + flows.len());
        references.extend(screens);
        references.extend(flows);

        Ok(ReferoContext {
            query: request.query.clone(),
            references,
            fetched_at: now_millis(),
        })
    }

    pub async fn search_screens(
        &self,
        request: &ReferoSearchRequest,
    ) -> Result<Vec<ReferoReference>, ReferoServiceError> {
        let raw = self
            .client
            .call_tool(
                "refero_search_screens",
                json!({
                    "query": request.query,
                    "platform": platform_to_refero_value(request.platform),
                    "limit": request.limit,
                    "tags": request.tags,
                }),
            )
            .await?;

        Ok(extract_reference_values(&raw)
            .into_iter()
            .enumerate()
            .map(|(index, value)| normalize_reference(value, ReferoReferenceKind::Screen, index))
            .collect())
    }

    pub async fn search_flows(
        &self,
        request: &ReferoSearchRequest,
    ) -> Result<Vec<ReferoReference>, ReferoServiceError> {
        let raw = self
            .client
            .call_tool(
                "refero_search_flows",
                json!({
                    "query": request.query,
                    "platform": platform_to_refero_value(request.platform),
                    "limit": request.limit,
                    "tags": request.tags,
                }),
            )
            .await?;

        Ok(extract_reference_values(&raw)
            .into_iter()
            .enumerate()
            .map(|(index, value)| normalize_reference(value, ReferoReferenceKind::Flow, index))
            .collect())
    }
}

fn platform_to_refero_value(platform: ReferoPlatform) -> &'static str {
    match platform {
        ReferoPlatform::Web => "web",
        ReferoPlatform::Ios => "ios",
        ReferoPlatform::Android => "android",
        ReferoPlatform::Unknown => "web",
    }
}

fn extract_reference_values(raw: &Value) -> Vec<&Value> {
    if let Some(items) = raw.get("items").and_then(Value::as_array) {
        return items.iter().collect();
    }

    if let Some(results) = raw.get("results").and_then(Value::as_array) {
        return results.iter().collect();
    }

    if let Some(content) = raw.get("content").and_then(Value::as_array) {
        return content.iter().collect();
    }

    raw.as_array()
        .map(|items| items.iter().collect())
        .unwrap_or_default()
}

fn normalize_reference(value: &Value, kind: ReferoReferenceKind, index: usize) -> ReferoReference {
    let fallback_id = format!("{kind:?}-{index}");
    let id = string_field(value, &["id", "screenId", "flowId", "slug"]).unwrap_or(fallback_id);
    let title = string_field(value, &["title", "name", "screenName", "flowName"])
        .unwrap_or_else(|| "Untitled Refero reference".to_string());

    ReferoReference {
        id,
        kind,
        title,
        product_name: string_field(value, &["productName", "appName", "companyName"]),
        product_url: string_field(value, &["productUrl", "appUrl", "website"]),
        platform: ReferoPlatform::Unknown,
        source_url: string_field(value, &["sourceUrl", "url"]),
        thumbnail_url: string_field(value, &["thumbnailUrl", "thumbnail", "image"]),
        image_url: string_field(value, &["imageUrl", "screenshotUrl"]),
        summary: string_field(value, &["summary", "description"]),
        tags: string_array_field(value, &["tags", "categories"]),
        screen_type: string_field(value, &["screenType", "type"]),
        flow_type: string_field(value, &["flowType", "type"]),
        step_count: value
            .get("stepCount")
            .and_then(Value::as_u64)
            .and_then(|count| u32::try_from(count).ok()),
        style_type: string_field(value, &["styleType"]),
    }
}

fn string_field(value: &Value, keys: &[&str]) -> Option<String> {
    keys.iter()
        .find_map(|key| value.get(*key).and_then(Value::as_str))
        .map(str::trim)
        .filter(|text| !text.is_empty())
        .map(ToOwned::to_owned)
}

fn string_array_field(value: &Value, keys: &[&str]) -> Vec<String> {
    keys.iter()
        .find_map(|key| value.get(*key).and_then(Value::as_array))
        .map(|items| {
            items
                .iter()
                .filter_map(Value::as_str)
                .map(str::trim)
                .filter(|text| !text.is_empty())
                .map(ToOwned::to_owned)
                .collect()
        })
        .unwrap_or_default()
}

#[derive(Debug, Error)]
pub enum ReferoServiceError {
    #[error("Refero client error: {0}")]
    Client(#[from] ReferoClientError),
}
