use serde_json::Value;

use crate::models::flows::FlowsInput;
use crate::models::research::ProjectCategory;

const FLOWS_SHAPE_EXAMPLE: &str = r#"{
  "apiVersion": "v1",
  "artifactKind": "flowsArtifact",
  "projectId": "PROJECT_ID",
  "researchArtifactId": "RESEARCH_ARTIFACT_ID",
  "strategyArtifactId": "STRATEGY_ARTIFACT_ID",
  "moodboardArtifactId": "MOODBOARD_ARTIFACT_ID",
  "title": "Project Flows",
  "flows": [
    {
      "id": "flow-1",
      "title": "User Completes the Core Task",
      "description": "Move from the primary product surface to a successful domain action.",
      "status": "Draft",
      "category": "Conversion",
      "screenCount": 5,
      "steps": [
        { "id": "flow-1-step-1", "order": 0, "label": "Primary workspace -> Review current state", "screenId": "screen-workspace" },
        { "id": "flow-1-step-2", "order": 1, "label": "Primary workspace -> Start core action", "screenId": "screen-workspace" }
      ]
    }
  ],
  "screens": [
    {
      "id": "screen-workspace",
      "title": "Primary workspace",
      "description": "Main product screen for reviewing state and starting the core domain action.",
      "flowCount": 2,
      "keyElements": ["Domain-specific overview", "Primary task action"]
    }
  ],
  "generatedAt": 0
}"#;

const SITEMAP_SHAPE_EXAMPLE: &str = r#"{
  "apiVersion": "v1", "artifactKind": "flowsArtifact", "projectId": "PROJECT_ID",
  "title": "Project Sitemap", "generatedAt": 0,
  "flows": [{
    "id": "main-sitemap", "title": "Main Sitemap", "description": "Public website structure.",
    "status": "Draft", "category": "Navigation", "screenCount": 3,
    "steps": [
      { "id": "home", "order": 0, "label": "Home", "screenId": "screen-home" },
      { "id": "about", "order": 1, "label": "About", "screenId": "screen-about" },
      { "id": "pricing", "order": 2, "label": "Pricing", "screenId": "screen-pricing" }
    ]
  }],
  "screens": [
    { "id": "screen-home", "title": "Home", "description": "Website entry page.", "flowCount": 1, "keyElements": ["Primary proposition", "Main navigation"] },
    { "id": "screen-about", "title": "About", "description": "Company story.", "flowCount": 1, "keyElements": ["Story", "Team"] },
    { "id": "screen-pricing", "title": "Pricing", "description": "Available plans.", "flowCount": 1, "keyElements": ["Plan comparison", "Purchase action"] }
  ],
  "canvas": { "version": 1, "boards": [{
    "flowId": "main-sitemap",
    "positions": [{ "stepId": "home", "x": 350, "y": 80 }, { "stepId": "about", "x": 180, "y": 210 }, { "stepId": "pricing", "x": 520, "y": 210 }],
    "edges": [{ "source": "home", "target": "about" }, { "source": "home", "target": "pricing" }]
  }] }
}"#;

fn structure_rules(category: ProjectCategory) -> &'static str {
    match category {
        ProjectCategory::Websites => {
            "- Generate a Sitemap, not five product/user journeys. Use one main board unless the saved scope requires distinct website structures.\n- Each step is a website page with a concise page-name label and a stable screenId pointing to screens[]. Include only pages justified by the saved context, up to 18 per board.\n- Include canvas version 1 with one board per flow, a position for every step, and directed parent/child navigation edges. The steps array is an inventory, not a linear journey. Never connect unrelated sibling pages merely because they are adjacent in the array."
        }
        ProjectCategory::WebApps | ProjectCategory::IosApps => {
            "- Generate 5 high-signal functional product/user flows by default, with 4-7 ordered steps each.\n- Each step label should read like Screen -> Action, adapted to the actual domain: the screen name plus a 2-5 word action (for example \"Portfolio -> Review holdings\"). Put details in screens[].keyElements, never in the label. Action/decision nodes are not additional screens.\n- App screens support core tasks, data, transactions, states and settings; do not substitute public marketing pages for app functionality. For iOS apps, use mobile navigation and native interaction patterns.\n- Generate 10-15 reusable unique screens when justified by the saved context. Reference the same screenId when different actions use the same screen."
        }
    }
}

