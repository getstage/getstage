use crate::models::wireframes::{WireframeBrandSource, WireframeKind, WireframesInput};

const WIREFRAMES_SHAPE_EXAMPLE: &str = r#"{
  "apiVersion": "v1",
  "artifactKind": "wireframesArtifact",
  "projectId": "PROJECT_ID",
  "title": "Project Wireframes",
  "wireframeKind": "lofi",
  "stats": {
    "flowsScreenCount": 0,
    "moodboardPatternCount": 0,
    "totalConfigureScreenCount": 0
  },
  "configureScreens": [
    {
      "id": "homepage",
      "title": "Homepage",
      "description": "Primary landing - communicates value, drives demo conversion",
      "kind": "Page",
      "priority": "P0",
      "required": true,
      "selected": true
    }
  ],
  "generatedScreens": [
    {
      "id": "homepage",
      "title": "Homepage",
      "priority": "P0",
      "generatedAtLabel": "just now",
      "goal": "Convert evaluators into demo requests with one scroll.",
      "sections": [
        {
          "id": "homepage-hero",
          "title": "Hero",
          "blocks": [
            {
              "id": "homepage-hero-headline",
              "kind": "hero",
              "intent": "Lead with the value proposition + primary CTA.",
              "emphasis": "primary",
              "copySlots": {
                "headline": "Wholesale onboarding without the busywork",
                "sub": "Mid-market retailers onboard 5x faster.",
                "cta": "Request a demo"
              }
            }
          ]
        }
      ]
    }
  ],
  "generatedAt": 0,
  "generatedAtLabel": "just now",
  "figmaSymbolUrl": "https://figma.com/"
}"#;

const ALLOWED_BLOCK_KINDS: &str = "header, hero, feature-grid, testimonial, pricing-table, cta, form, logo-strip, footer, stat-strip, faq, media, text, list, table, navigation";

// Hi-Fi mode turns each screen into a final, production-quality design carried
// as a self-contained HTML fragment. The block outline is still produced (used
// for Figma layer naming and as a Lo-Fi fallback), but `html` is the source of
// truth for the visual design. These rules double as our anti-slop taste rubric.
const HIFI_RULES: &str = r#"
Hi-Fi mode — produce a FINAL DESIGN, not a wireframe:
- For EACH generatedScreens[] entry, add an "html" field: a single, self-contained HTML fragment that renders that screen as a polished, production-quality web page.
- Style everything with ONE <style> block at the top of the fragment (plain CSS) plus inline styles as needed. Do NOT use Tailwind, any CSS framework, <script>, external <link> stylesheets, or @import. Use system font stacks inside the <style> block (e.g. font-family: 'Geist', system-ui, sans-serif). The design MUST render on its own with no JavaScript or external requests.
- When a <component_pack> is attached below, its stylesheet is added to the fragment for you. Use that pack's classes for every control (buttons, inputs, cards, badges, tabs, tables) and write ONLY layout CSS in your own <style> block. Never redefine a pack class, and never invent a second button or card style.
- Wrap everything in one root <div> — do not emit <html>, <head>, or <body> tags.
- Still fill sections[]/blocks[] as the structural outline (used for Figma layer naming and Lo-Fi fallback); the "html" field is the source of truth for the visuals.

Brand:
- Derive the palette, typography, and tone from the moodboard styleGuides[] (or the attached brand kit). Apply real brand colors and fonts — never default grays/blues.
- Set brandTokens.paletteRef and brandTokens.typographyRef to the source you used.

Imagery:
- Use topic-relevant placeholder photos via https://images.unsplash.com/...&q=80&w=1200, or branded gradient blocks. Never leave empty image boxes.

Anti-slop taste rules (mandatory):
- Cohesive system: one spacing scale, one corner radius, consistent shadows.
- Strong typographic hierarchy with intentional spacing between sections (typically 48–96px) — not huge empty bands and not cramped, centered-everything layouts.
- Realistic copy drawn from the strategy/research artifacts — no "Lorem ipsum" or placeholder filler.
- Make each section visually distinct (alternating backgrounds, varied layout); avoid identical three-icon-card rows unless intentional.
- Keep markup semantic and FLAT (header, section, h1-h3, p, ul, button) so it converts cleanly to Figma layers and exportable code. Avoid absolute positioning, transforms, and exotic CSS.
- Ensure WCAG-AA text contrast.

