use anyhow::{Context, bail};
use serde_json::{Map as JsonMap, Value as JsonValue, json};

use super::{MAX_BLOCKS_PER_SECTION, MAX_SECTIONS_PER_SCREEN};
use crate::models::wireframes::{
    WireframeBrandSource, WireframeKind, WireframeViewport, WireframesInput,
};
use crate::wireframes::prompt::component_pack_css;

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

    // One stylesheet for the whole run: every Hi-Fi screen draws its controls from the
    // same source instead of inventing a button per screen. Lo-Fi compiles from blocks
    // and has no packs.
    let pack_css = match kind {
        WireframeKind::Hifi => component_pack_css(input),
        WireframeKind::Lofi => String::new(),
    };

    let mut normalized_screens = Vec::new();
    for screen in &raw_screens {
        if let Some(normalized) =
            normalize_screen(screen, generated_at_label, generated_at, kind, &pack_css)?
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
    let viewport = WireframeViewport::from_project_type(&input.project_type);
    normalized.insert("viewport".to_string(), json!(viewport.as_str()));
    normalized.insert("frameWidth".to_string(), json!(viewport.frame_width()));
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

/// Folds a scoped generation response into the saved artifact.
///
/// `screen_ids` are the ids the run was scoped to. An id the saved artifact already has
/// keeps its position and is replaced by the returned screen; an id it does not have yet
/// (a screen the user added after the first pass) is appended, together with its
/// `configureScreens` entry so the new screen is not missing from the screen list.
fn merge_regenerated_screens(
    existing_artifact_json: &str,
    partial_artifact: JsonValue,
    screen_ids: &[String],
    kind: WireframeKind,
) -> anyhow::Result<(JsonValue, Vec<String>)> {
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
    let target_ids: std::collections::HashSet<&str> =
        screen_ids.iter().map(String::as_str).collect();

    // At least one requested id must come back, otherwise the merge would report success
    // while changing nothing at all.
    let returned_a_requested_id = partial_screens.iter().any(|screen| {
        screen
            .get("id")
            .and_then(JsonValue::as_str)
            .is_some_and(|id| target_ids.contains(id))
    });
    if !returned_a_requested_id {
        bail!(
            "The AI response contained none of the requested wireframe screens: {}.",
            screen_ids.join(", ")
        );
    }

    // A requested id the model omitted keeps its existing screen (via unwrap_or below)
    // rather than discarding every regenerated screen — a partial response still lands
    // the sections it did return. The unchanged/empty check below then catches the case
    // where nothing actually changed for a requested id.
    let mut merged_screens = existing_screens
        .iter()
        .map(|screen| {
            let Some(id) = screen.get("id").and_then(JsonValue::as_str) else {
                return screen.clone();
            };
            if !target_ids.contains(id) {
                return screen.clone();
            }
            screen_by_id(&partial_screens, id)
                .cloned()
                .unwrap_or_else(|| screen.clone())
        })
        .collect::<Vec<_>>();

    // Requested ids the saved artifact never had are newly added screens: append them in
    // the order the run requested them, after the screens that already existed.
    for screen_id in screen_ids {
        if screen_by_id(&merged_screens, screen_id).is_some() {
            continue;
        }
        if let Some(screen) = screen_by_id(&partial_screens, screen_id) {
            merged_screens.push(screen.clone());
        }
    }

    // A kind change (the Lo-Fi -> Hi-Fi conversion) rewrites the artifact's wireframeKind
    // below, so a screen left over from the previous kind would be presented as if it had
    // been converted — a Hi-Fi result grid showing Lo-Fi screens with no markup. A screen
    // the user did not select is not part of this pass, so drop it instead of mixing kinds.
    let kind_changed = existing_object
        .get("wireframeKind")
        .and_then(JsonValue::as_str)
        .is_some_and(|existing| existing != kind.as_str());
    if kind_changed {
        merged_screens.retain(|screen| {
            screen
                .get("id")
                .and_then(JsonValue::as_str)
                .is_some_and(|id| target_ids.contains(id))
        });
    }

    // For Hi-Fi every requested screen must end up with real markup that differs from what
    // was saved. A screen that fails that bar is reverted to its saved version and
    // reported, instead of failing the whole run: a ten-minute run that produced five good
    // screens must land those five rather than throw everything away. Only a run where
    // nothing at all landed is an error. Lo-Fi screens carry no html, so skip.
    let mut failed_ids = Vec::new();
    if matches!(kind, WireframeKind::Hifi) {
        for screen_id in screen_ids {
            let after = screen_by_id(&merged_screens, screen_id)
                .and_then(|screen| screen.get("html").and_then(JsonValue::as_str))
                .unwrap_or("");
            let before = screen_by_id(&existing_screens, screen_id)
                .and_then(|screen| screen.get("html").and_then(JsonValue::as_str))
                .unwrap_or("");
            if !after.trim().is_empty() && html_changed(before, after) {
                continue;
            }
            failed_ids.push(screen_id.clone());
            // Never keep a screen the provider returned empty: restore the saved version,
            // or drop it entirely when the run was adding it for the first time.
            match screen_by_id(&existing_screens, screen_id) {
                Some(saved) => {
                    let saved = saved.clone();
                    if let Some(slot) = merged_screens.iter_mut().find(|screen| {
                        screen.get("id").and_then(JsonValue::as_str) == Some(screen_id.as_str())
                    }) {
                        *slot = saved;
                    }
                }
                None => merged_screens.retain(|screen| {
                    screen.get("id").and_then(JsonValue::as_str) != Some(screen_id.as_str())
                }),
            }
        }

        if failed_ids.len() == screen_ids.len() {
            bail!(
                "None of the requested wireframe screens came back usable: {}. Retry regeneration.",
                failed_ids.join(", ")
            );
        }
    }

    // configureScreens is the user-authored screen list, so its entries and their order
    // win; entries for ids only the response knows about are appended so an appended
    // screen is still listed.
    let mut merged_configure = existing_object
        .get("configureScreens")
        .and_then(JsonValue::as_array)
        .cloned()
        .unwrap_or_default();
    let mut configure_ids: std::collections::HashSet<String> = merged_configure
        .iter()
        .filter_map(|entry| {
            entry
                .get("id")
                .and_then(JsonValue::as_str)
                .map(ToOwned::to_owned)
        })
        .collect();
    let partial_configure = partial_object
        .get("configureScreens")
        .and_then(JsonValue::as_array)
        .cloned()
        .unwrap_or_default();
    for entry in partial_configure {
        let Some(id) = entry
            .get("id")
            .and_then(JsonValue::as_str)
            .map(ToOwned::to_owned)
        else {
            continue;
        };
        if configure_ids.insert(id) {
            merged_configure.push(entry);
        }
    }
    let configure_count = merged_configure.len();

    let mut merged = existing_object.clone();
    merged.insert(
        "generatedScreens".to_string(),
        JsonValue::Array(merged_screens),
    );
    if configure_count > 0 {
        merged.insert(
            "configureScreens".to_string(),
            JsonValue::Array(merged_configure),
        );
        if let Some(stats) = merged.get_mut("stats").and_then(JsonValue::as_object_mut) {
            stats.insert(
                "totalConfigureScreenCount".to_string(),
                json!(configure_count),
            );
        }
    }
    for key in [
        "wireframeKind",
        "viewport",
        "frameWidth",
        "brandSource",
        "styleDirectionId",
        "generatedAt",
        "generatedAtLabel",
    ] {
        if let Some(value) = partial_object.get(key) {
            merged.insert(key.to_string(), value.clone());
        }
    }

    Ok((JsonValue::Object(merged), failed_ids))
}

/// Resolves a scoped run against whatever the project already has saved.
///
/// With a saved artifact the returned screens are merged into it, so unselected screens
/// survive and newly requested ids are appended. Without one there is nothing to merge
/// into: the prompt already restricted the output to `screen_ids`, so the normalized
/// artifact stands as the artifact. An unscoped run is a full pass and passes through.
pub fn apply_scoped_screens(
    existing_artifact_json: Option<&str>,
    artifact: JsonValue,
    screen_ids: Option<&[String]>,
    kind: WireframeKind,
) -> anyhow::Result<(JsonValue, Vec<String>)> {
    let (Some(screen_ids), Some(existing_json)) = (screen_ids, existing_artifact_json) else {
        return Ok((artifact, Vec::new()));
    };
    merge_regenerated_screens(existing_json, artifact, screen_ids, kind)
}

fn screen_by_id<'a>(screens: &'a [JsonValue], id: &str) -> Option<&'a JsonValue> {
    screens
        .iter()
        .find(|screen| screen.get("id").and_then(JsonValue::as_str) == Some(id))
}

