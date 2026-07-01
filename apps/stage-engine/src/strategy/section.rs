use anyhow::{Context, bail};
use serde_json::{Value, json};

use crate::models::strategy::StrategyInput;

/// Run source that asks the workflow to regenerate every section that is not yet
/// approved, leaving approved sections untouched.
pub const REGENERATE_UNAPPROVED_SOURCE: &str = "sections:unapproved";

pub fn parse_strategy_section(source: Option<&str>) -> Option<&str> {
    source.and_then(|value| value.strip_prefix("section:"))
}

/// Collect the ids of sections that are not approved, preserving artifact order.
pub fn unapproved_section_ids(artifact: &Value) -> Vec<String> {
    artifact
        .get("sections")
        .and_then(Value::as_array)
        .map(|sections| {
            sections
                .iter()
                .filter(|section| section.get("status").and_then(Value::as_str) != Some("approved"))
                .filter_map(|section| {
                    section
                        .get("id")
                        .and_then(Value::as_str)
                        .map(str::to_string)
                })
                .collect()
        })
        .unwrap_or_default()
}

pub fn build_section_regenerate_prompt(
    section_id: &str,
    artifact: &Value,
    input: &StrategyInput,
) -> String {
    format!(
        r#"You are regenerating one section of a Stage Strategy artifact.

Return a single valid JSON object for the strategy section with id `{section_id}`.
Match the Stage StrategySection schema exactly (`id`, `title`, `status`, `kind`, and only the relevant content fields).
Do not return markdown.
Do not wrap the section in an outer object.

Project:
- Project ID: {project_id}
- Project name: {project_name}

Focus areas:
{focus_areas}

Additional notes:
{additional_notes}

Saved research artifact JSON:
{research_artifact}

Current section:
{current_section}

Regenerate this section with fresh, concrete product-design strategy grounded in the saved research artifact.
Keep the section `id` as `{section_id}`.
Preserve `status: "approved"` only if the current section was already approved, otherwise set `status` to `"action"`.
"#,
        section_id = section_id,
        project_id = input.project_id,
        project_name = input.project_name,
        focus_areas = if input.focus_areas.is_empty() {
            "None.".to_string()
        } else {
            input
                .focus_areas
                .iter()
                .map(|value| format!("- {value}"))
                .collect::<Vec<_>>()
                .join("\n")
        },
        additional_notes = input.additional_notes.as_deref().unwrap_or("None."),
        research_artifact = pretty_json(&input.research_artifact_json),
        current_section =
            current_section_json(artifact, section_id).unwrap_or_else(|_| "null".to_string()),
    )
}

pub fn merge_strategy_section(
    artifact: &mut Value,
    section_id: &str,
    mut patch: Value,
) -> anyhow::Result<()> {
    let Some(sections) = artifact.get_mut("sections").and_then(Value::as_array_mut) else {
        bail!("strategy artifact missing sections array");
    };

    let Some(index) = sections
        .iter()
        .position(|section| section.get("id").and_then(Value::as_str) == Some(section_id))
    else {
        bail!("strategy section `{section_id}` was not found");
    };

    if let (Some(current), Some(next)) = (sections.get(index), patch.as_object_mut()) {
        let approved = current.get("status").and_then(Value::as_str) == Some("approved");
        next.insert("id".to_string(), json!(section_id));
        if approved {
            next.insert("status".to_string(), json!("approved"));
        } else {
            next.insert("status".to_string(), json!("action"));
        }
    }

    sections[index] = patch;
    Ok(())
}

fn current_section_json(artifact: &Value, section_id: &str) -> anyhow::Result<String> {
    let sections = artifact
        .get("sections")
        .and_then(Value::as_array)
        .context("strategy artifact missing sections array")?;

    let section = sections
        .iter()
        .find(|section| section.get("id").and_then(Value::as_str) == Some(section_id))
        .with_context(|| format!("strategy section `{section_id}` was not found"))?;

    Ok(serde_json::to_string_pretty(section)?)
}

fn pretty_json(raw: &str) -> String {
    serde_json::from_str::<Value>(raw)
        .and_then(|value| serde_json::to_string_pretty(&value))
        .unwrap_or_else(|_| raw.to_string())
}

#[cfg(test)]
#[path = "../testing/strategy/section.rs"]
mod tests;