pub fn build_flows_prompt(input: &FlowsInput) -> String {
    format!(
        r#"You are generating the Stage Flows artifact.

Return a single valid JSON object matching the Stage FlowsArtifact schema.
Do not return markdown.
Do not add explanatory text before or after the JSON.

This shape example is ONLY a formatting reference, not content to copy:
{shape_example}

Project:
- Project ID: {project_id}
- Project name: {project_name}
- Project category (authoritative): {project_category}

Saved research artifact JSON:
{research_artifact}

Saved strategy artifact JSON:
{strategy_artifact}

Saved moodboard artifact JSON:
{moodboard_artifact}

Existing flows artifact JSON, if any:
{existing_flows_artifact}

Existing flows artifact ID, if any:
{existing_flows_artifact_id}

Requirements:
{structure_rules}
- Make every generated flow specific to the saved Research, Strategy, and Moodboard context.
- Use the authoritative project category to choose Sitemap (websites) or Flows (web/iOS apps); do not infer a different category from upstream text.
- For apps, platforms, dashboards, and authenticated products, prioritize functional screens for the domain's core tasks, data, transactions, states, and settings. Do not default to Homepage, About Us, Features, Pricing, Testimonials, Blog, Contact Us, or Demo Request unless the artifacts explicitly require a marketing website.
- Marketing pages are appropriate only when the project scope actually includes a public marketing website.
- If the existing artifact has canvas metadata, preserve ALL flow IDs, step IDs, step-to-screen references, and board membership. Do not add/remove/reorder nodes, change saved positions/connections, or invent a new graph during regeneration. Refine labels, descriptions and screen elements without replacing the saved diagram. Preserve every existing screen ID as well. This preservation rule overrides all default flow/page/screen counts.
- If no saved canvas exists, use existing flows for continuity and replace generic content that conflicts with the authoritative category.
- Do not call or assume external Refero flow search. Use only the Stage artifacts above.
- Every generated flow must use `status: "Draft"`. The Stage user approves flows later.
- Use concise categories such as `Navigation`, `Onboarding`, `Conversion`, `Evaluation`, `Client portal`, or `Handoff`.
- Use stable screen IDs in `screenId` when a step maps to a generated screen.
- Screens should include specific `keyElements` grounded in the strategy and moodboard direction.
- Avoid generic SaaS advice unless the project artifacts are generic.
- Do not include JSON null values. Omit optional fields instead.

The JSON must use:
- `apiVersion`: `"v1"`
- `artifactKind`: `"flowsArtifact"`
- `projectId`: the provided project ID
- `researchArtifactId`: the provided research artifact ID
- `strategyArtifactId`: the provided strategy artifact ID
- `moodboardArtifactId`: the provided moodboard artifact ID
"#,
        shape_example = if input.project_category == ProjectCategory::Websites {
            SITEMAP_SHAPE_EXAMPLE
        } else {
            FLOWS_SHAPE_EXAMPLE
        },
        structure_rules = structure_rules(input.project_category),
        project_category = input.project_category.display_name(),
        project_id = input.project_id,
        project_name = input.project_name,
        research_artifact = pretty_json(&input.research_artifact_json),
        strategy_artifact = pretty_json(&input.strategy_artifact_json),
        moodboard_artifact = pretty_json(&input.moodboard_artifact_json),
        existing_flows_artifact = input
            .existing_flows_artifact_json
            .as_deref()
            .map(pretty_json)
            .unwrap_or_else(|| "None.".to_string()),
        existing_flows_artifact_id = input
            .existing_flows_artifact_id
            .as_deref()
            .unwrap_or("None."),
    )
}

pub fn build_screen_regenerate_prompt(
    screen_id: &str,
    artifact: &Value,
    input: &FlowsInput,
) -> String {
    format!(
        r#"You are regenerating one screen inside a Stage Flows artifact.

Return a single valid JSON object. Do not return markdown.

Target screen ID:
{screen_id}

Return this shape:
{{
  "id": "{screen_id}",
  "title": "Screen title",
  "description": "One clear sentence.",
  "keyElements": ["Specific element", "Specific element"]
}}

Rules:
- Only regenerate the target screen.
- Keep the same screen ID.
- Return 4-8 key elements.
- Ground the screen in the current artifact and upstream context.
- Do not include JSON null values.

Current flows artifact:
{artifact}

Research artifact:
{research_artifact}

Strategy artifact:
{strategy_artifact}

Moodboard artifact:
{moodboard_artifact}
"#,
        screen_id = screen_id,
        artifact = pretty_json_value(artifact),
        research_artifact = pretty_json(&input.research_artifact_json),
        strategy_artifact = pretty_json(&input.strategy_artifact_json),
        moodboard_artifact = pretty_json(&input.moodboard_artifact_json),
    )
}

pub fn build_flow_regenerate_prompt(flow_id: &str, artifact: &Value, input: &FlowsInput) -> String {
    format!(
        r#"You are regenerating one flow inside a Stage Flows artifact.

Return a single valid JSON object. Do not return markdown.

Target flow ID:
{flow_id}

Return this shape:
{{
  "id": "{flow_id}",
  "title": "Flow title",
  "description": "One clear sentence.",
  "status": "Draft",
  "category": "Conversion",
  "screenCount": 4,
  "steps": [
    {{ "id": "{flow_id}-step-1", "order": 0, "label": "Screen -> Action", "screenId": "screen-id" }}
  ]
}}

Rules:
- Only regenerate the target flow.
- Keep the same flow ID.
- Use `status: "Draft"`.
- Preserve every existing step ID and screenId. If the current artifact has canvas metadata, keep exactly the same nodes and connections; update content only.
{structure_rules}
- Ground the flow in the current artifact and upstream context.
- Do not include JSON null values.

Current flows artifact:
{artifact}

Research artifact:
{research_artifact}

Strategy artifact:
{strategy_artifact}

Moodboard artifact:
{moodboard_artifact}
"#,
        flow_id = flow_id,
        structure_rules = structure_rules(input.project_category),
        artifact = pretty_json_value(artifact),
        research_artifact = pretty_json(&input.research_artifact_json),
        strategy_artifact = pretty_json(&input.strategy_artifact_json),
        moodboard_artifact = pretty_json(&input.moodboard_artifact_json),
    )
}

#[cfg(test)]
#[path = "../testing/flows/prompt.rs"]
mod tests;

fn pretty_json(raw: &str) -> String {
    serde_json::from_str::<Value>(raw)
        .and_then(|value| serde_json::to_string_pretty(&value))
        .unwrap_or_else(|_| raw.to_string())
}

fn pretty_json_value(value: &Value) -> String {
    serde_json::to_string_pretty(value).unwrap_or_else(|_| value.to_string())
}
