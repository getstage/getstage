use crate::models::errors::EngineErrorCode;
use crate::models::providers::ProviderId;
use crate::models::runs::StartRunRequest;
use crate::wireframes::helper::artifact::{
    is_scoped_regeneration_request, merge_tsx_screens, missing_screen_ids,
    selected_moodboard_asset_keys, validate_single_screen_response,
};
use crate::wireframes::helper::error::WorkflowError;
use crate::wireframes::helper::source::{
    parse_brand_source_from_source, parse_kind_from_source, parse_screens_from_source,
    parse_style_direction_from_source, parse_token,
};
use crate::wireframes::helper::workspace::configure_provider_workspace_call;
use crate::wireframes::provider_workspace::ProviderCallFiles;

#[test]
fn parses_kind_brand_and_style_direction_from_source() {
    let source = "kind:hifi,brand:style-guide,style-direction:dir_42";

    assert_eq!(parse_kind_from_source(source), Some("hifi"));
    assert_eq!(parse_brand_source_from_source(source), Some("style-guide"));
    assert_eq!(parse_style_direction_from_source(source), Some("dir_42"));
}

#[test]
fn parses_multiple_screen_ids_from_semicolon_delimited_token() {
    let source = "kind:hifi,brand:brand-kit,screens:homepage;pricing;checkout";

    assert_eq!(
        parse_screens_from_source(source),
        Some(vec![
            "homepage".to_string(),
            "pricing".to_string(),
            "checkout".to_string()
        ])
    );
}

#[test]
fn returns_none_when_screens_token_is_empty() {
    let source = "kind:hifi,screens:";

    assert_eq!(parse_screens_from_source(source), None);
}

#[test]
fn parse_token_splits_on_commas_not_semicolons() {
    let source = "kind:hifi,screens:screen-a;screen-b";

    assert_eq!(parse_token(source, "screens:"), Some("screen-a;screen-b"));
}

#[test]
fn accepts_exactly_one_complete_requested_screen_response() {
    let artifact = serde_json::json!({
        "generatedScreens": [{
            "id": "dashboard",
            "tsx": "export default function Screen(){ return <main>Dashboard</main>; }"
        }]
    });

    let screen = validate_single_screen_response(&artifact, "dashboard").unwrap();

    assert_eq!(
        screen.get("id").and_then(serde_json::Value::as_str),
        Some("dashboard")
    );
}

#[test]
fn rejects_wrong_extra_or_output_only_screen_responses() {
    let wrong = serde_json::json!({
        "generatedScreens": [{"id": "settings", "tsx": "export default function Screen(){}"}]
    });
    let extra = serde_json::json!({
        "generatedScreens": [
            {"id": "dashboard", "tsx": "export default function Screen(){}"},
            {"id": "settings", "tsx": "export default function Screen(){}"}
        ]
    });
    let output_only = serde_json::json!({
        "generatedScreens": [{"id": "dashboard", "html": "<main>Fallback</main>"}]
    });

    assert!(validate_single_screen_response(&wrong, "dashboard").is_err());
    assert!(validate_single_screen_response(&extra, "dashboard").is_err());
    assert!(validate_single_screen_response(&output_only, "dashboard").is_err());
}

#[test]
fn repair_merge_replaces_existing_and_restores_missing_screens() {
    let mut target = serde_json::json!({
        "generatedScreens": [{"id": "dashboard", "tsx": "old", "html": "old"}]
    });
    let repair = serde_json::json!({
        "generatedScreens": [
            {"id": "dashboard", "tsx": "fixed", "html": "fixed"},
            {"id": "settings", "tsx": "restored", "html": "restored"}
        ]
    });

    merge_tsx_screens(&mut target, &repair);

    let screens = target["generatedScreens"].as_array().unwrap();
    assert_eq!(screens.len(), 2);
    assert_eq!(screens[0]["tsx"], "fixed");
    assert_eq!(screens[1]["id"], "settings");
    assert!(
        missing_screen_ids(&target, &["dashboard".to_string(), "settings".to_string()]).is_empty()
    );
}

#[test]
fn distinguishes_full_generation_from_scoped_regeneration() {
    let ids = ["dashboard".to_string()];

    assert!(is_scoped_regeneration_request(
        "Regenerate wireframe screens: dashboard",
        Some(&ids),
        true,
    ));
    assert_eq!(
        is_scoped_regeneration_request(
            "Generate the selected Hi-Fi wireframe screens.",
            Some(&ids),
            true,
        ),
        false,
    );
}

#[test]
fn generation_failures_keep_technical_detail_out_of_user_copy() {
    let error = WorkflowError::GenerationFailed(
        "screen project-dashboard rendered an object as a React child".to_string(),
    )
    .to_engine_error(ProviderId::Claude);

    assert!(matches!(error.code, EngineErrorCode::InternalError));
    assert!(error.retryable);
    assert!(error.message.contains("existing screens are unchanged"));
    assert!(!error.message.contains("React child"));
    assert!(error.detail.unwrap().contains("React child"));
}

#[test]
fn moodboard_asset_selection_is_scoped_to_the_selected_direction() {
    let artifact = serde_json::json!({
        "references": [
            {"directionId": "warm", "imageAssetKey": "moodboards/warm.webp", "isInMoodboard": true},
            {"directionId": "cool", "imageAssetKey": "moodboards/cool.webp", "isInMoodboard": true},
            {"directionId": "warm", "imageAssetKey": "moodboards/rejected.webp", "isInMoodboard": false},
            {"directionId": "warm", "imageAssetKey": "moodboards/warm.webp", "isInMoodboard": true}
        ]
    });

    assert_eq!(
        selected_moodboard_asset_keys(Some(&artifact.to_string()), Some("warm")),
        vec!["moodboards/warm.webp"]
    );
}

#[test]
fn provider_request_embeds_required_context_before_the_paid_call() {
    let root = std::env::temp_dir().join(format!(
        "stage-context-envelope-{}-{}",
        std::process::id(),
        crate::helpers::time::now_millis()
    ));
    std::fs::create_dir_all(&root).unwrap();
    let manifest = root.join("call.json");
    let required = root.join("required.md");
    let optional = root.join("optional.md");
    std::fs::write(&manifest, r#"{"requiredFiles":["required.md"]}"#).unwrap();
    std::fs::write(&required, "BINDING-CONTEXT-42").unwrap();
    std::fs::write(&optional, "OPTIONAL-CONTEXT").unwrap();

    let mut request = StartRunRequest {
        provider_id: ProviderId::Codex,
        model_id: "codex-default".to_string(),
        prompt: String::new(),
        mode: crate::models::runs::RunMode::Wireframes,
        context: Default::default(),
        attachments: vec![],
        model_options: vec![],
        working_directory: Some(root.to_string_lossy().to_string()),
    };
    let call_files = ProviderCallFiles {
        required_paths: vec![
            manifest.to_string_lossy().to_string(),
            required.to_string_lossy().to_string(),
        ],
        on_demand_paths: vec![optional.to_string_lossy().to_string()],
    };

    configure_provider_workspace_call(&mut request, &call_files, "Create the plan").unwrap();

    assert!(request.prompt.contains("BINDING-CONTEXT-42"));
    assert!(!request.prompt.contains("OPTIONAL-CONTEXT"));
    assert!(request.context.required_context_files.is_none());
    assert_eq!(request.context.context_files.as_ref().unwrap().len(), 3);
    std::fs::remove_dir_all(root).unwrap();
}
