use serde_json::Value;

use crate::models::flows::FlowsInput;

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
      "title": "Evaluator Requests a Demo",
      "description": "Move from landing page interest to a scheduled sales conversation.",
      "status": "Draft",
      "category": "Conversion",
      "screenCount": 5,
      "steps": [
        { "id": "flow-1-step-1", "order": 0, "label": "Landing page -> Review value proposition", "screenId": "screen-landing" },
        { "id": "flow-1-step-2", "order": 1, "label": "Landing page -> Click \"Request Demo\"", "screenId": "screen-landing" }
      ]
    }
  ],
  "screens": [
    {
      "id": "screen-landing",
      "title": "Landing page",
      "description": "Primary entry screen that frames the offer and routes visitors to conversion paths.",
      "flowCount": 2,
      "keyElements": ["Navigation with primary CTA", "Hero value proposition"]
    }
  ],
  "generatedAt": 0
}"#;

/// The `Project:` block lines describing the project type. An empty type (an older
/// Convex deployment that does not send it yet) degrades to `unspecified` rather
/// than emitting a blank value the model would have to guess about.
pub fn project_type_lines(project_type: &str, project_type_label: Option<&str>) -> String {
    let kind = match project_type.trim() {
        "" => "unspecified",
        value => value,
    };
    let mut lines = format!("- Project type: {kind}\n");
    if let Some(label) = project_type_label
        .map(str::trim)
        .filter(|label| !label.is_empty())
    {
        lines.push_str(&format!("- Project type detail: {label}\n"));
    }
    lines
}

/// Screen-set guidance keyed off the project type. Flows produces the screen list the
/// wireframes list is built from, so `wireframes::prompt` reuses this exact wording to
/// keep both passes planning the same kind of product.
pub fn project_type_screen_guidance(project_type: &str) -> &'static str {
    match project_type.trim() {
        "web-app" | "app-design" | "product-design" => {
            "This is an application project: plan signed-in application screens (sign-in/sign-up, dashboard or overview, the primary list, an item detail, create/edit, settings) plus the empty and error states that matter. Do NOT default to marketing pages - no homepage, pricing, blog, or testimonials unless the saved artifacts explicitly call for them."
        }
        "web-design" | "branding" => {
            "This is a site project: plan marketing pages (landing/home, product or service detail, pricing, about, contact, supporting content) rather than signed-in application screens."
        }
        _ => {
            "Derive the screen set from the saved artifacts for this project type. Plan marketing pages (home, pricing, blog) only if this project really is a marketing site, and signed-in application screens only if it really is an application."
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
{project_type_lines}
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
- Generate 5 high-signal product/user flows by default.
- Make every generated flow specific to the saved Research, Strategy, and Moodboard context.
- Do not call or assume external Refero flow search. Use only the Stage artifacts above.
- Every generated flow must use `status: "Draft"`. The Stage user approves flows later.
- Use concise categories such as `Onboarding`, `Conversion`, `Evaluation`, `Client portal`, or `Handoff`.
- Each flow should have 4-7 ordered steps.
- Each step label should read like `Landing page -> Click "Request Demo"` or `Form screen -> Fill details`.
- Use stable screen IDs in `screenId` when a step maps to a generated screen.
- Screen set: {project_type_guidance}
- Generate 10-15 reusable unique screens when possible.
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
        shape_example = FLOWS_SHAPE_EXAMPLE,
        project_id = input.project_id,
        project_name = input.project_name,
        project_type_lines =
            project_type_lines(&input.project_type, input.project_type_label.as_deref()),
        project_type_guidance = project_type_screen_guidance(&input.project_type),
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
- Return 4-7 ordered steps.
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
        artifact = pretty_json_value(artifact),
        research_artifact = pretty_json(&input.research_artifact_json),
        strategy_artifact = pretty_json(&input.strategy_artifact_json),
        moodboard_artifact = pretty_json(&input.moodboard_artifact_json),
    )
}

fn pretty_json(raw: &str) -> String {
    serde_json::from_str::<Value>(raw)
        .and_then(|value| serde_json::to_string_pretty(&value))
        .unwrap_or_else(|_| raw.to_string())
}

fn pretty_json_value(value: &Value) -> String {
    serde_json::to_string_pretty(value).unwrap_or_else(|_| value.to_string())
}

#[cfg(test)]
#[path = "../testing/flows/prompt.rs"]
mod tests;
