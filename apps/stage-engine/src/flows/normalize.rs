use anyhow::{Context, bail};
use serde_json::{Map as JsonMap, Value as JsonValue, json};

use crate::models::flows::FlowsInput;

const MAX_FLOWS: usize = 8;
const MAX_STEPS_PER_FLOW: usize = 8;
const MAX_SCREENS: usize = 18;
const MAX_KEY_ELEMENTS: usize = 8;

pub fn normalize_flows_artifact(
    artifact: JsonValue,
    input: &FlowsInput,
    generated_at: u128,
) -> anyhow::Result<JsonValue> {
    normalize_flows_artifact_with_status_policy(artifact, input, generated_at, true)
}

pub fn normalize_existing_flows_artifact(
    artifact: JsonValue,
    input: &FlowsInput,
    generated_at: u128,
) -> anyhow::Result<JsonValue> {
    normalize_flows_artifact_with_status_policy(artifact, input, generated_at, false)
}

fn normalize_flows_artifact_with_status_policy(
    artifact: JsonValue,
    input: &FlowsInput,
    generated_at: u128,
    force_draft: bool,
) -> anyhow::Result<JsonValue> {
    let object = artifact
        .as_object()
        .context("flows provider output was not a JSON object")?;
    let flows = object
        .get("flows")
        .and_then(JsonValue::as_array)
        .cloned()
        .unwrap_or_default();
    let screens = object
        .get("screens")
        .and_then(JsonValue::as_array)
        .cloned()
        .unwrap_or_default();

    let normalized_flows = flows
        .iter()
        .take(MAX_FLOWS)
        .enumerate()
        .filter_map(|(index, flow)| normalize_flow(flow, index, force_draft).transpose())
        .collect::<anyhow::Result<Vec<_>>>()?;

    if normalized_flows.is_empty() {
        bail!("The AI response did not contain usable flows.");
    }

    let normalized_screens = screens
        .iter()
        .take(MAX_SCREENS)
        .enumerate()
        .filter_map(|(index, screen)| normalize_screen(screen, index).transpose())
        .collect::<anyhow::Result<Vec<_>>>()?;

    let mut normalized = JsonMap::new();
    normalized.insert("apiVersion".to_string(), json!("v1"));
    normalized.insert("artifactKind".to_string(), json!("flowsArtifact"));
    normalized.insert("projectId".to_string(), json!(input.project_id));
    normalized.insert(
        "researchArtifactId".to_string(),
        json!(input.research_artifact_id),
    );
    normalized.insert(
        "strategyArtifactId".to_string(),
        json!(input.strategy_artifact_id),
    );
    normalized.insert(
        "moodboardArtifactId".to_string(),
        json!(input.moodboard_artifact_id),
    );
    normalized.insert(
        "title".to_string(),
        json!(
            object
                .get("title")
                .and_then(JsonValue::as_str)
                .map(str::trim)
                .filter(|value| !value.is_empty())
                .unwrap_or("Project Flows")
        ),
    );
    normalized.insert("flows".to_string(), JsonValue::Array(normalized_flows));
    normalized.insert("screens".to_string(), JsonValue::Array(normalized_screens));
    normalized.insert(
        "generatedAt".to_string(),
        json!(i64::try_from(generated_at).unwrap_or(i64::MAX)),
    );

    if let Some(figjam_url) = object
        .get("figjamUrl")
        .and_then(JsonValue::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        normalized.insert("figjamUrl".to_string(), json!(figjam_url));
    }

    if let Some(exported_at) = object.get("figjamExportedAt").and_then(JsonValue::as_i64) {
        if exported_at >= 0 {
            normalized.insert("figjamExportedAt".to_string(), json!(exported_at));
        }
    }

    if let Some(updated_at) = object.get("updatedAt").and_then(JsonValue::as_i64) {
        if updated_at >= 0 {
            normalized.insert("updatedAt".to_string(), json!(updated_at));
        }
    }

    Ok(JsonValue::Object(normalized))
}

pub fn merge_screen_patch(
    artifact: &mut JsonValue,
    screen_id: &str,
    patch: JsonValue,
) -> anyhow::Result<()> {
    let screens = artifact
        .get_mut("screens")
        .and_then(JsonValue::as_array_mut)
        .context("flows artifact missing screens array")?;
    let screen = screens
        .iter_mut()
        .find(|screen| screen.get("id").and_then(JsonValue::as_str) == Some(screen_id))
        .with_context(|| format!("No screen found with id `{screen_id}`."))?;
    let Some(screen_object) = screen.as_object_mut() else {
        bail!("target screen was not an object");
    };

    if let Some(title) = clean_string(patch.get("title")).filter(|value| !value.is_empty()) {
        screen_object.insert("title".to_string(), json!(title));
    }
    if let Some(description) =
        clean_string(patch.get("description")).filter(|value| !value.is_empty())
    {
        screen_object.insert("description".to_string(), json!(description));
    }
    if let Some(elements) = normalize_string_array(patch.get("keyElements"), MAX_KEY_ELEMENTS) {
        screen_object.insert("keyElements".to_string(), JsonValue::Array(elements));
    }

    Ok(())
}

