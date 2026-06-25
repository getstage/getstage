use super::*;

fn input() -> FlowsInput {
    FlowsInput {
        project_id: "p1".to_string(),
        project_name: "Project".to_string(),
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
fn rejects_empty_flows() {
    let artifact = json!({ "flows": [], "screens": [] });

    let error = normalize_flows_artifact(artifact, &input(), 123).unwrap_err();

    assert!(error.to_string().contains("usable flows"));
}
