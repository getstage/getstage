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

    let mut normalized_screens = Vec::new();
    for screen in &raw_screens {
        if let Some(normalized) =
            normalize_screen(screen, generated_at_label, generated_at, kind)?
        {
            normalized_screens.push(normalized);
        }
    }

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

pub fn merge_regenerated_screens(
    existing_artifact_json: &str,
    partial_artifact: JsonValue,
    screen_ids: &[String],
    kind: WireframeKind,
) -> anyhow::Result<JsonValue> {
    let existing = serde_json::from_str::<JsonValue>(existing_artifact_json)
        .context("existing wireframes artifact is invalid")?;
    let existing_object = existing
        .as_object()
        .context("existing wireframes artifact was not a JSON object")?;
    let partial_object = partial_artifact
        .as_object()
        .context("regenerated wireframes artifact was not a JSON object")?;

    let partial_screens = partial_object
        .get("generatedScreens")
        .and_then(JsonValue::as_array)
        .cloned()
        .unwrap_or_default();
    if partial_screens.is_empty() {
        bail!("The AI response did not contain regenerated wireframe screens.");
    }

    let existing_screens = existing_object
        .get("generatedScreens")
        .and_then(JsonValue::as_array)
        .cloned()
        .unwrap_or_default();
    let regen_ids: std::collections::HashSet<&str> =
        screen_ids.iter().map(String::as_str).collect();

    for screen_id in screen_ids {
        let found = existing_screens
            .iter()
            .any(|screen| screen.get("id").and_then(JsonValue::as_str) == Some(screen_id.as_str()));
        if !found {
            bail!("Screen {screen_id} was not found in the existing wireframes artifact.");
        }
    }

    // A requested id the model omitted keeps its existing screen (via unwrap_or
    // below) rather than discarding every regenerated screen — a partial response
    // still lands the sections it did return. The unchanged/empty check below then
    // catches the case where nothing actually changed for a requested id.
    let merged_screens = existing_screens
        .iter()
        .map(|screen| {
            let Some(id) = screen.get("id").and_then(JsonValue::as_str) else {
                return screen.clone();
            };
            if !regen_ids.contains(id) {
                return screen.clone();
            }
            partial_screens
                .iter()
                .find(|candidate| candidate.get("id").and_then(JsonValue::as_str) == Some(id))
                .cloned()
                .unwrap_or_else(|| screen.clone())
        })
        .collect::<Vec<_>>();

    // For Hi-Fi, a regen must materially change each requested screen. Reject an
    // empty fragment or one identical to the pre-merge markup (the provider copied
    // the prior html, or omitted the id entirely) so the run fails visibly instead
    // of reporting success with no change. Lo-Fi screens carry no html, so skip.
    if matches!(kind, WireframeKind::Hifi) {
        let html_for = |screens: &[JsonValue], id: &str| -> String {
            screens
                .iter()
                .find(|screen| screen.get("id").and_then(JsonValue::as_str) == Some(id))
                .and_then(|screen| screen.get("html").and_then(JsonValue::as_str))
                .unwrap_or("")
                .to_string()
        };
        for screen_id in screen_ids {
            let before = html_for(&existing_screens, screen_id);
            let after = html_for(&merged_screens, screen_id);
            if after.trim().is_empty() {
                bail!("Regenerated screen {screen_id} has empty html.");
            }
            if !html_changed(&before, &after) {
                bail!("Regenerated screen {screen_id} is unchanged. Retry regeneration.");
            }
        }
    }

    let mut merged = existing_object.clone();
    merged.insert(
        "generatedScreens".to_string(),
        JsonValue::Array(merged_screens),
    );
    for key in [
        "wireframeKind",
        "brandSource",
        "styleDirectionId",
        "generatedAt",
        "generatedAtLabel",
    ] {
        if let Some(value) = partial_object.get(key) {
            merged.insert(key.to_string(), value.clone());
        }
    }

    Ok(JsonValue::Object(merged))
}

// Trim-insensitive equality: a regen that returns byte-identical markup (the
// provider copy-pasted the prior fragment) counts as unchanged and is rejected.
fn html_changed(before: &str, after: &str) -> bool {
    before.trim() != after.trim()
}

// A Hi-Fi fragment must actually be a styled layout, not raw CSS text or a bare
// string. Require some styling (a <style> block or inline style=) and at least
// one layout element so the preview renders a design rather than unstyled text.
fn validate_hifi_html(html: &str) -> anyhow::Result<()> {
    let trimmed = html.trim();
    if !trimmed.contains("<style") && !trimmed.contains("style=") {
        bail!("Hi-Fi html must include a <style> block or inline styles.");
    }
    if !trimmed.contains("<div")
        && !trimmed.contains("<header")
        && !trimmed.contains("<main")
        && !trimmed.contains("<section")
    {
        bail!("Hi-Fi html must include semantic layout elements (div/header/main/section).");
    }
    Ok(())
}

fn normalize_screen(
    screen: &JsonValue,
    generated_at_label: &str,
    generated_at: u128,
    kind: WireframeKind,
) -> anyhow::Result<Option<JsonValue>> {
    let Some(object) = screen.as_object() else {
        return Ok(None);
    };
    let Some(id) = object.get("id").and_then(JsonValue::as_str).map(str::to_string) else {
        return Ok(None);
    };
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
    entry.insert(
        "generatedAt".to_string(),
        json!(i64::try_from(generated_at).unwrap_or(i64::MAX)),
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
    if let Some(html) = object
        .get("html")
        .and_then(JsonValue::as_str)
        .map(str::trim)
        .filter(|html| !html.is_empty())
    {
        // Hi-Fi screens carry a self-contained design fragment; a fragment that is
        // raw CSS text or has no styling/layout renders as unstyled text in the
        // preview iframe. Reject it up front so the user retries instead of saving
        // a broken artifact. Lo-Fi screens compile from blocks and skip this.
        if matches!(kind, WireframeKind::Hifi) {
            validate_hifi_html(html)?;
        }
        entry.insert("html".to_string(), json!(html));
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

    Ok(Some(JsonValue::Object(entry)))
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

#[cfg(test)]
#[path = "../testing/wireframes/normalize.rs"]
mod tests;
