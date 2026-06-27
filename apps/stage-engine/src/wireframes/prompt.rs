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

pub fn build_wireframes_prompt(
    input: &WireframesInput,
    kind: WireframeKind,
    brand_source: Option<WireframeBrandSource>,
    style_direction_id: Option<&str>,
    layout_preference: Option<&str>,
    brand_kit_attached: bool,
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
            format!(
                "Previous wireframes artifact (regenerate; keep ids stable where possible):\n{json}\n\n"
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
        WireframeKind::Hifi => {
            "\nHi-Fi rules:\n- Populate brandTokens on each screen.\n- Choose blocks that match the moodboard pattern catalog when one is provided.\n"
        }
        WireframeKind::Lofi => "",
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
- One screen per generatedScreens[] entry; preserve every selected screen from the configure list.
- {brand_source_line}
{style_direction_block}{layout_block}</rules>

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
