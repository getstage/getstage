use super::*;

fn input() -> FlowsInput {
    FlowsInput {
        project_id: "p1".to_string(),
        project_name: "Project".to_string(),
        project_type: "app-design".to_string(),
        project_type_label: None,
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
fn flows_prompt_states_the_project_type_and_its_screen_guidance() {
    let prompt = build_flows_prompt(&input());

    assert!(prompt.contains("- Project type: app-design"));
    // Flows produces the screen list wireframes builds on, so an app project must not be
    // planned as a marketing site here either.
    assert!(prompt.contains("This is an application project"));
    assert!(prompt.contains("Do NOT default to marketing pages"));
}

#[test]
fn flows_prompt_falls_back_when_the_project_type_is_missing() {
    let mut input = input();
    input.project_type = String::new();

    let prompt = build_flows_prompt(&input);

    assert!(prompt.contains("- Project type: unspecified"));
    assert!(prompt.contains("Derive the screen set from the saved artifacts"));
}
