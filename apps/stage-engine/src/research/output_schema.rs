use serde_json::{Value as JsonValue, json};

/// Opportunity `sourceSection` values Stage accepts (Rust `ResearchArtifactSection` and the
/// Zod `researchArtifactSectionSchema`). The prompt, this schema and both parsers must agree.
pub const SOURCE_SECTIONS: [&str; 5] = [
    "summary",
    "companySnapshot",
    "competitiveAnalysis",
    "uiPatterns",
    "targetUsers",
];

/// JSON Schema the provider must answer with for a full Research run. Codex
/// (`--output-schema`) and Claude (`--json-schema`) enforce it while generating, so the
/// model cannot drop a section, rename a field or invent enum values.
///
/// Item counts (3-5 opportunities, at least one persona, ...) are deliberately NOT in the
/// schema: forcing more items than the model wants makes constrained decoding stall on
/// whitespace for minutes (seen live with Codex). Counts are checked after the run and
/// fixed by the repair pass.
///
/// Strict-mode rules: every object closes `additionalProperties` and lists every property
/// as required; optional values are nullable instead of absent.
pub fn research_output_schema() -> JsonValue {
    let text = || json!({ "type": "string" });
    let optional_text = || json!({ "type": ["string", "null"] });
    let texts = || json!({ "type": "array", "items": { "type": "string" } });

    let competitor = object(json!({
        "id": text(),
        "name": text(),
        "url": optional_text(),
        "positioning": optional_text(),
        "summary": optional_text(),
        "strengths": texts(),
        "weaknesses": texts(),
        "sourceReferenceIds": texts(),
    }));
    let matrix_row = object(json!({
        "id": text(),
        "label": text(),
        "cells": {
            "type": "array",
            "items": object(json!({
                "competitorId": text(),
                "score": { "type": "string", "enum": ["Strong", "OK", "Weak"] },
            })),
        },
    }));
    let target_user = object(json!({
        "id": text(),
        "name": text(),
        "role": text(),
        "context": text(),
        "goals": texts(),
        "frustrations": texts(),
    }));
    let opportunity = object(json!({
        "id": text(),
        "title": text(),
        "description": text(),
        "sourceSection": { "type": "string", "enum": SOURCE_SECTIONS },
    }));
    let source_reference = object(json!({
        "id": text(),
        "provider": {
            "type": "string",
            "enum": ["refero", "figma", "notion", "sheets", "website", "details", "user"],
        },
        "label": text(),
        "url": optional_text(),
        "externalId": optional_text(),
    }));

    object(json!({
        "apiVersion": { "type": "string", "enum": ["v1"] },
        "artifactKind": { "type": "string", "enum": ["researchArtifact"] },
        "projectId": text(),
        "title": text(),
        "summary": texts(),
        "companySnapshot": {
            "type": "array",
            "items": object(json!({ "label": text(), "value": text() })),
        },
        "competitiveAnalysis": object(json!({
            "competitors": { "type": "array", "items": competitor },
            "matrixRows": { "type": "array", "items": matrix_row },
        })),
        "targetUsers": { "type": "array", "items": target_user },
        "opportunities": { "type": "array", "items": opportunity },
        "openQuestions": texts(),
        "sourceReferences": { "type": "array", "items": source_reference },
    }))
}

fn object(properties: JsonValue) -> JsonValue {
    let required: Vec<String> = properties
        .as_object()
        .map(|map| map.keys().cloned().collect())
        .unwrap_or_default();
    json!({
        "type": "object",
        "additionalProperties": false,
        "required": required,
        "properties": properties,
    })
}

/// Structured output marks optional values as `null` or `""`; Stage's contracts treat
/// both as absent, so they are removed before enrichment.
pub fn drop_empty_values(value: &mut JsonValue) {
    match value {
        JsonValue::Object(map) => {
            map.retain(|_, item| !is_empty(item));
            map.values_mut().for_each(drop_empty_values);
        }
        JsonValue::Array(items) => {
            items.retain(|item| !is_empty(item));
            items.iter_mut().for_each(drop_empty_values);
        }
        _ => {}
    }
}

