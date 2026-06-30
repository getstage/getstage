use super::*;
use crate::models::wireframes::{WireframeBrandSource, WireframeKind, WireframesInput};

fn sample_input() -> WireframesInput {
    WireframesInput {
        project_id: "project_123".to_string(),
        project_name: "Shopify".to_string(),
        strategy_artifact_id: "strategy_1".to_string(),
        strategy_artifact_json: "{}".to_string(),
        research_artifact_id: None,
        research_artifact_json: None,
        moodboard_artifact_id: None,
        moodboard_artifact_json: None,
        flows_artifact_id: None,
        flows_artifact_json: None,
        existing_wireframes_artifact_id: Some("wireframes_1".to_string()),
        existing_wireframes_artifact_json: Some(
            r#"{"generatedScreens":[{"id":"homepage"}]}"#.to_string(),
        ),
    }
}

#[test]
fn includes_partial_regeneration_block_when_screen_ids_provided() {
    let prompt = build_wireframes_prompt(
        &sample_input(),
        WireframeKind::Hifi,
        Some(WireframeBrandSource::StyleGuide),
        Some("direction_1"),
        None,
        false,
        Some(&["homepage".to_string(), "pricing".to_string()]),
    );

    assert!(prompt.contains("PARTIAL REGENERATION"));
    assert!(prompt.contains("homepage, pricing"));
    assert!(prompt.contains("Previous wireframes artifact"));
}

#[test]
fn omits_partial_regeneration_block_when_screen_ids_are_absent() {
    let prompt = build_wireframes_prompt(
        &sample_input(),
        WireframeKind::Hifi,
        Some(WireframeBrandSource::StyleGuide),
        Some("direction_1"),
        None,
        false,
        None,
    );

    assert!(!prompt.contains("PARTIAL REGENERATION"));
}