pub fn merge_flow_patch(
    artifact: &mut JsonValue,
    flow_id: &str,
    patch: JsonValue,
) -> anyhow::Result<()> {
    let flows = artifact
        .get_mut("flows")
        .and_then(JsonValue::as_array_mut)
        .context("flows artifact missing flows array")?;
    let flow = flows
        .iter_mut()
        .find(|flow| flow.get("id").and_then(JsonValue::as_str) == Some(flow_id))
        .with_context(|| format!("No flow found with id `{flow_id}`."))?;
    let Some(flow_object) = flow.as_object_mut() else {
        bail!("target flow was not an object");
    };

    if let Some(title) = clean_string(patch.get("title")).filter(|value| !value.is_empty()) {
        flow_object.insert("title".to_string(), json!(title));
    }
    if let Some(description) =
        clean_string(patch.get("description")).filter(|value| !value.is_empty())
    {
        flow_object.insert("description".to_string(), json!(description));
    }
    if let Some(category) = clean_string(patch.get("category")).filter(|value| !value.is_empty()) {
        flow_object.insert("category".to_string(), json!(category));
    }

    flow_object.insert("status".to_string(), json!("Draft"));

    if let Some(steps) = patch.get("steps").and_then(JsonValue::as_array) {
        let normalized_steps = steps
            .iter()
            .take(MAX_STEPS_PER_FLOW)
            .enumerate()
            .filter_map(|(index, step)| normalize_step(step, flow_id, index).transpose())
            .collect::<anyhow::Result<Vec<_>>>()?;
        if !normalized_steps.is_empty() {
            flow_object.insert("steps".to_string(), JsonValue::Array(normalized_steps));
            flow_object.insert("screenCount".to_string(), json!(screen_count_from_steps(steps)));
        }
    }

    Ok(())
}

fn normalize_flow(flow: &JsonValue, index: usize, force_draft: bool) -> anyhow::Result<Option<JsonValue>> {
    let Some(object) = flow.as_object() else {
        return Ok(None);
    };
    let title = clean_string(object.get("title")).unwrap_or_else(|| format!("Flow {}", index + 1));
    if title.trim().is_empty() {
        return Ok(None);
    }

    let id = clean_string(object.get("id")).unwrap_or_else(|| stable_id("flow", &title, index));
    let description = clean_string(object.get("description"))
        .unwrap_or_else(|| "A project flow generated from Stage context.".to_string());
    let category =
        clean_string(object.get("category")).unwrap_or_else(|| "Project flow".to_string());
    let status = if force_draft {
        "Draft".to_string()
    } else {
        normalize_status(object.get("status"))
    };
    let steps = object
        .get("steps")
        .and_then(JsonValue::as_array)
        .cloned()
        .unwrap_or_default();
    let normalized_steps = steps
        .iter()
        .take(MAX_STEPS_PER_FLOW)
        .enumerate()
        .filter_map(|(step_index, step)| normalize_step(step, &id, step_index).transpose())
        .collect::<anyhow::Result<Vec<_>>>()?;
    let screen_count = object
        .get("screenCount")
        .and_then(JsonValue::as_u64)
        .unwrap_or_else(|| screen_count_from_steps(&steps));

    Ok(Some(json!({
        "id": id,
        "title": title,
        "description": description,
        "status": status,
        "category": category,
        "screenCount": screen_count,
        "steps": normalized_steps
    })))
}

fn normalize_screen(screen: &JsonValue, index: usize) -> anyhow::Result<Option<JsonValue>> {
    let Some(object) = screen.as_object() else {
        return Ok(None);
    };
    let title = clean_string(object.get("title")).unwrap_or_else(|| format!("Screen {}", index + 1));
    if title.trim().is_empty() {
        return Ok(None);
    }

    let id = clean_string(object.get("id")).unwrap_or_else(|| stable_id("screen", &title, index));
    let description = clean_string(object.get("description"))
        .unwrap_or_else(|| "A screen identified from the generated flows.".to_string());
    let flow_count = object
        .get("flowCount")
        .and_then(JsonValue::as_u64)
        .unwrap_or(1);
    let key_elements = normalize_string_array(object.get("keyElements"), MAX_KEY_ELEMENTS)
        .unwrap_or_default();

    Ok(Some(json!({
        "id": id,
        "title": title,
        "description": description,
        "flowCount": flow_count,
        "keyElements": key_elements
    })))
}

