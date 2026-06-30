use super::*;
use serde_json::json;

#[test]
fn unapproved_source_constant_matches_client_contract() {
    // The desktop client sends this exact literal as the run source; if either side
    // drifts, unapproved regeneration silently falls back to a full run.
    assert_eq!(REGENERATE_UNAPPROVED_SOURCE, "sections:unapproved");
}

#[test]
fn unapproved_section_ids_keeps_only_unapproved_in_order() {
    let artifact = json!({
        "sections": [
            { "id": "overview", "status": "approved" },
            { "id": "audience", "status": "action" },
            { "id": "positioning", "status": "approved" },
            { "id": "messaging", "status": "draft" },
        ]
    });

    assert_eq!(
        unapproved_section_ids(&artifact),
        vec!["audience".to_string(), "messaging".to_string()],
    );
}

#[test]
fn unapproved_section_ids_treats_missing_status_as_unapproved() {
    let artifact = json!({
        "sections": [
            { "id": "no_status" },
            { "id": "approved_one", "status": "approved" },
        ]
    });

    assert_eq!(
        unapproved_section_ids(&artifact),
        vec!["no_status".to_string()]
    );
}

#[test]
fn unapproved_section_ids_skips_sections_without_a_string_id() {
    let artifact = json!({
        "sections": [
            { "status": "action" },
            { "id": 42, "status": "action" },
            { "id": "valid", "status": "action" },
        ]
    });

    assert_eq!(unapproved_section_ids(&artifact), vec!["valid".to_string()]);
}

#[test]
fn unapproved_section_ids_returns_empty_when_all_approved() {
    let artifact = json!({
        "sections": [
            { "id": "a", "status": "approved" },
            { "id": "b", "status": "approved" },
        ]
    });

    assert!(unapproved_section_ids(&artifact).is_empty());
}

#[test]
fn unapproved_section_ids_returns_empty_when_sections_missing_or_wrong_type() {
    assert!(unapproved_section_ids(&json!({})).is_empty());
    assert!(unapproved_section_ids(&json!({ "sections": "not-an-array" })).is_empty());
    assert!(unapproved_section_ids(&json!(null)).is_empty());
}

#[test]
fn parse_strategy_section_extracts_id_only_from_section_prefix() {
    assert_eq!(
        parse_strategy_section(Some("section:audience")),
        Some("audience")
    );
    assert_eq!(parse_strategy_section(Some("section:")), Some(""));
    assert_eq!(
        parse_strategy_section(Some(REGENERATE_UNAPPROVED_SOURCE)),
        None
    );
    assert_eq!(parse_strategy_section(Some("audience")), None);
    assert_eq!(parse_strategy_section(None), None);
}
