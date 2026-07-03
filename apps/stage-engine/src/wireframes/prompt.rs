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
- Wrap everything in one root <div> — do not emit <html>, <head>, or <body> tags.
- Still fill sections[]/blocks[] as the structural outline (used for Figma layer naming and Lo-Fi fallback); the "html" field is the source of truth for the visuals.

Brand:
- Derive the palette, typography, and tone from the moodboard styleGuides[] (or the attached brand kit). Apply real brand colors and fonts — never default grays/blues.
- Set brandTokens.paletteRef and brandTokens.typographyRef to the source you used.

Imagery:
- Use topic-relevant placeholder photos via https://images.unsplash.com/...&q=80&w=1200, or branded gradient blocks. Never leave empty image boxes.

Anti-slop taste rules (mandatory):
- Cohesive system: one spacing scale, one corner radius, consistent shadows.
- Strong typographic hierarchy and generous whitespace; avoid cramped, centered-everything layouts.
- Realistic copy drawn from the strategy/research artifacts — no "Lorem ipsum" or placeholder filler.
- Make each section visually distinct (alternating backgrounds, varied layout); avoid identical three-icon-card rows unless intentional.
- Keep markup semantic and FLAT (header, section, h1-h3, p, ul, button) so it converts cleanly to Figma layers and exportable code. Avoid absolute positioning, transforms, and exotic CSS.
- Ensure WCAG-AA text contrast.

Pre-flight check before returning: confirm every Hi-Fi screen has a non-empty "html" using brand colors, real copy, and at least one image, and that no two sections look identical.
"#;

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
        WireframeKind::Hifi => HIFI_RULES,
        WireframeKind::Lofi => "",
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
