use anyhow::{Context, bail};
use serde_json::{Map as JsonMap, Value as JsonValue, json};

use super::{MAX_BLOCKS_PER_SECTION, MAX_SECTIONS_PER_SCREEN};
use crate::models::wireframes::{WireframeBrandSource, WireframeKind, WireframesInput};

const ALLOWED_BLOCK_KINDS: &[&str] = &[
    "header",
    "hero",
    "feature-grid",
    "testimonial",
    "pricing-table",
    "cta",
    "form",
    "logo-strip",
    "footer",
    "stat-strip",
    "faq",
    "media",
    "text",
    "list",
    "table",
    "navigation",
];
const ALLOWED_EMPHASIS: &[&str] = &["primary", "secondary", "tertiary"];

pub fn normalize_wireframes_artifact(
    artifact: JsonValue,
    input: &WireframesInput,
    kind: WireframeKind,
    brand_source: Option<WireframeBrandSource>,
    style_direction_id: Option<&str>,
    generated_at: u128,
    generated_at_label: &str,
) -> anyhow::Result<JsonValue> {
    let object = artifact
        .as_object()
        .context("wireframes provider output was not a JSON object")?;

    let raw_screens = object
        .get("generatedScreens")
        .and_then(JsonValue::as_array)
        .cloned()
        .unwrap_or_default();

    let normalized_screens = raw_screens
        .iter()
        .filter_map(|screen| normalize_screen(screen, generated_at_label))
        .collect::<Vec<_>>();

    if normalized_screens.is_empty() {
        bail!("The AI response did not contain usable wireframe screens.");
    }

    let configure_screens = object
        .get("configureScreens")
        .cloned()
        .unwrap_or_else(|| json!([]));

    let stats = object.get("stats").cloned().unwrap_or_else(|| {
        json!({
            "flowsScreenCount": 0,
            "moodboardPatternCount": 0,
            "totalConfigureScreenCount": normalized_screens.len()
        })
    });

    let title = object
        .get("title")
        .and_then(JsonValue::as_str)
        .unwrap_or("Project Wireframes")
        .to_string();
    let figma_symbol_url = object
        .get("figmaSymbolUrl")
        .and_then(JsonValue::as_str)
        .unwrap_or("https://figma.com/")
        .to_string();

    let mut normalized = JsonMap::new();
    normalized.insert("apiVersion".to_string(), json!("v1"));
    normalized.insert("artifactKind".to_string(), json!("wireframesArtifact"));
    normalized.insert("projectId".to_string(), json!(input.project_id));
    normalized.insert("title".to_string(), json!(title));
    normalized.insert("wireframeKind".to_string(), json!(kind.as_str()));
    if let Some(brand_source) = brand_source {
        let value = match brand_source {
            WireframeBrandSource::StyleGuide => "style-guide",
            WireframeBrandSource::BrandKit => "brand-kit",
        };
        normalized.insert("brandSource".to_string(), json!(value));
    }
    if let Some(style_direction_id) = style_direction_id {
        normalized.insert("styleDirectionId".to_string(), json!(style_direction_id));
    }
    normalized.insert("stats".to_string(), stats);
    normalized.insert("configureScreens".to_string(), configure_screens);
    if let Some(brand_kit) = object.get("brandKit").cloned()
        && !brand_kit.is_null()
    {
        normalized.insert("brandKit".to_string(), brand_kit);
    }
    if let Some(layout_preference) = object.get("layoutPreference").cloned()
        && !layout_preference.is_null()
    {
        normalized.insert("layoutPreference".to_string(), layout_preference);
    }
    normalized.insert(
        "generatedScreens".to_string(),
        JsonValue::Array(normalized_screens),
    );
    normalized.insert(
        "generatedAt".to_string(),
        json!(i64::try_from(generated_at).unwrap_or(i64::MAX)),
    );
    normalized.insert(
        "generatedAtLabel".to_string(),
        json!(generated_at_label.to_string()),
    );
    normalized.insert("figmaSymbolUrl".to_string(), json!(figma_symbol_url));

    Ok(JsonValue::Object(normalized))
}

