use anyhow::bail;
use serde_json::Value;

use crate::models::research::ResearchInput;

use super::competitive::competitive_rules_for_prompt;

pub fn parse_research_section(source: Option<&str>) -> Option<&str> {
    source.and_then(|value| value.strip_prefix("section:"))
}

pub fn build_section_regenerate_prompt(
    section: &str,
    artifact: &Value,
    input: &ResearchInput,
) -> String {
    format!(
        r#"You are regenerating one section of a Stage Research artifact.

Return a single valid JSON value for the `{section}` section only.
Do not return markdown.
Do not wrap the section in an outer object unless the section itself is an object.

Project:
- Project ID: {project_id}
- Project name: {project_name}
- Industry: {industry}

Current artifact title: {title}

Current `{section}` value:
{current_section}

Regenerate this section with fresh, specific product-design insights grounded in the project brief.
Keep IDs stable when possible. For list sections, preserve stable `id` fields where they already exist.
{competitive_rules}
"#,
        section = section,
        project_id = input.project_id,
        project_name = input.project_name,
        industry = input.industry,
        title = artifact
            .get("title")
            .and_then(Value::as_str)
            .unwrap_or("Research"),
        current_section = serde_json::to_string_pretty(section_value(artifact, section))
            .unwrap_or_else(|_| "null".to_string()),
        competitive_rules = if section == "competitiveAnalysis" {
            format!("\n{}\n", competitive_rules_for_prompt(input))
        } else {
            String::new()
        },
    )
}

pub fn build_opportunities_prompt(artifact: &Value, input: &ResearchInput) -> String {
    format!(
        r#"You are generating strategic product opportunities from an already validated Stage Research artifact.

Return one valid JSON object with exactly this shape:
{{"opportunities":[{{"id":"opportunity-1","title":"Short label","description":"One sentence max 25 words.","sourceSection":"competitiveAnalysis"}}]}}

Rules:
- You are advising how **{project_name}** (client: {client_name}) can win vs competitors — NOT comparing competitors to each other.
- Use only findings present in the validated Research artifact below.
- Return 3–5 opportunities max.
- title: 2–4 words (e.g. "Conversational onboarding").
- description: exactly ONE sentence, max 25 words. State the gap + why it matters for this product.
- Example tone: "Onboarding is weak across competitors — mostly static forms. Guided setup would differentiate {project_name}."
- Never invent facts, competitors, user needs, or evidence.
- If the validated Research does not support an opportunity, omit it.
- Return no markdown and no text outside the JSON object.

Project goals from Convex:
- Project: {project_name}
- Client: {client_name}
- Industry: {industry}
- Brief: {project_brief}
- Target users: {target_users}
- Additional notes: {additional_notes}

Validated Research artifact:
{artifact}
"#,
        project_name = input.project_name,
        client_name = input.client_name.as_deref().unwrap_or("the client"),
        industry = input.industry,
        project_brief = input.project_brief.as_deref().unwrap_or("Not provided."),
        target_users = input.target_users.as_deref().unwrap_or("Not provided."),
        additional_notes = input.additional_notes.as_deref().unwrap_or("Not provided."),
        artifact = serde_json::to_string_pretty(artifact).unwrap_or_else(|_| "{}".to_string()),
    )
}

pub fn build_competitive_repair_prompt(artifact: &Value, input: &ResearchInput) -> String {
    format!(
        r#"Repair only the incomplete competitive analysis in this validated Stage Research artifact.

Return one valid JSON object with exactly these keys:
{{"competitiveAnalysis":{{"competitors":[],"matrixRows":[]}},"sourceReferences":[]}}

Rules:
- Use web search/fetch only for the allowed competitor sites below.
- Inspect at most the homepage plus three relevant pages per site.
- Return all existing valid competitive findings plus repaired missing findings.
- Every competitor claim must reference a returned website sourceReference id.
- Every matrix cell must include a Strong/OK/Weak score. A short UX note is optional.
- Never invent facts, sources, competitors, dimensions, scores, or placeholder values.
- If evidence is insufficient for a cell, omit that cell.
- Return no markdown and no text outside the JSON object.

Allowed competitors:
{competitors}

Current validated artifact:
{artifact}
"#,
        competitors = crate::research::competitive::format_competitive_targets_for_prompt(input),
        artifact = serde_json::to_string_pretty(artifact).unwrap_or_else(|_| "{}".to_string()),
    )
}

pub fn merge_research_section(
    artifact: &mut Value,
    section: &str,
    patch: Value,
) -> anyhow::Result<()> {
    let Some(object) = artifact.as_object_mut() else {
        bail!("research artifact was not a JSON object");
    };

    object.insert(section.to_string(), patch);
    Ok(())
}

fn section_value<'a>(artifact: &'a Value, section: &str) -> &'a Value {
    artifact.get(section).unwrap_or(&Value::Null)
}
