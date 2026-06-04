#![allow(dead_code)]

use std::collections::HashSet;

use serde_json::{Value, json};
use thiserror::Error;

use crate::helpers::time::now_millis;
use crate::models::refero::{
    ReferoCategorySearch, ReferoCategorySearchRequest, ReferoContext, ReferoPlatform,
    ReferoReference, ReferoReferenceKind, ReferoSearchRequest,
};

use super::client::{ReferoClient, ReferoClientError};
use super::parse::{
    decode_image_bytes, extract_reference_values, infer_extension, is_synthetic_reference_id,
    looks_like_image_bytes, nested_string_field, reference_id, refero_tags, string_array_field,
    string_field,
};

const MAX_REFERO_SEARCH_RESULTS: u8 = 4;
const MAX_REFERO_IMAGE_FETCHES: usize = 15;

#[derive(Clone, Debug)]
pub struct ReferoService {
    client: ReferoClient,
}

impl ReferoService {
    pub fn new(client: ReferoClient) -> Self {
        Self { client }
    }

    pub async fn research_context_for_categories(
        &self,
        category_requests: &[ReferoCategorySearchRequest],
        flow_request: &ReferoSearchRequest,
    ) -> Result<ReferoContext, ReferoServiceError> {
        let mut category_searches = Vec::with_capacity(category_requests.len());
        let mut references = Vec::new();
        let mut seen_screen_ids = HashSet::new();

        for request in category_requests {
            let screens = self.search_screens_for_category(request).await?;
            let mut bucket = Vec::new();

            for mut screen in screens {
                if seen_screen_ids.contains(&screen.id) {
                    continue;
                }

                seen_screen_ids.insert(screen.id.clone());
                screen.ui_pattern_category = Some(request.category);
                bucket.push(screen.clone());
                references.push(screen);

                if bucket.len() >= usize::from(request.limit) {
                    break;
                }
            }

            category_searches.push(ReferoCategorySearch {
                category: request.category,
                query: request.query.clone(),
                references: bucket,
            });
        }

        let flows = self.search_flows(flow_request).await?;
        references.extend(flows);

        let query = category_requests
            .iter()
            .map(|request| request.query.as_str())
            .collect::<Vec<_>>()
            .join(" | ");

        tracing::info!(
            screen_hits = references
                .iter()
                .filter(|reference| reference.kind == ReferoReferenceKind::Screen)
                .count(),
            flow_hits = references
                .iter()
                .filter(|reference| reference.kind == ReferoReferenceKind::Flow)
                .count(),
            category_buckets = category_searches.len(),
            "Refero search completed"
        );

        Ok(ReferoContext {
            query,
            references,
            category_searches,
            fetched_at: now_millis(),
        })
    }

