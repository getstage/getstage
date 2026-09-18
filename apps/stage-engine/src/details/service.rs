use std::collections::HashSet;
use std::time::Duration;

use reqwest::header::{ACCEPT, AUTHORIZATION, CONTENT_TYPE, HeaderMap, HeaderValue};
use serde_json::{Value, json};
use thiserror::Error;

use crate::config::DetailsConfig;
use crate::helpers::time::now_millis;
use crate::models::refero::{
    ReferoCategorySearch, ReferoContext, ReferoPlatform, ReferoReference, ReferoReferenceKind,
    ReferoUiPatternCategory,
};
use crate::models::research::ResearchInput;
use crate::refero::parse::looks_like_image_bytes;

use super::parse::{DetailsSearchHit, extract_search_hits, media_image_url};

const MAX_INSPIRATIONS_PER_CATEGORY: usize = 4;

#[derive(Clone, Debug)]
pub struct DetailsService {
    http: reqwest::Client,
    media: reqwest::Client,
    mcp_url: String,
    auth_configured: bool,
}

impl DetailsService {
    pub fn from_config(config: &DetailsConfig) -> Result<Self, DetailsServiceError> {
        Self::from_parts(&config.mcp_url, config.token.as_deref())
    }

    pub fn is_configured(&self) -> bool {
        self.auth_configured
    }

    pub fn with_token(&self, token: String) -> Result<Self, DetailsServiceError> {
        Self::from_parts(&self.mcp_url, Some(token.as_str()))
    }

    pub async fn research_context(
        &self,
        input: &ResearchInput,
    ) -> Result<ReferoContext, DetailsServiceError> {
        let requests = details_section_search_requests(&input.details_sections);
        let project_context = website_project_context(input);
        let mut excluded_source_domains = Vec::new();
        let mut seen_ids = HashSet::new();
        let mut selected = Vec::new();

        for (category_index, section) in requests.iter().enumerate() {
            let query = details_section_query(section);
            let search = self
                .call_tool(
                    "search_inspirations",
                    json!({
                        "query": query,
                        "projectContext": project_context,
                        "excludeSourceDomains": excluded_source_domains,
                    }),
                )
                .await?;

            let hits = extract_search_hits(&search)
                .into_iter()
                .filter(|hit| seen_ids.insert(hit.id.clone()))
                .take(MAX_INSPIRATIONS_PER_CATEGORY)
                .collect::<Vec<_>>();

            for (hit_index, hit) in hits.into_iter().enumerate() {
                if let Some(domain) = hit.product_name.as_deref()
                    && !excluded_source_domains.iter().any(|seen| seen == domain)
                {
                    excluded_source_domains.push(domain.to_string());
                }
                selected.push((category_index, hit_index, hit));
            }
        }

        let mut join_set = tokio::task::JoinSet::new();
        for (category_index, hit_index, hit) in selected {
            let service = self.clone();
            join_set.spawn(async move {
                let inspiration_id = hit.id.clone();
                (
                    category_index,
                    hit_index,
                    inspiration_id,
                    service
                        .hydrate_hit(&hit, ReferoUiPatternCategory::WebsiteSection)
                        .await,
                )
            });
        }

        let mut hydrated = Vec::new();
        while let Some(joined) = join_set.join_next().await {
            let (category_index, hit_index, inspiration_id, result) =
                joined.map_err(|error| DetailsServiceError::ToolCallFailed {
                    message: format!("Details inspiration task failed: {error}"),
                })?;
            match result {
                Ok(reference) => hydrated.push((category_index, hit_index, reference)),
                Err(error) => {
                    tracing::warn!(
                        %inspiration_id,
                        %error,
                        "Details inspiration fetch failed; continuing without this reference"
                    );
                }
            }
        }
        hydrated.sort_by_key(|(category_index, hit_index, _)| (*category_index, *hit_index));

        let mut buckets = vec![Vec::new(); requests.len()];
        for (category_index, _, reference) in hydrated {
            buckets[category_index].push(reference);
        }
        let category_searches = requests
            .into_iter()
            .enumerate()
            .map(|(index, section)| ReferoCategorySearch {
                category: ReferoUiPatternCategory::WebsiteSection,
                query: details_section_query(&section),
                section: Some(section),
                references: std::mem::take(&mut buckets[index]),
            })
            .collect::<Vec<_>>();
        let references = category_searches
            .iter()
            .flat_map(|bucket| bucket.references.iter().cloned())
            .collect();
        let query = category_searches
            .iter()
            .map(|bucket| bucket.query.as_str())
            .collect::<Vec<_>>()
            .join(" | ");

        Ok(ReferoContext {
            query,
            references,
            category_searches,
            fetched_at: now_millis(),
        })
    }

