#![allow(dead_code)]

use std::collections::HashSet;

use serde_json::{Value, json};
use thiserror::Error;

use crate::helpers::time::now_millis;
use crate::models::refero::{
    ReferoCategorySearch, ReferoCategorySearchRequest, ReferoContext, ReferoPlatform,
    ReferoReference, ReferoReferenceKind, ReferoSearchRequest, ReferoUiPatternCategory,
};

use super::client::{ReferoClient, ReferoClientError};
use super::parse::{
    decode_image_bytes, extract_reference_values, infer_extension, is_synthetic_reference_id,
    looks_like_image_bytes, nested_string_field, reference_id, refero_tags, string_array_field,
    string_field,
};

const MAX_REFERO_SEARCH_RESULTS: u8 = 12;
// Full-res screenshot per kept screen (5 categories x 4), so the UI never shows a blurry thumbnail.
const MAX_REFERO_IMAGE_FETCHES: usize = 20;
// Pull a wider candidate pool per category, then keep only the screens that actually match
// the category — so off-topic top hits get dropped instead of shown.
const CATEGORY_CANDIDATE_POOL: u8 = 12;

#[derive(Clone, Debug)]
pub struct ReferoService {
    client: ReferoClient,
}

impl ReferoService {
    pub fn new(client: ReferoClient) -> Self {
        Self { client }
    }

    pub fn is_configured(&self) -> bool {
        self.client.is_configured()
    }

    pub fn with_token(&self, token: String) -> Result<Self, ReferoClientError> {
        Ok(Self {
            client: ReferoClient::from_parts(self.client.mcp_url().to_string(), Some(token))?,
        })
    }

    pub fn with_fresh_call_counter(&self) -> Self {
        Self {
            client: self.client.with_fresh_call_counter(),
        }
    }

    pub fn call_count(&self) -> usize {
        self.client.call_count()
    }