fn normalize_screen(screen: &JsonValue, generated_at_label: &str) -> Option<JsonValue> {
    let object = screen.as_object()?;
    let id = object.get("id").and_then(JsonValue::as_str)?.to_string();
    let title = object
        .get("title")
        .and_then(JsonValue::as_str)
        .unwrap_or(&id)
        .to_string();
    let priority = object
        .get("priority")
        .and_then(JsonValue::as_str)
        .unwrap_or("P0")
        .to_string();

    let mut entry = JsonMap::new();
    entry.insert("id".to_string(), json!(id));
    entry.insert("title".to_string(), json!(title));
    entry.insert("priority".to_string(), json!(priority));
    entry.insert(
        "generatedAtLabel".to_string(),
        json!(generated_at_label.to_string()),
    );

    if let Some(figma_url) = object.get("figmaUrl").and_then(JsonValue::as_str) {
        entry.insert("figmaUrl".to_string(), json!(figma_url));
    }
    if let Some(goal) = object.get("goal").and_then(JsonValue::as_str) {
        entry.insert("goal".to_string(), json!(goal));
    }
    if let Some(brand_tokens) = object.get("brandTokens").cloned()
        && !brand_tokens.is_null()
    {
        entry.insert("brandTokens".to_string(), brand_tokens);
    }

    let raw_sections = object
        .get("sections")
        .and_then(JsonValue::as_array)
        .cloned()
        .unwrap_or_default();

    let sections = raw_sections
        .iter()
        .take(MAX_SECTIONS_PER_SCREEN)
        .enumerate()
        .filter_map(|(index, section)| normalize_section(section, &id, index))
        .collect::<Vec<_>>();

    entry.insert("sections".to_string(), JsonValue::Array(sections));

    Some(JsonValue::Object(entry))
}

fn normalize_section(section: &JsonValue, screen_id: &str, index: usize) -> Option<JsonValue> {
    let object = section.as_object()?;
    let id = object
        .get("id")
        .and_then(JsonValue::as_str)
        .map(ToOwned::to_owned)
        .unwrap_or_else(|| format!("{screen_id}-section-{index}"));
    let title = object
        .get("title")
        .and_then(JsonValue::as_str)
        .unwrap_or("Section")
        .to_string();

    let raw_blocks = object
        .get("blocks")
        .and_then(JsonValue::as_array)
        .cloned()
        .unwrap_or_default();
    let blocks = raw_blocks
        .iter()
        .take(MAX_BLOCKS_PER_SECTION)
        .enumerate()
        .filter_map(|(block_index, block)| normalize_block(block, &id, block_index))
        .collect::<Vec<_>>();

    let mut entry = JsonMap::new();
    entry.insert("id".to_string(), json!(id));
    entry.insert("title".to_string(), json!(title));
    entry.insert("blocks".to_string(), JsonValue::Array(blocks));

    Some(JsonValue::Object(entry))
}

fn normalize_block(block: &JsonValue, section_id: &str, index: usize) -> Option<JsonValue> {
    let object = block.as_object()?;
    let kind = object.get("kind").and_then(JsonValue::as_str)?;
    if !ALLOWED_BLOCK_KINDS.contains(&kind) {
        tracing::warn!(
            block_kind = kind,
            "dropping wireframe block with unknown kind"
        );
        return None;
    }

    let id = object
        .get("id")
        .and_then(JsonValue::as_str)
        .map(ToOwned::to_owned)
        .unwrap_or_else(|| format!("{section_id}-block-{index}"));
    let intent = object
        .get("intent")
        .and_then(JsonValue::as_str)
        .unwrap_or("Display content.")
        .to_string();
    let emphasis = object
        .get("emphasis")
        .and_then(JsonValue::as_str)
        .filter(|value| ALLOWED_EMPHASIS.contains(value))
        .unwrap_or("secondary")
        .to_string();

    let mut entry = JsonMap::new();
    entry.insert("id".to_string(), json!(id));
    entry.insert("kind".to_string(), json!(kind));
    entry.insert("intent".to_string(), json!(intent));
    entry.insert("emphasis".to_string(), json!(emphasis));
    if let Some(copy_slots) = object.get("copySlots").cloned()
        && !copy_slots.is_null()
    {
        entry.insert("copySlots".to_string(), copy_slots);
    }
    if let Some(notes) = object.get("notes").and_then(JsonValue::as_str) {
        entry.insert("notes".to_string(), json!(notes));
    }

    Some(JsonValue::Object(entry))
}
