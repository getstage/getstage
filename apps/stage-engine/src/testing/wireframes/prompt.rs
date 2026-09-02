use super::*;
use crate::models::wireframes::{WireframeBrandSource, WireframeKind, WireframesInput};

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
fn scoped_run_drops_research_and_keeps_it_on_a_full_pass() {
    // Research is the largest block in the prompt. A run scoped to known screens must not
    // carry it, while a full pass still does — that difference is the latency fix.
    let mut input = sample_input();
    input.research_artifact_json = Some(r#"{"findings":["RESEARCH_MARKER"]}"#.to_string());

    let scoped = build_wireframes_prompt(
        &input,
        WireframeKind::Hifi,
        Some(WireframeBrandSource::StyleGuide),
        None,
        None,
        false,
        Some(&["homepage".to_string()]),
    );
    let full = build_wireframes_prompt(
        &input,
        WireframeKind::Hifi,
        Some(WireframeBrandSource::StyleGuide),
        None,
        None,
        false,
        None,
    );

    assert!(!scoped.contains("RESEARCH_MARKER"));
    assert!(!scoped.contains("Saved research artifact JSON"));
    assert!(full.contains("RESEARCH_MARKER"));
}

#[test]
fn scoped_run_keeps_only_the_targeted_screens_and_their_flows() {
    // The flows artifact is the authoritative screen list on a full pass, but a scoped run
    // only needs the screens it re-designs plus the journeys those screens sit in.
    let mut input = sample_input();
    input.flows_artifact_json = Some(
        r#"{"screens":[{"id":"homepage","title":"Homepage"},{"id":"settings","title":"Settings"}],"flows":[{"id":"signup","steps":[{"id":"s1","screenId":"homepage"},{"id":"s2","screenId":"checkout"}]},{"id":"admin","steps":[{"id":"s3","screenId":"settings"}]}]}"#
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

    assert!(prompt.contains("\"id\":\"homepage\""));
    // The untargeted screen and the flow that never touches homepage are both gone.
    assert!(!prompt.contains("Settings"));
    assert!(!prompt.contains("\"admin\""));
    // Neighbouring steps of a matching flow stay: they are the journey context.
    assert!(prompt.contains("checkout"));
}

#[test]
fn full_pass_keeps_the_whole_flows_artifact() {
    let mut input = sample_input();
    input.flows_artifact_json = Some(
        r#"{"screens":[{"id":"homepage"},{"id":"settings"}],"flows":[{"id":"admin","steps":[{"id":"s3","screenId":"settings"}]}]}"#
            .to_string(),
    );

    let prompt = build_wireframes_prompt(
        &input,
        WireframeKind::Hifi,
        Some(WireframeBrandSource::StyleGuide),
        None,
        None,
        false,
        None,
    );

    assert!(prompt.contains("authoritative screen list"));
    assert!(prompt.contains("\"settings\""));
    assert!(prompt.contains("\"admin\""));
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
fn hifi_prompt_without_skill_selection_requires_verified_catalog_source() {
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
        !prompt.contains("<skill id="),
        "design skills must be explicitly selected"
    );
    assert!(prompt.contains("The \"tsx\" field is the design."));
    assert!(prompt.contains("catalog-candidates.json"));
    assert!(prompt.contains("catalogComponentIds"));
    assert!(!prompt.contains("@stage/base"));
    assert_eq!(
        resolve_hifi_prompt_preferences(&sample_input()).component_pack_ids,
        Vec::<String>::new(),
        "an unset selection must not silently enable shadcn-ui"
    );
}

#[test]
fn hifi_prompt_explicit_empty_skill_selection_injects_no_skill() {
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
fn removed_taste_skill_id_is_ignored() {
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

    assert!(!prompt.contains("<skill id="));
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
fn lofi_prompt_omits_design_skills() {
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
    assert!(prompt.contains("preserve every selected screen from the configure list"));
    assert!(prompt.contains("Saved research artifact JSON") == false);
    assert!(!prompt.contains("catalog-candidates.json"));
    assert!(!prompt.contains("SCOPED GENERATION"));
}

#[test]
fn scoped_lofi_prompt_keeps_the_work_context_and_contract() {
    let mut input = sample_input();
    input.research_artifact_json = Some(r#"{"findings":["LOFI_RESEARCH"]}"#.to_string());
    input.flows_artifact_json =
        Some(r#"{"screens":[{"id":"homepage"},{"id":"settings"}]}"#.to_string());

    let prompt = build_wireframes_prompt(
        &input,
        WireframeKind::Lofi,
        None,
        None,
        None,
        false,
        Some(&["homepage".to_string()]),
    );

    assert!(prompt.contains("LOFI_RESEARCH"));
    assert!(prompt.contains("authoritative screen list"));
    assert!(prompt.contains("\"settings\""));
    assert!(prompt.contains("PARTIAL REGENERATION"));
    assert!(!prompt.contains("The \"tsx\" field is the design"));
    assert!(!prompt.contains("validated_design_plan"));
}

#[test]
fn hifi_prompt_injects_only_concise_adapters_for_selected_skills() {
    let mut input = sample_input();
    input.enabled_skill_ids = Some(vec![
        "frontend-design".to_string(),
        "impeccable".to_string(),
        "emil-design-eng".to_string(),
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

    assert!(
        prompt.contains("<skill id=\"frontend-design\">")
            && prompt.contains("**Role:** establish a specific visual direction.")
    );
    assert!(
        prompt.contains("<skill id=\"impeccable\">")
            && prompt.contains("**Role:** refine the chosen direction")
    );
    assert!(
        prompt.contains("<skill id=\"emil-design-eng\">")
            && prompt.contains("**Role:** make interactions feel intentional")
    );
    assert!(!prompt.contains("<skill id=\"ui-ux-pro-max\">"));
    assert!(!prompt.contains("Full upstream reference:"));
    assert!(!prompt.contains("CLAUDE_PLUGIN_ROOT"));
    assert!(
        prompt.len() < 80_000,
        "selected adapters must not reintroduce the upstream source corpus"
    );
}

#[test]
fn hifi_prompt_synthesizes_multiple_skills_without_order_precedence() {
    let mut input = sample_input();
    input.enabled_skill_ids = Some(vec![
        "impeccable".to_string(),
        "frontend-design".to_string(),
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

    assert!(prompt.contains("<skill_synthesis>"));
    assert!(prompt.contains("prompt order never grants precedence"));
    assert!(!prompt.contains("<skill_precedence>"));
}

#[test]
fn hifi_prompt_omits_synthesis_note_for_a_single_skill() {
    let mut input = sample_input();
    input.enabled_skill_ids = Some(vec!["impeccable".to_string()]);

    let prompt = build_wireframes_prompt(
        &input,
        WireframeKind::Hifi,
        Some(WireframeBrandSource::StyleGuide),
        None,
        None,
        false,
        None,
    );

    assert!(prompt.contains("<skill id=\"impeccable\">"));
    assert!(!prompt.contains("<skill_synthesis>"));
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

#[test]
fn prior_artifact_echo_drops_the_pack_stylesheet() {
    let mut input = sample_input();
    // Shape of a saved screen after `normalize` prepends the pack stylesheet.
    input.existing_wireframes_artifact_json = Some(
        r#"{"artifactKind":"wireframesArtifact","generatedScreens":[{"id":"home","html":"<style data-stage-pack>.ui-btn{height:36px}</style>\n<div>Real markup</div>"}]}"#
            .to_string(),
    );

    let prompt = build_wireframes_prompt(
        &input,
        WireframeKind::Hifi,
        Some(WireframeBrandSource::StyleGuide),
        None,
        None,
        false,
        None,
    );

    // Resending the stylesheet once per screen would add ~6 KB x screen count of prompt
    // for CSS the model is explicitly told not to write.
    assert!(
        !prompt.contains("<style data-stage-pack>"),
        "the echoed artifact must not carry the pack stylesheet"
    );
    assert!(
        !prompt.contains(".ui-btn{height:36px}"),
        "the pack CSS body must be stripped, not just its wrapper"
    );
    assert!(
        prompt.contains("<div>Real markup</div>"),
        "the model's own markup must survive the strip"
    );
}

#[test]
fn prompt_states_the_project_type_and_its_screen_guidance() {
    let prompt = build_wireframes_prompt(
        &sample_input(),
        WireframeKind::Hifi,
        Some(WireframeBrandSource::StyleGuide),
        None,
        None,
        false,
        None,
    );

    assert!(prompt.contains("- Project type: web-app"));
    // An app project must not be steered toward a marketing site.
    assert!(prompt.contains("This is an application project"));
    assert!(prompt.contains("Do NOT default to marketing pages"));
}

#[test]
fn prompt_reports_the_free_text_label_for_an_other_project_type() {
    let mut input = sample_input();
    input.project_type = "other".to_string();
    input.project_type_label = Some("Trade show booth".to_string());

    let prompt = build_wireframes_prompt(
        &input,
        WireframeKind::Hifi,
        Some(WireframeBrandSource::StyleGuide),
        None,
        None,
        false,
        None,
    );

    assert!(prompt.contains("- Project type: other"));
    assert!(prompt.contains("- Project type detail: Trade show booth"));
}

#[test]
fn site_project_type_keeps_marketing_page_guidance() {
    let mut input = sample_input();
    input.project_type = "web-design".to_string();

    let prompt = build_wireframes_prompt(
        &input,
        WireframeKind::Hifi,
        Some(WireframeBrandSource::StyleGuide),
        None,
        None,
        false,
        None,
    );

    assert!(prompt.contains("This is a site project"));
}

#[test]
fn scoped_first_pass_omits_the_regeneration_wording() {
    // A Hi-Fi run scoped to selected screens before anything is saved: there is no prior
    // markup, so the prompt must scope the output without the re-design instructions.
    let mut input = sample_input();
    input.existing_wireframes_artifact_id = None;
    input.existing_wireframes_artifact_json = None;

    let prompt = build_wireframes_prompt(
        &input,
        WireframeKind::Hifi,
        Some(WireframeBrandSource::StyleGuide),
        None,
        None,
        false,
        Some(&["dashboard".to_string(), "settings".to_string()]),
    );

    assert!(prompt.contains("SCOPED GENERATION"));
    assert!(prompt.contains("dashboard, settings"));
    assert!(!prompt.contains("PARTIAL REGENERATION"));
    assert!(!prompt.contains("Do NOT reuse prior html"));
    assert!(!prompt.contains("Previous wireframes artifact"));
}

#[test]
fn a_scoped_run_must_still_return_the_whole_screen_list() {
    // Generating only the ticked screens must not shrink configureScreens: the screens the
    // user unticked have to stay in the list, or there is no way to tick them again.
    let input = sample_input();

    let scoped = build_wireframes_prompt(
        &input,
        WireframeKind::Hifi,
        Some(WireframeBrandSource::StyleGuide),
        None,
        None,
        false,
        Some(&["dashboard".to_string()]),
    );

    assert!(
        scoped.contains("configureScreens[] is the screen LIST"),
        "a scoped run must be told the scope narrows generation, not the list"
    );
    assert!(scoped.contains("give those selected: false"));
    assert!(
        !scoped.contains("cover every selected screen from the configure list"),
        "the full-pass coverage rule would contradict the scope"
    );

    let full = build_wireframes_prompt(
        &input,
        WireframeKind::Hifi,
        Some(WireframeBrandSource::StyleGuide),
        None,
        None,
        false,
        None,
    );

    assert!(
        full.contains("cover every selected screen from the configure list"),
        "an unscoped run is a full pass and must cover the ticked list"
    );
    assert!(!full.contains("configureScreens[] is the screen LIST"));
}

#[test]
fn design_director_prompt_uses_selected_adapters_and_target_screen_ids() {
    let mut input = sample_input();
    input.enabled_skill_ids = Some(vec!["frontend-design".to_string()]);
    input.enabled_component_pack_ids = Some(vec!["shadcn-ui".to_string(), "magic-ui".to_string()]);

    let prompt = build_design_director_prompt(
        &input,
        Some(WireframeBrandSource::StyleGuide),
        Some("direction_1"),
        false,
        &["dashboard".to_string(), "settings".to_string()],
    );

    assert!(prompt.contains("Target screen IDs: dashboard, settings"));
    assert!(prompt.contains("<skill id=\"frontend-design\">"));
    assert_eq!(prompt.contains("<skill id=\"impeccable\">"), false);
    assert!(prompt.contains("Selected RAG catalog filters: shadcn-ui, magic-ui"));
    assert!(!prompt.contains("@stage/sections"));
    assert_eq!(prompt.contains("Full upstream reference:"), false);
    assert_eq!(prompt.contains("CLAUDE_PLUGIN_ROOT"), false);
}

#[test]
fn hifi_screen_prompt_is_compact_and_bound_to_one_planned_recipe() {
    let plan = r#"{"schemaVersion":"1","aestheticThesis":"Operational atelier","screens":[{"screenId":"homepage","informationHierarchy":["Primary decision","Evidence"],"contentRequirements":["Real project status"],"componentRecipe":[{"libraryId":"shadcn-ui","exportName":"Button","role":"primary action","requiredProps":[]}]},{"screenId":"settings","informationHierarchy":["Preferences"],"contentRequirements":["Saved settings"],"componentRecipe":[{"libraryId":"shadcn-ui","exportName":"Card","role":"settings group","requiredProps":[]}]}]}"#;

    let prompt = build_wireframes_prompt_with_plan(
        &sample_input(),
        WireframeKind::Hifi,
        Some(WireframeBrandSource::StyleGuide),
        None,
        None,
        false,
        Some(&["homepage".to_string()]),
        Some(plan),
    );

    assert!(prompt.contains("<validated_design_plan>"));
    assert!(prompt.contains("Operational atelier"));
    assert!(prompt.contains("Primary decision"));
    assert!(prompt.contains("<catalog_implementation_requirements>"));
    assert!(prompt.contains("catalogComponentIds"));
    assert!(!prompt.contains("@stage/base"));
    assert_eq!(prompt.contains("settings group"), false);
    assert_eq!(prompt.contains("Full upstream reference:"), false);
    assert!(
        prompt.chars().count() < 15_000,
        "screen prompt grew beyond its compact contract"
    );
}

#[test]
fn selected_library_prompt_requires_runtime_rag_sources() {
    let mut input = sample_input();
    input.enabled_component_pack_ids = Some(vec![
        "shadcn-ui".to_string(),
        "magic-ui".to_string(),
        "bklit-ui".to_string(),
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

    assert!(prompt.contains("catalog-candidates.json"));
    assert!(prompt.contains("exact candidate source files"));
    assert!(prompt.contains("catalogComponentIds"));
    assert!(!prompt.contains("<skill id="));
    assert!(!prompt.contains("Recipe `magic-marketing-hero`"));
}

#[test]
fn workspace_skill_adapter_removes_operational_instructions_but_keeps_design_guidance() {
    let source = r#"---
allowed-tools: Bash
---
## How to design
Use deliberate hierarchy and restrained motion.
## Setup
Run `npx shadcn@latest init` before working.
## Visual principles
Prefer one clear focal point.
"#;

    let sanitized = sanitize_workspace_skill(source);

    assert!(sanitized.contains("Use deliberate hierarchy and restrained motion."));
    assert!(sanitized.contains("Prefer one clear focal point."));
    assert!(!sanitized.contains("allowed-tools"));
    assert!(!sanitized.contains("npx shadcn"));
}
