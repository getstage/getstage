use serde_json::{Map as JsonMap, Value as JsonValue, json};
use uuid::Uuid;

/// Fonts the styleguide spec forbids as generated defaults (premium/creative work).
/// Matched case-insensitively against the model's `typography.fontFamily`.
const BANNED_FONT_FAMILIES: &[&str] = &[
    "inter",
    "times",
    "times new roman",
    "georgia",
    "garamond",
    "palatino",
];

/// Non-banned default used when the model returns a banned/empty font family.
const DEFAULT_FONT_FAMILY: &str = "Geist";

fn is_banned_font_family(name: &str) -> bool {
    let normalized = name.trim().to_lowercase();
    BANNED_FONT_FAMILIES
        .iter()
        .any(|banned| normalized == *banned)
}

/// Repair banned/empty `typography.fontFamily` at the boundary so the UI never
/// renders a banned font even if the model ignores the prompt's anti-pattern rules.
fn repair_banned_typography(object: &mut JsonMap<String, JsonValue>) {
    let Some(typography) = object
        .get_mut("typography")
        .and_then(JsonValue::as_object_mut)
    else {
        return;
    };

    let needs_default = typography
        .get("fontFamily")
        .and_then(JsonValue::as_str)
        .map(|family| family.trim().is_empty() || is_banned_font_family(family))
        .unwrap_or(true);

    if needs_default {
        typography.insert("fontFamily".to_string(), json!(DEFAULT_FONT_FAMILY));
    }
}

pub fn normalize_style_guide(
    mut raw: JsonValue,
    direction_id: &str,
    direction_name: &str,
    existing_style_guide_id: Option<&str>,
    _generated_at: u128,
) -> JsonValue {
    let Some(object) = raw.as_object_mut() else {
        return json!({
            "id": existing_style_guide_id
                .filter(|value| !value.trim().is_empty())
                .map(ToOwned::to_owned)
                .unwrap_or_else(|| Uuid::new_v4().to_string()),
            "directionId": direction_id,
            "title": format!("{direction_name} Style Guide"),
            "subtitle": "Brand Handbook for your project",
            "atmosphere": [],
            "colorPalettes": [],
            "typography": {
                "fontFamily": DEFAULT_FONT_FAMILY,
                "previewSize": 28,
                "rows": [],
                "weightSamples": []
            },
            "componentSwatchCount": 6
        });
    };

    object.insert(
        "id".to_string(),
        json!(
            existing_style_guide_id
                .filter(|value| !value.trim().is_empty())
                .map(ToOwned::to_owned)
                .unwrap_or_else(|| Uuid::new_v4().to_string())
        ),
    );
    object.insert("directionId".to_string(), json!(direction_id));

    if !object.contains_key("title") {
        object.insert(
            "title".to_string(),
            json!(format!("{direction_name} Style Guide")),
        );
    }
    if !object.contains_key("subtitle") {
        object.insert(
            "subtitle".to_string(),
            json!("Brand Handbook for your project"),
        );
    }
    if !object.contains_key("componentSwatchCount") {
        object.insert("componentSwatchCount".to_string(), json!(6));
    }

    repair_banned_typography(object);

    raw
}

pub fn merge_style_guide_into_artifact(
    artifact: &mut JsonValue,
    style_guide: JsonValue,
    direction_id: &str,
) -> anyhow::Result<()> {
    let style_guide_id = style_guide
        .get("id")
        .and_then(JsonValue::as_str)
        .ok_or_else(|| anyhow::anyhow!("normalized style guide missing id"))?
        .to_string();

    let style_guides = artifact
        .as_object_mut()
        .and_then(|object| object.get_mut("styleGuides"))
        .and_then(JsonValue::as_array_mut)
        .ok_or_else(|| anyhow::anyhow!("moodboard artifact missing styleGuides array"))?;

    style_guides.retain(|entry| {
        entry
            .get("directionId")
            .and_then(JsonValue::as_str)
            .map_or(true, |value| value != direction_id)
    });
    style_guides.push(style_guide);

    let directions = artifact
        .get_mut("directions")
        .and_then(JsonValue::as_array_mut)
        .ok_or_else(|| anyhow::anyhow!("moodboard artifact missing directions array"))?;

    for direction in directions {
        let Some(object) = direction.as_object_mut() else {
            continue;
        };
        if object.get("id").and_then(JsonValue::as_str) == Some(direction_id) {
            object.insert("hasStyleGuide".to_string(), json!(true));
            object.insert("styleGuideId".to_string(), json!(style_guide_id.clone()));
        }
    }

    Ok(())
}

pub fn direction_reference_metadata(reference: &JsonValue) -> JsonMap<String, JsonValue> {
    let mut metadata = JsonMap::new();
    for key in [
        "id",
        "title",
        "source",
        "sourceUrl",
        "imageUrl",
        "thumbnailUrl",
        "imageAssetKey",
        "thumbnailAssetKey",
        "uploadedAssetId",
    ] {
        if let Some(value) = reference.get(key) {
            metadata.insert(key.to_string(), value.clone());
        }
    }
    metadata
}

pub fn reference_has_visual_input(reference: &JsonValue) -> bool {
    [
        "imageUrl",
        "thumbnailUrl",
        "imageAssetKey",
        "thumbnailAssetKey",
    ]
    .iter()
    .any(|key| {
        reference
            .get(key)
            .and_then(JsonValue::as_str)
            .map(|value| !value.trim().is_empty())
            .unwrap_or(false)
    })
}

#[cfg(test)]
#[path = "../testing/styleguide/normalize.rs"]
mod tests;
