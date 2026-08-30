use crate::models::wireframes::WireframesInput;

pub(crate) fn configured_screens_from_input(input: &WireframesInput) -> Vec<serde_json::Value> {
    input
        .existing_wireframes_artifact_json
        .as_deref()
        .and_then(|raw| serde_json::from_str::<serde_json::Value>(raw).ok())
        .and_then(|artifact| {
            artifact
                .get("configureScreens")
                .and_then(serde_json::Value::as_array)
                .cloned()
        })
        .filter(|screens| !screens.is_empty())
        .or_else(|| {
            input
                .flows_artifact_json
                .as_deref()
                .and_then(|raw| serde_json::from_str::<serde_json::Value>(raw).ok())
                .and_then(|artifact| {
                    artifact
                        .get("screens")
                        .and_then(serde_json::Value::as_array)
                        .cloned()
                })
        })
        .unwrap_or_default()
}

pub(crate) fn selected_moodboard_asset_keys(
    artifact_json: Option<&str>,
    style_direction_id: Option<&str>,
) -> Vec<String> {
    let Some(artifact_json) = artifact_json else {
        return Vec::new();
    };
    let Ok(artifact) = serde_json::from_str::<serde_json::Value>(artifact_json) else {
        return Vec::new();
    };
    let Some(references) = artifact
        .get("references")
        .and_then(serde_json::Value::as_array)
    else {
        return Vec::new();
    };

    let mut keys = Vec::new();
    for reference in references {
        if reference
            .get("isInMoodboard")
            .and_then(serde_json::Value::as_bool)
            == Some(false)
        {
            continue;
        }
        if let Some(direction_id) = style_direction_id
            && reference
                .get("directionId")
                .and_then(serde_json::Value::as_str)
                != Some(direction_id)
        {
            continue;
        }
        let Some(key) = reference
            .get("imageAssetKey")
            .and_then(serde_json::Value::as_str)
            .map(str::trim)
            .filter(|key| !key.is_empty())
        else {
            continue;
        };
        if !keys.iter().any(|existing| existing == key) {
            keys.push(key.to_string());
        }
    }
    keys
}

pub(crate) fn is_scoped_regeneration_request(
    prompt: &str,
    target_screen_ids: Option<&[String]>,
    has_existing_artifact: bool,
) -> bool {
    prompt
        .trim_start()
        .starts_with("Regenerate wireframe screens:")
        && target_screen_ids.is_some_and(|ids| ids.is_empty() == false)
        && has_existing_artifact
}

pub(crate) fn missing_screen_ids(
    artifact: &serde_json::Value,
    expected_ids: &[String],
) -> Vec<String> {
    let returned = artifact
        .get("generatedScreens")
        .and_then(serde_json::Value::as_array)
        .into_iter()
        .flatten()
        .filter_map(|screen| screen.get("id").and_then(serde_json::Value::as_str))
        .collect::<std::collections::HashSet<_>>();
    expected_ids
        .iter()
        .filter(|id| !returned.contains(id.as_str()))
        .cloned()
        .collect()
}

pub(crate) fn validate_single_screen_response(
    artifact: &serde_json::Value,
    expected_screen_id: &str,
) -> anyhow::Result<serde_json::Value> {
    let screens = artifact
        .get("generatedScreens")
        .and_then(serde_json::Value::as_array)
        .ok_or_else(|| anyhow::anyhow!("generatedScreens is missing"))?;
    if screens.len() != 1 {
        anyhow::bail!(
            "expected exactly one generated screen `{expected_screen_id}`, received {}",
            screens.len()
        );
    }
    let screen = &screens[0];
    let id = screen
        .get("id")
        .and_then(serde_json::Value::as_str)
        .unwrap_or("");
    if id != expected_screen_id {
        anyhow::bail!("expected screen `{expected_screen_id}`, received `{id}`");
    }
    let tsx = screen
        .get("tsx")
        .and_then(serde_json::Value::as_str)
        .unwrap_or("");
    if tsx.trim().is_empty() {
        anyhow::bail!("screen `{expected_screen_id}` returned no TSX");
    }
    Ok(screen.clone())
}

pub(crate) fn merge_tsx_screens(target: &mut serde_json::Value, repair: &serde_json::Value) {
    let Some(target_screens) = target
        .get_mut("generatedScreens")
        .and_then(serde_json::Value::as_array_mut)
    else {
        return;
    };
    let Some(repair_screens) = repair
        .get("generatedScreens")
        .and_then(serde_json::Value::as_array)
    else {
        return;
    };
    for repaired in repair_screens {
        let Some(id) = repaired.get("id").and_then(serde_json::Value::as_str) else {
            continue;
        };
        if repaired
            .get("tsx")
            .and_then(serde_json::Value::as_str)
            .is_none_or(|tsx| tsx.trim().is_empty())
        {
            continue;
        }
        if let Some(screen) = target_screens
            .iter_mut()
            .find(|screen| screen.get("id").and_then(serde_json::Value::as_str) == Some(id))
        {
            let Some(screen) = screen.as_object_mut() else {
                continue;
            };
            screen.insert("tsx".to_string(), repaired["tsx"].clone());
            if let Some(html) = repaired.get("html") {
                screen.insert("html".to_string(), html.clone());
            }
            let original_has_catalog_ids = screen
                .get("catalogComponentIds")
                .is_some_and(valid_catalog_component_ids);
            if !original_has_catalog_ids
                && let Some(repaired_ids) = repaired
                    .get("catalogComponentIds")
                    .filter(|ids| valid_catalog_component_ids(ids))
            {
                screen.insert("catalogComponentIds".to_string(), repaired_ids.clone());
            }
        } else {
            target_screens.push(repaired.clone());
        }
    }
}

fn valid_catalog_component_ids(value: &serde_json::Value) -> bool {
    value.as_array().is_some_and(|ids| {
        !ids.is_empty()
            && ids
                .iter()
                .all(|id| id.as_str().is_some_and(|id| !id.trim().is_empty()))
    })
}
