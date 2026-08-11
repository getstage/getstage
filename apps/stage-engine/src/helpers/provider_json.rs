use anyhow::{Context, bail};
use serde_json::{Value as JsonValue, json};

pub fn extract_json_object(text: &str) -> anyhow::Result<JsonValue> {
    extract_json_object_matching(text, None)
}

/// Kept for tests and any remaining full-artifact parse paths.
#[allow(dead_code)]
pub fn extract_research_artifact(text: &str) -> anyhow::Result<JsonValue> {
    extract_json_object_matching(text, Some("researchArtifact"))
}

pub fn extract_strategy_artifact(text: &str) -> anyhow::Result<JsonValue> {
    let trimmed = text.trim();
    if trimmed.is_empty() {
        bail!("provider output was empty");
    }

    if let Some(value) = find_artifact_by_kind(trimmed, "strategyArtifact") {
        return Ok(value);
    }

    // Strategy normalization injects apiVersion/artifactKind/projectId later, so accept
    // provider output that follows the artifact shape but omitted the metadata wrapper.
    if let Ok(value) = serde_json::from_str::<JsonValue>(trimmed)
        && strategy_shape_is_normalizable(&value)
    {
        return Ok(value);
    }

    collect_json_objects(trimmed)
        .into_iter()
        .rev()
        .find(strategy_shape_is_normalizable)
        .context("provider output did not contain a valid strategyArtifact artifact")
}

pub fn extract_flows_artifact(text: &str) -> anyhow::Result<JsonValue> {
    let trimmed = text.trim();
    if trimmed.is_empty() {
        bail!("provider output was empty");
    }

    if let Some(value) = find_artifact_by_kind(trimmed, "flowsArtifact") {
        return Ok(value);
    }

    if let Ok(value) = serde_json::from_str::<JsonValue>(trimmed)
        && flows_shape_is_normalizable(&value)
    {
        return Ok(value);
    }

    collect_json_objects(trimmed)
        .into_iter()
        .rev()
        .find(flows_shape_is_normalizable)
        .context("provider output did not contain a valid flowsArtifact artifact")
}

pub fn extract_style_guide(text: &str) -> anyhow::Result<JsonValue> {
    let trimmed = text.trim();
    if trimmed.is_empty() {
        bail!("provider output was empty");
    }

    if let Ok(value) = serde_json::from_str::<JsonValue>(trimmed)
        && style_guide_shape_is_normalizable(&value)
    {
        return Ok(value);
    }

    collect_json_objects(trimmed)
        .into_iter()
        .rev()
        .find(style_guide_shape_is_normalizable)
        .context("provider output did not contain a valid style guide object")
}

pub fn extract_wireframes_artifact(text: &str) -> anyhow::Result<JsonValue> {
    let trimmed = text.trim();
    if trimmed.is_empty() {
        bail!("provider output was empty");
    }

    if let Some(value) = find_artifact_by_kind(trimmed, "wireframesArtifact") {
        return Ok(value);
    }

    if let Ok(value) = serde_json::from_str::<JsonValue>(trimmed)
        && wireframes_shape_is_normalizable(&value)
    {
        return Ok(value);
    }

    if let Some(value) = collect_json_objects(trimmed)
        .into_iter()
        .rev()
        .find(wireframes_shape_is_normalizable)
    {
        return Ok(value);
    }

    // A Hi-Fi response is one huge JSON object whose values are escaped HTML/TSX. After
    // tens of thousands of characters models sometimes drop the root object's closing
    // brace, which makes the whole artifact unparseable even though every screen inside it
    // is complete. Throwing a ten-minute run away over one missing byte is data loss, so
    // rebuild the artifact from the screen objects that did parse. A screen truncated
    // mid-write never balances its braces, so it can never be recovered here.
    let recovered = recover_generated_screens(trimmed);
    if !recovered.is_empty() {
        tracing::warn!(
            screens = recovered.len(),
            "wireframes artifact was malformed; recovered the complete screens from it"
        );
        return Ok(json!({ "generatedScreens": recovered }));
    }

    bail!("provider output did not contain a valid wireframesArtifact artifact")
}