Canvas / height rules (mandatory — Stage crops and exports by content height):
- NEVER use min-height: 100vh, height: 100vh, or min-height: 100% on the root wrapper or on dialog/onboarding shells. Height must come from content.
- Modal, form, invite, success, and step screens: content-sized card/panel with modest outer padding (32–64px). Do NOT vertically center a small card inside a full desktop viewport of empty white.
- Marketing / long pages: stack sections tightly with consistent gaps; do not pad with large empty regions between sections.
- Prefer one root <div> that wraps only real UI — no spacer divs whose only job is to fill the viewport.

Multi-step / wizard / onboarding / success screens (mandatory — Stage never runs JavaScript):
- Emit ONLY the active step's UI for that screen. Do NOT include sibling steps hidden with display:none, visibility:hidden, the hidden attribute, or aria-hidden.
- Do NOT rely on tabs, carousels, or step state that needs <script> to reveal content. One screen id = one visible frame.
- Keep the active panel content-sized; no empty wrapper holding height for hidden siblings.

Pre-flight check before returning: confirm every Hi-Fi screen has a non-empty "html" using brand colors, real copy, and at least one image; no two sections look identical; no screen relies on 100vh / empty viewport centering; and no screen hides its only content for JavaScript.
"#;

const REACT_TSX_RULES: &str = r#"
React component mode (Stage renders TSX → static HTML; no client JavaScript):
- For EACH generatedScreens[] entry, add a "tsx" field: a complete React function component as a string.
- Default-export `function Screen()` and return one visible root.
- Import selected Base components ONLY from "@stage/base". If a Sections library is selected, import its blocks ONLY from "@stage/sections". These virtual modules resolve to the exact real libraries selected for this run.
- Do not import another component library, npm package, Node API, browser global, stylesheet, or local file. `react` and `lucide-react` are the only other allowed imports.
- Use at least one real Base component in every screen. Use a real Sections component when the selected block fits the screen; do not force marketing sections into application forms.
- Use Tailwind utility classes for layout around the real components. Motion components render their initial static SSR state.
- Keep a minimal self-contained "html" fallback; rendered TSX replaces it only after compilation succeeds.
- Still fill sections[]/blocks[] for Figma naming. One screen = one visible frame (no hidden steps).
"#;

const RENDERER_LIBRARY_MANIFESTS: &str =
    include_str!("../../../../packages/wireframe-renderer/manifests/libraries.json");

fn react_tsx_prompt_enabled() -> bool {
    crate::wireframes::render::react_render_enabled()
}

fn react_library_manifest(component_pack_ids: &[String]) -> String {
    let libraries = crate::wireframes::render::resolve_renderer_libraries(component_pack_ids);
    let Ok(manifest) = serde_json::from_str::<serde_json::Value>(RENDERER_LIBRARY_MANIFESTS) else {
        return String::new();
    };

    let mut output = String::from("\nSelected real component libraries for this run:\n");
    for (kind, id, module) in [
        ("Base", Some(libraries.base.as_str()), "@stage/base"),
        ("Sections", libraries.sections.as_deref(), "@stage/sections"),
    ] {
        let Some(id) = id else {
            output.push_str("- Sections: none selected. Do not import \"@stage/sections\".\n");
            continue;
        };
        let key = if kind == "Base" { "base" } else { "sections" };
        let Some(entry) = manifest
            .get(key)
            .and_then(serde_json::Value::as_array)
            .and_then(|entries| {
                entries
                    .iter()
                    .find(|entry| entry.get("id").and_then(serde_json::Value::as_str) == Some(id))
            })
        else {
            continue;
        };
        let name = entry
            .get("name")
            .and_then(serde_json::Value::as_str)
            .unwrap_or(id);
        let exports = entry
            .get("exports")
            .and_then(serde_json::Value::as_array)
            .map(|items| {
                items
                    .iter()
                    .filter_map(serde_json::Value::as_str)
                    .collect::<Vec<_>>()
                    .join(", ")
            })
            .unwrap_or_default();
        output.push_str(&format!(
            "- {kind}: {name} (`{id}`). Allowed import: `import {{ {exports} }} from \"{module}\";`\n"
        ));
    }
    output
}

