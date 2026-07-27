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
        enabled_skill_ids: None,
        enabled_component_pack_ids: None,
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

#[test]
fn regen_prompt_redacts_prior_html_and_forbids_reuse() {
    let mut input = sample_input();
    input.existing_wireframes_artifact_json = Some(
        r#"{"generatedScreens":[{"id":"homepage","html":"<div class=\"lim-welcome\">SECRET_MARKUP</div>"},{"id":"pricing","html":"<div>PRICING_MARKUP</div>"}]}"#
            .to_string(),
    );

    let prompt = build_wireframes_prompt(
        &input,
        WireframeKind::Hifi,
        Some(WireframeBrandSource::StyleGuide),
        None,
        None,
        false,
        Some(&["homepage".to_string()]),
    );

    // Prior html for a requested screen must be stripped from the prompt payload.
    assert!(
        !prompt.contains("SECRET_MARKUP"),
        "regen prompt leaked prior html for a requested screen"
    );
    // Non-regen screens are omitted from the prompt entirely.
    assert!(
        !prompt.contains("PRICING_MARKUP"),
        "regen prompt included a screen that was not being regenerated"
    );
    assert!(prompt.contains("Do NOT reuse prior html"));
    assert!(prompt.contains("homepage"));
}

#[test]
fn hifi_prompt_includes_taste_skill_by_default() {
    let prompt = build_wireframes_prompt(
        &sample_input(),
        WireframeKind::Hifi,
        Some(WireframeBrandSource::StyleGuide),
        None,
        None,
        false,
        None,
    );

    assert!(
        prompt.contains("<skill id=\"design-taste-frontend\">"),
        "Hi-Fi generation must attach the Taste skill"
    );
    assert!(prompt.contains("Leonxlnx/taste-skill"));
    assert!(prompt.contains("Absolute bans (anti-slop)"));
    assert!(
        prompt.contains("<component_pack id=\"shadcn-ui\">"),
        "Hi-Fi must attach the default base pack when prefs are unset"
    );
    assert!(prompt.contains("Controls come from this pack. Layout is yours."));
}

#[test]
fn hifi_prompt_omits_taste_when_skill_disabled_in_prefs() {
    let mut input = sample_input();
    input.enabled_skill_ids = Some(vec![]);
    input.enabled_component_pack_ids = Some(vec!["radix-ui".to_string()]);

    let prompt = build_wireframes_prompt(
        &input,
        WireframeKind::Hifi,
        Some(WireframeBrandSource::StyleGuide),
        None,
        None,
        false,
        None,
    );

    assert!(!prompt.contains("<skill id="));
    assert!(
        !prompt.contains("<component_pack id="),
        "radix-ui ships behaviour, not a visual design, so it has no pack to attach"
    );
}

#[test]
fn hifi_prompt_attaches_base_and_sections_packs_in_order() {
    let mut input = sample_input();
    input.enabled_component_pack_ids =
        Some(vec!["aceternity-ui".to_string(), "shadcn-ui".to_string()]);

    let prompt = build_wireframes_prompt(
        &input,
        WireframeKind::Hifi,
        Some(WireframeBrandSource::StyleGuide),
        None,
        None,
        false,
        None,
    );

    let base_at = prompt
        .find("<component_pack id=\"shadcn-ui\">")
        .expect("base pack attached");
    let sections_at = prompt
        .find("<component_pack id=\"aceternity-ui\">")
        .expect("sections pack attached");
    // Selection order must not decide injection order: a sections pack consumes the
    // base pack's --ui-* variables, so the base vocabulary always comes first.
    assert!(
        base_at < sections_at,
        "base pack must be injected before the sections pack"
    );
}

#[test]
fn hifi_prompt_supplies_a_base_pack_when_only_sections_are_selected() {
    let mut input = sample_input();
    // The old multi-select allowed this; the sections CSS would otherwise render against
    // undefined --ui-* variables.
    input.enabled_component_pack_ids = Some(vec!["magic-ui".to_string()]);

    let prompt = build_wireframes_prompt(
        &input,
        WireframeKind::Hifi,
        Some(WireframeBrandSource::StyleGuide),
        None,
        None,
        false,
        None,
    );

    assert!(
        prompt.contains("<component_pack id=\"shadcn-ui\">"),
        "a sections pack must always get a base pack under it"
    );
    assert!(prompt.contains("<component_pack id=\"magic-ui\">"));
}

#[test]
fn hifi_prompt_attaches_no_pack_when_selection_is_explicitly_empty() {
    let mut input = sample_input();
    input.enabled_component_pack_ids = Some(Vec::new());

    let prompt = build_wireframes_prompt(
        &input,
        WireframeKind::Hifi,
        Some(WireframeBrandSource::StyleGuide),
        None,
        None,
        false,
        None,
    );

    // Empty means "no packs", not "fall back to the default pack".
    assert!(!prompt.contains("<component_pack id="));
}

#[test]
fn lofi_prompt_omits_taste_skill() {
    let prompt = build_wireframes_prompt(
        &sample_input(),
        WireframeKind::Lofi,
        None,
        None,
        None,
        false,
        None,
    );

    assert!(!prompt.contains("<skill id="));
}

#[test]
fn hifi_prompt_injects_full_body_of_each_selected_skill() {
    let mut input = sample_input();
    input.enabled_skill_ids = Some(vec![
        "design-taste-frontend".to_string(),
        "impeccable".to_string(),
    ]);

    let prompt = build_wireframes_prompt(
        &input,
        WireframeKind::Hifi,
        Some(WireframeBrandSource::StyleGuide),
        None,
        None,
        false,
        None,
    );

    // Not a one-line hint: the vendored SKILL.md body must be present.
    assert!(
        prompt.contains("<skill id=\"impeccable\">")
            && prompt.contains("Pick the visitor mode first"),
        "a selected catalog skill must inject its full vendored body"
    );
    assert!(
        !prompt.contains("<skill id=\"frontend-design\">"),
        "unselected catalog skills must stay out of the prompt"
    );
    assert!(
        prompt.contains("<skill_precedence>"),
        "two or more skills must declare a conflict rule"
    );

    let taste_at = prompt
        .find("<skill id=\"design-taste-frontend\">")
        .expect("taste block present");
    let impeccable_at = prompt
        .find("<skill id=\"impeccable\">")
        .expect("impeccable block present");
    assert!(
        taste_at > impeccable_at,
        "Taste must be injected last so its bans win a conflict"
    );
}

#[test]
fn hifi_prompt_omits_precedence_note_for_a_single_skill() {
    let mut input = sample_input();
    input.enabled_skill_ids = Some(vec!["design-taste-frontend".to_string()]);

    let prompt = build_wireframes_prompt(
        &input,
        WireframeKind::Hifi,
        Some(WireframeBrandSource::StyleGuide),
        None,
        None,
        false,
        None,
    );

    assert!(prompt.contains("<skill id=\"design-taste-frontend\">"));
    assert!(!prompt.contains("<skill_precedence>"));
}

#[test]
fn lofi_prompt_ignores_skills_and_component_packs() {
    let mut input = sample_input();
    input.enabled_skill_ids = Some(vec!["impeccable".to_string()]);
    input.enabled_component_pack_ids = Some(vec!["radix-ui".to_string()]);

    let prompt =
        build_wireframes_prompt(&input, WireframeKind::Lofi, None, None, None, false, None);

    assert!(!prompt.contains("<skill id="));
    assert!(!prompt.contains("<component_pack id="));
}
