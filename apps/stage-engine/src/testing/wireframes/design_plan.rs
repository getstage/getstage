use serde_json::json;

use super::*;

fn valid_plan_json() -> serde_json::Value {
    json!({
        "schemaVersion": "1",
        "aestheticThesis": "Calm operational canvas with amber decision accents",
        "targetAudience": "Agency design leads",
        "designSystem": {
            "typography": {
                "display": "Cormorant Garamond for editorial moments",
                "body": "Inter for application content",
                "label": "Inter medium uppercase",
                "data": "Inter tabular numerals"
            },
            "palette": {
                "background": "Stone 50",
                "surface": "White",
                "foreground": "Stone 950",
                "muted": "Stone 500",
                "accent": "Amber 600",
                "border": "Stone 200",
                "semantic": "Red, amber, and green reserved for status"
            },
            "spacingScale": ["4", "8", "16", "24", "32"],
            "radii": ["8", "16"],
            "elevation": ["flat", "raised"],
            "surfaceTreatment": "Warm white planes separated by thin stone borders",
            "iconTreatment": "Lucide 18px, 1.75 stroke",
            "informationDensity": "Compact operational density",
            "visualVariance": "Editorial entry screen, dense operational screens",
            "motion": {
                "principle": "Motion only explains state change",
                "durations": "120ms feedback, 220ms disclosure",
                "easing": "ease-out enter, ease-in-out movement",
                "reducedMotion": "Remove transforms and preserve state feedback"
            }
        },
        "sharedPatterns": {
            "navigation": "Left rail with stable project context",
            "forms": "Persistent labels and inline errors",
            "tablesAndLists": "Sticky headers and row actions on focus",
            "feedback": "Inline status plus toast for completion",
            "emptyStates": "Explain the missing input and one next action",
            "validation": "Validate on blur and submit",
            "loading": "Skeletons preserve final geometry",
            "modalDialog": "Use only for bounded confirmation"
        },
        "screens": [{
            "screenId": "dashboard",
            "purpose": "Prioritise active client decisions",
            "screenRole": "operate",
            "layoutArchetype": "rail + work queue + contextual detail",
            "density": "compact",
            "informationHierarchy": ["Urgent decisions", "Upcoming milestones"],
            "contentRequirements": ["Real client names and decision deadlines from strategy"],
            "flowContext": "Opened from project overview; selection opens decision detail",
            "componentRecipe": [{
                "libraryId": "shadcn-ui",
                "exportName": "Table",
                "purpose": "Comparable decision queue",
                "placement": "Main workspace",
                "requiredProps": [],
                "motionPurpose": "none",
                "signature": false
            }],
            "motionPurpose": "Selection feedback only",
            "avoidList": ["No decorative KPI card row"]
        }],
        "conflictResolutions": [],
        "avoidList": ["No generic gradient hero"]
    })
}

#[test]
fn accepts_complete_plan_covering_expected_screens() {
    let plan: WireframeDesignPlan = serde_json::from_value(valid_plan_json()).unwrap();

    plan.validate(&["dashboard".to_string()]).unwrap();
}

#[test]
fn rejects_plan_missing_a_target_screen() {
    let plan: WireframeDesignPlan = serde_json::from_value(valid_plan_json()).unwrap();

    let error = plan.validate(&["settings".to_string()]).unwrap_err();

    assert!(error.to_string().contains("missing screen recipe settings"));
}

#[test]
fn rejects_empty_component_recipe() {
    let mut value = valid_plan_json();
    value["screens"][0]["componentRecipe"] = json!([]);
    let plan: WireframeDesignPlan = serde_json::from_value(value).unwrap();

    let error = plan.validate(&[]).unwrap_err();

    assert!(error.to_string().contains("empty component recipe"));
}

#[test]
fn rejects_generic_and_repeated_screen_layouts() {
    let mut generic = valid_plan_json();
    generic["screens"][0]["layoutArchetype"] = json!("standard dashboard");
    let generic_plan: WireframeDesignPlan = serde_json::from_value(generic).unwrap();
    assert_eq!(
        generic_plan
            .validate(&[])
            .unwrap_err()
            .to_string()
            .contains("generic layout archetype"),
        true
    );

    let mut repeated = valid_plan_json();
    let mut second = repeated["screens"][0].clone();
    second["screenId"] = json!("settings");
    repeated["screens"].as_array_mut().unwrap().push(second);
    let repeated_plan: WireframeDesignPlan = serde_json::from_value(repeated).unwrap();
    assert_eq!(
        repeated_plan
            .validate(&[])
            .unwrap_err()
            .to_string()
            .contains("repeats layout archetype"),
        true
    );
}

#[test]
fn extracts_wrapped_plan_from_provider_prose() {
    let text = format!(
        "Here is the result:\n{}",
        json!({ "designPlan": valid_plan_json() })
    );

    let plan = extract_design_plan(&text, &["dashboard".to_string()]).unwrap();

    assert_eq!(plan.screens[0].screen_id, "dashboard");
}

#[test]
fn reuses_valid_plan_from_existing_artifact() {
    let artifact = json!({ "artifactKind": "wireframesArtifact", "designPlan": valid_plan_json() });

    let plan =
        design_plan_from_artifact(&artifact.to_string(), &["dashboard".to_string()]).unwrap();

    assert_eq!(
        plan.aesthetic_thesis,
        "Calm operational canvas with amber decision accents"
    );
}

#[test]
fn target_scope_wins_screen_id_resolution() {
    let targets = vec![
        "settings".to_string(),
        "settings".to_string(),
        "billing".to_string(),
    ];
    let flows = json!({ "screens": [{ "id": "dashboard" }] }).to_string();

    let ids = expected_screen_ids(None, Some(&flows), Some(&targets));

    assert_eq!(ids, vec!["settings", "billing"]);
}

#[test]
fn full_run_uses_flow_screen_ids() {
    let flows = json!({
        "screens": [{ "id": "dashboard" }, { "id": "settings" }, { "id": "dashboard" }]
    })
    .to_string();

    let ids = expected_screen_ids(None, Some(&flows), None);

    assert_eq!(ids, vec!["dashboard", "settings"]);
}
