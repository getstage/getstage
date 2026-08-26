use std::collections::{BTreeMap, BTreeSet, HashMap};

use anyhow::{Context, bail};
use serde_json::Value as JsonValue;

use crate::wireframes::design_plan::WireframeDesignPlan;
use crate::wireframes::render::{RenderFailure, RendererLibraries};

const LIBRARY_MANIFEST: &str =
    include_str!("../../../../packages/wireframe-renderer/manifests/libraries.json");

#[derive(Clone, Debug)]
struct ComponentContract {
    module: String,
    required_props: BTreeSet<String>,
    motion_requirement: String,
}

fn component_contracts(
    libraries: &RendererLibraries,
) -> anyhow::Result<HashMap<(String, String), ComponentContract>> {
    let manifest: JsonValue =
        serde_json::from_str(LIBRARY_MANIFEST).context("renderer library manifest is invalid")?;
    let mut contracts = HashMap::new();
    for (slot, library_id) in libraries.selected() {
        let entry = manifest
            .get(slot.manifest_key)
            .and_then(JsonValue::as_array)
            .and_then(|entries| {
                entries
                    .iter()
                    .find(|entry| entry.get("id").and_then(JsonValue::as_str) == Some(library_id))
            })
            .with_context(|| {
                format!("selected library `{library_id}` is absent from the manifest")
            })?;
        let groups = entry
            .get("componentGroups")
            .and_then(JsonValue::as_array)
            .context("library componentGroups are missing")?;
        for group in groups {
            let motion = group
                .get("motion")
                .and_then(|value| value.get("requirement"))
                .and_then(JsonValue::as_str)
                .unwrap_or("none");
            let group_exports = group
                .get("exports")
                .and_then(JsonValue::as_array)
                .into_iter()
                .flatten()
                .filter_map(JsonValue::as_str);
            for export_name in group_exports {
                contracts.insert(
                    (library_id.to_string(), export_name.to_string()),
                    ComponentContract {
                        module: slot.module.to_string(),
                        required_props: BTreeSet::new(),
                        motion_requirement: motion.to_string(),
                    },
                );
            }
        }
        for recipe in entry
            .get("recipes")
            .and_then(JsonValue::as_array)
            .into_iter()
            .flatten()
        {
            for component in recipe
                .get("components")
                .and_then(JsonValue::as_array)
                .into_iter()
                .flatten()
            {
                let Some(export_name) = component.get("exportName").and_then(JsonValue::as_str)
                else {
                    continue;
                };
                let required_props: BTreeSet<String> = component
                    .get("requiredProps")
                    .and_then(JsonValue::as_array)
                    .into_iter()
                    .flatten()
                    .filter_map(JsonValue::as_str)
                    .map(str::to_string)
                    .collect();
                if let Some(contract) =
                    contracts.get_mut(&(library_id.to_string(), export_name.to_string()))
                {
                    contract.required_props.extend(required_props);
                }
            }
        }
    }
    Ok(contracts)
}

pub fn validate_design_plan_libraries(
    plan: &mut WireframeDesignPlan,
    component_pack_ids: &[String],
) -> anyhow::Result<()> {
    let libraries = RendererLibraries::resolve(component_pack_ids);
    let contracts = component_contracts(&libraries)?;
    let mut signature_screens = HashMap::<String, Vec<String>>::new();

    for screen in &mut plan.screens {
        let mut seen = BTreeSet::new();
        for component in &mut screen.component_recipe {
            // Providers sometimes write the import module ("@stage/base") instead of the
            // selected library id ("origin-ui"). Same thing — normalize before lookup so a
            // naming slip doesn't kill the run.
            if component.library_id.starts_with("@stage/") {
                if let Some(resolved) = libraries
                    .selected()
                    .find(|(slot, _)| slot.module == component.library_id)
                    .map(|(_, id)| id.to_string())
                {
                    component.library_id = resolved;
                }
            }
            let key = (component.library_id.clone(), component.export_name.clone());
            let Some(contract) = contracts.get(&key) else {
                bail!(
                    "screen `{}` plans unavailable component `{}:{}`",
                    screen.screen_id,
                    component.library_id,
                    component.export_name
                );
            };
            if !seen.insert(key) {
                bail!(
                    "screen `{}` repeats `{}` in its component recipe",
                    screen.screen_id,
                    component.export_name
                );
            }
            // Required props are registry facts, not a design decision. Hydrate
            // omissions deterministically instead of spending a provider repair pass
            // asking the model to repeat data Stage already owns.
            for required_prop in &contract.required_props {
                if !component.required_props.contains(required_prop) {
                    component.required_props.push(required_prop.clone());
                }
            }
        }
        for signature in screen
            .component_recipe
            .iter()
            .filter(|component| component.signature)
        {
            signature_screens
                .entry(signature.export_name.clone())
                .or_default()
                .push(screen.screen_id.clone());
        }
    }

    for (signature, screens) in signature_screens {
        if screens.len() < 2 {
            continue;
        }
        let shared_patterns = serde_json::to_string(&plan.shared_patterns)
            .unwrap_or_default()
            .to_ascii_lowercase();
        let shared_by_design = shared_patterns.contains(&signature.to_ascii_lowercase());
        if !shared_by_design {
            bail!(
                "signature component `{signature}` is repeated across unrelated screens: {}",
                screens.join(", ")
            );
        }
    }
    Ok(())
}

