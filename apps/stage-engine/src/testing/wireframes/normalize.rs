use super::*;
use crate::models::wireframes::{WireframeBrandSource, WireframeKind, WireframesInput};
use serde_json::json;

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
        existing_wireframes_artifact_id: None,
        existing_wireframes_artifact_json: None,
    }
}

fn sample_screen(id: &str, html: Option<&str>) -> serde_json::Value {
    let mut screen = json!({
        "id": id,
        "title": id,
        "priority": "P0",
        "sections": [{
            "id": format!("{id}-hero"),
            "title": "Hero",
            "blocks": [{
                "id": format!("{id}-hero-block"),
                "kind": "hero",
                "intent": "Lead with the value proposition.",
                "emphasis": "primary",
                "copySlots": { "headline": "Wholesale onboarding" }
            }]
        }]
    });

    if let Some(html) = html {
        screen["html"] = json!(html);
    }

    screen
}

#[test]
fn normalizes_lofi_screen_with_valid_blocks() {
    let artifact = json!({
        "title": "Project Wireframes",
        "generatedScreens": [sample_screen("homepage", None)]
    });

    let normalized = normalize_wireframes_artifact(
        artifact,
        &sample_input(),
        WireframeKind::Lofi,
        None,
        None,
        1_700_000_000_000,
        "just now",
    )
    .unwrap();

    assert_eq!(normalized["artifactKind"], "wireframesArtifact");
    assert_eq!(normalized["wireframeKind"], "lofi");
    assert_eq!(normalized["projectId"], "project_123");
    assert_eq!(normalized["generatedScreens"][0]["id"], "homepage");
    assert_eq!(
        normalized["generatedScreens"][0]["sections"][0]["blocks"][0]["kind"],
        "hero"
    );
    assert_eq!(normalized["generatedAt"], 1_700_000_000_000_i64);
}

#[test]
fn preserves_hifi_html_field() {
    let artifact = json!({
        "generatedScreens": [sample_screen(
            "homepage",
            Some("<div><style>.hero{color:#111}</style><section class=\"hero\">Hi-Fi</section></div>"),
        )]
    });

    let normalized = normalize_wireframes_artifact(
        artifact,
        &sample_input(),
        WireframeKind::Hifi,
        Some(WireframeBrandSource::StyleGuide),
        Some("direction_1"),
        123,
        "just now",
    )
    .unwrap();

    assert_eq!(normalized["wireframeKind"], "hifi");
    assert_eq!(normalized["brandSource"], "style-guide");
    assert_eq!(normalized["styleDirectionId"], "direction_1");
    assert!(
        normalized["generatedScreens"][0]["html"]
            .as_str()
            .unwrap()
            .contains("Hi-Fi")
    );
}

#[test]
fn drops_blocks_with_unknown_kind() {
    let artifact = json!({
        "generatedScreens": [{
            "id": "homepage",
            "title": "Homepage",
            "sections": [{
                "id": "homepage-hero",
                "title": "Hero",
                "blocks": [
                    { "id": "valid", "kind": "hero", "intent": "Valid block." },
                    { "id": "invalid", "kind": "mystery-widget", "intent": "Should drop." }
                ]
            }]
        }]
    });

    let normalized = normalize_wireframes_artifact(
        artifact,
        &sample_input(),
        WireframeKind::Lofi,
        None,
        None,
        123,
        "just now",
    )
    .unwrap();

    let blocks = &normalized["generatedScreens"][0]["sections"][0]["blocks"];
    assert_eq!(blocks.as_array().unwrap().len(), 1);
    assert_eq!(blocks[0]["kind"], "hero");
}

#[test]
fn rejects_empty_generated_screens() {
    let artifact = json!({ "generatedScreens": [] });

    let error = normalize_wireframes_artifact(
        artifact,
        &sample_input(),
        WireframeKind::Lofi,
        None,
        None,
        123,
        "just now",
    )
    .unwrap_err();

    assert!(error.to_string().contains("usable wireframe screens"));
}

#[test]
fn merges_regenerated_screens_into_existing_artifact() {
    let existing = json!({
        "artifactKind": "wireframesArtifact",
        "generatedScreens": [
            sample_screen("homepage", Some("<div>Old homepage</div>")),
            sample_screen("pricing", Some("<div>Old pricing</div>"))
        ]
    });
    let partial = json!({
        "generatedScreens": [sample_screen("homepage", Some("<div>New homepage</div>"))],
        "generatedAt": 456,
        "generatedAtLabel": "updated"
    });

    let merged =
        merge_regenerated_screens(&existing.to_string(), partial, &["homepage".to_string()])
            .unwrap();

    let screens = merged["generatedScreens"].as_array().unwrap();
    assert_eq!(screens.len(), 2);
    assert!(
        screens[0]["html"]
            .as_str()
            .unwrap()
            .contains("New homepage")
    );
    assert!(screens[1]["html"].as_str().unwrap().contains("Old pricing"));
    assert_eq!(merged["generatedAt"], 456);
    assert_eq!(merged["generatedAtLabel"], "updated");
}

#[test]
fn rejects_merge_when_existing_screen_is_missing() {
    let existing = json!({
        "generatedScreens": [sample_screen("homepage", None)]
    });
    let partial = json!({
        "generatedScreens": [sample_screen("pricing", None)]
    });

    let error = merge_regenerated_screens(&existing.to_string(), partial, &["pricing".to_string()])
        .unwrap_err();

    assert!(
        error
            .to_string()
            .contains("was not found in the existing wireframes artifact")
    );
}

#[test]
fn keeps_existing_screen_when_partial_response_omits_a_requested_id() {
    let existing = json!({
        "generatedScreens": [
            sample_screen("homepage", Some("old-home")),
            sample_screen("pricing", Some("orig-pricing"))
        ]
    });
    // The model returned only homepage even though pricing was also requested.
    let partial = json!({
        "generatedScreens": [sample_screen("homepage", Some("new-home"))]
    });

    let merged = merge_regenerated_screens(
        &existing.to_string(),
        partial,
        &["homepage".to_string(), "pricing".to_string()],
    )
    .expect("a partial response should merge what it returned, not fail");

    let screens = merged["generatedScreens"].as_array().unwrap();
    let by_id = |id: &str| {
        screens
            .iter()
            .find(|screen| screen["id"] == id)
            .and_then(|screen| screen["html"].as_str())
    };
    assert_eq!(by_id("homepage"), Some("new-home"), "returned screen is updated");
    assert_eq!(by_id("pricing"), Some("orig-pricing"), "omitted screen is preserved");
}

#[test]
fn rejects_merge_when_partial_screens_are_empty() {
    let existing = json!({
        "generatedScreens": [sample_screen("homepage", None)]
    });
    let partial = json!({ "generatedScreens": [] });

    let error =
        merge_regenerated_screens(&existing.to_string(), partial, &["homepage".to_string()])
            .unwrap_err();

    assert!(
        error
            .to_string()
            .contains("did not contain regenerated wireframe screens")
    );
}
