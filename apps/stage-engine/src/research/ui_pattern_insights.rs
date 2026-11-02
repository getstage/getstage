// Real UI pattern recognition for Research → UI Patterns.
//
// The reference screenshots (Refero for apps, Details for websites) are shown to
// the Research AI, which names the patterns it actually sees per section in a
// fixed shape (`uiPatternInsights`). The engine checks every answer against the
// same rules before it reaches the "Reference Patterns" panel; a section without
// enough usable answers falls back to the old behaviour (category templates for
// apps, no panel for websites). Pattern recognition never fails a Research run.

use std::collections::{HashMap, HashSet};
use std::path::PathBuf;

use serde_json::{Value, json};

use crate::models::refero::{ReferoContext, ReferoReferenceKind};
use crate::models::runs::{RunAttachment, RunAttachmentKind};
use crate::providers::command::provider_cli_working_directory;
use crate::refero::parse::{infer_image_mime, looks_like_image_bytes};

/// Screenshots shown per section: the three the panel shows first.
const SCREENSHOTS_PER_SECTION: usize = 3;
/// Hard cap per run so Research stays inside its time limit.
const MAX_SCREENSHOTS: usize = 15;

/// Standard answer shape, enforced after the run.
pub const MIN_PATTERNS: usize = 2;
pub const MAX_PATTERNS: usize = 4;
const MAX_TITLE_WORDS: usize = 6;
const MAX_TITLE_CHARS: usize = 60;
const MIN_DESCRIPTION_WORDS: usize = 4;
const MAX_DESCRIPTION_CHARS: usize = 240;

/// Field the AI answers in. Removed from the artifact once read.
pub const INSIGHTS_FIELD: &str = "uiPatternInsights";

#[derive(Clone, Debug)]
pub struct UiPatternScreenshot {
    pub section_id: String,
    pub section_title: String,
    pub product: Option<String>,
    pub path: String,
}

/// Writes the first screenshots of every section to the provider working
/// directory. Must run before the images are uploaded (upload takes the bytes).
/// A screenshot that cannot be written is skipped.
pub fn save_ui_pattern_screenshots(context: &ReferoContext) -> Vec<UiPatternScreenshot> {
    let directory = match provider_cli_working_directory() {
        Ok(directory) => directory,
        Err(error) => {
            tracing::warn!(%error, "no working directory for UI pattern screenshots");
            return Vec::new();
        }
    };

    let mut screenshots = Vec::new();
    for bucket in &context.category_searches {
        let section_id = bucket.row_id();
        let section_title = bucket.display_title().to_string();
        let references = bucket
            .references
            .iter()
            .filter(|reference| reference.kind == ReferoReferenceKind::Screen)
            .filter_map(|reference| {
                let bytes = reference.raw_image_bytes.as_deref()?;
                looks_like_image_bytes(bytes).then_some((reference, bytes))
            })
            .take(SCREENSHOTS_PER_SECTION);

        for (reference, bytes) in references {
            if screenshots.len() >= MAX_SCREENSHOTS {
                return screenshots;
            }
            let path = screenshot_path(&directory, &reference.id, bytes);
            if let Err(error) = std::fs::write(&path, bytes) {
                tracing::warn!(reference_id = %reference.id, %error, "could not save UI pattern screenshot");
                continue;
            }
            screenshots.push(UiPatternScreenshot {
                section_id: section_id.clone(),
                section_title: section_title.clone(),
                product: reference
                    .product_name
                    .as_deref()
                    .map(str::trim)
                    .filter(|name| !name.is_empty())
                    .map(ToOwned::to_owned),
                path: path.to_string_lossy().into_owned(),
            });
        }
    }
    screenshots
}

fn screenshot_path(directory: &std::path::Path, reference_id: &str, bytes: &[u8]) -> PathBuf {
    let extension = match infer_image_mime(bytes) {
        "image/jpeg" => "jpg",
        "image/webp" => "webp",
        "image/gif" => "gif",
        _ => "png",
    };
    let stem: String = reference_id
        .chars()
        .map(|character| {
            if character.is_ascii_alphanumeric() {
                character
            } else {
                '-'
            }
        })
        .collect();
    directory.join(format!("research-pattern-{stem}.{extension}"))
}

/// Image attachments for the provider (Codex receives them directly; Claude
/// opens the paths listed in the prompt).
pub fn screenshot_attachments(screenshots: &[UiPatternScreenshot]) -> Vec<RunAttachment> {
    screenshots
        .iter()
        .enumerate()
        .map(|(index, screenshot)| RunAttachment {
            id: format!("research-pattern-{index}"),
            kind: RunAttachmentKind::Image,
            name: None,
            url: None,
            mime_type: None,
            local_path: Some(screenshot.path.clone()),
        })
        .collect()
}