    async fn search_screens_for_category(
        &self,
        request: &ReferoCategorySearchRequest,
    ) -> Result<Vec<ReferoReference>, ReferoServiceError> {
        let search = ReferoSearchRequest {
            query: request.query.clone(),
            platform: request.platform,
            limit: request.limit,
            tags: vec![request.category.as_str().to_string()],
        };
        self.search_screens(&search).await
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
                    "response_format": "json",
                }),
            )
            .await?;

        let records = extract_reference_values(&raw);
        if records.is_empty() {
            tracing::warn!(
                query = %request.query,
                "Refero screen search returned no parseable records"
            );
        }

        let take = request.limit.min(MAX_REFERO_SEARCH_RESULTS);

        Ok(records
            .into_iter()
            .take(usize::from(take))
            .enumerate()
            .map(|(index, value)| normalize_reference(&value, ReferoReferenceKind::Screen, index))
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
                    "response_format": "json",
                }),
            )
            .await?;

        let records = extract_reference_values(&raw);
        if records.is_empty() {
            tracing::warn!(
                query = %request.query,
                "Refero flow search returned no parseable records"
            );
        }

        Ok(records
            .into_iter()
            .take(usize::from(request.limit.min(MAX_REFERO_SEARCH_RESULTS)))
            .enumerate()
            .map(|(index, value)| normalize_reference(&value, ReferoReferenceKind::Flow, index))
            .collect())
    }

    pub async fn fetch_screen_image_bytes(
        &self,
        screen_id: &str,
    ) -> Result<Vec<u8>, ReferoServiceError> {
        let mut last_error = None;

        for image_size in ["full", "thumbnail"] {
            match self
                .fetch_screen_image_with_size(screen_id, image_size)
                .await
            {
                Ok(bytes) => return Ok(bytes),
                Err(error) => {
                    tracing::debug!(
                        screen_id = %screen_id,
                        image_size,
                        %error,
                        "Refero get_screen_image attempt failed"
                    );
                    last_error = Some(error);
                }
            }
        }

        Err(last_error.unwrap_or_else(|| ReferoServiceError::MissingImage {
            reference_id: screen_id.to_string(),
        }))
    }

    async fn fetch_screen_image_with_size(
        &self,
        screen_id: &str,
        image_size: &str,
    ) -> Result<Vec<u8>, ReferoServiceError> {
        let raw = self
            .client
            .call_tool(
                "refero_get_screen_image",
                json!({
                    "screen_id": screen_id,
                    "image_size": image_size,
                }),
            )
            .await?;

        let bytes = decode_image_bytes(&raw).ok_or_else(|| ReferoServiceError::MissingImage {
            reference_id: screen_id.to_string(),
        })?;

        if !looks_like_image_bytes(&bytes) {
            return Err(ReferoServiceError::MissingImage {
                reference_id: screen_id.to_string(),
            });
        }

        Ok(bytes)
    }

    pub async fn hydrate_category_screen_images(
        &self,
        category_searches: &mut [ReferoCategorySearch],
    ) -> Result<usize, ReferoServiceError> {
        let mut fetched = 0usize;

        for bucket in category_searches.iter_mut() {
            if fetched >= MAX_REFERO_IMAGE_FETCHES {
                break;
            }

            for reference in bucket.references.iter_mut() {
                if fetched >= MAX_REFERO_IMAGE_FETCHES {
                    break;
                }

                if reference.kind != ReferoReferenceKind::Screen {
                    continue;
                }

                if is_synthetic_reference_id(&reference.id) {
                    tracing::warn!(
                        screen_id = %reference.id,
                        category = %reference
                            .ui_pattern_category
                            .map(|category| category.as_str())
                            .unwrap_or("unknown"),
                        "Skipping Refero image fetch because search result had no real screen id"
                    );
                    continue;
                }

                if reference.raw_image_bytes.is_some() {
                    continue;
                }

                let screen_id = reference.id.clone();
                let bytes = match self.fetch_screen_image_bytes(&screen_id).await {
                    Ok(bytes) => bytes,
                    Err(error) => {
                        tracing::warn!(screen_id = %screen_id, %error, "Refero screen image fetch failed");
                        continue;
                    }
                };

                reference.raw_image_bytes = Some(bytes);
                fetched += 1;
            }
        }

        Ok(fetched)
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

fn normalize_reference(value: &Value, kind: ReferoReferenceKind, index: usize) -> ReferoReference {
    let kind_label = match kind {
        ReferoReferenceKind::Screen => "screen",
        ReferoReferenceKind::Flow => "flow",
        ReferoReferenceKind::Style => "style",
    };
    let id = reference_id(value, kind_label, index);
    let title = string_field(value, &["title", "name", "screenName", "flowName"])
        .unwrap_or_else(|| "Untitled Refero reference".to_string());

    let product_name = nested_string_field(value, &["site", "name"])
        .or_else(|| string_field(value, &["productName", "appName", "companyName", "product"]));
    let product_url = nested_string_field(value, &["site", "domain"]).or_else(|| {
        string_field(
            value,
            &["productUrl", "appUrl", "website", "url", "page_url"],
        )
    });

    ReferoReference {
        id,
        kind,
        title,
        product_name,
        product_url,
        platform: parse_platform(value),
        source_url: string_field(
            value,
            &[
                "refero_url",
                "referoUrl",
                "sourceUrl",
                "pageUrl",
                "page_url",
            ],
        ),
        thumbnail_url: string_field(
            value,
            &[
                "thumbnail_url",
                "thumbnailUrl",
                "thumbnail",
                "preview_url",
                "previewUrl",
            ],
        ),
        image_url: string_field(
            value,
            &[
                "preview_url",
                "previewUrl",
                "imageUrl",
                "screenshotUrl",
                "fullImageUrl",
            ],
        ),
        summary: nested_string_field(value, &["content", "description"])
            .or_else(|| string_field(value, &["summary", "description", "problem"])),
        tags: refero_tags(value),
        screen_type: string_array_field(value, &["page_types", "pageTypes"])
            .first()
            .cloned()
            .or_else(|| string_field(value, &["screenType", "type"])),
        flow_type: string_field(value, &["flowType", "type"]),
        step_count: value
            .get("screens_count")
            .or_else(|| value.get("screensCount"))
            .or_else(|| value.get("stepCount"))
            .and_then(Value::as_u64)
            .and_then(|count| u32::try_from(count).ok()),
        style_type: string_field(value, &["styleType"]),
        ui_pattern_category: None,
        raw_image_bytes: None,
    }
}

fn parse_platform(value: &Value) -> ReferoPlatform {
    match string_field(value, &["platform"]).as_deref() {
        Some("ios") => ReferoPlatform::Ios,
        Some("android") => ReferoPlatform::Android,
        Some("web") => ReferoPlatform::Web,
        _ => ReferoPlatform::Unknown,
    }
}

#[derive(Debug, Error)]
pub enum ReferoServiceError {
    #[error("Refero client error: {0}")]
    Client(#[from] ReferoClientError),

    #[error("Refero image missing for {reference_id}")]
    MissingImage { reference_id: String },
}

pub fn infer_refero_file_name(reference_id: &str, mime_type: &str) -> String {
    format!("{reference_id}.{}", infer_extension(mime_type))
}
