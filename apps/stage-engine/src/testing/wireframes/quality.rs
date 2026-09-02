use serde_json::{Value as JsonValue, json};

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

    assert!(error.to_string().contains("unselected library `magic-ui`"));
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
fn does_not_invent_props_from_a_removed_static_manifest() {
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

    assert!(
        plan.screens[0].component_recipe[0]
            .required_props
            .is_empty()
    );
}
