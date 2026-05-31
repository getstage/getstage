use crate::models::refero::{ReferoPlatform, ReferoSearchRequest};
use crate::models::research::ResearchInput;

pub fn build_refero_search_request(input: &ResearchInput) -> ReferoSearchRequest {
    let mut parts = Vec::new();
    parts.push(input.industry.as_str());
    parts.push(input.project_name.as_str());

    if let Some(client_name) = input.client_name.as_deref() {
        parts.push(client_name);
    }

    if let Some(brief) = input.project_brief.as_deref() {
        parts.push(brief);
    }

    ReferoSearchRequest {
        query: parts.join(" "),
        platform: ReferoPlatform::Web,
        limit: 8,
        tags: vec![
            "research".to_string(),
            "competitive-analysis".to_string(),
            "ui-patterns".to_string(),
        ],
    }
}