/// Prompt instructions for `uiPatternInsights`. Always added, because the
/// schema always requires the field.
pub fn ui_pattern_prompt_section(screenshots: &[UiPatternScreenshot]) -> String {
    if screenshots.is_empty() {
        return format!("{INSIGHTS_FIELD}: return an empty array [] (no screenshots this run).");
    }

    let mut sections: Vec<(&str, &str, Vec<String>)> = Vec::new();
    for screenshot in screenshots {
        let line = format!(
            "  - Open and study this image: {}{}",
            screenshot.path,
            screenshot
                .product
                .as_deref()
                .map(|product| format!(" (product: {product})"))
                .unwrap_or_default()
        );
        match sections
            .iter_mut()
            .find(|(id, _, _)| *id == screenshot.section_id)
        {
            Some((_, _, lines)) => lines.push(line),
            None => sections.push((
                &screenshot.section_id,
                &screenshot.section_title,
                vec![line],
            )),
        }
    }
    let section_lines = sections
        .iter()
        .map(|(id, title, lines)| format!("- sectionId \"{id}\" ({title}):\n{}", lines.join("\n")))
        .collect::<Vec<_>>()
        .join("\n");

    format!(
        r#"UI pattern recognition ({INSIGHTS_FIELD}):
Reference screenshots per UI Patterns section:
{section_lines}

Open every screenshot above, then fill {INSIGHTS_FIELD} with one entry per sectionId listed above:
- sectionId: copy the sectionId exactly.
- patterns: 3-4 design patterns you can actually SEE in that section's screenshots. Never list a pattern that is not visible.
- title: the pattern name, 2-5 words, Title Case, a design term a UI designer would use (e.g. "Oversized Type Hero", "Logo Wall", "Comparison Table"). No product names, no punctuation.
- description: exactly one sentence, max 25 words: which products show it and how it is built (layout, hierarchy, components). Use the product names given above.
- Describe layout and design only. No marketing claims, no advice, no pricing facts.
- If you cannot open a section's screenshots, return that section with an empty patterns array."#
    )
}

/// JSON Schema for `uiPatternInsights` (strict mode, no item counts — see
/// research_output_schema for why counts are checked afterwards).
pub fn ui_pattern_insights_schema() -> Value {
    json!({
        "type": "array",
        "items": {
            "type": "object",
            "additionalProperties": false,
            "required": ["sectionId", "patterns"],
            "properties": {
                "sectionId": { "type": "string" },
                "patterns": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "additionalProperties": false,
                        "required": ["title", "description"],
                        "properties": {
                            "title": { "type": "string" },
                            "description": { "type": "string" },
                        },
                    },
                },
            },
        },
    })
}

/// Removes `uiPatternInsights` from the artifact and returns the patterns that
/// pass the standard, as "Title — description" per section id. Sections with
/// fewer than MIN_PATTERNS usable patterns are left out (caller falls back).
pub fn take_ui_pattern_insights(artifact: &mut Value) -> HashMap<String, Vec<String>> {
    let Some(raw) = artifact
        .as_object_mut()
        .and_then(|object| object.remove(INSIGHTS_FIELD))
    else {
        return HashMap::new();
    };

    let mut by_section = HashMap::new();
    for entry in raw.as_array().into_iter().flatten() {
        let Some(section_id) = entry.get("sectionId").and_then(Value::as_str) else {
            continue;
        };
        let section_id = section_id.trim();
        if section_id.is_empty() || by_section.contains_key(section_id) {
            continue;
        }

        let mut seen = HashSet::new();
        let patterns = entry
            .get("patterns")
            .and_then(Value::as_array)
            .into_iter()
            .flatten()
            .filter_map(|pattern| {
                let title = clean_title(pattern.get("title")?.as_str()?)?;
                let description = clean_description(pattern.get("description")?.as_str()?)?;
                seen.insert(title.to_lowercase())
                    .then(|| format!("{title} — {description}"))
            })
            .take(MAX_PATTERNS)
            .collect::<Vec<_>>();

        if patterns.len() >= MIN_PATTERNS {
            by_section.insert(section_id.to_string(), patterns);
        }
    }
    by_section
}

fn collapse_whitespace(text: &str) -> String {
    text.split_whitespace().collect::<Vec<_>>().join(" ")
}

fn clean_title(raw: &str) -> Option<String> {
    // The panel splits "title — body" on the em dash, so a title must not contain one.
    let title = collapse_whitespace(&raw.replace(['—', '–'], " "));
    let title = title
        .trim_matches(|character: char| {
            character.is_ascii_punctuation() || character.is_whitespace()
        })
        .to_string();
    let words = title.split_whitespace().count();
    (words > 0 && words <= MAX_TITLE_WORDS && title.chars().count() <= MAX_TITLE_CHARS)
        .then_some(title)
}