// Trim-insensitive equality: a regen that returns byte-identical markup (the
// provider copy-pasted the prior fragment) counts as unchanged and is rejected.
fn html_changed(before: &str, after: &str) -> bool {
    before.trim() != after.trim()
}

/// Preview iframes never run JS. Strip what the sandbox would block or ignore.
pub(crate) fn sanitize_hifi_html(html: &str) -> String {
    let mut out = strip_tag_pair(html, "script");
    out = strip_tag_pair(&out, "link");
    // Drop common inline handlers the model invents for step UIs.
    for attr in ["onclick=", "onload=", "onerror=", "onchange=", "onsubmit="] {
        out = strip_attr(&out, attr);
    }
    out.replace("@import", "/* blocked import */")
}

fn strip_tag_pair(html: &str, tag: &str) -> String {
    let open = format!("<{tag}");
    let close = format!("</{tag}>");
    let lower = html.to_ascii_lowercase();
    let void_tag = matches!(tag, "link" | "meta" | "img" | "br" | "hr" | "input");
    let mut out = String::with_capacity(html.len());
    let mut cursor = 0;
    while let Some(rel) = lower[cursor..].find(&open) {
        let start = cursor + rel;
        out.push_str(&html[cursor..start]);
        let after = start + open.len();
        let Some(gt_rel) = lower[after..].find('>') else {
            return out;
        };
        let gt = after + gt_rel;
        let self_closing = void_tag || html.as_bytes().get(gt.saturating_sub(1)) == Some(&b'/');
        if self_closing {
            cursor = gt + 1;
            continue;
        }
        let Some(end_rel) = lower[gt + 1..].find(&close) else {
            return out;
        };
        cursor = gt + 1 + end_rel + close.len();
    }
    out.push_str(&html[cursor..]);
    out
}