/// Screen objects salvaged from an artifact whose outer JSON did not survive.
fn recover_generated_screens(text: &str) -> Vec<JsonValue> {
    let mut screens: Vec<(String, JsonValue)> = Vec::new();
    for value in collect_json_objects(text) {
        let Some(id) = value.get("id").and_then(JsonValue::as_str) else {
            continue;
        };
        // A screen carries a design (`html`/`tsx`) or a structural outline (`sections`).
        // Sections and blocks are also `id`-bearing objects, but never hold those keys.
        if !(value.get("html").is_some()
            || value.get("tsx").is_some()
            || value.get("sections").is_some())
        {
            continue;
        }
        let id = id.to_string();
        // Providers sometimes echo the prompt's prior artifact before writing the real
        // one, so a later occurrence of an id supersedes an earlier one.
        match screens.iter_mut().find(|(seen, _)| *seen == id) {
            Some(slot) => slot.1 = value,
            None => screens.push((id, value)),
        }
    }
    screens.into_iter().map(|(_, value)| value).collect()
}

fn extract_json_object_matching(
    text: &str,
    artifact_kind: Option<&str>,
) -> anyhow::Result<JsonValue> {
    let trimmed = text.trim();
    if trimmed.is_empty() {
        bail!("provider output was empty");
    }

    if let Some(kind) = artifact_kind {
        if let Some(value) = find_artifact_by_kind(trimmed, kind) {
            return Ok(value);
        }
        bail!("provider output did not contain a valid {kind} artifact");
    }

    if let Ok(value) = serde_json::from_str::<JsonValue>(trimmed) {
        if value.is_object() {
            return Ok(value);
        }
    }

    let objects = collect_json_objects(trimmed);
    if objects.is_empty() {
        bail!("provider output did not contain a JSON object");
    }

    objects
        .into_iter()
        .last()
        .context("provider output contained invalid JSON")
}

fn find_artifact_by_kind(text: &str, kind: &str) -> Option<JsonValue> {
    if let Ok(value) = serde_json::from_str::<JsonValue>(text) {
        if artifact_matches_kind_and_shape(&value, kind) {
            return Some(value);
        }
    }

    // Prefer the last match: providers often echo the prompt's prior artifact
    // before writing the real one. First-match would pick the echo (e.g. regen
    // payload with html stripped) and fail merge with empty html.
    let mut last = None;
    for line in text.lines() {
        let line = line.trim();
        if !line.starts_with('{') || !line.contains(kind) {
            continue;
        }
        if let Ok(value) = serde_json::from_str::<JsonValue>(line) {
            if artifact_matches_kind_and_shape(&value, kind) {
                last = Some(value);
            }
        }
    }
    if last.is_some() {
        return last;
    }

    collect_json_objects(text)
        .into_iter()
        .rev()
        .find(|value| artifact_matches_kind_and_shape(value, kind))
}

fn artifact_matches_kind_and_shape(value: &JsonValue, kind: &str) -> bool {
    if !artifact_kind_matches(value, kind) {
        return false;
    }

    match kind {
        "strategyArtifact" => value
            .get("sections")
            .and_then(JsonValue::as_array)
            .is_some_and(|sections| !sections.is_empty()),
        "flowsArtifact" => flows_shape_is_normalizable(value),
        "wireframesArtifact" => wireframes_shape_is_normalizable(value),
        "researchArtifact" => {
            value.get("summary").is_some() || value.get("competitiveAnalysis").is_some()
        }
        _ => true,
    }
}

fn flows_shape_is_normalizable(value: &JsonValue) -> bool {
    value
        .get("flows")
        .and_then(JsonValue::as_array)
        .is_some_and(|flows| !flows.is_empty())
        || value
            .get("screens")
            .and_then(JsonValue::as_array)
            .is_some_and(|screens| !screens.is_empty())
}

fn wireframes_shape_is_normalizable(value: &JsonValue) -> bool {
    value
        .get("generatedScreens")
        .and_then(JsonValue::as_array)
        .is_some_and(|screens| !screens.is_empty())
}

