use serde_json::json;

use super::*;

fn plan_with_screens(screens: JsonValue) -> WireframeDesignPlan {
    serde_json::from_value(json!({
        "schemaVersion": "1",
        "aestheticThesis": "Editorial operations desk with decisive amber accents",
        "targetAudience": "Agency design leads",
        "designSystem": {
            "typography": {
                "display": "Editorial serif",
                "body": "Neutral sans",
                "label": "Medium uppercase sans",
                "data": "Tabular sans"
            },
            "palette": {
                "background": "Warm canvas",
                "surface": "Paper white",
                "foreground": "Ink",
                "muted": "Stone",
                "accent": "Amber",
                "border": "Stone line",
                "semantic": "Reserved red amber green"
            },
            "spacingScale": ["4", "8", "16", "24"],
            "radii": ["8", "16"],
            "elevation": ["flat", "raised"],
            "surfaceTreatment": "Warm paper and thin ink dividers",
            "iconTreatment": "Lucide 18px with labels",
            "informationDensity": "Compact operations",
            "visualVariance": "Editorial overview and dense work screens",
            "motion": {
                "principle": "Only spatial continuity",
                "durations": "120ms to 220ms",
                "easing": "ease-out",
                "reducedMotion": "Remove transforms"
            }
        },
        "sharedPatterns": {
            "navigation": "Persistent rail",
            "forms": "Persistent labels",
            "tablesAndLists": "Sticky headers",
            "feedback": "Inline status",
            "emptyStates": "One next action",
            "validation": "On blur and submit",
            "loading": "Stable skeleton geometry",
            "modalDialog": "Bounded confirmation only"
        },
        "screens": screens,
        "conflictResolutions": [],
        "avoidList": ["No repeated generic card grids", "No decorative charts"]
    }))
    .unwrap()
}

fn screen(id: &str, export_name: &str, signature: bool) -> JsonValue {
    json!({
        "screenId": id,
        "purpose": "Resolve the next project decision",
        "screenRole": "operate",
        "layoutArchetype": "Rail plus priority queue and contextual detail",
        "density": "compact",
        "informationHierarchy": ["Urgent decision", "Supporting evidence"],
        "contentRequirements": ["Real decision title and deadline"],
        "flowContext": "Opened from overview; action advances to review",
        "componentRecipe": [{
            "libraryId": "shadcn-ui",
            "exportName": export_name,
            "purpose": "primary action",
            "placement": "decision footer",
            "requiredProps": if export_name == "Button" { json!(["type"]) } else { json!([]) },
            "motionPurpose": "none",
            "signature": signature
        }],
        "motionPurpose": "none — immediate operational action",
        "avoidList": ["No decorative status"]
    })
}

#[test]
fn rejects_plan_components_outside_selected_runtime_libraries() {
    let mut planned = screen("dashboard", "ShimmerButton", true);
    let component = &mut planned["componentRecipe"][0];
    component["libraryId"] = json!("magic-ui");
    component["requiredProps"] = json!(["children"]);
    let mut plan = plan_with_screens(json!([planned]));

    let error = validate_design_plan_libraries(&mut plan, &["shadcn-ui".to_string()]).unwrap_err();

    assert!(error.to_string().contains("magic-ui:ShimmerButton"));
}

#[test]
fn rejects_unjustified_signature_repetition_across_screens() {
    let mut plan = plan_with_screens(json!([
        screen("dashboard", "Button", true),
        screen("settings", "Button", true)
    ]));

    let error = validate_design_plan_libraries(&mut plan, &["shadcn-ui".to_string()]).unwrap_err();

    assert!(
        error
            .to_string()
            .contains("repeated across unrelated screens")
    );
}

#[test]
fn hydrates_manifest_required_props_omitted_by_the_provider() {
    let mut planned = screen("signup", "AuroraText", true);
    let component = &mut planned["componentRecipe"][0];
    component["libraryId"] = json!("magic-ui");
    component["requiredProps"] = json!([]);
    let mut plan = plan_with_screens(json!([planned]));

    validate_design_plan_libraries(
        &mut plan,
        &["shadcn-ui".to_string(), "magic-ui".to_string()],
    )
    .unwrap();

    assert_eq!(
        plan.screens[0].component_recipe[0].required_props,
        ["children"]
    );
}

#[test]
fn accepts_exact_recipe_import_and_rendered_component() {
    let mut plan = plan_with_screens(json!([screen("dashboard", "Button", true)]));
    let artifact = json!({
        "generatedScreens": [{
            "id": "dashboard",
            "tsx": "import { Button } from \"@stage/base\";\nexport default function Screen(){ return <Button type=\"button\">Review</Button>; }"
        }]
    });

    validate_design_plan_libraries(&mut plan, &["shadcn-ui".to_string()]).unwrap();
    let failures = validate_artifact_against_plan(
        &artifact,
        &plan,
        &["shadcn-ui".to_string()],
        &["dashboard".to_string()],
    )
    .unwrap();

    assert!(failures.is_empty());
}

#[test]
fn reports_missing_and_unplanned_screen_implementation() {
    let plan = plan_with_screens(json!([
        screen("dashboard", "Button", true),
        screen("settings", "Button", false)
    ]));
    let artifact = json!({
        "generatedScreens": [{
            "id": "dashboard",
            "tsx": "import { Button, Card } from \"@stage/base\";\nexport default function Screen(){ return <Card><Button>Review</Button></Card>; }"
        }]
    });

    let failures = validate_artifact_against_plan(
        &artifact,
        &plan,
        &["shadcn-ui".to_string()],
        &["dashboard".to_string(), "settings".to_string()],
    )
    .unwrap();

    assert_eq!(failures.len(), 2);
    assert!(
        failures
            .iter()
            .any(|failure| failure.error.contains("recipe mismatch"))
    );
    assert!(
        failures
            .iter()
            .any(|failure| failure.error.contains("omitted"))
    );
}

#[test]
fn merges_multiple_gate_failures_into_one_repair_per_screen() {
    let merged = merge_quality_failures(
        vec![RenderFailure {
            id: "dashboard".to_string(),
            tsx: "old".to_string(),
            error: "plan mismatch".to_string(),
        }],
        vec![RenderFailure {
            id: "dashboard".to_string(),
            tsx: "new".to_string(),
            error: "render failed".to_string(),
        }],
    );

    assert_eq!(merged.len(), 1);
    assert_eq!(merged[0].tsx, "old");
    assert!(merged[0].error.contains("plan mismatch\nrender failed"));
}

#[test]
fn requires_observable_motion_when_the_plan_specifies_it() {
    let mut planned = screen("dashboard", "Card", false);
    planned["motionPurpose"] = json!("Explain transition from draft to approved");
    let plan = plan_with_screens(json!([planned]));
    let artifact = json!({
        "generatedScreens": [{
            "id": "dashboard",
            "tsx": "import { Card } from \"@stage/base\";\nexport default function Screen(){ return <Card>Approval</Card>; }"
        }]
    });

    let failures = validate_artifact_against_plan(
        &artifact,
        &plan,
        &["shadcn-ui".to_string()],
        &["dashboard".to_string()],
    )
    .unwrap();

    assert_eq!(failures.len(), 1);
    assert!(failures[0].error.contains("specifies purposeful motion"));
}
