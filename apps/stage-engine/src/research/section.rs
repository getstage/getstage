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
