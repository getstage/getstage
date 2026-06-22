use crate::models::refero::{
    ReferoCategorySearchRequest, ReferoPlatform, ReferoSearchRequest, ReferoUiPatternCategory,
};
use crate::models::research::ResearchInput;
use crate::research::competitive::allowed_competitor_names;

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

/// One Refero screen search per competitor, paired with its display name. Searching Refero for the
/// competitor's own product surfaces real screenshots (bot-proof) to ground the competitive matrix,
/// instead of crawling their live site — which large sites gate behind bot/JS checks.
pub fn build_refero_competitor_search_requests(
    input: &ResearchInput,
) -> Vec<(String, ReferoSearchRequest)> {
    allowed_competitor_names(input)
        .into_iter()
        .map(|name| {
            let request = ReferoSearchRequest {
                query: name.clone(),
                platform: ReferoPlatform::Web,
                limit: CATEGORY_SCREEN_LIMIT,
                tags: Vec::new(),
            };
            (name, request)
        })
        .collect()
}

fn build_category_query(input: &ResearchInput, category: ReferoUiPatternCategory) -> String {
    // Lead with the concrete UI pattern — that is what makes each category distinct and
    // pulls a different region of Refero's index. Leading every query with the same
    // industry phrase made all five collide and return the same generic screens. Industry
    // stays only as a light trailing qualifier (and never the client name — see flow note).
    let pattern = match category {
        ReferoUiPatternCategory::Onboarding => "account signup onboarding wizard first run",
        ReferoUiPatternCategory::Homepage => "marketing homepage hero sections",
        ReferoUiPatternCategory::Pricing => "pricing page plans comparison table",
        ReferoUiPatternCategory::Checkout => "mobile checkout payment order summary",
        ReferoUiPatternCategory::Dashboard => "orders analytics dashboard overview",
    };

    format!("{pattern} {}", input.industry.trim())
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

    #[test]
    fn builds_one_refero_search_per_competitor() {
        let mut input = sample_input();
        input.competitor_urls = vec![
            "https://www.amazon.com".to_string(),
            "https://www.squarespace.com".to_string(),
        ];

        let requests = build_refero_competitor_search_requests(&input);
        let names: Vec<&str> = requests.iter().map(|(name, _)| name.as_str()).collect();

        assert_eq!(names, vec!["Amazon", "Squarespace"]);
        assert!(
            requests
                .iter()
                .all(|(name, request)| &request.query == name),
            "each competitor search must query its own product name"
        );
    }
}
