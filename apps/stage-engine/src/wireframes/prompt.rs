use crate::flows::prompt::{project_type_lines, project_type_screen_guidance};
use crate::models::wireframes::{
    WireframeBrandSource, WireframeKind, WireframeViewport, WireframesInput,
};

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

/// Hi-Fi rules for mandatory RAG-backed React mode.
const HIFI_REACT_RULES: &str = r#"
Hi-Fi mode — the design IS a React component:
- The "tsx" field is the design. Stage compiles a self-contained implementation adapted from the verified RAG source files with real Tailwind and ships the rendered result. Put all of your effort here.
- The "html" field is a fallback shown ONLY if that compilation fails. Keep it SHORT and plain: wrap it in ONE root <div> and use `style="..."` attributes for the few styles it needs. Do NOT put Tailwind classes in "html" — nothing compiles them there, so they would render completely unstyled. It must still be valid: one <div> root and at least one inline style, or the screen is rejected.
- Style the TSX with Tailwind utility classes. Arbitrary values are fine and encouraged for brand fidelity (text-[13px], bg-[#F5F5F5], rounded-[6px], shadow-[0_1px_2px_rgba(0,0,0,0.08)]).
- Still fill sections[]/blocks[] as the structural outline (used for Figma layer naming and the Lo-Fi view).

Brand:
- Derive the palette, typography, and tone from the moodboard styleGuides[] (or the attached brand kit). Apply real brand colors and fonts through Tailwind arbitrary values — never default grays/blues.
- Set brandTokens.paletteRef and brandTokens.typographyRef to the source you used.

Imagery:
- Use topic-relevant placeholder photos via https://images.unsplash.com/...&q=80&w=1200, or branded gradient blocks. Never leave empty image boxes.

Anti-slop taste rules (mandatory):
- Cohesive system: one spacing scale, one corner radius, consistent shadows across every screen in the run.
- Strong typographic hierarchy with intentional spacing between sections (typically 48-96px on desktop) — not huge empty bands and not cramped, centered-everything layouts.
- Realistic copy drawn from the strategy/research artifacts — no "Lorem ipsum" or placeholder filler.
- Make each section visually distinct (alternating backgrounds, varied layout); avoid identical three-icon-card rows unless intentional.
- Ensure WCAG-AA text contrast.

Canvas / height rules (mandatory — Stage crops and exports by content height):
- NEVER use min-h-screen, h-screen, or any 100vh height on the root wrapper or on dialog/onboarding shells. Height must come from content.
- Modal, form, invite, success, and step screens: content-sized card/panel with modest outer padding. Do NOT vertically center a small card inside a full frame of empty white.
- Prefer one root element that wraps only real UI — no spacer divs whose only job is to fill the frame.

Motion and interaction (motion/react runs live in the app preview; the Figma export and the card thumbnail are a static capture of the RESTING frame):
- You MAY `import { motion } from "motion/react"` and use `animate`, `initial`, `whileHover`, `whileInView`, springs, and transitions. It runs for real in the live preview.
- Because Figma and the thumbnail capture the resting frame, the initial/resting state must already look complete — never leave an element blank, `opacity-0`, or hidden waiting for JS to reveal it. Animate FROM a good-looking state, not from invisible.
- Also give interactive elements CSS states (`hover:`, `focus-visible:`, `active:`, `group-hover:` with `transition-*`) and Tailwind animation utilities (`animate-pulse`, `animate-marquee`, `motion-reduce:animate-none`) so motion reads even in the static capture. A screen with no motion and no hover states reads as a screenshot.

Brand surfaces:
- Adapt the retrieved component's structure and interaction to the project's palette. Preserve its distinctive behavior while applying the selected brand evidence.
- Check contrast against the section you place things in: a dark section needs light text and light chart colors set on the element or an ancestor.

Multi-step / wizard / onboarding / success screens (mandatory — the render is static, no client JavaScript):
- Emit ONLY the active step's UI for that screen. Do NOT include sibling steps hidden with hidden/aria-hidden or display:none.
- One screen id = one visible frame. Motion components render their initial static state.

Pre-flight check before returning: confirm every screen has a non-empty "tsx" built from the real libraries, using brand colors, real copy, and at least one image; no two sections look identical; no screen relies on a full-viewport height; and the "html" fallback is short and plain.
"#;

const REACT_TSX_RULES: &str = r#"
React component mode (Stage renders TSX → static HTML; no client JavaScript):
- For EACH generatedScreens[] entry, add a "tsx" field: a complete React function component as a string.
- Default-export `function Screen()` and return one visible root.
- Read `catalog-candidates.json`, then read the exact candidate source files listed by `sourcePath`. Adapt at least one retrieved component into this screen.
- You MAY import the exact `@/` paths from those retrieved files, plus `react`, `lucide-react`, `motion`, and `motion/react`. Do not import `@stage/*`, an invented package, a stylesheet, or a Node API.
- Add `catalogComponentIds` with the exact component IDs actually used. Every ID must come from `catalog-candidates.json`.
- Write "tsx" as one JSON string with quotes escaped exactly once. The decoded component source must contain no backslash-escaped quotes — a literal \" left inside the decoded tsx (className=\"...\") fails compilation.
- Use retrieved source for distinctive components and Tailwind for page layout between them. Do not substitute an old Stage component or invent a fake library API.
- Use Tailwind utility classes for layout around the real components. Motion components render their initial static SSR state.
- Never position copy with absolute/fixed positioning or negative margins (`-mt-*`, `-top-*`, …). Stack text, buttons, and media with flex/grid only — overlapping headlines fail the render gate.
- Keep a minimal self-contained "html" fallback; rendered TSX replaces it only after compilation succeeds. The fallback shows the same single visible frame — never hidden steps or display:none siblings.
- Still fill sections[]/blocks[] for Figma naming. One screen = one visible frame (no hidden steps).

Each generatedScreens[] entry therefore looks like this (abbreviated — keep every other field too):
{
  "id": "homepage",
  "title": "Homepage",
  "catalogComponentIds": ["origin-ui/example-component"],
  "tsx": "export default function Screen() {\n  return <div className=\"p-10\"><h1 className=\"text-3xl font-semibold\">Headline</h1></div>;\n}\n",
  "html": "<div style=\"padding:40px\"><h1>Headline</h1></div>",
  "sections": []
}

A screen returned without a "tsx" field is an incomplete response. Write the TSX first, then derive the short "html" fallback from it.
"#;

/// Concise Stage adapters for explicitly selected skills. Upstream `SOURCE_*.md` files remain
/// vendored for offline maintenance and tests, but are never copied into generation prompts.
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

#[derive(Debug, PartialEq, Eq)]
pub(crate) struct HifiPromptPreferences {
    pub skill_ids: Vec<&'static str>,
    pub component_pack_ids: Vec<String>,
}

fn enabled_component_pack_ids(input: &WireframesInput) -> Vec<String> {
    input.enabled_component_pack_ids.clone().unwrap_or_default()
}

/// Explicitly selected catalog skills. Legacy or unset preferences select no skill.
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
    HifiPromptPreferences {
        skill_ids: selected_catalog_skill_ids(input),
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
    let mut extras = String::from(HIFI_REACT_RULES);
    let preferences = resolve_hifi_prompt_preferences(input);

    if preferences.skill_ids.len() > 1 {
        extras.push_str(
            "\n\n<skill_synthesis>\nUse each selected skill only for its declared role. Resolve overlap through project evidence and the shared design plan; prompt order never grants precedence.\n</skill_synthesis>\n",
        );
    }

    for id in &preferences.skill_ids {
        if let Some((_, body)) = CATALOG_SKILLS.iter().find(|(entry, _)| entry == id) {
            push_skill_block(&mut extras, id, body);
        }
    }

    // Keep the hard React/output contract closest to the requested JSON response.
    extras.push_str(REACT_TSX_RULES);
    extras
}

const DESIGN_PLAN_SHAPE: &str = r#"{
  "schemaVersion": "1",
  "aestheticThesis": "one concrete product-specific visual idea",
  "targetAudience": "specific audience and context",
  "designSystem": {
    "typography": { "display": "role and treatment", "body": "role and treatment", "label": "role and treatment", "data": "role and treatment" },
    "palette": { "background": "token role", "surface": "token role", "foreground": "token role", "muted": "token role", "accent": "token role", "border": "token role", "semantic": "status roles" },
    "spacingScale": ["4", "8", "16"],
    "radii": ["small", "large"],
    "elevation": ["flat", "raised"],
    "surfaceTreatment": "shared surface rule",
    "iconTreatment": "family, size, and stroke rule",
    "informationDensity": "shared density principle",
    "visualVariance": "how screen roles vary without changing systems",
    "motion": { "principle": "purpose gate", "durations": "duration scale", "easing": "easing vocabulary", "reducedMotion": "reduced-motion behavior" }
  },
  "sharedPatterns": {
    "navigation": "shared navigation behavior",
    "forms": "shared form behavior",
    "tablesAndLists": "shared data behavior",
    "feedback": "shared feedback behavior",
    "emptyStates": "shared empty-state behavior",
    "validation": "shared validation behavior",
    "loading": "shared loading behavior",
    "modalDialog": "shared modal/dialog behavior"
  },
  "screens": [{
    "screenId": "exact-screen-id",
    "purpose": "one user outcome",
    "screenRole": "persuade | operate | read | experience",
    "layoutArchetype": "specific composition",
    "density": "screen-specific density",
    "informationHierarchy": ["first priority", "second priority"],
    "contentRequirements": ["specific project fact, copy, or data needed on this screen"],
    "flowContext": "what comes before, what this screen enables, and what comes next",
    "componentRecipe": [{
      "libraryId": "the selected library id (e.g. origin-ui) — never the @stage/* import module",
      "exportName": "exact registered export",
      "purpose": "why this component fits this content",
      "placement": "where it belongs",
      "requiredProps": ["important prop/data requirement"],
      "motionPurpose": "none or one concrete purpose",
      "signature": false
    }],
    "motionPurpose": "none or one concrete screen-level purpose",
    "avoidList": ["screen-specific anti-pattern"]
  }],
  "conflictResolutions": [{ "conflict": "selected-skill conflict", "decision": "chosen direction", "evidence": "project evidence that decides it" }],
  "avoidList": ["run-level anti-pattern"]
}"#;

#[cfg(test)]
pub fn build_design_director_prompt(
    input: &WireframesInput,
    brand_source: Option<WireframeBrandSource>,
    style_direction_id: Option<&str>,
    brand_kit_attached: bool,
    expected_screen_ids: &[String],
) -> String {
    let preferences = resolve_hifi_prompt_preferences(input);
    let mut skill_context = String::new();
    if preferences.skill_ids.is_empty() {
        skill_context.push_str("No optional design skill was selected. Use project evidence and the hard Stage quality rules only.\n");
    } else {
        for id in &preferences.skill_ids {
            if let Some((_, body)) = CATALOG_SKILLS.iter().find(|(entry, _)| entry == id) {
                push_skill_block(&mut skill_context, id, body);
            }
        }
    }
    let library_context = format!(
        "Selected RAG catalog filters: {}. Concrete components are retrieved per screen.",
        preferences.component_pack_ids.join(", ")
    );
    let target_ids = expected_screen_ids.join(", ");
    let style_direction = style_direction_id.unwrap_or("none selected");
    let brand_source = match brand_source {
        Some(WireframeBrandSource::StyleGuide) => {
            "style-guide: use the selected moodboard style guide as binding evidence"
        }
        Some(WireframeBrandSource::BrandKit) if brand_kit_attached => {
            "brand-kit: inspect the attached brand files and make their palette, type, and asset treatment binding"
        }
        Some(WireframeBrandSource::BrandKit) => {
            "brand-kit: no attachment was readable; fail rather than invent brand evidence"
        }
        None => "none",
    };
    let research = input.research_artifact_json.as_deref().unwrap_or("null");
    let moodboard = input.moodboard_artifact_json.as_deref().unwrap_or("null");
    let flows = input.flows_artifact_json.as_deref().unwrap_or("null");

    format!(
        r#"<role>You are the Design Director for one Stage Hi-Fi wireframe run.</role>

<contract>
- Return exactly one JSON object matching the plan shape below. No markdown or prose.
- Create one coherent system for every target screen before any screen is designed.
- Use one product-specific aesthetic thesis, not generic words such as modern, clean, premium, or professional.
- Project evidence outranks optional skills. Skills contribute only within their declared roles; prompt order never decides conflicts.
- Every target screen ID must appear exactly once in screens[].
- Every screen gets a purpose, role, distinct layout archetype, density, real selected-library component recipe, motion purpose, and avoid-list.
- Component recipes may name only exact exports from the selected library manifest. Primitive Button/Card/Badge use alone is not a signature design.
- Preserve one shared typography, palette, spacing, radius, elevation, surface, icon, density, variance, and motion vocabulary.
- Define shared navigation, form, table/list, feedback, empty, validation, loading, and modal/dialog behavior.
- Do not generate TSX or HTML. Do not invent libraries or exports.
</contract>

Target screen IDs: {target_ids}
Project: {project_name} ({project_type})
Brand source: {brand_source}
Selected moodboard style direction ID: {style_direction}

Selected skill adapters:
{skill_context}

Selected component libraries:
{library_context}

Saved strategy artifact JSON:
{strategy}

Saved research artifact JSON:
{research}

Saved moodboard artifact JSON:
{moodboard}

Saved flows artifact JSON:
{flows}

Required JSON shape:
{shape}

Return only the validated design-plan JSON object."#,
        project_name = input.project_name,
        project_type = input.project_type,
        strategy = input.strategy_artifact_json,
        shape = DESIGN_PLAN_SHAPE,
    )
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

/// A scoped run re-designs screens that already exist, so the model needs those screens'
/// own definitions and the journeys they sit in — not the product's entire flow inventory.
/// Keeps `screens[]` for the target ids and only the flows that actually reference them.
pub(crate) fn scope_flows_artifact(flows_json: &str, ids: &[&str]) -> String {
    let Ok(mut value) = serde_json::from_str::<serde_json::Value>(flows_json) else {
        return flows_json.to_string();
    };
    let Some(object) = value.as_object_mut() else {
        return flows_json.to_string();
    };
    let id_set: std::collections::HashSet<&str> = ids.iter().copied().collect();

    if let Some(screens) = object.get("screens").and_then(serde_json::Value::as_array) {
        let kept = screens
            .iter()
            .filter(|screen| {
                screen
                    .get("id")
                    .and_then(serde_json::Value::as_str)
                    .is_some_and(|id| id_set.contains(id))
            })
            .cloned()
            .collect::<Vec<_>>();
        object.insert("screens".to_string(), serde_json::Value::Array(kept));
    }

    // Whole flows are kept, not just the matching steps: the neighbouring steps are the
    // journey context that keeps a re-designed screen consistent with the ones around it.
    if let Some(flows) = object.get("flows").and_then(serde_json::Value::as_array) {
        let kept = flows
            .iter()
            .filter(|flow| {
                flow.get("steps")
                    .and_then(serde_json::Value::as_array)
                    .is_some_and(|steps| {
                        steps.iter().any(|step| {
                            step.get("screenId")
                                .and_then(serde_json::Value::as_str)
                                .is_some_and(|id| id_set.contains(id))
                        })
                    })
            })
            .cloned()
            .collect::<Vec<_>>();
        object.insert("flows".to_string(), serde_json::Value::Array(kept));
    }

    serde_json::to_string(&value).unwrap_or_else(|_| flows_json.to_string())
}

const PLANNED_HIFI_SCREEN_RULES: &str = r#"<hard_rules>
- Return one valid WireframesArtifact JSON object and no prose or markdown.
- generatedScreens[] must contain only the requested screen ID and must include non-empty `tsx`, short inline-styled `html`, and structural sections/blocks.
- `tsx` is the design: default-export `function Screen()` with one visible root and complete real content.
- Read `catalog-candidates.json`, then the exact source files referenced by `sourcePath`. Adapt at least one verified component into the screen and return its exact ID in `catalogComponentIds`.
- You MAY import the exact `@/` paths from those retrieved files, plus `react`, `lucide-react`, `motion`, or `motion/react`. `@stage/*`, invented packages, stylesheets, and Node APIs are forbidden.
- Use Tailwind for page layout around the adapted catalog components. Never replace retrieved source with an old Stage component or an invented library API.
- No npm packages, local files, stylesheets, Node APIs, browser globals, runtime fetches, scripts, eval, or dynamic code.
- The live preview runs React and Motion. Figma and thumbnails capture the static resting frame, which must already be visible, complete, and legible; never start required content at zero opacity or hidden.
- Use real project copy/data from the plan's content requirements. No lorem ipsum, generic metrics, fake charts, emoji icons, empty image boxes, or unexplained decorative status.
- Charts require a real relationship and labeled data. Decorative effects never count as page structure.
- Preserve semantic elements, labels, focus-visible states, contrast, reduced motion, and stable layout during interaction.
- Height comes from content. Never use 100vh, min-h-screen, h-screen, hidden sibling steps, or a small card centered inside an empty viewport.
- Never position copy with absolute/fixed positioning or negative margins. Stack text, buttons, and media with flex/grid and the spacing scale only — overlapping headlines are a hard failure.
- The `html` fallback is one short root with inline styles and the same visible content; no Tailwind classes.
</hard_rules>"#;

fn compact_design_plan_json(plan_json: &str, target_screen_ids: &[String]) -> String {
    let Ok(mut value) = serde_json::from_str::<serde_json::Value>(plan_json) else {
        return plan_json.to_string();
    };
    let ids: std::collections::HashSet<&str> =
        target_screen_ids.iter().map(String::as_str).collect();
    if let Some(screens) = value
        .get_mut("screens")
        .and_then(serde_json::Value::as_array_mut)
        && !ids.is_empty()
    {
        screens.retain(|screen| {
            screen
                .get("screenId")
                .and_then(serde_json::Value::as_str)
                .is_some_and(|id| ids.contains(id))
        });
    }
    if let Some(object) = value.as_object_mut() {
        object.remove("conflictResolutions");
    }
    serde_json::to_string(&value).unwrap_or_else(|_| plan_json.to_string())
}

fn selected_brand_evidence(
    input: &WireframesInput,
    brand_source: Option<WireframeBrandSource>,
    style_direction_id: Option<&str>,
    brand_kit_attached: bool,
) -> String {
    match brand_source {
        Some(WireframeBrandSource::BrandKit) if brand_kit_attached => {
            "Attached brand-kit files are the binding visual evidence for this screen.".to_string()
        }
        Some(WireframeBrandSource::BrandKit) => {
            "Brand-kit evidence is unavailable; do not invent a replacement palette.".to_string()
        }
        Some(WireframeBrandSource::StyleGuide) => {
            let guide = input
                .moodboard_artifact_json
                .as_deref()
                .and_then(|raw| serde_json::from_str::<serde_json::Value>(raw).ok())
                .and_then(|artifact| {
                    artifact
                        .get("styleGuides")
                        .and_then(serde_json::Value::as_array)
                        .cloned()
                })
                .and_then(|guides| {
                    style_direction_id
                        .and_then(|id| {
                            guides.iter().find(|guide| {
                                guide.get("directionId").and_then(serde_json::Value::as_str)
                                    == Some(id)
                                    || guide.get("id").and_then(serde_json::Value::as_str)
                                        == Some(id)
                            })
                        })
                        .or_else(|| guides.first())
                        .cloned()
                });
            match guide {
                Some(guide) => format!(
                    "Selected moodboard style-guide evidence only:\n{}",
                    serde_json::to_string(&guide).unwrap_or_default()
                ),
                None => "No selected moodboard style guide was available; follow the validated design plan without inventing a second palette.".to_string(),
            }
        }
        None => "No brand source was selected; follow the validated design plan.".to_string(),
    }
}

fn screen_list_context(input: &WireframesInput) -> String {
    let flow_screens = input
        .flows_artifact_json
        .as_deref()
        .and_then(|raw| serde_json::from_str::<serde_json::Value>(raw).ok())
        .and_then(|value| value.get("screens").cloned())
        .unwrap_or_else(|| serde_json::json!([]));
    let configure_screens = input
        .existing_wireframes_artifact_json
        .as_deref()
        .and_then(|raw| serde_json::from_str::<serde_json::Value>(raw).ok())
        .and_then(|value| value.get("configureScreens").cloned())
        .unwrap_or_else(|| serde_json::json!([]));
    serde_json::json!({
        "flowScreens": flow_screens,
        "savedConfigureScreens": configure_screens,
    })
    .to_string()
}

fn scoped_existing_screen_context(input: &WireframesInput, ids: &[String]) -> String {
    let Some(raw) = input.existing_wireframes_artifact_json.as_deref() else {
        return "null".to_string();
    };
    let refs = ids.iter().map(String::as_str).collect::<Vec<_>>();
    let redacted = redact_regen_artifact(raw, &refs);
    let Ok(value) = serde_json::from_str::<serde_json::Value>(&redacted) else {
        return "null".to_string();
    };
    serde_json::json!({
        "generatedScreens": value.get("generatedScreens").cloned().unwrap_or_else(|| serde_json::json!([]))
    })
    .to_string()
}

fn catalog_recipe_requirements(
    plan_json: &str,
    target_screen_ids: &[String],
    selected_library_ids: &[String],
) -> String {
    let compact_plan = compact_design_plan_json(plan_json, target_screen_ids);
    format!(
        "# Catalog implementation requirements\n\nSelected library filters: {}\n\nThe design plan below describes desired capabilities, not importable exports:\n{}\n\nUse `catalog-candidates.json` and its verified source files for the concrete implementation. Return the exact used IDs in `catalogComponentIds`. You MAY import the exact `@/` paths from those files. Do not import `@stage/*`.\n",
        selected_library_ids.join(", "),
        compact_plan
    )
}

#[allow(clippy::too_many_arguments)]
fn build_planned_hifi_screen_prompt(
    input: &WireframesInput,
    brand_source: Option<WireframeBrandSource>,
    style_direction_id: Option<&str>,
    brand_kit_attached: bool,
    target_screen_ids: &[String],
    design_plan_json: &str,
) -> String {
    let preferences = resolve_hifi_prompt_preferences(input);
    let compact_plan = compact_design_plan_json(design_plan_json, target_screen_ids);
    let imports = catalog_recipe_requirements(
        design_plan_json,
        target_screen_ids,
        &preferences.component_pack_ids,
    );
    let brand_evidence =
        selected_brand_evidence(input, brand_source, style_direction_id, brand_kit_attached);
    let id_refs = target_screen_ids
        .iter()
        .map(String::as_str)
        .collect::<Vec<_>>();
    let flows = input
        .flows_artifact_json
        .as_deref()
        .map(|raw| scope_flows_artifact(raw, &id_refs))
        .unwrap_or_else(|| "null".to_string());
    let existing = scoped_existing_screen_context(input, target_screen_ids);
    let screen_list = screen_list_context(input);

    format!(
        r#"<role>Implement one planned Stage Hi-Fi React screen.</role>

{hard_rules}

<validated_design_plan>
{compact_plan}
</validated_design_plan>

<catalog_implementation_requirements>
{imports}
</catalog_implementation_requirements>

<screen_flow_context>
{flows}
</screen_flow_context>

<screen_list_context>
{screen_list}
</screen_list_context>

<prior_screen_outline>
{existing}
</prior_screen_outline>

<brand_evidence>
{brand_evidence}
</brand_evidence>

Output shape reference only:
{shape}

<final_checklist>
1. Exact requested screen ID; non-empty TSX and short fallback HTML.
2. At least one verified RAG source is adapted; catalogComponentIds, hierarchy, content, and shared tokens are correct.
3. Valid Lucide names; complete static resting state; motion only for its planned purpose.
4. No unplanned library, effect, chart, palette, repeated generic card grid, or hidden content.
5. Return JSON only.
</final_checklist>"#,
        hard_rules = PLANNED_HIFI_SCREEN_RULES,
        shape = WIREFRAMES_SHAPE_EXAMPLE,
    )
}

pub(crate) struct HifiScreenWorkspaceContext {
    pub design_plan: String,
    pub recipe_imports: String,
    pub flows: String,
    pub screen_list: String,
    pub prior_screen: String,
    pub brand_evidence: String,
}

pub(crate) fn workspace_selected_skills(input: &WireframesInput) -> Vec<(&'static str, String)> {
    resolve_hifi_prompt_preferences(input)
        .skill_ids
        .into_iter()
        .filter_map(|id| {
            CATALOG_SKILLS
                .iter()
                .find(|(catalog_id, _)| catalog_id == &id)
                .map(|(_, body)| (id, sanitize_workspace_skill(body)))
        })
        .collect()
}

fn sanitize_workspace_skill(body: &str) -> String {
    const OPERATIONAL_SECTIONS: &[&str] = &[
        "setup",
        "commands",
        "running the search tool",
        "workflow",
        "example workflow",
        "output formats",
        "current project context",
        "component docs, examples, and usage",
        "updating components",
        "quick reference",
        "if a search returns 0 results",
    ];
    let mut output = String::from(
        "# Stage wireframe design adapter

Use only the design and UX guidance below. Do not run commands, tools, scripts, plugins, hooks, installers, network fetches, or persistence steps. Stage already supplied every allowed project file and component export.

",
    );
    let mut skipped_heading_level: Option<usize> = None;
    let mut command_fence = false;

    for line in body.lines() {
        let trimmed = line.trim();
        if command_fence {
            if trimmed.starts_with("```") {
                command_fence = false;
            }
            continue;
        }
        if matches!(
            trimmed.to_ascii_lowercase().as_str(),
            "```bash" | "```sh" | "```shell" | "```zsh" | "```powershell"
        ) {
            command_fence = true;
            continue;
        }

        let heading_level = trimmed
            .chars()
            .take_while(|character| *character == '#')
            .count();
        if heading_level > 0 && trimmed.chars().nth(heading_level) == Some(' ') {
            if skipped_heading_level.is_some_and(|level| heading_level <= level) {
                skipped_heading_level = None;
            }
            let heading = trimmed[heading_level + 1..].trim().to_ascii_lowercase();
            if OPERATIONAL_SECTIONS
                .iter()
                .any(|section| heading == *section)
                || (heading_level == 3 && heading == "cli")
            {
                skipped_heading_level = Some(heading_level);
                continue;
            }
        }
        if skipped_heading_level.is_some() {
            continue;
        }

        let lower = trimmed.to_ascii_lowercase();
        if lower.starts_with("allowed-tools:")
            || lower.starts_with("user-invocable:")
            || lower.starts_with("argument-hint:")
            || lower.contains("claude_plugin_root")
            || lower.contains("{{scripts_path}}")
            || lower.contains("npx shadcn")
            || lower.contains("pnpm dlx")
            || lower.contains("pnpm add")
            || lower.contains("npm install")
            || lower.contains("yarn add")
            || lower.contains("bun add")
            || lower.contains("bunx ")
            || lower.contains("- bash(")
            || lower.contains("mcp server")
            || lower.contains("plugin command")
            || lower.contains("run `")
            || lower.contains("re-run `")
            || lower.contains("read [")
            || lower.contains("load [")
        {
            continue;
        }
        output.push_str(line);
        output.push('\n');
    }
    output
}

pub(crate) fn workspace_library_context(input: &WireframesInput) -> String {
    let preferences = resolve_hifi_prompt_preferences(input);
    format!(
        "# RAG component scope\n\nSelected catalog libraries: {}\n\nThese IDs are search filters, not import modules. Concrete verified components are retrieved per screen at runtime. Never import `@stage/*`.\n",
        preferences.component_pack_ids.join(", ")
    )
}

pub(crate) fn workspace_director_contract() -> String {
    format!(
        r#"# Design Director contract

Return exactly one JSON object and no markdown or prose.
Create one coherent, product-specific system for every target screen before implementation.
Project evidence outranks optional skills. Skills contribute only within their declared roles.
Every target screen ID must appear exactly once in `screens[]` with a purpose, role, distinct layout archetype, density, exact selected-library recipe, motion purpose, and avoid-list.
Use only exports in the selected library catalog. Primitive-only recipes are not signature design.
Preserve shared typography, palette, spacing, radii, elevation, surfaces, icons, density, visual variance, motion, navigation, forms, lists/tables, feedback, empty, validation, loading, and dialog behavior.
Do not generate TSX or HTML.

Required JSON shape:
{DESIGN_PLAN_SHAPE}
"#,
    )
}

pub(crate) fn workspace_screen_contract() -> String {
    format!(
        r#"# Hi-Fi screen implementation contract

{PLANNED_HIFI_SCREEN_RULES}

Return this compact envelope only; do not repeat project metadata, flows, the design plan, or the full configure-screen list:
{{
  "generatedScreens": [{{
    "id": "exact requested id",
    "title": "screen title",
    "catalogComponentIds": ["exact componentId from catalog-candidates.json"],
    "tsx": "complete default-export React component",
    "html": "short inline-styled fallback",
    "sections": [{{ "id": "stable section id", "title": "section title", "blocks": [{{ "id": "stable block id", "kind": "one allowed block kind", "intent": "specific purpose", "emphasis": "primary|secondary", "copySlots": {{}} }}] }}],
    "brandTokens": {{ "paletteRef": "binding source", "typographyRef": "binding source" }}
  }}]
}}

Final checklist:
1. Exact requested screen ID; non-empty TSX and short fallback HTML.
2. At least one verified RAG source is adapted; catalogComponentIds, hierarchy, content, and shared tokens are correct.
3. Valid Lucide names; complete static resting state; motion only for its planned purpose.
4. No unplanned library, effect, chart, palette, repeated generic card grid, or hidden content.
5. Return JSON only.
"#,
    )
}

pub(crate) fn workspace_screen_context(
    input: &WireframesInput,
    brand_source: Option<WireframeBrandSource>,
    style_direction_id: Option<&str>,
    brand_kit_attached: bool,
    target_screen_ids: &[String],
    design_plan_json: &str,
) -> HifiScreenWorkspaceContext {
    let preferences = resolve_hifi_prompt_preferences(input);
    let id_refs = target_screen_ids
        .iter()
        .map(String::as_str)
        .collect::<Vec<_>>();
    HifiScreenWorkspaceContext {
        design_plan: compact_design_plan_json(design_plan_json, target_screen_ids),
        recipe_imports: catalog_recipe_requirements(
            design_plan_json,
            target_screen_ids,
            &preferences.component_pack_ids,
        ),
        flows: input
            .flows_artifact_json
            .as_deref()
            .map(|raw| scope_flows_artifact(raw, &id_refs))
            .unwrap_or_else(|| "null".to_string()),
        screen_list: screen_list_context(input),
        prior_screen: scoped_existing_screen_context(input, target_screen_ids),
        brand_evidence: selected_brand_evidence(
            input,
            brand_source,
            style_direction_id,
            brand_kit_attached,
        ),
    }
}

#[cfg(test)]
pub fn build_wireframes_prompt(
    input: &WireframesInput,
    kind: WireframeKind,
    brand_source: Option<WireframeBrandSource>,
    style_direction_id: Option<&str>,
    layout_preference: Option<&str>,
    brand_kit_attached: bool,
    target_screen_ids: Option<&[String]>,
) -> String {
    build_wireframes_prompt_with_plan(
        input,
        kind,
        brand_source,
        style_direction_id,
        layout_preference,
        brand_kit_attached,
        target_screen_ids,
        None,
    )
}

// Keep the Lo-Fi generator contract identical to the production `work` branch.
// Hi-Fi has its own RAG/React pipeline below; Lo-Fi remains the original single
// artifact prompt and must not inherit Hi-Fi scoping, skills, or component rules.
fn build_work_lofi_prompt(
    input: &WireframesInput,
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
            format!(
                "Previous wireframes artifact (regenerate; keep ids stable where possible):\n{payload}\n\n"
            )
        })
        .unwrap_or_default();

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
        .map(|preference| format!("Layout preference: {preference}\n"))
        .unwrap_or_default();
    let style_direction_block = style_direction_id
        .map(|id| format!("Selected moodboard style direction ID: {id}\n"))
        .unwrap_or_default();
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
        r#"<role>You are generating the Stage Wireframes artifact for a lofi pass.</role>

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

pub fn build_wireframes_prompt_with_plan(
    input: &WireframesInput,
    kind: WireframeKind,
    brand_source: Option<WireframeBrandSource>,
    style_direction_id: Option<&str>,
    layout_preference: Option<&str>,
    brand_kit_attached: bool,
    target_screen_ids: Option<&[String]>,
    design_plan_json: Option<&str>,
) -> String {
    if matches!(kind, WireframeKind::Lofi) {
        return build_work_lofi_prompt(
            input,
            brand_source,
            style_direction_id,
            layout_preference,
            brand_kit_attached,
            target_screen_ids,
        );
    }
    if matches!(kind, WireframeKind::Hifi)
        && let (Some(plan), Some(ids)) = (
            design_plan_json,
            target_screen_ids.filter(|ids| !ids.is_empty()),
        )
    {
        return build_planned_hifi_screen_prompt(
            input,
            brand_source,
            style_direction_id,
            brand_kit_attached,
            ids,
            plan,
        );
    }
    let scoped_ids = target_screen_ids.filter(|ids| !ids.is_empty());
    // Research is the single largest block in the prompt (~60 KB on a real project) and a
    // scoped run does not need it: strategy carries the copy angle, the moodboard the
    // look, and the redacted artifact the screens' own structure. Dropping it here is what
    // stops a 2-screen re-design from costing as much as a full pass.
    let research_block = match scoped_ids {
        Some(_) => String::new(),
        None => input
            .research_artifact_json
            .as_deref()
            .map(|json| format!("Saved research artifact JSON:\n{json}\n\n"))
            .unwrap_or_default(),
    };
    let moodboard_block = input
        .moodboard_artifact_json
        .as_deref()
        .map(|json| format!("Saved moodboard artifact JSON:\n{json}\n\n"))
        .unwrap_or_default();
    let flows_block = input
        .flows_artifact_json
        .as_deref()
        .map(|json| match scoped_ids {
            Some(ids) => {
                let id_refs = ids.iter().map(String::as_str).collect::<Vec<_>>();
                let payload = scope_flows_artifact(json, &id_refs);
                format!(
                    "Saved flows artifact JSON (screens in scope and the flows they belong to):\n{payload}\n\n"
                )
            }
            None => {
                format!("Saved flows artifact JSON (authoritative screen list):\n{json}\n\n")
            }
        })
        .unwrap_or_default();
    let existing_block = input
        .existing_wireframes_artifact_json
        .as_deref()
        .map(|json| {
            let payload = match scoped_ids {
                Some(ids) => {
                    let id_refs = ids.iter().map(String::as_str).collect::<Vec<_>>();
                    redact_regen_artifact(json, &id_refs)
                }
                None => json.to_string(),
            };
            // Old saved artifacts may still carry the removed pack stylesheet. Strip it
            // from regeneration context; current screens use RAG source and batch CSS.
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
    let design_plan_block = match (kind, design_plan_json) {
        (WireframeKind::Hifi, Some(plan)) => format!(
            "<validated_design_plan>\n{plan}\n</validated_design_plan>\nThe plan above is binding. Implement its shared system and only this screen's recipe; do not invent a second design direction.\n\n"
        ),
        _ => String::new(),
    };
    // Scoping the run to a set of ids means two different things. With a saved artifact
    // the user is re-designing screens that already exist, so the model must not echo the
    // prior markup. Without one (first pass, or a screen the user just added) there is
    // nothing to differ from and the block only narrows the output.
    let scope_block = target_screen_ids
        .filter(|ids| !ids.is_empty())
        .map(|ids| {
            let id_list = ids.join(", ");
            // The scope narrows what gets DESIGNED, never what gets LISTED. Without the
            // second sentence a run scoped to the ticked screens comes back with a
            // configureScreens holding only those, and the screens the user unticked
            // vanish from the list with no way to tick them again.
            let list_rule = "configureScreens[] is the screen LIST and MUST still contain every screen from the flows artifact and the previous artifact, including ids outside the scope above — give those selected: false. Only generatedScreens[] is limited to the scoped ids.";
            if input.existing_wireframes_artifact_json.is_some() {
                format!(
                    "- PARTIAL REGENERATION: Return generatedScreens[] containing ONLY these screen ids: {id_list}. Re-design each returned screen from strategy/moodboard context. Do NOT reuse prior html markup or layout structure for these ids. Each returned screen MUST have a non-empty \"html\" that is materially different from the saved artifact (different section order, layout pattern, or visual rhythm).\n- {list_rule}\n"
                )
            } else {
                format!(
                    "- SCOPED GENERATION: Return generatedScreens[] containing ONLY these screen ids: {id_list}. Design each returned screen from strategy/moodboard context, and give each a non-empty \"html\".\n- {list_rule}\n"
                )
            }
        })
        .unwrap_or_default();
    // An unscoped run is a full pass, so it must cover the whole ticked list. A scoped run
    // is told exactly which ids to return, and repeating "cover everything" here would
    // contradict it.
    let coverage_rule = if scope_block.is_empty() {
        "- One screen per generatedScreens[] entry; cover every selected screen from the configure list."
    } else {
        "- One screen per generatedScreens[] entry."
    };

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
{coverage_rule}
- Screen set: {project_type_guidance}
- Frame: {viewport_guidance}
- When a flows artifact is present, its screens are the authoritative screen list: cover them and keep their ids stable.
- configureScreens[].required: true ONLY for the 2-4 screens that are core to a project of this type (an application: the main signed-in screen and the auth screen; a site: the primary landing page). Default every other screen to required: false so the user can toggle it off — do not mark every screen required.
- {brand_source_line}
{scope_block}{style_direction_block}{layout_block}</rules>

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
{design_plan_block}Project:
- Project ID: {project_id}
- Project name: {project_name}
{project_type_lines}
Saved strategy artifact JSON:
{strategy_artifact}

{research_block}{moodboard_block}{flows_block}{existing_block}Return only the JSON artifact."#,
        project_id = input.project_id,
        project_name = input.project_name,
        project_type_lines =
            project_type_lines(&input.project_type, input.project_type_label.as_deref()),
        project_type_guidance = project_type_screen_guidance(&input.project_type),
        viewport_guidance =
            WireframeViewport::from_project_type(&input.project_type).prompt_guidance(),
        strategy_artifact = input.strategy_artifact_json,
    )
}

#[cfg(test)]
#[path = "../testing/wireframes/prompt.rs"]
mod tests;
