use super::*;

fn input(category: ProjectCategory) -> FlowsInput {
    FlowsInput {
        project_id: "p1".into(),
        project_name: "Project".into(),
        project_category: category,
        research_artifact_id: "r1".into(),
        research_artifact_json: "{}".into(),
        strategy_artifact_id: "s1".into(),
        strategy_artifact_json: "{}".into(),
        moodboard_artifact_id: "m1".into(),
        moodboard_artifact_json: "{}".into(),
        existing_flows_artifact_id: None,
        existing_flows_artifact_json: None,
    }
}

#[test]
fn websites_generate_page_inventory_and_branched_sitemap() {
    let prompt = build_flows_prompt(&input(ProjectCategory::Websites));
    assert!(prompt.contains("Generate a Sitemap, not five product/user journeys"));
    assert!(!prompt.contains("Each step label should read like Screen -> Action"));
    let example: Value = serde_json::from_str(SITEMAP_SHAPE_EXAMPLE).unwrap();
    assert_eq!(
        example["canvas"]["boards"][0]["edges"][1],
        serde_json::json!({"source": "home", "target": "pricing"})
    );
}

#[test]
fn apps_generate_functional_flows_with_authoritative_category() {
    for category in [ProjectCategory::WebApps, ProjectCategory::IosApps] {
        let prompt = build_flows_prompt(&input(category));
        assert!(prompt.contains("Generate 5 high-signal functional product/user flows"));
        assert!(prompt.contains(&format!(
            "Project category (authoritative): {}",
            category.display_name()
        )));
        assert!(!prompt.contains("Generate a Sitemap, not five product/user journeys"));
    }
}

#[test]
fn regeneration_keeps_saved_node_and_screen_identity() {
    let prompt = build_flow_regenerate_prompt(
        "sitemap",
        &serde_json::json!({}),
        &input(ProjectCategory::Websites),
    );
    assert!(prompt.contains("Preserve every existing step ID and screenId"));
    assert!(prompt.contains("keep exactly the same nodes and connections"));
}
