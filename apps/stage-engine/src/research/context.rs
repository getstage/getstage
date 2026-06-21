use crate::models::refero::{
    ReferoCategorySearchRequest, ReferoPlatform, ReferoSearchRequest, ReferoUiPatternCategory,
};
use crate::models::research::ResearchInput;

const CATEGORY_SCREEN_LIMIT: u8 = 4;

pub fn build_refero_category_search_requests(
    input: &ResearchInput,
) -> Vec<ReferoCategorySearchRequest> {
    ReferoUiPatternCategory::all()
        .iter()
        .map(|category| ReferoCategorySearchRequest {
            category: *category,
            query: build_category_query(input, *category),
            platform: ReferoPlatform::Web,
            limit: CATEGORY_SCREEN_LIMIT,
        })
        .collect()
}

pub fn build_refero_flow_search_request(input: &ResearchInput) -> ReferoSearchRequest {
    // Refero is a design-screenshot search; the client's own name is semantic noise
    // that drags results toward unrelated products. Search on industry + flow intent only.
    let query_parts = [
        input.industry.clone(),
        "B2B buyer approval onboarding checkout subscription flow".to_string(),
    ];

    ReferoSearchRequest {
        query: query_parts.join(" "),
        platform: ReferoPlatform::Web,
        limit: 4,
        tags: vec!["competitive-analysis".to_string()],
    }
}

fn build_category_query(input: &ResearchInput, category: ReferoUiPatternCategory) -> String {
    let pattern = match category {
        ReferoUiPatternCategory::Onboarding => {
            "B2B wholesale signup onboarding setup wizard account request"
        }
        ReferoUiPatternCategory::Homepage => {
            "B2B wholesale marketing homepage landing hero product"
        }
        ReferoUiPatternCategory::Pricing => "B2B pricing page plan comparison subscription tiers",
        ReferoUiPatternCategory::Checkout => "B2B mobile checkout payment order review cart",
        ReferoUiPatternCategory::Dashboard => {
            "B2B wholesale dashboard admin catalog approval queue"
        }
    };

    // Industry + UI-pattern intent only — never the client name (see flow search note).
    let query_parts = [input.industry.clone(), pattern.to_string()];

    query_parts.join(" ")
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::research::ResearchInput;

    fn sample_input() -> ResearchInput {
        ResearchInput {
            project_id: "proj-1".to_string(),
            project_name: "Example B2B".to_string(),
            client_name: Some("Northwind Traders".to_string()),
            industry: "E-commerce".to_string(),
            website: Some("www.example.com".to_string()),
            project_brief: None,
            competitor_urls: vec![],
            target_users: None,
            additional_notes: None,
            uploaded_asset_ids: vec![],
        }
    }

    #[test]
    fn builds_five_category_searches_with_industry_context() {
        let requests = build_refero_category_search_requests(&sample_input());
        assert_eq!(requests.len(), 5);
        assert!(requests[0].query.contains("E-commerce"));
        assert!(requests[0].query.contains("onboarding"));
        assert_eq!(requests[0].category, ReferoUiPatternCategory::Onboarding);
        assert_eq!(requests[0].limit, 4);
    }

    #[test]
    fn refero_queries_exclude_client_name() {
        // The client name must never pollute a Refero design search.
        let input = sample_input(); // client_name = "Northwind Traders"
        for request in build_refero_category_search_requests(&input) {
            assert!(
                !request.query.contains("Northwind"),
                "category query leaked client name: {}",
                request.query
            );
        }
        assert!(
            !build_refero_flow_search_request(&input)
                .query
                .contains("Northwind"),
            "flow query leaked client name"
        );
    }
}