fn strip_attr(html: &str, attr: &str) -> String {
    let lower = html.to_ascii_lowercase();
    let needle = attr.to_ascii_lowercase();
    let mut out = String::with_capacity(html.len());
    let mut cursor = 0;
    while let Some(rel) = lower[cursor..].find(&needle) {
        let start = cursor + rel;
        // Keep a leading space if present so markup stays readable.
        let cut = if start > cursor && html.as_bytes()[start - 1] == b' ' {
            start - 1
        } else {
            start
        };
        out.push_str(&html[cursor..cut]);
        let after = start + needle.len();
        let end = match html.as_bytes().get(after) {
            Some(b'"') => lower[after + 1..]
                .find('"')
                .map(|i| after + 1 + i + 1)
                .unwrap_or(html.len()),
            Some(b'\'') => lower[after + 1..]
                .find('\'')
                .map(|i| after + 1 + i + 1)
                .unwrap_or(html.len()),
            _ => lower[after..]
                .find(|c: char| c.is_ascii_whitespace() || c == '>')
                .map(|i| after + i)
                .unwrap_or(html.len()),
        };
        cursor = end;
    }
    out.push_str(&html[cursor..]);
    out
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
    // Hidden-only multi-step shells render blank without JS.
    let body = strip_tag_pair(trimmed, "style");
    let lower = body.to_ascii_lowercase();
    let hidden_heavy =
        lower.matches("display:none").count() + lower.matches("display: none").count() >= 2
            && !lower.contains("display:block")
            && !lower.contains("display: block")
            && !lower.contains("display:flex")
            && !lower.contains("display: flex");
    if hidden_heavy {
        bail!(
            "Hi-Fi html has no visible content (emit only the active step; do not hide siblings for JS)."
        );
    }
    Ok(())
}

// The pack stylesheet rides along inside each screen rather than sitting once at the
// artifact root: the preview iframe, the PNG capture, Paper's CSS inliner, and the code
// export each receive a single fragment, and none of them can reach run-level state.
// Duplication costs a few KB per screen and buys a fragment that renders anywhere.
fn with_pack_css(html: &str, pack_css: &str) -> String {
    if pack_css.is_empty() {
        return html.to_string();
    }
    // Marked so `strip_pack_styles` can drop it when a prior artifact is echoed back into
    // a prompt — otherwise every regenerate would resend the stylesheet once per screen.
    format!("<style data-stage-pack>{pack_css}</style>\n{html}")
}

fn normalize_screen(
    screen: &JsonValue,
    generated_at_label: &str,
    generated_at: u128,
    kind: WireframeKind,
    pack_css: &str,
) -> anyhow::Result<Option<JsonValue>> {
    let Some(object) = screen.as_object() else {
        return Ok(None);
    };
    let Some(id) = object
        .get("id")
        .and_then(JsonValue::as_str)
        .map(str::to_string)
    else {
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
            // Strip scripts/handlers first: the preview sandbox never runs them, and
            // validation must see the post-strip markup the user will actually get.
            let sanitized = sanitize_hifi_html(html);
            // Validate before the pack stylesheet is attached, otherwise prepending
            // <style> would let any fragment pass the styling check.
            validate_hifi_html(&sanitized)?;
            entry.insert(
                "html".to_string(),
                json!(with_pack_css(&sanitized, pack_css)),
            );
        } else {
            entry.insert("html".to_string(), json!(html));
        }
    }

    if let Some(tsx) = object
        .get("tsx")
        .and_then(JsonValue::as_str)
        .map(str::trim)
        .filter(|tsx| !tsx.is_empty())
    {
        entry.insert("tsx".to_string(), json!(tsx));
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
