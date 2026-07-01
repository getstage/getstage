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
    // that drags results toward unrelated products. Search on industry + flow intent,
    // plus the project descriptor so two same-industry projects don't share one flow query.
    let mut query_parts = vec![
        input.industry.clone(),
        "B2B buyer approval onboarding checkout subscription flow".to_string(),
    ];
    let descriptor = project_descriptor(input);
    if !descriptor.is_empty() {
        query_parts.push(descriptor);
    }

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

    // Two same-industry projects (e.g. both "SaaS") otherwise produce identical queries and
    // get back the exact same screens. Appending a short, project-specific descriptor mined
    // from the brief/target-users/notes pulls each project toward its own corner of the index.
    let descriptor = project_descriptor(input);
    if descriptor.is_empty() {
        format!("{pattern} {}", input.industry.trim())
    } else {
        format!("{pattern} {} {descriptor}", input.industry.trim())
    }
}

/// Words too generic to differentiate one project's design search from another's. Dropping
/// them keeps the descriptor focused on what actually makes a project distinct.
const DESCRIPTOR_STOPWORDS: &[&str] = &[
    "with",
    "that",
    "this",
    "have",
    "from",
    "your",
    "their",
    "they",
    "them",
    "will",
    "would",
    "should",
    "into",
    "about",
    "more",
    "than",
    "then",
    "when",
    "what",
    "which",
    "while",
    "where",
    "users",
    "user",
    "product",
    "products",
    "platform",
    "app",
    "apps",
    "application",
    "website",
    "site",
    "service",
    "services",
    "company",
    "business",
    "customer",
    "customers",
    "team",
    "teams",
    "build",
    "building",
    "make",
    "making",
    "want",
    "need",
    "needs",
    "looking",
    "help",
    "helps",
    "using",
    "based",
    "across",
    "also",
    "like",
    "design",
    "designs",
    "page",
    "pages",
    "screen",
    "screens",
    "tool",
    "tools",
    "software",
    "solution",
    "solutions",
    "manage",
    "management",
];

fn is_descriptor_stopword(word: &str) -> bool {
    DESCRIPTOR_STOPWORDS.contains(&word)
}

/// A short, project-specific qualifier so two same-industry projects don't collapse to the
/// same Refero query. We mine the free text the user already gave us — brief, target users,
/// notes — for the first few salient keywords (deduped, generic filler removed). The client
/// name stays excluded (semantic noise, see flow note). If none of those fields are filled in,
/// this is empty and we fall back to the pattern+industry query — so richer divergence depends
/// on the project's brief/notes being filled out in the research config flow.
fn project_descriptor(input: &ResearchInput) -> String {
    use std::collections::HashSet;

    const MAX_KEYWORDS: usize = 5;
    let mut seen: HashSet<String> = HashSet::new();
    let mut keywords: Vec<String> = Vec::new();

    let sources = [
        input.project_brief.as_deref(),
        input.target_users.as_deref(),
        input.additional_notes.as_deref(),
    ];

    for text in sources.into_iter().flatten() {
        for raw in text.split(|c: char| !c.is_alphanumeric()) {
            let word = raw.to_lowercase();
            if word.len() < 4 || is_descriptor_stopword(&word) {
                continue;
            }
            if seen.insert(word.clone()) {
                keywords.push(word);
                if keywords.len() >= MAX_KEYWORDS {
                    return keywords.join(" ");
                }
            }
        }
    }

    keywords.join(" ")
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
    fn same_industry_projects_diverge_via_descriptor() {
        // The reported bug: two "SaaS" projects returned identical Refero output. With distinct
        // briefs/notes, the category + flow queries must no longer be identical.
        let mut a = sample_input();
        a.industry = "SaaS".to_string();
        a.project_brief =
            Some("Invoicing and expense tracking for freelance designers".to_string());

        let mut b = sample_input();
        b.industry = "SaaS".to_string();
        b.project_brief = Some("Shift scheduling and payroll for restaurant staff".to_string());

        let queries_a: Vec<String> = build_refero_category_search_requests(&a)
            .into_iter()
            .map(|request| request.query)
            .collect();
        let queries_b: Vec<String> = build_refero_category_search_requests(&b)
            .into_iter()
            .map(|request| request.query)
            .collect();

        assert_ne!(queries_a, queries_b, "same-industry projects collided");
        assert_ne!(
            build_refero_flow_search_request(&a).query,
            build_refero_flow_search_request(&b).query,
            "flow queries collided"
        );
        // Descriptor stays free of generic filler and the client name.
        assert!(queries_a[0].contains("invoicing"));
        assert!(!queries_a[0].contains("Northwind"));
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
