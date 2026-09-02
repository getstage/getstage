use std::collections::{BTreeSet, HashMap};

use anyhow::bail;

use crate::wireframes::design_plan::WireframeDesignPlan;

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

#[cfg(test)]
#[path = "../testing/wireframes/quality.rs"]
mod tests;