/// Leonxlnx/taste-skill (`design-taste-frontend` / tasteskill.dev), Stage-adapted.
/// Injected into every Hi-Fi wireframes generation prompt.
const TASTE_SKILL: &str = include_str!("../../skills/design-taste-frontend/SKILL.md");
const TASTE_SKILL_ID: &str = "design-taste-frontend";

/// Vendored component packs. `pack.css` is prepended to every Hi-Fi fragment by
/// `normalize`, so all screens in a run share one control vocabulary instead of each
/// screen inventing its own button; `pack.md` teaches the model that vocabulary.
///
/// Base packs implement `ui-*` controls and sections packs implement `sx-*` page
/// sections. Class names are identical across packs of the same kind, so swapping a
/// pack swaps CSS without changing a word of the prompt. Base entries come first so
/// their `--ui-*` variables are declared before a sections pack consumes them.
///
/// `radix-ui` is deliberately absent: it ships accessible behaviour, not a visual
/// design, so there is nothing for a wireframe to copy.
/// Keep ids in sync with `apps/user-application/src/lib/settings/skillsCatalog.ts`.
struct ComponentPack {
    id: &'static str,
    /// Base packs declare the `--ui-*` variables and the `ui-*` controls; sections packs
    /// consume both and add `sx-*` page blocks on top.
    base: bool,
    /// Prepended to the fragment; never shown to the model.
    css: &'static str,
    /// Injected into the prompt; never shipped to the browser.
    vocabulary: &'static str,
}

macro_rules! component_pack {
    ($id:literal, base) => {
        component_pack!(@build $id, true)
    };
    ($id:literal, sections) => {
        component_pack!(@build $id, false)
    };
    (@build $id:literal, $base:literal) => {
        ComponentPack {
            id: $id,
            base: $base,
            css: include_str!(concat!("../../component-packs/", $id, "/pack.css")),
            vocabulary: include_str!(concat!("../../component-packs/", $id, "/pack.md")),
        }
    };
}

const COMPONENT_PACKS: &[ComponentPack] = &[
    // base — exactly one per run
    component_pack!("shadcn-ui", base),
    component_pack!("mantine", base),
    component_pack!("origin-ui", base),
    component_pack!("kokonut-ui", base),
    // sections — optional, layered over a base pack
    component_pack!("aceternity-ui", sections),
    component_pack!("magic-ui", sections),
];

/// Vendored, Stage-adapted skill files. Each directory also carries the verbatim upstream
/// `SOURCE_*.md` for provenance; only the adapted `SKILL.md` reaches the prompt, because the
/// upstream files assume a coding agent with a filesystem, a CLI, and React/Tailwind output.
///
/// Order matters: this is the injection order, and Taste is appended last by
/// `hifi_prompt_extras` so its anti-slop bans get the final word on any conflict.
/// Keep ids in sync with `apps/user-application/src/lib/settings/skillsCatalog.ts`.
const CATALOG_SKILLS: &[(&str, &str)] = &[
    (
        "frontend-design",
        include_str!("../../skills/frontend-design/SKILL.md"),
    ),
    (
        "ui-ux-pro-max",
        include_str!("../../skills/ui-ux-pro-max/SKILL.md"),
    ),
    (
        "impeccable",
        include_str!("../../skills/impeccable/SKILL.md"),
    ),
    (
        "emil-design-eng",
        include_str!("../../skills/emil-design-eng/SKILL.md"),
    ),
    (
        "design-motion-principles",
        include_str!("../../skills/design-motion-principles/SKILL.md"),
    ),
];

const DEFAULT_BASE_PACK_ID: &str = "shadcn-ui";

/// Base pack only. A sections pack is an explicit opt-in, never a default.
const DEFAULT_COMPONENT_PACK_IDS: &[&str] = &[DEFAULT_BASE_PACK_ID];

#[derive(Debug, PartialEq, Eq)]
pub(crate) struct HifiPromptPreferences {
    pub skill_ids: Vec<&'static str>,
    pub component_pack_ids: Vec<String>,
}

fn env_taste_skill_disabled() -> bool {
    // Set STAGE_WIREFRAMES_TASTE_SKILL=0 for A/B without skill (overrides user prefs).
    matches!(
        std::env::var("STAGE_WIREFRAMES_TASTE_SKILL").as_deref(),
        Ok("0") | Ok("false") | Ok("off")
    )
}