fn style_guide_shape_is_normalizable(value: &JsonValue) -> bool {
    value
        .get("colorPalettes")
        .and_then(JsonValue::as_array)
        .is_some_and(|palettes| !palettes.is_empty())
        && value
            .get("typography")
            .and_then(JsonValue::as_object)
            .is_some()
}

fn strategy_shape_is_normalizable(value: &JsonValue) -> bool {
    value
        .get("sections")
        .and_then(JsonValue::as_array)
        .is_some_and(|sections| !sections.is_empty())
}

fn artifact_kind_matches(value: &JsonValue, kind: &str) -> bool {
    value.get("artifactKind").and_then(JsonValue::as_str) == Some(kind)
}

fn collect_json_objects(text: &str) -> Vec<JsonValue> {
    let mut objects = Vec::new();

    for (start, _) in text.match_indices('{') {
        let Some(end) = matching_object_end(text, start) else {
            continue;
        };

        if let Ok(value) = serde_json::from_str::<JsonValue>(&text[start..=end]) {
            if value.is_object() {
                objects.push(value);
            }
        }
    }

    objects
}

pub(crate) fn is_complete_json_object(text: &str) -> bool {
    let trimmed = text.trim();
    let Some(start) = trimmed.find('{') else {
        return false;
    };
    let Some(end) = matching_object_end(trimmed, start) else {
        return false;
    };
    end == trimmed.len() - 1
}