    pub async fn research_context_for_categories(
        &self,
        category_requests: &[ReferoCategorySearchRequest],
        flow_request: &ReferoSearchRequest,
    ) -> Result<ReferoContext, ReferoServiceError> {
        let mut join_set = tokio::task::JoinSet::new();

        for (index, request) in category_requests.iter().enumerate() {
            let service = self.clone();
            let request = request.clone();
            join_set.spawn(async move {
                let screens = service.search_screens_for_category(&request).await?;
                Ok::<_, ReferoServiceError>((index, request, screens))
            });
        }

        let mut indexed_results = Vec::with_capacity(category_requests.len());
        while let Some(joined) = join_set.join_next().await {
            let result = joined.map_err(|error| {
                ReferoServiceError::Client(ReferoClientError::ToolCallFailed {
                    message: format!("Refero category search task failed: {error}"),
                })
            })?;
            indexed_results.push(result?);
        }

        indexed_results.sort_by_key(|(index, _, _)| *index);

        let mut category_searches = Vec::with_capacity(category_requests.len());
        let mut references = Vec::new();
        let mut seen_screen_ids = HashSet::new();

        for (_index, request, screens) in indexed_results {
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
            limit: CATEGORY_CANDIDATE_POOL,
            tags: Vec::new(),
        };
        let candidates = self.search_screens(&search).await?;
        Ok(keep_screens_matching_category(
            candidates,
            request.category,
            usize::from(request.limit),
        ))
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

    /// Look up each competitor's own screens in Refero (one concurrent search per competitor),
    /// preserving input order. This is the bot-proof evidence the model scores the competitive
    /// matrix from, instead of crawling competitors' live sites.
    pub async fn competitor_screen_evidence(
        &self,
        requests: &[(String, ReferoSearchRequest)],
    ) -> Result<Vec<(String, Vec<ReferoReference>)>, ReferoServiceError> {
        let mut join_set = tokio::task::JoinSet::new();
        for (index, (name, request)) in requests.iter().enumerate() {
            let service = self.clone();
            let name = name.clone();
            let request = request.clone();
            join_set.spawn(async move {
                let screens = service.search_screens(&request).await;
                (index, name, screens)
            });
        }

        let mut indexed = Vec::with_capacity(requests.len());
        while let Some(joined) = join_set.join_next().await {
            let (index, name, screens) = joined.map_err(|error| {
                ReferoServiceError::Client(ReferoClientError::ToolCallFailed {
                    message: format!("Refero competitor search task failed: {error}"),
                })
            })?;
            indexed.push((index, name, screens?));
        }

        indexed.sort_by_key(|(index, _, _)| *index);
        Ok(indexed
            .into_iter()
            .map(|(_, name, screens)| (name, screens))
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

        Err(
            last_error.unwrap_or_else(|| ReferoServiceError::MissingImage {
                reference_id: screen_id.to_string(),
            }),
        )
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
            for reference in bucket.references.iter_mut() {
                if fetched >= MAX_REFERO_IMAGE_FETCHES {
                    break;
                }
                // Refero search only yields a low-res thumbnail_url; fetch the full-res screenshot.
                // Skip flows, already-hydrated screens, and synthetic ids (no real uuid to fetch).
                if reference.kind != ReferoReferenceKind::Screen
                    || reference.raw_image_bytes.is_some()
                    || is_synthetic_reference_id(&reference.id)
                {
                    continue;
                }

                match self.fetch_screen_image_bytes(&reference.id).await {
                    Ok(bytes) => {
                        reference.raw_image_bytes = Some(bytes);
                        fetched += 1;
                    }
                    Err(error) => {
                        tracing::warn!(screen_id = %reference.id, %error, "Refero screen image fetch failed");
                    }
                }
            }
        }

        tracing::info!(
            refero_image_fetches = fetched,
            refero_image_budget = MAX_REFERO_IMAGE_FETCHES,
            "Refero image hydration completed"
        );

        Ok(fetched)
    }
}

/// Turn Refero's fuzzy result list into a clean, on-category, varied set:
/// 1. rank by how strongly each screen matches the category (page type weighs most),
/// 2. drop off-category screens once any real match exists,
/// 3. prefer one screen per product so a category never shows four near-identical screens
///    from the same site (falling back to fill only if that leaves us short).
/// Falls back to the raw candidates only when nothing matches at all, so a category is
/// never empty purely because Refero's metadata was sparse.
fn keep_screens_matching_category(
    candidates: Vec<ReferoReference>,
    category: ReferoUiPatternCategory,
    limit: usize,
) -> Vec<ReferoReference> {
    let keywords = category_keywords(category);

    let mut scored: Vec<(i32, usize, ReferoReference)> = candidates
        .into_iter()
        .enumerate()
        .map(|(index, reference)| (category_score(&reference, keywords), index, reference))
        .collect();
    // Best score first; Refero's original order breaks ties (stable preference).
    scored.sort_by(|a, b| b.0.cmp(&a.0).then(a.1.cmp(&b.1)));

    let any_relevant = scored.first().is_some_and(|(score, _, _)| *score > 0);

    let mut chosen = Vec::new();
    let mut seen_products = HashSet::new();
    let mut leftovers = Vec::new();
    for (score, _, reference) in scored {
        if any_relevant && score == 0 {
            continue; // off-category — only kept if nothing real matched
        }
        let product = reference
            .product_name
            .as_deref()
            .unwrap_or_default()
            .to_ascii_lowercase();
        if product.is_empty() || seen_products.insert(product) {
            chosen.push(reference);
            if chosen.len() >= limit {
                return chosen;
            }
        } else {
            leftovers.push(reference);
        }
    }
    for reference in leftovers {
        if chosen.len() >= limit {
            break;
        }
        chosen.push(reference);
    }
    chosen
}

/// Relevance score for a screen against a category. `page_types` (Refero's own screen
/// classification, surfaced as `screen_type`) is the strongest signal, then tags, then
/// free text — so a screen actually classified as "Checkout" outranks one that merely
/// mentions the word.
fn category_score(reference: &ReferoReference, keywords: &[&str]) -> i32 {
    let mut score = 0;
    if let Some(screen_type) = &reference.screen_type {
        let lower = screen_type.to_ascii_lowercase();
        if keywords.iter().any(|keyword| lower.contains(keyword)) {
            score += 3;
        }
    }
    let tags = reference
        .tags
        .iter()
        .map(|tag| tag.to_ascii_lowercase())
        .collect::<Vec<_>>()
        .join(" ");
    if keywords.iter().any(|keyword| tags.contains(keyword)) {
        score += 2;
    }
    let text = format!(
        "{} {}",
        reference.title.to_ascii_lowercase(),
        reference
            .summary
            .as_deref()
            .unwrap_or("")
            .to_ascii_lowercase()
    );
    if keywords.iter().any(|keyword| text.contains(keyword)) {
        score += 1;
    }
    score
}

fn category_keywords(category: ReferoUiPatternCategory) -> &'static [&'static str] {
    match category {
        ReferoUiPatternCategory::Onboarding => &[
            "onboard",
            "sign up",
            "signup",
            "sign-up",
            "register",
            "setup",
            "wizard",
            "get started",
            "welcome",
            "create account",
        ],
        ReferoUiPatternCategory::Homepage => &["home", "landing", "hero", "marketing"],
        ReferoUiPatternCategory::Pricing => &["pricing", "plan", "subscription", "tier", "billing"],
        ReferoUiPatternCategory::Checkout => &["checkout", "cart", "payment", "order", "purchase"],
        ReferoUiPatternCategory::Dashboard => &[
            "dashboard",
            "admin",
            "console",
            "analytics",
            "overview",
            "panel",
            "report",
        ],
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

#[cfg(test)]
mod tests {
    use super::*;

    fn screen(title: &str, screen_type: Option<&str>) -> ReferoReference {
        ReferoReference {
            id: title.to_string(),
            kind: ReferoReferenceKind::Screen,
            title: title.to_string(),
            product_name: None,
            product_url: None,
            platform: ReferoPlatform::Web,
            source_url: None,
            thumbnail_url: None,
            image_url: None,
            summary: None,
            tags: Vec::new(),
            screen_type: screen_type.map(str::to_string),
            flow_type: None,
            step_count: None,
            style_type: None,
            ui_pattern_category: None,
            raw_image_bytes: None,
        }
    }

    #[test]
    fn keeps_only_category_matching_screens() {
        let candidates = vec![
            screen("Checkout payment", Some("Checkout")),
            screen("Course catalog", Some("Browse")),
            screen("Cart review", Some("Cart")),
        ];

        let kept = keep_screens_matching_category(candidates, ReferoUiPatternCategory::Checkout, 4);
        let titles: Vec<&str> = kept
            .iter()
            .map(|reference| reference.title.as_str())
            .collect();

        assert_eq!(titles, vec!["Checkout payment", "Cart review"]);
    }

    #[test]
    fn falls_back_to_candidates_when_nothing_matches() {
        let candidates = vec![screen("Mystery screen", None)];

        let kept = keep_screens_matching_category(candidates, ReferoUiPatternCategory::Pricing, 4);

        assert_eq!(kept.len(), 1);
    }

    #[test]
    fn prefers_one_screen_per_product_for_variety() {
        let with_product = |title: &str, product: &str| ReferoReference {
            product_name: Some(product.to_string()),
            ..screen(title, Some("Checkout"))
        };
        let candidates = vec![
            with_product("Checkout A", "ShopOne"),
            with_product("Checkout B", "ShopOne"),
            with_product("Checkout C", "ShopTwo"),
        ];

        let kept = keep_screens_matching_category(candidates, ReferoUiPatternCategory::Checkout, 2);
        let products: Vec<&str> = kept
            .iter()
            .filter_map(|reference| reference.product_name.as_deref())
            .collect();

        // Two different products, not the same site twice.
        assert_eq!(products, vec!["ShopOne", "ShopTwo"]);
    }
}
