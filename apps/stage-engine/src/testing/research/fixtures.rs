use crate::models::research::ResearchInput;

pub(crate) fn benchmark_input(competitor_count: usize) -> ResearchInput {
    assert!(competitor_count <= 10);

    ResearchInput {
        project_id: format!("benchmark-{competitor_count}"),
        project_name: "Enterprise Operations Hub".to_string(),
        client_name: Some("Northstar Group".to_string()),
        industry: "Enterprise project management".to_string(),
        website: Some("https://example.com".to_string()),
        project_brief: Some(
            "Design a role-aware operations workspace for distributed enterprise teams."
                .to_string(),
        ),
        competitor_urls: (1..=competitor_count)
            .map(|index| format!("https://competitor-{index}.example"))
            .collect(),
        target_users: Some(
            "Operations leaders, programme managers, and cross-functional contributors."
                .to_string(),
        ),
        additional_notes: Some(
            "Prioritize onboarding, navigation, dashboards, and mobile review flows.".to_string(),
        ),
        uploaded_asset_ids: Vec::new(),
    }
}

#[test]
fn benchmark_fixtures_cover_zero_three_and_ten_competitors() {
    let counts = [0, 3, 10].map(|count| benchmark_input(count).competitor_urls.len());
    assert_eq!(counts, [0, 3, 10]);
}