    fn from_parts(mcp_url: &str, token: Option<&str>) -> Result<Self, DetailsServiceError> {
        let mut headers = HeaderMap::new();
        headers.insert(CONTENT_TYPE, HeaderValue::from_static("application/json"));
        headers.insert(
            ACCEPT,
            HeaderValue::from_static("application/json, text/event-stream"),
        );
        headers.insert(
            "MCP-Protocol-Version",
            HeaderValue::from_static("2025-06-18"),
        );
        if let Some(token) = token {
            let value = HeaderValue::from_str(&format!("Bearer {token}"))
                .map_err(|_| DetailsServiceError::InvalidTokenHeader)?;
            headers.insert(AUTHORIZATION, value);
        }

        let http = reqwest::Client::builder()
            .default_headers(headers)
            .timeout(Duration::from_secs(30))
            .connect_timeout(Duration::from_secs(5))
            .build()?;
        let media = reqwest::Client::builder()
            .timeout(Duration::from_secs(20))
            .connect_timeout(Duration::from_secs(5))
            .build()?;

        Ok(Self {
            http,
            media,
            mcp_url: mcp_url.to_string(),
            auth_configured: token.is_some(),
        })
    }

    async fn call_tool(
        &self,
        tool_name: &str,
        arguments: Value,
    ) -> Result<Value, DetailsServiceError> {
        tracing::info!(tool_name, "Details MCP tool call");

        let response = self
            .http
            .post(&self.mcp_url)
            .json(&json!({
                "jsonrpc": "2.0",
                "id": 1,
                "method": "tools/call",
                "params": {
                    "name": tool_name,
                    "arguments": arguments,
                },
            }))
            .send()
            .await?
            .error_for_status()?
            .json::<Value>()
            .await?;

        if let Some(message) = response
            .get("error")
            .and_then(|error| error.get("message"))
            .and_then(Value::as_str)
        {
            return Err(DetailsServiceError::ToolCallFailed {
                message: message.to_string(),
            });
        }

        Ok(response.get("result").cloned().unwrap_or(Value::Null))
    }

    async fn hydrate_hit(
        &self,
        hit: &DetailsSearchHit,
        category: ReferoUiPatternCategory,
    ) -> Result<ReferoReference, DetailsServiceError> {
        let detail = self
            .call_tool(
                "get_inspiration",
                json!({
                    "id": hit.id,
                }),
            )
            .await?;

        let image_url = media_image_url(&detail)
            .or_else(|| hit.thumbnail_url.clone())
            .ok_or_else(|| DetailsServiceError::MissingMedia(hit.id.clone()))?;

        // Media lives on a CDN. Do not send the Details bearer token there.
        let bytes = self
            .media
            .get(&image_url)
            .send()
            .await?
            .error_for_status()?
            .bytes()
            .await?;
        if !looks_like_image_bytes(&bytes) {
            return Err(DetailsServiceError::MissingMedia(hit.id.clone()));
        }

        Ok(ReferoReference {
            id: hit.id.clone(),
            kind: ReferoReferenceKind::Screen,
            title: hit.title.clone(),
            product_name: hit.product_name.clone(),
            product_url: hit.source_url.clone(),
            platform: ReferoPlatform::Web,
            source_url: hit.source_url.clone(),
            thumbnail_url: Some(image_url.clone()),
            image_url: Some(image_url),
            summary: None,
            tags: hit.tags.clone(),
            screen_type: Some(category.display_title().to_string()),
            flow_type: None,
            step_count: None,
            style_type: None,
            ui_pattern_category: Some(category),
            raw_image_bytes: Some(bytes.to_vec()),
        })
    }
}

const DEFAULT_DETAILS_SECTIONS: [&str; 5] =
    ["Hero", "Features", "Social Proof", "Pricing", "Contact"];

fn details_section_search_requests(selected: &[String]) -> Vec<String> {
    if selected.is_empty() {
        return DEFAULT_DETAILS_SECTIONS.map(str::to_string).to_vec();
    }

    selected.iter().take(5).cloned().collect()
}

fn details_section_query(section: &str) -> String {
    format!("marketing website {section} section")
}

#[cfg(test)]
mod tests {
    use super::{DEFAULT_DETAILS_SECTIONS, details_section_search_requests};

    #[test]
    fn searches_use_selected_sections() {
        let selected = vec!["Navigation".to_string(), "Team".to_string()];
        assert_eq!(details_section_search_requests(&selected), selected);
        assert_eq!(
            details_section_search_requests(&[]),
            DEFAULT_DETAILS_SECTIONS.map(str::to_string)
        );
    }
}

fn website_project_context(input: &ResearchInput) -> String {
    let mut parts = vec![format!("A {} website", input.industry.trim())];
    if let Some(target_users) = input
        .target_users
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        parts.push(format!(
            "for {}",
            target_users.chars().take(120).collect::<String>()
        ));
    }
    if let Some(brief) = input
        .project_brief
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        parts.push(brief.chars().take(240).collect());
    }
    format!("{}.", parts.join(". "))
}

#[derive(Debug, Error)]
pub enum DetailsServiceError {
    #[error("failed to call Details MCP: {0}")]
    Http(#[from] reqwest::Error),

    #[error("Details token could not be used as an authorization header")]
    InvalidTokenHeader,

    #[error("Details MCP tool call failed: {message}")]
    ToolCallFailed { message: String },

    #[error("Details inspiration {0} did not include a usable still image")]
    MissingMedia(String),
}
