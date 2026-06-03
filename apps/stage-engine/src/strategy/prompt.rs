use serde_json::Value;

use crate::models::strategy::StrategyInput;

const STRATEGY_SHAPE_EXAMPLE: &str = r#"{
  "title": "Project Strategy",
  "sections": [
    {
      "id": "direction",
      "title": "Design Direction",
      "status": "action",
      "kind": "plain",
      "body": ["One concise strategic direction paragraph."]
    },
    {
      "id": "principles",
      "title": "Design Principles",
      "status": "action",
      "kind": "principles",
      "principles": [
        {
          "title": "Clarity over decoration",
          "body": "One principle explained clearly.",
          "research": "Optional research grounding."
        }
      ]
    },
    {
      "id": "audience",
      "title": "Target Audience Strategy",
      "status": "action",
      "kind": "table",
      "table": [["Primary user", "Who this is for"]]
    },
    {
      "id": "content",
      "title": "Content Strategy",
      "status": "action",
      "kind": "paragraph",
      "body": ["Voice: ...", "CTA: ...", "Empty states: ..."]
    },
    {
      "id": "positioning",
      "title": "Competitive Positioning",
      "status": "action",
      "kind": "boxes",
      "boxes": [{ "title": "FOLLOW", "bullets": ["..."] }]
    },
    {
      "id": "pages",
      "title": "Key Pages & Objectives",
      "status": "action",
      "kind": "cards",
      "cards": [
        {
          "title": "Dashboard",
          "objective": "Why the page exists",
          "kpi": "What to measure",
          "keyElement": "Most important UI element"
        }
      ]
    },
    {
      "id": "accessibility",
      "title": "Accessibility & Constraints",
      "status": "action",
      "kind": "table",
      "table": [["WCAG level", "AA minimum"]]
    }
  ]
}"#;

pub fn build_strategy_prompt(input: &StrategyInput) -> String {
    format!(
        r#"You are generating the Stage Strategy artifact.

Return a single valid JSON object matching the Stage StrategyArtifact schema.
Do not return markdown.
Do not add explanatory text before or after the JSON.

This shape example is ONLY a formatting reference, not content to copy:
{shape_example}

Project:
- Project ID: {project_id}
- Project name: {project_name}

Focus areas:
{focus_areas}

Additional notes:
{additional_notes}

Saved research artifact JSON:
{research_artifact}

Requirements:
- Use exactly these seven sections and keep them in this order:
  1. Design Direction (`direction`, `plain`)
  2. Design Principles (`principles`, `principles`)
  3. Target Audience Strategy (`audience`, `table`)
  4. Content Strategy (`content`, `paragraph`)
  5. Competitive Positioning (`positioning`, `boxes`)
  6. Key Pages & Objectives (`pages`, `cards`)
  7. Accessibility & Constraints (`accessibility`, `table`)
- Make the strategy specific to the saved research. Do not write generic SaaS advice.
- Set every section to `status: "action"`. Only the user approves sections in the Stage UI.
- For Content Strategy, write short labeled lines such as `Voice: ...`, `CTA: ...`, `Empty states: ...`.
- For Competitive Positioning, use 3 boxes titled `FOLLOW`, `BREAK`, and `AVOID`.
- For Key Pages & Objectives, return 3-5 cards grounded in the research opportunities and user needs.
- For `table` sections (`audience`, `accessibility`), each row must be a JSON array. Prefer two cells `[label, value]`. Extra columns are allowed but the first cell is treated as the label and the rest are combined into the value.

The JSON must use:
- `apiVersion`: `"v1"`
- `artifactKind`: `"strategyArtifact"`
- `projectId`: the provided project ID
- `researchArtifactId`: the provided research artifact ID
"#,
        shape_example = STRATEGY_SHAPE_EXAMPLE,
        project_id = input.project_id,
        project_name = input.project_name,
        focus_areas = format_focus_areas(&input.focus_areas),
        additional_notes = input.additional_notes.as_deref().unwrap_or("None."),
        research_artifact = pretty_json(&input.research_artifact_json),
    )
}

fn format_focus_areas(focus_areas: &[String]) -> String {
    if focus_areas.is_empty() {
        "None.".to_string()
    } else {
        focus_areas
            .iter()
            .map(|value| format!("- {value}"))
            .collect::<Vec<_>>()
            .join("\n")
    }
}

fn pretty_json(raw: &str) -> String {
    serde_json::from_str::<Value>(raw)
        .and_then(|value| serde_json::to_string_pretty(&value))
        .unwrap_or_else(|_| raw.to_string())
}
