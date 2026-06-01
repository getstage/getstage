use crate::models::refero::{ReferoPlatform, ReferoSearchRequest};
use crate::models::research::ResearchInput;

pub fn build_refero_screen_search_request(input: &ResearchInput) -> ReferoSearchRequest {
    let mut query_parts = vec![
        input.industry.clone(),
        "B2B wholesale onboarding pricing checkout mobile dashboard".to_string(),
    ];

    if let Some(client_name) = input.client_name.as_deref() {
        query_parts.push(client_name.to_string());
    }

    ReferoSearchRequest {
        query: query_parts.join(" "),
        platform: ReferoPlatform::Web,
        limit: 4,
        tags: vec!["ui-patterns".to_string()],
    }
}

pub fn build_refero_flow_search_request(input: &ResearchInput) -> ReferoSearchRequest {
    let mut query_parts = vec![
        input.industry.clone(),
        "B2B buyer approval onboarding checkout subscription flow".to_string(),
    ];

    if let Some(client_name) = input.client_name.as_deref() {
        query_parts.push(client_name.to_string());
    }

    ReferoSearchRequest {
        query: query_parts.join(" "),
        platform: ReferoPlatform::Web,
        limit: 4,
        tags: vec!["competitive-analysis".to_string()],
    }
}