fn taste_skill_enabled(input: &WireframesInput) -> bool {
    if env_taste_skill_disabled() {
        return false;
    }
    match &input.enabled_skill_ids {
        // Legacy / unset prefs → Taste ON by default.
        None => true,
        Some(ids) => ids.iter().any(|id| id == TASTE_SKILL_ID),
    }
}

fn enabled_component_pack_ids(input: &WireframesInput) -> Vec<String> {
    match &input.enabled_component_pack_ids {
        None => DEFAULT_COMPONENT_PACK_IDS
            .iter()
            .map(|id| (*id).to_string())
            .collect(),
        Some(ids) => ids.clone(),
    }
}

/// Vendored packs for this run, in `COMPONENT_PACKS` order (base before sections).
fn selected_component_packs(input: &WireframesInput) -> Vec<&'static ComponentPack> {
    let ids = enabled_component_pack_ids(input);
    let mut packs: Vec<&'static ComponentPack> = COMPONENT_PACKS
        .iter()
        .filter(|pack| ids.iter().any(|id| id == pack.id))
        .collect();

    // A sections pack styles itself with the base pack's `--ui-*` variables. The old
    // multi-select let a project save sections without a base, which would render those
    // sections against undefined variables — so a sections pack always gets a base under
    // it. An empty selection stays empty: that means "no packs", not "the default pack".
    if packs.iter().any(|pack| !pack.base) && !packs.iter().any(|pack| pack.base) {
        if let Some(base) = COMPONENT_PACKS
            .iter()
            .find(|pack| pack.id == DEFAULT_BASE_PACK_ID)
        {
            packs.insert(0, base);
        }
    }

    packs
}

/// Stylesheet shared by every Hi-Fi screen in the run. Empty when no selected pack is
/// vendored — the model then styles controls itself, exactly as it did before packs.
pub(crate) fn component_pack_css(input: &WireframesInput) -> String {
    selected_component_packs(input)
        .iter()
        .map(|pack| pack.css)
        .collect::<Vec<_>>()
        .join("\n")
}

/// Selected catalog skills other than Taste. Legacy / unset prefs stay Taste-only so old
/// projects keep the exact behaviour they had before per-project selection existed.
fn selected_catalog_skill_ids(input: &WireframesInput) -> Vec<&'static str> {
    let Some(ids) = &input.enabled_skill_ids else {
        return Vec::new();
    };
    CATALOG_SKILLS
        .iter()
        .filter(|(id, _)| ids.iter().any(|enabled| enabled == id))
        .map(|(id, _)| *id)
        .collect()
}

pub(crate) fn resolve_hifi_prompt_preferences(input: &WireframesInput) -> HifiPromptPreferences {
    let mut skill_ids = selected_catalog_skill_ids(input);
    // Taste is appended last so its bans win any conflict with another skill.
    if taste_skill_enabled(input) {
        skill_ids.push(TASTE_SKILL_ID);
    }

    HifiPromptPreferences {
        skill_ids,
        component_pack_ids: enabled_component_pack_ids(input),
    }
}

fn push_skill_block(extras: &mut String, id: &str, body: &str) {
    extras.push_str("\n\n<skill id=\"");
    extras.push_str(id);
    extras.push_str("\">\n");
    extras.push_str(body);
    extras.push_str("\n</skill>\n");
}

fn hifi_prompt_extras(input: &WireframesInput) -> String {
    let mut extras = String::from(HIFI_RULES);
    let preferences = resolve_hifi_prompt_preferences(input);
    if react_tsx_prompt_enabled() {
        extras.push_str(REACT_TSX_RULES);
        extras.push_str(&react_library_manifest(&preferences.component_pack_ids));
    }

    if preferences.skill_ids.len() > 1 {
        extras.push_str(
            "\n\n<skill_precedence>\nThe <skill> blocks below all apply to every Hi-Fi html screen. Where two skills conflict, the LATER block wins; the moodboard, style guide, or brand kit outranks all of them.\n</skill_precedence>\n",
        );
    }

    for id in &preferences.skill_ids {
        if *id == TASTE_SKILL_ID {
            continue;
        }
        if let Some((_, body)) = CATALOG_SKILLS.iter().find(|(entry, _)| entry == id) {
            push_skill_block(&mut extras, id, body);
        }
    }

    if preferences.skill_ids.contains(&TASTE_SKILL_ID) {
        push_skill_block(&mut extras, TASTE_SKILL_ID, TASTE_SKILL);
    }

    for pack in selected_component_packs(input) {
        extras.push_str("\n\n<component_pack id=\"");
        extras.push_str(pack.id);
        extras.push_str("\">\n");
        extras.push_str(pack.vocabulary);
        extras.push_str("\n</component_pack>\n");
    }
    extras
}

