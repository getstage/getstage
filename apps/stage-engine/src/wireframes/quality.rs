use std::collections::{BTreeMap, BTreeSet, HashMap};

use anyhow::{Context, bail};
use serde_json::Value as JsonValue;

use crate::wireframes::design_plan::WireframeDesignPlan;
use crate::wireframes::render::RenderFailure;

fn normalized_library_id(value: &str) -> &str {
    match value {
        "bklit-ui" => "bklit",
        other => other,
    }
}

/// The Design Director describes component intent. The verified catalog, not a copied
/// renderer manifest, decides which concrete source implements that intent.
pub fn validate_design_plan_libraries(
    plan: &mut WireframeDesignPlan,
    selected_library_ids: &[String],
) -> anyhow::Result<()> {
    let selected = selected_library_ids
        .iter()
        .map(|value| normalized_library_id(value))
        .collect::<BTreeSet<_>>();
    if selected.is_empty() {
        bail!("Hi-Fi generation requires at least one selected component library");
    }

    let mut signature_screens = HashMap::<String, Vec<String>>::new();
    for screen in &plan.screens {
        let mut seen = BTreeSet::new();
        for component in &screen.component_recipe {
            if component.export_name.trim().is_empty() || component.purpose.trim().is_empty() {
                bail!(
                    "screen `{}` contains an incomplete component requirement",
                    screen.screen_id
                );
            }
            if !selected.contains(normalized_library_id(&component.library_id)) {
                bail!(
                    "screen `{}` requests unselected library `{}`",
                    screen.screen_id,
                    component.library_id
                );
            }
            let key = (
                normalized_library_id(&component.library_id).to_string(),
                component.export_name.clone(),
            );
            if !seen.insert(key) {
                bail!(
                    "screen `{}` repeats `{}` in its component requirements",
                    screen.screen_id,
                    component.export_name
                );
            }
            if component.signature {
                signature_screens
                    .entry(component.export_name.clone())
                    .or_default()
                    .push(screen.screen_id.clone());
            }
        }
    }

    let shared_patterns = serde_json::to_string(&plan.shared_patterns)
        .unwrap_or_default()
        .to_ascii_lowercase();
    for (signature, screens) in signature_screens {
        if screens.len() > 1 && !shared_patterns.contains(&signature.to_ascii_lowercase()) {
            bail!(
                "signature component `{signature}` is repeated across unrelated screens: {}",
                screens.join(", ")
            );
        }
    }
    Ok(())
}

fn retrieved_component_ids(artifact: &JsonValue, screen_id: &str) -> BTreeSet<String> {
    artifact
        .get("catalogRetrieval")
        .and_then(|value| value.get("screens"))
        .and_then(|value| value.get(screen_id))
        .and_then(|value| value.get("components"))
        .and_then(JsonValue::as_array)
        .into_iter()
        .flatten()
        .filter_map(|value| value.get("componentId").and_then(JsonValue::as_str))
        .map(str::to_string)
        .collect()
}

fn claimed_component_ids(screen: &JsonValue) -> BTreeSet<String> {
    screen
        .get("catalogComponentIds")
        .and_then(JsonValue::as_array)
        .into_iter()
        .flatten()
        .filter_map(JsonValue::as_str)
        .map(str::to_string)
        .collect()
}

pub fn validate_artifact_against_plan(
    artifact: &JsonValue,
    plan: &WireframeDesignPlan,
    _selected_library_ids: &[String],
    target_screen_ids: &[String],
) -> anyhow::Result<Vec<RenderFailure>> {
    let screens = artifact
        .get("generatedScreens")
        .and_then(JsonValue::as_array)
        .context("generatedScreens is missing")?;
    let mut failures = Vec::new();

    for screen_id in target_screen_ids {
        let Some(planned) = plan
            .screens
            .iter()
            .find(|screen| screen.screen_id == *screen_id)
        else {
            failures.push(RenderFailure {
                id: screen_id.clone(),
                tsx: String::new(),
                error: "The validated Design Director plan has no entry for this screen."
                    .to_string(),
            });
            continue;
        };
        let Some(screen) = screens
            .iter()
            .find(|screen| screen.get("id").and_then(JsonValue::as_str) == Some(screen_id))
        else {
            failures.push(RenderFailure {
                id: screen_id.clone(),
                tsx: String::new(),
                error: "The provider omitted this requested screen.".to_string(),
            });
            continue;
        };
        let tsx = screen
            .get("tsx")
            .and_then(JsonValue::as_str)
            .unwrap_or("")
            .to_string();
        if tsx.trim().is_empty() {
            failures.push(RenderFailure {
                id: screen_id.clone(),
                tsx,
                error: "The provider returned no TSX for this screen.".to_string(),
            });
            continue;
        }
        if tsx.contains("@stage/") {
            failures.push(RenderFailure {
                id: screen_id.clone(),
                tsx,
                error: "Legacy @stage/* imports are forbidden; implement the retrieved catalog source directly."
                    .to_string(),
            });
            continue;
        }

        let retrieved = retrieved_component_ids(artifact, screen_id);
        let claimed = claimed_component_ids(screen);
        if retrieved.is_empty() {
            failures.push(RenderFailure {
                id: screen_id.clone(),
                tsx,
                error: "No server-owned RAG retrieval evidence exists for this screen.".to_string(),
            });
            continue;
        }
        if claimed.is_empty() || !claimed.is_subset(&retrieved) {
            failures.push(RenderFailure {
                id: screen_id.clone(),
                tsx,
                error: format!(
                    "catalogComponentIds must be a non-empty subset of the retrieved component IDs. Retrieved: {retrieved:?}; claimed: {claimed:?}."
                ),
            });
            continue;
        }

        let motion_is_none = planned
            .motion_purpose
            .trim()
            .to_ascii_lowercase()
            .starts_with("none");
        let imports_motion = tsx.contains("from \"motion/react\"")
            || tsx.contains("from 'motion/react'")
            || tsx.contains("from \"motion\"")
            || tsx.contains("from 'motion'");
        if motion_is_none && imports_motion {
            failures.push(RenderFailure {
                id: screen_id.clone(),
                tsx,
                error: "The design plan requires no motion, but the TSX imports Motion."
                    .to_string(),
            });
        } else if !motion_is_none
            && !imports_motion
            && !tsx.contains("transition-")
            && !tsx.contains("animate-")
        {
            failures.push(RenderFailure {
                id: screen_id.clone(),
                tsx,
                error: "The design plan specifies motion, but the implementation contains no Motion import or CSS transition/animation."
                    .to_string(),
            });
        }
    }
    Ok(failures)
}

pub fn merge_quality_failures(
    primary: Vec<RenderFailure>,
    additional: Vec<RenderFailure>,
) -> Vec<RenderFailure> {
    let mut merged = BTreeMap::<String, RenderFailure>::new();
    for failure in primary.into_iter().chain(additional) {
        merged
            .entry(failure.id.clone())
            .and_modify(|current| {
                current.error.push('\n');
                current.error.push_str(&failure.error);
                if current.tsx.is_empty() {
                    current.tsx.clone_from(&failure.tsx);
                }
            })
            .or_insert(failure);
    }
    merged.into_values().collect()
}

#[cfg(test)]
#[path = "../testing/wireframes/quality.rs"]
mod tests;