fn normalize_step(step: &JsonValue, flow_id: &str, index: usize) -> anyhow::Result<Option<JsonValue>> {
    let (label, id, screen_id) = match step {
        JsonValue::String(value) => (
            value.trim().to_string(),
            format!("{flow_id}-step-{}", index + 1),
            None,
        ),
        JsonValue::Object(object) => {
            let label = clean_string(object.get("label")).unwrap_or_default();
            let id = clean_string(object.get("id"))
                .unwrap_or_else(|| format!("{flow_id}-step-{}", index + 1));
            let screen_id = clean_string(object.get("screenId"));
            (label, id, screen_id)
        }
        _ => return Ok(None),
    };

    if label.is_empty() {
        return Ok(None);
    }

    let mut normalized = JsonMap::new();
    normalized.insert("id".to_string(), json!(id));
    normalized.insert("order".to_string(), json!(index));
    normalized.insert("label".to_string(), json!(label));
    if let Some(screen_id) = screen_id.filter(|value| !value.is_empty()) {
        normalized.insert("screenId".to_string(), json!(screen_id));
    }

    Ok(Some(JsonValue::Object(normalized)))
}

fn normalize_string_array(value: Option<&JsonValue>, limit: usize) -> Option<Vec<JsonValue>> {
    value.and_then(JsonValue::as_array).map(|items| {
        items
            .iter()
            .filter_map(|item| clean_string(Some(item)))
            .filter(|value| !value.is_empty())
            .take(limit)
            .map(|value| json!(value))
            .collect()
    })
}

fn normalize_status(value: Option<&JsonValue>) -> String {
    match clean_string(value).as_deref() {
        Some("Approved") => "Approved".to_string(),
        Some("In Review") => "In Review".to_string(),
        _ => "Draft".to_string(),
    }
}

fn screen_count_from_steps(steps: &[JsonValue]) -> u64 {
    let mut screens = std::collections::BTreeSet::new();
    for step in steps {
        if let Some(screen_id) = step
            .get("screenId")
            .and_then(JsonValue::as_str)
            .map(str::trim)
            .filter(|value| !value.is_empty())
        {
            screens.insert(screen_id.to_string());
            continue;
        }
        if let Some(label) = match step {
            JsonValue::String(value) => Some(value.as_str()),
            JsonValue::Object(object) => object.get("label").and_then(JsonValue::as_str),
            _ => None,
        } {
            let screen = label.split("->").next().unwrap_or(label).trim();
            if !screen.is_empty() {
                screens.insert(screen.to_lowercase());
            }
        }
    }

    u64::try_from(screens.len().max(1)).unwrap_or(1)
}

fn clean_string(value: Option<&JsonValue>) -> Option<String> {
    value
        .and_then(JsonValue::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(ToOwned::to_owned)
}

fn stable_id(prefix: &str, value: &str, index: usize) -> String {
    let slug = value
        .chars()
        .map(|character| {
            if character.is_ascii_alphanumeric() {
                character.to_ascii_lowercase()
            } else {
                '-'
            }
        })
        .collect::<String>()
        .split('-')
        .filter(|part| !part.is_empty())
        .collect::<Vec<_>>()
        .join("-");

    if slug.is_empty() {
        format!("{prefix}-{}", index + 1)
    } else {
        format!("{prefix}-{slug}")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn input() -> FlowsInput {
        FlowsInput {
            project_id: "p1".to_string(),
            project_name: "Project".to_string(),
            research_artifact_id: "r1".to_string(),
            research_artifact_json: "{}".to_string(),
            strategy_artifact_id: "s1".to_string(),
            strategy_artifact_json: "{}".to_string(),
            moodboard_artifact_id: "m1".to_string(),
            moodboard_artifact_json: "{}".to_string(),
            existing_flows_artifact_id: None,
            existing_flows_artifact_json: None,
        }
    }

    #[test]
    fn normalizes_string_steps_and_forces_draft() {
        let artifact = json!({
            "title": "Flows",
            "flows": [{
                "title": "Signup",
                "description": "Create account",
                "status": "Approved",
                "category": "Onboarding",
                "steps": ["Landing -> Click signup", "Form -> Submit"]
            }],
            "screens": []
        });

        let normalized = normalize_flows_artifact(artifact, &input(), 123).unwrap();

        assert_eq!(normalized["artifactKind"], "flowsArtifact");
        assert_eq!(normalized["flows"][0]["status"], "Draft");
        assert_eq!(normalized["flows"][0]["steps"][0]["label"], "Landing -> Click signup");
        assert_eq!(normalized["generatedAt"], 123);
    }

    #[test]
    fn rejects_empty_flows() {
        let artifact = json!({ "flows": [], "screens": [] });

        let error = normalize_flows_artifact(artifact, &input(), 123).unwrap_err();

        assert!(error.to_string().contains("usable flows"));
    }
}
