use serde_json::{Value as JsonValue, json};

const STYLE_GUIDE_SHAPE_EXAMPLE: &str = r##"{
  "title": "Style Guide",
  "subtitle": "Brand Handbook for your project",
  "atmosphere": [
    { "label": "Density", "value": "8/10", "color": "#6D67D3", "tint": "#E7E6FD", "position": 80 },
    { "label": "Motion", "value": "5/10", "color": "#059669", "tint": "#D1FAE5", "position": 50 }
  ],
  "colorPalettes": [
    {
      "label": "Warning",
      "hex": "#F97316",
      "colors": ["#FFF7ED", "#FFEDD5", "#FED7AA", "#FDBA74", "#FB923C", "#F97316", "#EA580C", "#C2410C", "#9A3412", "#7C2D12", "#431407"],
      "highlightIndex": 5
    },
    {
      "label": "Success",
      "hex": "#10B981",
      "colors": ["#ECFDF5", "#D1FAE5", "#A7F3D0", "#6EE7B7", "#34D399", "#10B981", "#059669", "#047857", "#065F46", "#064E3B", "#022C22"],
      "highlightIndex": 5
    }
  ],
  "typography": {
    "fontFamily": "Geist",
    "previewSize": 28,
    "rows": [
      { "id": "21-semibold", "size": 21, "weight": "Semi-Bold", "className": "text-[21px] font-semibold", "lineHeight": "100%" },
      { "id": "13-medium", "size": 13, "weight": "Medium", "className": "text-[13px] font-medium", "lineHeight": "100%" }
    ],
    "weightSamples": [
      { "label": "Geist - Bold", "className": "text-[24px] font-bold" },
      { "label": "Geist - Regular", "className": "text-[20px] font-normal" }
    ]
  },
  "componentSwatchCount": 6
}"##;

pub fn build_styleguide_prompt(
    project_name: &str,
    direction_name: &str,
    strategy_artifact_json: Option<&str>,
    research_artifact_json: Option<&str>,
    direction_references: &[JsonValue],
    has_attached_images: bool,
) -> String {
    let strategy_block = match (strategy_artifact_json, research_artifact_json) {
        (Some(strategy), _) => format!("Strategy JSON:\n{strategy}"),
        (None, Some(research)) => format!(
            "No strategy artifact yet. Research JSON:\n{research}"
        ),
        (None, None) => "No strategy or research artifact available. Infer direction from moodboard references only.".to_string(),
    };

    let references_json = serde_json::to_string_pretty(&json!(direction_references))
        .unwrap_or_else(|_| "[]".to_string());

    let image_directive = if has_attached_images {
        "Attached image files are the visual source of truth for this Direction. Derive palette, typography, atmosphere, and component tone directly from those images. The reference JSON below lists metadata only (URLs/keys) — use the attached images, not the URLs."
    } else {
        "Use the selected Direction's moodboard image references as the visual source of truth. Reference fields may be public image URLs, thumbnails, or Stage asset keys."
    };

    format!(
        r#"You are generating a Stage Moodboard Style Guide for one visual direction.

Project: {project_name}
Direction: {direction_name}

{image_directive}

Strategy context:
{strategy_block}

Assigned moodboard image references for this Direction:
{references_json}

Return ONE JSON object only (no markdown fences, no commentary) matching this shape:
{STYLE_GUIDE_SHAPE_EXAMPLE}

Rules:
- Derive palette, typography, atmosphere sliders, and component tone from the assigned Direction moodboard images.
- Do not derive visual style from research images or images outside this Direction.
- Avoid default or generic visual choices unless the assigned images clearly support them.
- Avoid pure black #000000; use a near-black with visible tone when dark ink is needed.
- Avoid generic AI purple/blue neon palettes and gradients over 80% saturation.
- Use at most one strong accent color per palette group.
- Avoid generic serif defaults such as Times, Georgia, Garamond, and Palatino.
- Avoid Inter for premium or creative visual directions unless the images strongly imply a plain utility app.
- Include useful atmosphere coverage: Density, Variance, and Motion should be represented when possible.
- If Variance is above 4/10, do not recommend centered-hero visual language in labels or samples.
- Do not include vague filler such as "scroll to explore" or generic circular spinner guidance.
- atmosphere.position is 0-100 (slider position).
- colorPalettes.colors must contain 8-11 hex colors from light to dark.
- typography.rows need stable string ids, Tailwind-like className strings, and lineHeight like "100%" or "150%".
- componentSwatchCount is usually 6.
- Do NOT include id or directionId; the engine adds those.
"#,
        project_name = project_name,
        direction_name = direction_name,
        image_directive = image_directive,
        strategy_block = strategy_block,
        references_json = references_json,
        STYLE_GUIDE_SHAPE_EXAMPLE = STYLE_GUIDE_SHAPE_EXAMPLE,
    )
}