// On partial regen, strip prior `html` from the prompt payload so the model
// re-designs from strategy/moodboard context instead of copy-pasting the saved
// markup. Only the requested screen ids are kept (without html); untouched screens
// are omitted entirely (they are not being regenerated). The full artifact is still
// merged server-side via WireframesInput — only the prompt payload is redacted.
fn redact_regen_artifact(existing_json: &str, ids: &[&str]) -> String {
    let Ok(mut value) = serde_json::from_str::<serde_json::Value>(existing_json) else {
        return existing_json.to_string();
    };
    let Some(object) = value.as_object_mut() else {
        return existing_json.to_string();
    };
    let id_set: std::collections::HashSet<&str> = ids.iter().copied().collect();
    let screens = object
        .get("generatedScreens")
        .and_then(serde_json::Value::as_array)
        .map(|screens| {
            screens
                .iter()
                .filter(|screen| {
                    screen
                        .get("id")
                        .and_then(serde_json::Value::as_str)
                        .is_some_and(|id| id_set.contains(id))
                })
                .map(|screen| {
                    let mut kept = serde_json::Map::new();
                    for key in ["id", "title", "goal", "priority", "sections"] {
                        if let Some(field) = screen.get(key) {
                            kept.insert(key.to_string(), field.clone());
                        }
                    }
                    serde_json::Value::Object(kept)
                })
                .collect::<Vec<_>>()
        })
        .unwrap_or_default();
    object.insert(
        "generatedScreens".to_string(),
        serde_json::Value::Array(screens),
    );
    serde_json::to_string(&value).unwrap_or_else(|_| existing_json.to_string())
}

/// Removes the `<style data-stage-pack>` block `normalize` prepends to every saved screen.
/// Operates on the artifact JSON text: the marker delimiters contain no characters that
/// JSON escapes, so they survive serialization intact.
fn strip_pack_styles(json: &str) -> String {
    const OPEN: &str = "<style data-stage-pack>";
    const CLOSE: &str = "</style>";

    let mut out = String::with_capacity(json.len());
    let mut rest = json;
    while let Some(start) = rest.find(OPEN) {
        out.push_str(&rest[..start]);
        let after_open = &rest[start + OPEN.len()..];
        let Some(end) = after_open.find(CLOSE) else {
            // Unterminated marker: keep what is left rather than silently truncating.
            out.push_str(after_open);
            return out;
        };
        rest = &after_open[end + CLOSE.len()..];
    }
    out.push_str(rest);
    out
}