fn is_empty(value: &JsonValue) -> bool {
    value.is_null() || value.as_str().is_some_and(|text| text.trim().is_empty())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::research::ResearchArtifactSection;

    fn every_object_is_strict(schema: &JsonValue) -> bool {
        match schema {
            JsonValue::Object(map) => {
                if map.get("type") == Some(&json!("object")) {
                    let properties = map["properties"].as_object().unwrap();
                    let required = map["required"].as_array().unwrap();
                    if map["additionalProperties"] != json!(false)
                        || required.len() != properties.len()
                    {
                        return false;
                    }
                }
                map.values().all(every_object_is_strict)
            }
            JsonValue::Array(items) => items.iter().all(every_object_is_strict),
            _ => true,
        }
    }

    #[test]
    fn schema_is_strict_mode_compatible() {
        assert!(every_object_is_strict(&research_output_schema()));
    }

    #[test]
    fn schema_never_forces_item_counts() {
        let text = research_output_schema().to_string();
        assert!(!text.contains("minItems") && !text.contains("maxItems"));
    }

    #[test]
    fn schema_requires_every_research_section() {
        let schema = research_output_schema();
        let required: Vec<&str> = schema["required"]
            .as_array()
            .unwrap()
            .iter()
            .filter_map(JsonValue::as_str)
            .collect();
        for section in [
            "summary",
            "companySnapshot",
            "competitiveAnalysis",
            "targetUsers",
            "opportunities",
            "openQuestions",
            "sourceReferences",
        ] {
            assert!(required.contains(&section), "{section}");
        }
        assert_eq!(
            schema["properties"]["opportunities"]["items"]["properties"]["sourceSection"]["enum"],
            json!(SOURCE_SECTIONS)
        );
    }

    #[test]
    fn every_allowed_source_section_parses() {
        for section in SOURCE_SECTIONS {
            serde_json::from_value::<ResearchArtifactSection>(json!(section))
                .unwrap_or_else(|_| panic!("{section} is not a ResearchArtifactSection"));
        }
    }

    #[test]
    fn empty_optional_values_are_dropped() {
        let mut value = json!({ "url": null, "summary": "", "name": "A", "list": ["x", "", null] });
        drop_empty_values(&mut value);
        assert_eq!(value, json!({ "name": "A", "list": ["x"] }));
    }

    /// Live check that both real CLIs accept the full schema and answer inside it:
    /// `cargo test live_research_schema -- --ignored --nocapture` (needs both logins).
    #[tokio::test]
    #[ignore]
    async fn live_research_schema_is_enforced_by_both_providers() {
        use crate::models::providers::ProviderId;
        use crate::models::research::ResearchArtifact;
        use crate::models::runs::{RunMode, StartRunRequest};
        use crate::providers::adapter::{ProviderRunContext, run_provider_collect};
        use crate::providers::process::ProviderProcessOutcome;
        use crate::runs::RunEventSink;

        for (provider_id, model_id) in [
            (ProviderId::Codex, "codex-default"),
            (ProviderId::Claude, "sonnet"),
        ] {
            let context = ProviderRunContext {
                api_version: "v1",
                run_id: "live-schema".to_string(),
                request: StartRunRequest {
                    provider_id,
                    model_id: model_id.to_string(),
                    model_options: vec![],
                    working_directory: None,
                    // Deliberately asks for things the schema forbids.
                    prompt: "Write a short Stage research artifact for project p1, a coffee shop ordering app, from your own knowledge (no web). Competitor: Starbucks. 3 summary bullets, 3 opportunities, 1 target user. Set every opportunity sourceSection to \"competitiveAnalysis.cardView\".".to_string(),
                    mode: RunMode::Research,
                    context: crate::models::runs::RunContext {
                        source: Some("research-repair".to_string()),
                        ..Default::default()
                    },
                    attachments: vec![],
                    output_schema: Some(research_output_schema()),
                },
            };
            let (_cancel, cancel_rx) = tokio::sync::watch::channel(false);
            let started = std::time::Instant::now();
            let outcome = tokio::time::timeout(
                std::time::Duration::from_secs(300),
                run_provider_collect(context, RunEventSink::detached(), cancel_rx),
            )
            .await
            .unwrap_or_else(|_| panic!("{provider_id:?}: no answer within 5 minutes"))
            .unwrap_or_else(|error| panic!("{provider_id:?}: {error}"));
            let ProviderProcessOutcome::Completed(text) = outcome else {
                panic!("cancelled");
            };
            let mut value = crate::helpers::provider_json::extract_research_artifact(&text)
                .unwrap_or_else(|error| panic!("{provider_id:?}: {error}\n{text}"));
            drop_empty_values(&mut value);
            value["generatedAt"] = json!(0);
            let artifact: ResearchArtifact = serde_json::from_value(value)
                .unwrap_or_else(|error| panic!("{provider_id:?}: {error}\n{text}"));
            println!(
                "{provider_id:?} in {}s: {} opportunities, {} target users, sections {:?}",
                started.elapsed().as_secs(),
                artifact.opportunities.len(),
                artifact.target_users.len(),
                artifact
                    .opportunities
                    .iter()
                    .map(|o| o.source_section)
                    .collect::<Vec<_>>()
            );
            assert!(artifact.opportunities.len() >= 3, "{provider_id:?}");
            assert!(!artifact.target_users.is_empty(), "{provider_id:?}");
            assert!(
                artifact
                    .opportunities
                    .iter()
                    .all(|o| o.source_section.is_some())
            );
        }
    }
}