fn clean_description(raw: &str) -> Option<String> {
    let description = collapse_whitespace(raw);
    let words = description.split_whitespace().count();
    (words >= MIN_DESCRIPTION_WORDS && description.chars().count() <= MAX_DESCRIPTION_CHARS)
        .then_some(description)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn pattern(title: &str, description: &str) -> Value {
        json!({ "title": title, "description": description })
    }

    #[test]
    fn keeps_standard_patterns_and_removes_the_field() {
        let mut artifact = json!({
            "title": "Research",
            "uiPatternInsights": [{
                "sectionId": "ui-patterns-hero",
                "patterns": [
                    pattern("Oversized Type Hero", "Phive and HNTRS let the headline fill the full first screen."),
                    pattern("Full-bleed Photo Background", "21TSI runs a cropped athlete photo edge to edge behind the headline."),
                    pattern("Minimal Top Navigation", "All three keep the navigation to a thin row of small text links."),
                ],
            }],
        });

        let insights = take_ui_pattern_insights(&mut artifact);

        assert!(artifact.get(INSIGHTS_FIELD).is_none());
        let hero = &insights["ui-patterns-hero"];
        assert_eq!(hero.len(), 3);
        assert_eq!(
            hero[0],
            "Oversized Type Hero — Phive and HNTRS let the headline fill the full first screen."
        );
    }

    #[test]
    fn drops_patterns_outside_the_standard() {
        let mut artifact = json!({
            "uiPatternInsights": [{
                "sectionId": "ui-patterns-pricing",
                "patterns": [
                    pattern("Comparison Table", "Arcade and Fibery compare plans in one aligned table."),
                    pattern("comparison table", "Duplicate title written in a different case here."),
                    pattern("This title is far too long to be a pattern name", "Long titles are not pattern names at all."),
                    pattern("Short", "Too short."),
                    pattern("Long Description", &"word ".repeat(80)),
                    pattern("Highlighted Plan — Badge", "Arcade marks the recommended plan with a colored badge."),
                ],
            }],
        });

        let pricing = &take_ui_pattern_insights(&mut artifact)["ui-patterns-pricing"];

        assert_eq!(pricing.len(), 2);
        assert!(pricing[0].starts_with("Comparison Table — "));
        assert!(pricing[1].starts_with("Highlighted Plan Badge — "));
    }

    #[test]
    fn caps_at_four_patterns() {
        let patterns: Vec<Value> = (1..=6)
            .map(|index| {
                pattern(
                    &format!("Pattern {index}"),
                    "A clearly visible layout pattern here.",
                )
            })
            .collect();
        let mut artifact = json!({
            "uiPatternInsights": [{ "sectionId": "ui-patterns-faq", "patterns": patterns }],
        });

        assert_eq!(
            take_ui_pattern_insights(&mut artifact)["ui-patterns-faq"].len(),
            MAX_PATTERNS
        );
    }

    #[test]
    fn sections_with_too_few_usable_patterns_fall_back() {
        let mut artifact = json!({
            "uiPatternInsights": [
                { "sectionId": "ui-patterns-hero", "patterns": [pattern("Logo Wall", "Mixpanel and Legora show customer logos in one row.")] },
                { "sectionId": "ui-patterns-features", "patterns": [] },
                { "patterns": [pattern("No Section", "This entry has no section id at all.")] },
            ],
        });

        assert!(take_ui_pattern_insights(&mut artifact).is_empty());
    }

    #[test]
    fn missing_or_malformed_field_is_ignored() {
        assert!(take_ui_pattern_insights(&mut json!({ "title": "x" })).is_empty());
        assert!(take_ui_pattern_insights(&mut json!({ "uiPatternInsights": "nope" })).is_empty());
    }

    #[test]
    fn prompt_lists_sections_and_paths() {
        let screenshots = vec![
            UiPatternScreenshot {
                section_id: "ui-patterns-hero".to_string(),
                section_title: "Hero".to_string(),
                product: Some("Phive".to_string()),
                path: "/tmp/a.png".to_string(),
            },
            UiPatternScreenshot {
                section_id: "ui-patterns-hero".to_string(),
                section_title: "Hero".to_string(),
                product: None,
                path: "/tmp/b.png".to_string(),
            },
        ];

        let prompt = ui_pattern_prompt_section(&screenshots);

        assert!(prompt.contains("sectionId \"ui-patterns-hero\" (Hero)"));
        assert!(prompt.contains("/tmp/a.png (product: Phive)"));
        assert!(prompt.contains("/tmp/b.png"));
        assert_eq!(screenshot_attachments(&screenshots).len(), 2);
        assert!(ui_pattern_prompt_section(&[]).contains("empty array"));
    }
}
