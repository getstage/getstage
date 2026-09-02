use super::*;
use crate::models::wireframes::{WireframeBrandSource, WireframeKind, WireframesInput};
use crate::wireframes::helper::artifact::merge_tsx_screens;
use serde_json::json;

fn sample_input() -> WireframesInput {
    WireframesInput {
        project_id: "project_123".to_string(),
        project_name: "Shopify".to_string(),
        project_type: "web-app".to_string(),
        project_type_label: None,
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
        enabled_skill_ids: None,
        enabled_component_pack_ids: None,
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
fn normalization_preserves_valid_catalog_component_ids() {
    let mut screen = sample_screen("homepage", None);
    screen["tsx"] = json!("export default function Screen() { return <main>Home</main>; }");
    screen["catalogComponentIds"] = json!([
        "aceternity-ui/features-section-demo-1",
        "bklit/funnel-chart"
    ]);
    let artifact = json!({ "generatedScreens": [screen] });

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

    assert_eq!(
        normalized["generatedScreens"][0]["catalogComponentIds"],
        json!([
            "aceternity-ui/features-section-demo-1",
            "bklit/funnel-chart"
        ])
    );
}

#[test]
fn normalized_repair_restores_catalog_component_ids_during_merge() {
    let mut repaired_screen = sample_screen("homepage", None);
    repaired_screen["tsx"] =
        json!("export default function Screen() { return <main>Repaired</main>; }");
    repaired_screen["catalogComponentIds"] = json!(["aceternity-ui/features-section-demo-1"]);

    let normalized_repair = normalize_wireframes_artifact(
        json!({ "generatedScreens": [repaired_screen] }),
        &sample_input(),
        WireframeKind::Hifi,
        Some(WireframeBrandSource::StyleGuide),
        Some("direction_1"),
        123,
        "just now",
    )
    .unwrap();
    let mut original = json!({
        "generatedScreens": [{
            "id": "homepage",
            "tsx": "export default function Screen() { return <main>Original</main>; }"
        }]
    });

    merge_tsx_screens(&mut original, &normalized_repair);

    assert_eq!(
        original["generatedScreens"][0]["catalogComponentIds"],
        json!(["aceternity-ui/features-section-demo-1"])
    );
}

#[test]
fn hifi_screens_carry_no_pack_stylesheet_in_react_mode() {
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
        None,
        123,
        "just now",
    )
    .unwrap();

    let html = normalized["generatedScreens"][0]["html"].as_str().unwrap();
    // React mode replaces the fragment with the rendered library output, so the
    // hand-written pack stylesheet is no longer prepended — the fragment stays the
    // model's own markup alone. The non-React prepend is covered below.
    assert!(!html.contains("data-stage-pack"));
    assert!(
        html.contains("Hi-Fi"),
        "the model's own markup must survive"
    );
}

#[test]
fn pack_stylesheet_prepend_marks_the_style_block_for_prompt_stripping() {
    // Non-React Hi-Fi path: the stylesheet rides inside the fragment because the preview
    // iframe, PNG capture, and code export each receive one screen in isolation.
    let html = with_pack_css("<div>Real markup</div>", ".ui-btn{height:36px}");
    assert_eq!(
        html,
        "<style data-stage-pack>.ui-btn{height:36px}</style>\n<div>Real markup</div>"
    );
    assert_eq!(
        with_pack_css("<div>Real markup</div>", ""),
        "<div>Real markup</div>"
    );
}

#[test]
fn lofi_screens_carry_no_component_pack_stylesheet() {
    let artifact = json!({
        "generatedScreens": [sample_screen(
            "homepage",
            Some("<div><style>.hero{color:#111}</style><section>Lo-Fi</section></div>"),
        )]
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

    assert!(
        !normalized["generatedScreens"][0]["html"]
            .as_str()
            .unwrap()
            .contains(".ui-btn")
    );
}

#[test]
fn normalize_rejects_unstyled_hifi_screen_despite_the_pack_stylesheet() {
    let artifact = json!({
        "generatedScreens": [sample_screen("homepage", Some("<div>No styles here</div>"))]
    });

    let error = normalize_wireframes_artifact(
        artifact,
        &sample_input(),
        WireframeKind::Hifi,
        Some(WireframeBrandSource::StyleGuide),
        None,
        123,
        "just now",
    )
    .unwrap_err();

    // The pack stylesheet is attached after validation on purpose; attaching it first
    // would let any fragment satisfy the "must be styled" check.
    assert!(error.to_string().contains("Hi-Fi html"));
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

    let (merged, _failed) = merge_regenerated_screens(
        &existing.to_string(),
        partial,
        &["homepage".to_string()],
        WireframeKind::Hifi,
    )
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
fn appends_a_screen_the_existing_artifact_does_not_have_yet() {
    // The user added a screen after Hi-Fi and generated only that one: it is not in the
    // saved artifact, so it must be appended rather than rejected.
    let existing = json!({
        "stats": { "totalConfigureScreenCount": 1 },
        "configureScreens": [{ "id": "homepage", "title": "Homepage", "required": true, "selected": true }],
        "generatedScreens": [sample_screen("homepage", Some("<div>Home</div>"))]
    });
    let partial = json!({
        "configureScreens": [{ "id": "settings", "title": "Settings", "required": false, "selected": true }],
        "generatedScreens": [sample_screen("settings", Some("<div>Settings</div>"))]
    });

    let (merged, _failed) = merge_regenerated_screens(
        &existing.to_string(),
        partial,
        &["settings".to_string()],
        WireframeKind::Hifi,
    )
    .expect("a screen absent from the saved artifact is new, not an error");

    let screens = merged["generatedScreens"].as_array().unwrap();
    assert_eq!(screens.len(), 2);
    assert_eq!(screens[0]["id"], "homepage", "existing order is stable");
    assert_eq!(screens[1]["id"], "settings", "new screen is appended");
    assert!(screens[0]["html"].as_str().unwrap().contains("Home"));

    let configure = merged["configureScreens"].as_array().unwrap();
    assert_eq!(configure.len(), 2);
    assert_eq!(configure[0]["id"], "homepage");
    assert_eq!(
        configure[1]["id"], "settings",
        "an appended screen is added to the screen list"
    );
    assert_eq!(merged["stats"]["totalConfigureScreenCount"], json!(2));
}

#[test]
fn keeps_an_unrequested_project_screen_the_model_returned_anyway() {
    let existing = json!({
        "stats": { "totalConfigureScreenCount": 3 },
        "configureScreens": [
            { "id": "homepage", "title": "Homepage", "required": true, "selected": true },
            { "id": "pricing", "title": "Pricing", "required": false, "selected": true },
            { "id": "screen-project-dashboard", "title": "Project dashboard", "required": false, "selected": true }
        ],
        "generatedScreens": [
            sample_screen("homepage", Some("<div>Home</div>")),
            sample_screen("pricing", Some("<div>Pricing</div>"))
        ]
    });
    let mut dashboard = sample_screen("screen-project-dashboard", Some("<div>Dashboard</div>"));
    dashboard["tsx"] = json!("export default function Dashboard() { return <main />; }");
    let mut homepage = sample_screen("homepage", Some("<div>New home</div>"));
    homepage["tsx"] = json!("export default function Home() { return <main />; }");
    let partial = json!({
        "generatedScreens": [homepage, dashboard]
    });

    let (merged, _failed) = merge_regenerated_screens(
        &existing.to_string(),
        partial,
        &["homepage".to_string()],
        WireframeKind::Hifi,
    )
    .expect("a bonus project screen should be appended");

    let screens = merged["generatedScreens"].as_array().unwrap();
    assert_eq!(screens.len(), 3);
    assert_eq!(screens[0]["id"], "homepage");
    assert_eq!(screens[1]["id"], "pricing");
    assert_eq!(screens[2]["id"], "screen-project-dashboard");
}

#[test]
fn converting_to_hifi_preserves_the_existing_lofi_result() {
    // Lo-Fi is an independent result. A Hi-Fi conversion may add rendered markup to
    // selected screens, but it must not erase the saved Lo-Fi sections or screens.
    let existing = json!({
        "wireframeKind": "lofi",
        "configureScreens": [
            { "id": "dashboard", "title": "Dashboard", "required": true, "selected": true },
            { "id": "pricing", "title": "Pricing", "required": false, "selected": false }
        ],
        "generatedScreens": [
            sample_screen("dashboard", None),
            sample_screen("pricing", None)
        ]
    });
    let mut converted_dashboard = sample_screen("dashboard", Some("<div>Dashboard</div>"));
    converted_dashboard["sections"] = json!([]);
    let partial = json!({
        "wireframeKind": "hifi",
        "generatedScreens": [converted_dashboard]
    });

    let (merged, _failed) = merge_regenerated_screens(
        &existing.to_string(),
        partial,
        &["dashboard".to_string()],
        WireframeKind::Hifi,
    )
    .expect("a scoped conversion is valid");

    let screens = merged["generatedScreens"].as_array().unwrap();
    assert_eq!(
        screens.len(),
        2,
        "the original Lo-Fi screens remain available"
    );
    assert_eq!(screens[0]["id"], "dashboard");
    assert_eq!(screens[1]["id"], "pricing");
    assert_eq!(
        screens[0]["sections"][0]["id"], "dashboard-hero",
        "the converted screen keeps its original Lo-Fi structure"
    );
    assert_eq!(merged["wireframeKind"], "hifi");
    assert_eq!(
        merged["configureScreens"].as_array().unwrap().len(),
        2,
        "the screen list keeps every screen; only the generated set is scoped"
    );
}

#[test]
fn regenerating_within_the_same_kind_keeps_untouched_screens() {
    // Same kind, so this is a regenerate, not a conversion: screens outside the scope
    // must survive untouched.
    let existing = json!({
        "wireframeKind": "hifi",
        "generatedScreens": [
            sample_screen("dashboard", Some("<div>old</div>")),
            sample_screen("settings", Some("<div>Settings</div>"))
        ]
    });
    let partial = json!({
        "wireframeKind": "hifi",
        "generatedScreens": [sample_screen("dashboard", Some("<div>new</div>"))]
    });

    let (merged, _failed) = merge_regenerated_screens(
        &existing.to_string(),
        partial,
        &["dashboard".to_string()],
        WireframeKind::Hifi,
    )
    .expect("a same-kind regenerate is valid");

    let screens = merged["generatedScreens"].as_array().unwrap();
    assert_eq!(screens.len(), 2, "an out-of-scope screen is preserved");
    assert_eq!(screens[1]["id"], "settings");
}

#[test]
fn rejects_merge_when_none_of_the_requested_ids_come_back() {
    let existing = json!({
        "generatedScreens": [sample_screen("homepage", Some("<div>Home</div>"))]
    });
    // The model answered with a screen nobody asked for.
    let partial = json!({
        "generatedScreens": [sample_screen("blog", Some("<div>Blog</div>"))]
    });

    let error = merge_regenerated_screens(
        &existing.to_string(),
        partial,
        &["homepage".to_string()],
        WireframeKind::Lofi,
    )
    .unwrap_err();

    assert!(
        error
            .to_string()
            .contains("contained none of the requested wireframe screens"),
        "unexpected error: {error}"
    );
}

#[test]
fn scoped_generation_without_a_saved_artifact_keeps_the_normalized_artifact() {
    // First Hi-Fi pass scoped to the two selected screens: there is nothing to merge into,
    // so the normalized artifact must pass through untouched instead of erroring.
    let artifact = json!({
        "artifactKind": "wireframesArtifact",
        "generatedScreens": [
            sample_screen("dashboard", Some("<div>Dashboard</div>")),
            sample_screen("settings", Some("<div>Settings</div>"))
        ]
    });

    let (resolved, _failed) = apply_scoped_screens(
        None,
        artifact.clone(),
        Some(&["dashboard".to_string(), "settings".to_string()]),
        WireframeKind::Hifi,
    )
    .expect("a scoped first pass must not require an existing artifact");

    assert_eq!(resolved, artifact);
}

#[test]
fn lofi_keeps_existing_screen_when_partial_response_omits_a_requested_id() {
    // Lo-Fi screens carry no html, so the unchanged/empty guard does not apply: a
    // partial response merges what it returned and preserves the omitted screen.
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

    let (merged, _failed) = merge_regenerated_screens(
        &existing.to_string(),
        partial,
        &["homepage".to_string(), "pricing".to_string()],
        WireframeKind::Lofi,
    )
    .expect("a partial response should merge what it returned, not fail");

    let screens = merged["generatedScreens"].as_array().unwrap();
    let by_id = |id: &str| {
        screens
            .iter()
            .find(|screen| screen["id"] == id)
            .and_then(|screen| screen["html"].as_str())
    };
    assert_eq!(
        by_id("homepage"),
        Some("new-home"),
        "returned screen is updated"
    );
    assert_eq!(
        by_id("pricing"),
        Some("orig-pricing"),
        "omitted screen is preserved"
    );
}

#[test]
fn rejects_merge_when_partial_screens_are_empty() {
    let existing = json!({
        "generatedScreens": [sample_screen("homepage", None)]
    });
    let partial = json!({ "generatedScreens": [] });

    let error = merge_regenerated_screens(
        &existing.to_string(),
        partial,
        &["homepage".to_string()],
        WireframeKind::Hifi,
    )
    .unwrap_err();

    assert!(
        error
            .to_string()
            .contains("did not contain regenerated wireframe screens")
    );
}

#[test]
fn merge_updates_only_regenerated_screen_timestamp() {
    let existing = json!({
        "generatedScreens": [
            { "id": "homepage", "generatedAt": 100, "generatedAtLabel": "old", "html": "<div>Old home</div>" },
            { "id": "pricing", "generatedAt": 100, "generatedAtLabel": "old", "html": "<div>Old pricing</div>" }
        ]
    });
    // A freshly normalized partial screen carries the new numeric timestamp.
    let partial = json!({
        "generatedScreens": [
            { "id": "homepage", "generatedAt": 999, "generatedAtLabel": "just now", "html": "<div>New home</div>" }
        ],
        "generatedAt": 999,
        "generatedAtLabel": "just now"
    });

    let (merged, _failed) = merge_regenerated_screens(
        &existing.to_string(),
        partial,
        &["homepage".to_string()],
        WireframeKind::Hifi,
    )
    .unwrap();

    let screens = merged["generatedScreens"].as_array().unwrap();
    let field = |id: &str, key: &str| {
        screens.iter().find(|screen| screen["id"] == id).unwrap()[key].clone()
    };
    assert_eq!(
        field("homepage", "generatedAt"),
        json!(999),
        "regenerated screen gets new timestamp"
    );
    assert_eq!(
        field("pricing", "generatedAt"),
        json!(100),
        "untouched screen keeps old timestamp"
    );
}

#[test]
fn rejects_regen_when_every_requested_screen_is_unchanged() {
    // Nothing usable came back, so there is no partial result worth saving.
    let existing = json!({
        "generatedScreens": [{ "id": "homepage", "html": "<div>Same markup</div>" }]
    });
    let partial = json!({
        "generatedScreens": [{ "id": "homepage", "html": "<div>Same markup</div>" }]
    });

    let error = merge_regenerated_screens(
        &existing.to_string(),
        partial,
        &["homepage".to_string()],
        WireframeKind::Hifi,
    )
    .unwrap_err();

    assert!(
        error.to_string().contains("came back usable"),
        "unexpected error: {error}"
    );
}

#[test]
fn saves_the_screens_that_worked_when_one_screen_fails() {
    // A ten-minute run that produced three good screens must land those three. The
    // failed screen keeps its saved design and is named back to the caller.
    let existing = json!({
        "generatedScreens": [
            { "id": "homepage", "html": "<div>Old home</div>" },
            { "id": "pricing", "html": "<div>Old pricing</div>" },
            { "id": "signup", "html": "<div>Old signup</div>" }
        ]
    });
    // pricing came back byte-identical, signup came back empty; homepage is genuinely new.
    let partial = json!({
        "generatedScreens": [
            { "id": "homepage", "html": "<div>New home</div>" },
            { "id": "pricing", "html": "<div>Old pricing</div>" },
            { "id": "signup", "html": "" }
        ]
    });

    let (merged, failed) = merge_regenerated_screens(
        &existing.to_string(),
        partial,
        &[
            "homepage".to_string(),
            "pricing".to_string(),
            "signup".to_string(),
        ],
        WireframeKind::Hifi,
    )
    .expect("a partial result must still save");

    let screens = merged["generatedScreens"].as_array().unwrap();
    let html = |id: &str| {
        screens
            .iter()
            .find(|screen| screen["id"] == id)
            .and_then(|screen| screen["html"].as_str())
    };

    assert_eq!(html("homepage"), Some("<div>New home</div>"));
    assert_eq!(
        html("pricing"),
        Some("<div>Old pricing</div>"),
        "an unchanged screen keeps its saved design"
    );
    assert_eq!(
        html("signup"),
        Some("<div>Old signup</div>"),
        "an empty response never overwrites a saved design"
    );
    assert_eq!(failed, vec!["pricing".to_string(), "signup".to_string()]);
}

#[test]
fn accepts_regen_when_html_changed() {
    let existing = json!({
        "generatedScreens": [{ "id": "homepage", "html": "<div>Old layout</div>" }]
    });
    let partial = json!({
        "generatedScreens": [{ "id": "homepage", "html": "<div>New layout entirely</div>" }]
    });

    let (merged, _failed) = merge_regenerated_screens(
        &existing.to_string(),
        partial,
        &["homepage".to_string()],
        WireframeKind::Hifi,
    )
    .unwrap();

    assert!(
        merged["generatedScreens"][0]["html"]
            .as_str()
            .unwrap()
            .contains("New layout entirely")
    );
}

#[test]
fn keeps_the_returned_screen_when_another_requested_id_is_omitted() {
    let existing = json!({
        "generatedScreens": [
            { "id": "homepage", "html": "<div>Home</div>" },
            { "id": "pricing", "html": "<div>Pricing</div>" }
        ]
    });
    // The model returned only homepage. Pricing keeps its saved design and is reported,
    // but homepage still lands — the run is not thrown away over the missing screen.
    let partial = json!({
        "generatedScreens": [{ "id": "homepage", "html": "<div>New home</div>" }]
    });

    let (merged, failed) = merge_regenerated_screens(
        &existing.to_string(),
        partial,
        &["homepage".to_string(), "pricing".to_string()],
        WireframeKind::Hifi,
    )
    .expect("one omitted screen must not discard the one that worked");

    let screens = merged["generatedScreens"].as_array().unwrap();
    assert_eq!(screens[0]["html"], "<div>New home</div>");
    assert_eq!(screens[1]["html"], "<div>Pricing</div>");
    assert_eq!(failed, vec!["pricing".to_string()]);
}

#[test]
fn rejects_regen_when_the_only_requested_screen_comes_back_empty() {
    let existing = json!({
        "generatedScreens": [{ "id": "homepage", "html": "<div>Home</div>" }]
    });
    let partial = json!({
        "generatedScreens": [{ "id": "homepage", "html": "   " }]
    });

    let error = merge_regenerated_screens(
        &existing.to_string(),
        partial,
        &["homepage".to_string()],
        WireframeKind::Hifi,
    )
    .unwrap_err();

    assert!(
        error.to_string().contains("came back usable"),
        "unexpected error: {error}"
    );
}

#[test]
fn drops_only_the_invalid_hifi_screen_and_keeps_the_valid_ones() {
    let artifact = json!({
        "generatedScreens": [
            sample_screen(
                "homepage",
                Some("<div><style>.hero{color:#111}</style><section class=\"hero\">Hi-Fi</section></div>"),
            ),
            sample_screen("broken", Some("<div>No styles here</div>")),
        ]
    });

    let normalized = normalize_wireframes_artifact(
        artifact,
        &sample_input(),
        WireframeKind::Hifi,
        Some(WireframeBrandSource::StyleGuide),
        None,
        123,
        "just now",
    )
    .expect("one invalid screen must not fail a run that produced a valid one");

    let screens = normalized["generatedScreens"].as_array().unwrap();
    assert_eq!(screens.len(), 1);
    assert_eq!(screens[0]["id"], "homepage");
}

#[test]
fn tsx_screen_keeps_its_html_fallback_without_html_era_validation() {
    // React mode: the model's html is a transient fallback that the renderer replaces.
    // A fallback the HTML-era validation would reject (Tailwind classes instead of
    // inline styles, hidden siblings) must not drop the screen or the run.
    let mut screen = sample_screen(
        "wizard",
        Some(
            r#"<div><style>.step{padding:16px}</style>
            <div class="step flex">Active step</div>
            <div class="step" style="display:none">Later step</div>
            <div class="step" style="display:none">Later step</div>
        </div>"#,
        ),
    );
    screen["tsx"] = json!("export default function Screen() { return <div />; }");

    let normalized = normalize_wireframes_artifact(
        json!({ "generatedScreens": [screen] }),
        &sample_input(),
        WireframeKind::Hifi,
        Some(WireframeBrandSource::StyleGuide),
        None,
        123,
        "just now",
    )
    .expect("a TSX screen must survive an html fallback the old validator rejects");

    let saved = &normalized["generatedScreens"][0];
    assert!(saved["tsx"].as_str().unwrap().contains("function Screen"));
    assert!(saved["html"].as_str().unwrap().contains("Active step"));
}

#[test]
fn validate_hifi_html_accepts_tailwind_visible_classes() {
    // The active step uses Tailwind layout utilities instead of an inline display
    // style; only the siblings are hidden. That shell renders fine.
    assert!(
        validate_hifi_html(
            r#"<div><style>.step{padding:16px}</style>
                <div class="step flex flex-col"><h1>Step one</h1></div>
                <div class="step" style="display:none">Step two</div>
                <div class="step" style="display:none">Step three</div>
            </div>"#
        )
        .is_ok()
    );
}

#[test]
fn validate_hifi_html_rejects_unstyled_or_raw_css() {
    // Raw CSS text with no elements at all.
    assert!(validate_hifi_html(".hero{color:#111}").is_err());
    // Layout element but no styling.
    assert!(validate_hifi_html("<div>No styles here</div>").is_err());
    // Inline style is enough.
    assert!(validate_hifi_html("<div style=\"color:#111\">Hi</div>").is_ok());
    // A <style> block plus a semantic layout element.
    assert!(validate_hifi_html("<style>.h{color:#111}</style><section>Hi</section>").is_ok());
}

#[test]
fn sanitize_strips_scripts_handlers_and_links() {
    let raw = r#"<div style="color:#111">
        <link rel="stylesheet" href="https://evil.example/x.css">
        <button onclick="alert(1)">Continue signup flow</button>
        <script>document.querySelector('.step-2').style.display='block'</script>
        <style>@import url("https://evil.example/pack.css"); .ok{color:red}</style>
        <p>Visible step copy here</p>
    </div>"#;
    let cleaned = sanitize_hifi_html(raw);
    assert!(!cleaned.to_ascii_lowercase().contains("<script"));
    assert!(!cleaned.to_ascii_lowercase().contains("<link"));
    assert!(!cleaned.contains("onclick"));
    assert!(!cleaned.to_ascii_lowercase().contains("@import url"));
    assert!(cleaned.contains("Visible step copy here"));
}

#[test]
fn normalize_strips_scripts_from_saved_hifi_html() {
    let artifact = json!({
        "generatedScreens": [sample_screen(
            "onboarding",
            Some(r#"<div><style>.card{padding:24px}</style>
                <div class="card"><h1>Invite your team</h1><p>Send seats to collaborators.</p></div>
                <script>window.ready=true</script></div>"#),
        )]
    });

    let normalized = normalize_wireframes_artifact(
        artifact,
        &sample_input(),
        WireframeKind::Hifi,
        Some(WireframeBrandSource::StyleGuide),
        None,
        123,
        "just now",
    )
    .unwrap();

    let html = normalized["generatedScreens"][0]["html"].as_str().unwrap();
    assert!(!html.to_ascii_lowercase().contains("<script"));
    assert!(html.contains("Invite your team"));
}

#[test]
fn normalize_rejects_hifi_shell_with_only_hidden_steps() {
    let artifact = json!({
        "generatedScreens": [sample_screen(
            "wizard",
            Some(r#"<div><style>.step{padding:16px}</style>
                <div class="step" style="display:none"><h1>Step one copy</h1></div>
                <div class="step" style="display:none"><h1>Step two copy</h1></div>
            </div>"#),
        )]
    });

    let error = normalize_wireframes_artifact(
        artifact,
        &sample_input(),
        WireframeKind::Hifi,
        Some(WireframeBrandSource::StyleGuide),
        None,
        123,
        "just now",
    )
    .unwrap_err();

    assert!(error.to_string().contains("visible content"));
}

#[test]
fn normalize_rejects_hifi_screen_with_raw_css_html() {
    let artifact = json!({
        "generatedScreens": [sample_screen("homepage", Some(".lim-welcome{color:#111}"))]
    });

    let error = normalize_wireframes_artifact(
        artifact,
        &sample_input(),
        WireframeKind::Hifi,
        Some(WireframeBrandSource::StyleGuide),
        None,
        123,
        "just now",
    )
    .unwrap_err();

    assert!(error.to_string().contains("Hi-Fi html"));
}

#[test]
fn normalize_sets_per_screen_generated_at() {
    let artifact = json!({
        "generatedScreens": [sample_screen("homepage", None)]
    });

    let normalized = normalize_wireframes_artifact(
        artifact,
        &sample_input(),
        WireframeKind::Lofi,
        None,
        None,
        1_700_000_000_123,
        "just now",
    )
    .unwrap();

    assert_eq!(
        normalized["generatedScreens"][0]["generatedAt"],
        1_700_000_000_123_i64
    );
    assert_eq!(
        normalized["generatedScreens"][0]["generatedAtLabel"],
        "just now"
    );
}