pub(crate) fn matching_object_end(text: &str, start: usize) -> Option<usize> {
    let bytes = text.as_bytes();
    if bytes.get(start) != Some(&b'{') {
        return None;
    }

    let mut depth = 0;
    let mut in_string = false;
    let mut escape = false;

    for (offset, &byte) in bytes[start..].iter().enumerate() {
        if in_string {
            if escape {
                escape = false;
            } else if byte == b'\\' {
                escape = true;
            } else if byte == b'"' {
                in_string = false;
            }
            continue;
        }

        match byte {
            b'"' => in_string = true,
            b'{' => depth += 1,
            b'}' => {
                depth -= 1;
                if depth == 0 {
                    return Some(start + offset);
                }
            }
            _ => {}
        }
    }

    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn extract_strategy_artifact_prefers_matching_kind_among_multiple_objects() {
        let text = r#"codex
{"title":"Example","sections":[]}
{"apiVersion":"v1","artifactKind":"researchArtifact","projectId":"p1"}
{"apiVersion":"v1","artifactKind":"strategyArtifact","projectId":"p1","sections":[{"id":"direction","kind":"plain","body":["One"]}]}
tokens used"#;

        let value = extract_strategy_artifact(text).unwrap();

        assert_eq!(value["artifactKind"], "strategyArtifact");
        assert_eq!(value["projectId"], "p1");
    }

    #[test]
    fn extract_strategy_artifact_rejects_invalid_artifact_json() {
        let text = r#"{"apiVersion":"v1","artifactKind":"strategyArtifact","projectId":"p1","sections":[{"id":"pages","kind":"cards","cards":[{"title":"Dashboard","objective":"Ops","kpi":"Time","keyElement":"Queue"]},{"id":"accessibility","kind":"table","table":[["WCAG","AA"]]}]}"#;

        let error = extract_strategy_artifact(text).unwrap_err();

        assert!(
            error
                .to_string()
                .contains("did not contain a valid strategyArtifact artifact")
        );
    }

    #[test]
    fn extract_strategy_artifact_parses_single_line_output() {
        let text = r#"{"apiVersion":"v1","artifactKind":"strategyArtifact","projectId":"p1","sections":[{"id":"direction","kind":"plain","body":["Go"]}]}"#;

        let value = extract_strategy_artifact(text).unwrap();

        assert_eq!(value["sections"][0]["id"], "direction");
    }

    #[test]
    fn extract_strategy_artifact_accepts_normalizable_shape_without_kind() {
        let text = r#"{"title":"Project Strategy","sections":[{"id":"direction","title":"Design Direction","status":"action","kind":"plain","body":["Go"]}]}"#;

        let value = extract_strategy_artifact(text).unwrap();

        assert_eq!(value["title"], "Project Strategy");
        assert_eq!(value["sections"][0]["id"], "direction");
    }

    #[test]
    fn extract_research_artifact_prefers_matching_kind() {
        let text = r#"{"artifactKind":"strategyArtifact","projectId":"p1","sections":[]}
{"artifactKind":"researchArtifact","projectId":"p1","summary":["One"]}"#;

        let value = extract_research_artifact(text).unwrap();

        assert_eq!(value["artifactKind"], "researchArtifact");
    }

    #[test]
    fn extract_json_object_without_hint_uses_last_object() {
        let text = r#"noise {"id":"direction","kind":"plain","body":["One line"]}"#;

        let value = extract_json_object(text).unwrap();

        assert_eq!(value["id"], "direction");
    }

    #[test]
    fn extract_strategy_artifact_reads_json_emitted_on_stderr_line() {
        let text = r#"noise on stdout {"apiVersion":"v1","artifactKind":"strategyArtifact","projectId":"p1","sections":[{"id":"direction","kind":"plain","body":["Go"]}]}"#;

        let value = extract_strategy_artifact(text).unwrap();

        assert_eq!(value["artifactKind"], "strategyArtifact");
        assert_eq!(value["sections"][0]["id"], "direction");
    }

    #[test]
    fn extract_strategy_artifact_parses_pretty_printed_multiline_output() {
        let text = r#"codex
{
  "apiVersion": "v1",
  "artifactKind": "strategyArtifact",
  "projectId": "p1",
  "sections": [
    {
      "id": "direction",
      "kind": "plain",
      "body": ["Go"]
    }
  ]
}
tokens used"#;

        let value = extract_strategy_artifact(text).unwrap();

        assert_eq!(value["artifactKind"], "strategyArtifact");
        assert_eq!(value["sections"][0]["id"], "direction");
    }

    #[test]
    fn is_complete_json_object_detects_balanced_objects() {
        assert!(is_complete_json_object(
            r#"{"artifactKind":"strategyArtifact"}"#
        ));
        assert!(!is_complete_json_object(
            r#"{"artifactKind":"strategyArtifact""#
        ));
        assert!(!is_complete_json_object(
            r#""artifactKind":"strategyArtifact""#
        ));
    }
    #[test]
    fn recovers_screens_when_the_artifact_lost_its_closing_brace() {
        // Run 009f3cbc: ten minutes of work, six finished screens, and the root object's
        // closing `}` missing. The screens themselves parse, so they must survive.
        let text = "```json\n{\n  \"artifactKind\": \"wireframesArtifact\",\n  \"generatedScreens\": [\n    {\"id\":\"home\",\"html\":\"<div>Home</div>\"},\n    {\"id\":\"pricing\",\"html\":\"<div>Pricing</div>\"}\n  ]\n```";

        let value = extract_wireframes_artifact(text).expect("complete screens must survive");

        let screens = value["generatedScreens"].as_array().unwrap();
        assert_eq!(screens.len(), 2);
        assert_eq!(screens[0]["id"], "home");
        assert_eq!(screens[1]["id"], "pricing");
    }

    #[test]
    fn a_screen_truncated_mid_write_is_never_recovered() {
        // The last screen was cut off mid-markup: its braces never balance, so it must be
        // dropped rather than saved as a half-written design.
        let text = "{\"generatedScreens\":[{\"id\":\"home\",\"html\":\"<div>Home</div>\"},{\"id\":\"pricing\",\"html\":\"<div>Pri";

        let value = extract_wireframes_artifact(text).expect("the complete screen must survive");

        let screens = value["generatedScreens"].as_array().unwrap();
        assert_eq!(screens.len(), 1);
        assert_eq!(screens[0]["id"], "home");
    }

    #[test]
    fn sections_and_blocks_are_not_mistaken_for_screens() {
        // Sections and blocks also carry an `id`; only screens carry html/tsx/sections.
        let text = "{\"generatedScreens\":[{\"id\":\"home\",\"sections\":[{\"id\":\"hero\",\"blocks\":[{\"id\":\"b1\",\"kind\":\"heading\"}]}]}]";

        let value = extract_wireframes_artifact(text).unwrap();

        let screens = value["generatedScreens"].as_array().unwrap();
        assert_eq!(screens.len(), 1);
        assert_eq!(screens[0]["id"], "home");
    }
}