pub fn build_wireframes_prompt(
    input: &WireframesInput,
    kind: WireframeKind,
    brand_source: Option<WireframeBrandSource>,
    style_direction_id: Option<&str>,
    layout_preference: Option<&str>,
    brand_kit_attached: bool,
    regenerate_screen_ids: Option<&[String]>,
) -> String {
    let research_block = input
        .research_artifact_json
        .as_deref()
        .map(|json| format!("Saved research artifact JSON:\n{json}\n\n"))
        .unwrap_or_default();
    let moodboard_block = input
        .moodboard_artifact_json
        .as_deref()
        .map(|json| format!("Saved moodboard artifact JSON:\n{json}\n\n"))
        .unwrap_or_default();
    let flows_block = input
        .flows_artifact_json
        .as_deref()
        .map(|json| format!("Saved flows artifact JSON (authoritative screen list):\n{json}\n\n"))
        .unwrap_or_default();
    let existing_block = input
        .existing_wireframes_artifact_json
        .as_deref()
        .map(|json| {
            let payload = match regenerate_screen_ids.filter(|ids| !ids.is_empty()) {
                Some(ids) => {
                    let id_refs = ids.iter().map(String::as_str).collect::<Vec<_>>();
                    redact_regen_artifact(json, &id_refs)
                }
                None => json.to_string(),
            };
            // Every saved screen carries the pack stylesheet. Echoing the artifact back
            // verbatim would resend it once per screen — ~6 KB x 13 screens of prompt for
            // CSS the model must not write anyway. `<component_pack>` teaches the classes.
            let payload = strip_pack_styles(&payload);
            format!(
                "Previous wireframes artifact (regenerate; keep ids stable where possible):\n{payload}\n\n"
            )
        })
        .unwrap_or_default();

    let kind_str = kind.as_str();
    let brand_source_line = match brand_source {
        Some(WireframeBrandSource::StyleGuide) => {
            "Brand source: style-guide (apply moodboard styleGuides[].palette/typography for Hi-Fi).".to_string()
        }
        Some(WireframeBrandSource::BrandKit) if brand_kit_attached => {
            "Brand source: brand-kit. Brand kit files are attached to this run — Read them and derive the palette, typography, and logo usage from the brand kit. Populate brandTokens on every screen from those choices and set brandTokens.paletteRef = \"brand-kit\".".to_string()
        }
        Some(WireframeBrandSource::BrandKit) => {
            "Brand source: brand-kit (no brand kit file was readable; infer conservative brand tokens and set brandTokens.paletteRef = \"brand-kit\").".to_string()
        }
        None => "Brand source: none (Lo-Fi structural only).".to_string(),
    };
    let layout_block = layout_preference
        .map(|pref| format!("Layout preference: {pref}\n"))
        .unwrap_or_default();
    let style_direction_block = style_direction_id
        .map(|id| format!("Selected moodboard style direction ID: {id}\n"))
        .unwrap_or_default();
    let hifi_extras = match kind {
        WireframeKind::Hifi => hifi_prompt_extras(input),
        WireframeKind::Lofi => String::new(),
    };
    let regenerate_block = regenerate_screen_ids
        .filter(|ids| !ids.is_empty())
        .map(|ids| {
            format!(
                "- PARTIAL REGENERATION: Return generatedScreens[] containing ONLY these screen ids: {}. Re-design each returned screen from strategy/moodboard context. Do NOT reuse prior html markup or layout structure for these ids. Each returned screen MUST have a non-empty \"html\" that is materially different from the saved artifact (different section order, layout pattern, or visual rhythm).\n",
                ids.join(", ")
            )
        })
        .unwrap_or_default();

    format!(
        r#"<role>You are generating the Stage Wireframes artifact for a {kind_str} pass.</role>

<rules>
- Return a SINGLE valid JSON object matching the Stage WireframesArtifact schema.
- Do NOT return markdown.
- Do NOT add explanatory text before or after the JSON.
- artifactKind MUST be "wireframesArtifact".
- Allowed block kinds: {ALLOWED_BLOCK_KINDS}.
- Each generated screen MUST have 1-6 sections; each section MUST have 1-5 blocks.
- copySlots are short strings (no markdown), filled from Strategy CTAs/value props when available.
- One screen per generatedScreens[] entry; preserve every selected screen from the configure list.
- configureScreens[].required: true ONLY for the 2-4 screens essential to the core funnel (e.g. the primary landing page). Default every other screen to required: false so the user can toggle it off — do not mark every screen required.
- {brand_source_line}
{regenerate_block}{style_direction_block}{layout_block}</rules>

<cognitive_steps>
1. Restate each screen's goal in one sentence (set generatedScreens[].goal).
2. Choose 4-8 sections per Page (1-3 for Section kind) from the allowed block kinds.
3. Pick blocks with clear hierarchy; mark at most one block per screen as emphasis "primary".
4. Fill copySlots from Strategy CTAs / value props; use short placeholders otherwise.
5. Return a single JSON object matching the shape example.
</cognitive_steps>

This shape example is ONLY a formatting reference, not content to copy:
{WIREFRAMES_SHAPE_EXAMPLE}
{hifi_extras}
Project:
- Project ID: {project_id}
- Project name: {project_name}

Saved strategy artifact JSON:
{strategy_artifact}

{research_block}{moodboard_block}{flows_block}{existing_block}Return only the JSON artifact."#,
        project_id = input.project_id,
        project_name = input.project_name,
        strategy_artifact = input.strategy_artifact_json,
    )
}

#[cfg(test)]
#[path = "../testing/wireframes/prompt.rs"]
mod tests;