fn stage_imports(tsx: &str) -> BTreeSet<(String, String)> {
    let mut imports = BTreeSet::new();
    for line in tsx
        .lines()
        .filter(|line| line.trim_start().starts_with("import "))
    {
        let Some((left, source)) = line.split_once(" from ") else {
            continue;
        };
        let module = source
            .trim()
            .trim_end_matches(';')
            .trim_matches(|character| character == '\'' || character == '"');
        if !module.starts_with("@stage/") {
            continue;
        }
        let Some(open) = left.find('{') else {
            continue;
        };
        let Some(close) = left.rfind('}') else {
            continue;
        };
        for name in left[open + 1..close].split(',') {
            let export_name = name.trim().split_whitespace().next().unwrap_or("");
            if !export_name.is_empty() {
                imports.insert((module.to_string(), export_name.to_string()));
            }
        }
    }
    imports
}

pub fn validate_artifact_against_plan(
    artifact: &JsonValue,
    plan: &WireframeDesignPlan,
    component_pack_ids: &[String],
    target_screen_ids: &[String],
) -> anyhow::Result<Vec<RenderFailure>> {
    let libraries = RendererLibraries::resolve(component_pack_ids);
    let contracts = component_contracts(&libraries)?;
    let targets = target_screen_ids
        .iter()
        .map(String::as_str)
        .collect::<BTreeSet<_>>();
    let screens = artifact
        .get("generatedScreens")
        .and_then(JsonValue::as_array)
        .context("generatedScreens is missing")?;
    let mut failures = Vec::new();

    for screen_id in targets {
        let Some(planned) = plan
            .screens
            .iter()
            .find(|screen| screen.screen_id == screen_id)
        else {
            failures.push(RenderFailure {
                id: screen_id.to_string(),
                tsx: String::new(),
                error: "The validated Design Director plan has no entry for this requested screen."
                    .to_string(),
            });
            continue;
        };
        let Some(screen) = screens
            .iter()
            .find(|screen| screen.get("id").and_then(JsonValue::as_str) == Some(screen_id))
        else {
            failures.push(RenderFailure {
                id: screen_id.to_string(),
                tsx: String::new(),
                error: "The provider omitted this requested screen or returned malformed JSON."
                    .to_string(),
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
                id: screen_id.to_string(),
                tsx,
                error: "The provider returned no TSX for this requested screen.".to_string(),
            });
            continue;
        }
        let expected = planned
            .component_recipe
            .iter()
            .filter_map(|component| {
                contracts
                    .get(&(component.library_id.clone(), component.export_name.clone()))
                    .map(|contract| (contract.module.clone(), component.export_name.clone()))
            })
            .collect::<BTreeSet<_>>();
        let actual = stage_imports(&tsx);
        if actual != expected {
            failures.push(RenderFailure {
                id: screen_id.to_string(),
                tsx,
                error: format!(
                    "Component recipe mismatch. Expected exact Stage imports {expected:?}; received {actual:?}."
                ),
            });
            continue;
        }
        if let Some(missing) = planned
            .component_recipe
            .iter()
            .find(|component| !tsx.contains(&format!("<{}", component.export_name)))
        {
            failures.push(RenderFailure {
                id: screen_id.to_string(),
                tsx,
                error: format!(
                    "Planned component `{}` is imported but not rendered.",
                    missing.export_name
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
                id: screen_id.to_string(),
                tsx,
                error: "The design plan explicitly requires no motion, but the TSX imports Motion."
                    .to_string(),
            });
        } else if motion_is_none == false {
            let recipe_supplies_motion = planned.component_recipe.iter().any(|component| {
                contracts
                    .get(&(component.library_id.clone(), component.export_name.clone()))
                    .is_some_and(|contract| contract.motion_requirement != "none")
            });
            let css_supplies_motion = tsx.contains("transition-") || tsx.contains("animate-");
            if imports_motion == false
                && recipe_supplies_motion == false
                && css_supplies_motion == false
            {
                failures.push(RenderFailure {
                    id: screen_id.to_string(),
                    tsx,
                    error: "The design plan specifies purposeful motion, but the implementation contains no Motion import, motion-capable recipe component, or CSS transition/animation.".to_string(),
                });
            }
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
                current.error.push_str("\n");
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
