use super::*;

fn input() -> FlowsInput {
    FlowsInput {
        project_id: "p1".to_string(),
        project_name: "Project".to_string(),
        project_category: crate::models::research::ProjectCategory::WebApps,
        research_artifact_id: "r1".to_string(),
        research_artifact_json: "{}".to_string(),
        strategy_artifact_id: "s1".to_string(),
        strategy_artifact_json: "{}".to_string(),
        moodboard_artifact_id: "m1".to_string(),
        moodboard_artifact_json: "{}".to_string(),
        existing_flows_artifact_id: None,
        existing_flows_artifact_json: None,
    }
}

#[test]
fn normalizes_string_steps_and_forces_draft() {
    let artifact = json!({
        "title": "Flows",
        "flows": [{
            "title": "Signup",
            "description": "Create account",
            "status": "Approved",
            "category": "Onboarding",
            "steps": ["Landing -> Click signup", "Form -> Submit"]
        }],
        "screens": []
    });

    let normalized = normalize_flows_artifact(artifact, &input(), 123).unwrap();

    assert_eq!(normalized["artifactKind"], "flowsArtifact");
    assert_eq!(normalized["flows"][0]["status"], "Draft");
    assert_eq!(
        normalized["flows"][0]["steps"][0]["label"],
        "Landing -> Click signup"
    );
    assert_eq!(normalized["generatedAt"], 123);
}

#[test]
fn websites_retain_more_than_eight_pages() {
    let mut context = input();
    context.project_category = ProjectCategory::Websites;
    let steps = (0..12)
        .map(|index| json!({"id": format!("page-{index}"), "label": format!("Page {index}")}))
        .collect::<Vec<_>>();
    let value =
        json!({"flows": [{"id": "sitemap", "title": "Sitemap", "steps": steps}], "screens": []});
    let result = normalize_flows_artifact(value, &context, 123).unwrap();
    assert_eq!(result["flows"][0]["steps"].as_array().unwrap().len(), 12);
}

#[test]
fn graph_normalization_preserves_membership_and_canvas_beyond_generation_limits() {
    let flows = (0..10).map(|flow| json!({
        "id": format!("flow-{flow}"), "title": format!("Flow {flow}"), "status": "Approved",
        "steps": (0..12).map(|step| json!({"id": format!("step-{step}"), "label": format!("Step {step}"), "screenId": format!("screen-{step}")})).collect::<Vec<_>>()
    })).collect::<Vec<_>>();
    let screens = (0..20)
        .map(
            |screen| json!({"id": format!("screen-{screen}"), "title": format!("Screen {screen}")}),
        )
        .collect::<Vec<_>>();
    let canvas = json!({"version": 1, "boards": [{"flowId": "flow-0", "positions": (0..12).map(|step| json!({"stepId": format!("step-{step}"), "x": step * 200, "y": 100})).collect::<Vec<_>>(), "edges": [{"source": "step-0", "target": "step-11"}]}]});
    let value = json!({"flows": flows, "screens": screens, "canvas": canvas});
    let mut context = input();
    context.existing_flows_artifact_json = Some(value.to_string());
    for result in [
        normalize_existing_flows_artifact(value.clone(), &context, 123).unwrap(),
        normalize_flows_artifact(value.clone(), &context, 123).unwrap(),
        normalize_flows_artifact(value.clone(), &input(), 123).unwrap(),
    ] {
        assert_eq!(result["flows"].as_array().unwrap().len(), 10);
        assert_eq!(result["flows"][0]["steps"].as_array().unwrap().len(), 12);
        assert_eq!(result["flows"][0]["steps"][11]["screenId"], "screen-11");
        assert_eq!(result["screens"].as_array().unwrap().len(), 20);
        assert_eq!(result["canvas"], canvas);
    }
}

#[test]
fn normalization_keeps_explicit_step_order_for_unmaterialized_boards() {
    let value = json!({"flows": [{"id": "main", "title": "Main", "steps": [{"id": "node", "label": "Page", "order": 42}]}], "screens": []});
    let result = normalize_existing_flows_artifact(value, &input(), 123).unwrap();
    assert_eq!(result["flows"][0]["steps"][0]["order"], 42);
}

#[test]
fn flow_patch_does_not_truncate_saved_nodes() {
    let steps = (0..12).map(|step| json!({"id": format!("step-{step}"), "label": format!("Page {step}"), "screenId": format!("screen-{step}")})).collect::<Vec<_>>();
    let mut value = json!({"flows": [{"id": "sitemap", "title": "Sitemap", "steps": steps}]});
    merge_flow_patch(&mut value, "sitemap", json!({"steps": steps})).unwrap();
    assert_eq!(value["flows"][0]["steps"].as_array().unwrap().len(), 12);
}

#[test]
fn targeted_flow_patch_does_not_truncate_unrelated_saved_screen_content() {
    let elements = (0..12)
        .map(|index| json!(format!("Element {index}")))
        .collect::<Vec<_>>();
    let mut value = json!({"flows": [{"id": "main", "title": "Main", "steps": [{"id": "node", "label": "Page", "order": 42}]}], "screens": [{"id": "screen", "title": "Page", "keyElements": elements}]});
    merge_flow_patch(&mut value, "main", json!({"title": "Updated"})).unwrap();
    let result = normalize_existing_flows_artifact(value, &input(), 123).unwrap();
    assert_eq!(result["screens"][0]["keyElements"], json!(elements));
    assert_eq!(result["flows"][0]["steps"][0]["order"], 42);
}

#[test]
fn rejects_empty_flows() {
    let artifact = json!({ "flows": [], "screens": [] });

    let error = normalize_flows_artifact(artifact, &input(), 123).unwrap_err();

    assert!(error.to_string().contains("usable flows"));
}
