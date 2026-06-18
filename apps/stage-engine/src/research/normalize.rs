//! Coerce provider research JSON into the Stage ResearchArtifact contract.
//! Prompts guide shape; this module guarantees the desktop Zod schema can parse saves.

use serde_json::{Map, Value, json};

use crate::models::research::ResearchInput;

pub fn normalize_research_artifact_fields(object: &mut Map<String, Value>, input: &ResearchInput) {
    normalize_title(object, input);
    normalize_summary(object);
    normalize_company_snapshot(object);
    normalize_target_users(object);
    normalize_opportunities(object);
    normalize_open_questions(object);
    normalize_source_references(object);
    normalize_competitive_analysis(object);
    ensure_array_field(object, "uiPatterns");
    ensure_array_field(object, "customSections");
}

fn normalize_title(object: &mut Map<String, Value>, input: &ResearchInput) {
    let title = object
        .get("title")
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_string);

    let title = title.or_else(|| {
        object
            .get("summary")
            .and_then(Value::as_object)
            .and_then(|summary| summary.get("headline"))
            .and_then(Value::as_str)
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .map(str::to_string)
    });

    let title = title.unwrap_or_else(|| format!("{} Research", input.project_name.trim()));
    object.insert("title".to_string(), json!(title));
}

fn normalize_summary(object: &mut Map<String, Value>) {
    let summary = match object.remove("summary") {
        Some(Value::Array(items)) => normalize_summary_array(items),
        Some(Value::String(text)) => {
            let trimmed = text.trim();
            if trimmed.is_empty() {
                vec![]
            } else {
                vec![trimmed.to_string()]
            }
        }
        Some(Value::Object(mut map)) => {
            let mut parts = Vec::new();
            if let Some(headline) = map
                .remove("headline")
                .and_then(|value| string_value(&value))
                .filter(|value| !value.is_empty())
            {
                parts.push(headline);
            }
            if let Some(body) = map
                .remove("body")
                .and_then(|value| string_value(&value))
                .filter(|value| !value.is_empty())
            {
                parts.push(body);
            }
            for (_, value) in map {
                if let Some(text) = string_value(&value).filter(|value| !value.is_empty()) {
                    parts.push(text);
                }
            }
            parts
        }
        _ => vec![],
    };

    object.insert(
        "summary".to_string(),
        Value::Array(summary.into_iter().map(Value::String).collect()),
    );
}

fn normalize_summary_array(items: Vec<Value>) -> Vec<String> {
    items
        .iter()
        .filter_map(|item| string_value(item))
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .collect()
}

fn normalize_company_snapshot(object: &mut Map<String, Value>) {
    let mut snapshot = match object.remove("companySnapshot") {
        Some(Value::Array(rows)) => normalize_company_snapshot_rows(rows),
        Some(Value::Object(map)) => company_snapshot_from_object(map),
        _ => vec![],
    };
    sort_company_snapshot_rows(&mut snapshot);

    object.insert("companySnapshot".to_string(), json!(snapshot));
}

fn normalize_company_snapshot_rows(rows: Vec<Value>) -> Vec<Value> {
    rows.into_iter()
        .filter_map(|row| {
            let object = row.as_object()?;
            let label = object
                .get("label")
                .and_then(Value::as_str)
                .map(str::trim)
                .filter(|value| !value.is_empty())?;
            let value = object
                .get("value")
                .and_then(Value::as_str)
                .map(str::trim)
                .filter(|value| !value.is_empty())?;
            Some(json!({ "label": label, "value": value }))
        })
        .collect()
}

fn company_snapshot_from_object(map: Map<String, Value>) -> Vec<Value> {
    let mut rows = Vec::new();

    let known_fields = [
        ("name", "Company"),
        ("company", "Company"),
        ("industry", "Industry"),
        ("website", "Website"),
        ("description", "Description"),
        ("client", "Client"),
        ("clientName", "Client"),
        ("projectFocus", "Project focus"),
        ("project focus", "Project focus"),
        ("primaryProductSurface", "Primary product surface"),
        ("keyUxAreas", "Key UX areas"),
        ("strategicContext", "Strategic context"),
    ];

    for (key, label) in known_fields {
        if let Some(value) = map
            .get(key)
            .and_then(|v| string_value(v))
            .filter(|v| !v.is_empty())
        {
            rows.push(json!({ "label": label, "value": value }));
        }
    }

    if let Some(strengths) = map.get("keyStrengths").and_then(|v| string_array(v)) {
        if !strengths.is_empty() {
            rows.push(json!({
                "label": "Key strengths",
                "value": strengths.join(" ")
            }));
        }
    }

    if let Some(weaknesses) = map.get("keyWeaknesses").and_then(|v| string_array(v)) {
        if !weaknesses.is_empty() {
            rows.push(json!({
                "label": "Key weaknesses",
                "value": weaknesses.join(" ")
            }));
        }
    }

    for (key, value) in map {
        if known_fields.iter().any(|(known, _)| known == &key.as_str()) {
            continue;
        }
        if key == "keyStrengths" || key == "keyWeaknesses" {
            continue;
        }
        if let Some(text) = string_value(&value).filter(|v| !v.is_empty()) {
            let label = label_from_key(&key);
            rows.push(json!({ "label": label, "value": text }));
        }
    }

    rows
}

fn sort_company_snapshot_rows(rows: &mut Vec<Value>) {
    rows.sort_by_key(|row| {
        row.get("label")
            .and_then(Value::as_str)
            .map(company_snapshot_label_rank)
            .unwrap_or(usize::MAX)
    });
}

fn company_snapshot_label_rank(label: &str) -> usize {
    match label.trim().to_ascii_lowercase().as_str() {
        "company" | "client" => 0,
        "industry" => 1,
        "product" | "project focus" | "primary product surface" => 2,
        "target user" | "target users" | "audience" => 3,
        "platform" => 4,
        "stage" => 5,
        "context" | "description" | "strategic context" => 6,
        "website" => 7,
        _ => 50,
    }
}

fn normalize_target_users(object: &mut Map<String, Value>) {
    let Some(users) = object.get_mut("targetUsers").and_then(Value::as_array_mut) else {
        object.insert("targetUsers".to_string(), json!([]));
        return;
    };

    let mut seen_users = std::collections::HashSet::new();
    let mut index = 0;
    users.retain_mut(|user| {
        let user_index = index;
        index += 1;
        let Some(user_object) = user.as_object_mut() else {
            return false;
        };

        let Some(name) = user_object
            .get("name")
            .and_then(Value::as_str)
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .map(str::to_string)
        else {
            return false;
        };
        let role = user_object
            .get("role")
            .and_then(Value::as_str)
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .map(str::to_string)
            .unwrap_or_else(|| name.clone());
        let dedupe_key = format!(
            "{}|{}",
            name.to_ascii_lowercase(),
            role.to_ascii_lowercase()
        );
        if !seen_users.insert(dedupe_key) {
            return false;
        }

        let id = user_object
            .get("id")
            .and_then(Value::as_str)
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .map(str::to_string)
            .unwrap_or_else(|| format!("target-user-{user_index}"));
        user_object.insert("id".to_string(), json!(id));
        user_object.insert("name".to_string(), json!(name));
        user_object.insert("role".to_string(), json!(role));

        let goals = user_object
            .remove("goals")
            .and_then(|value| string_array(&value))
            .unwrap_or_default();
        user_object.insert("goals".to_string(), json!(goals));

        let mut frustrations = user_object
            .remove("frustrations")
            .and_then(|value| string_array(&value))
            .unwrap_or_default();
        frustrations.extend(
            user_object
                .remove("painPoints")
                .and_then(|value| string_array(&value))
                .unwrap_or_default(),
        );
        user_object.insert("frustrations".to_string(), json!(frustrations));

        let mut assumptions = user_object
            .remove("assumptions")
            .and_then(|value| string_array(&value))
            .unwrap_or_default();
        if let Some(behaviours) = user_object
            .remove("behaviours")
            .and_then(|value| string_array(&value))
        {
            assumptions.extend(behaviours);
        }
        if let Some(behaviors) = user_object
            .remove("behaviors")
            .and_then(|value| string_array(&value))
        {
            assumptions.extend(behaviors);
        }
        if let Some(quote) = user_object
            .remove("quote")
            .and_then(|value| string_value(&value))
        {
            if !quote.is_empty() {
                assumptions.push(format!("Quote: {quote}"));
            }
        }
        user_object.insert("assumptions".to_string(), json!(assumptions));

        let mut context = user_object
            .get("context")
            .and_then(|value| string_value(value))
            .unwrap_or_default();
        if let Some(company) = user_object
            .remove("company")
            .and_then(|value| string_value(&value))
        {
            if !company.is_empty() {
                let company_line = format!("Company: {company}");
                context = if context.is_empty() {
                    company_line
                } else {
                    format!("{context} {company_line}")
                };
            }
        }
        if !context.is_empty() {
            user_object.insert("context".to_string(), json!(context));
        } else {
            user_object.remove("context");
        }

        let relevance = user_object
            .get("relevance")
            .and_then(|value| string_value(value));
        if let Some(relevance) = relevance.filter(|value| !value.is_empty()) {
            user_object.insert("relevance".to_string(), json!(relevance));
        } else {
            user_object.remove("relevance");
        }
        true
    });
}

fn normalize_opportunities(object: &mut Map<String, Value>) {
    let Some(opportunities) = object
        .get_mut("opportunities")
        .and_then(Value::as_array_mut)
    else {
        object.insert("opportunities".to_string(), json!([]));
        return;
    };

    let mut index = 0;
    opportunities.retain_mut(|opportunity| {
        let opportunity_index = index;
        index += 1;
        let Some(opportunity_object) = opportunity.as_object_mut() else {
            return false;
        };

        let id = opportunity_object
            .get("id")
            .and_then(Value::as_str)
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .map(str::to_string)
            .unwrap_or_else(|| format!("opportunity-{opportunity_index}"));
        opportunity_object.insert("id".to_string(), json!(id));

        let Some(description) = opportunity_object
            .get("description")
            .and_then(|value| string_value(value))
            .filter(|value| !value.is_empty())
            .or_else(|| {
                opportunity_object
                    .get("title")
                    .and_then(|value| string_value(value))
            })
        else {
            return false;
        };
        opportunity_object.insert("description".to_string(), json!(description));

        let title = opportunity_object
            .get("title")
            .and_then(|value| string_value(value))
            .filter(|value| !value.is_empty());
        if let Some(title) = title {
            opportunity_object.insert("title".to_string(), json!(title));
        } else {
            opportunity_object.remove("title");
        }

        opportunity_object.remove("priority");
        opportunity_object.remove("category");

        let source_section = opportunity_object
            .get("sourceSection")
            .and_then(Value::as_str)
            .map(str::trim)
            .filter(|value| !value.is_empty());
        if let Some(source_section) = source_section {
            opportunity_object.insert("sourceSection".to_string(), json!(source_section));
        } else {
            opportunity_object.remove("sourceSection");
        }
        true
    });
}

fn normalize_open_questions(object: &mut Map<String, Value>) {
    let questions = match object.remove("openQuestions") {
        Some(Value::Array(items)) => items
            .into_iter()
            .filter_map(|item| match item {
                Value::String(text) => string_value(&Value::String(text)),
                Value::Object(map) => map
                    .get("question")
                    .and_then(Value::as_str)
                    .map(str::trim)
                    .filter(|value| !value.is_empty())
                    .map(str::to_string),
                _ => None,
            })
            .collect::<Vec<_>>(),
        Some(Value::String(text)) => string_value(&Value::String(text)).into_iter().collect(),
        _ => vec![],
    };

    object.insert(
        "openQuestions".to_string(),
        Value::Array(questions.into_iter().map(Value::String).collect()),
    );
}

fn normalize_source_references(object: &mut Map<String, Value>) {
    let Some(references) = object
        .get_mut("sourceReferences")
        .and_then(Value::as_array_mut)
    else {
        object.insert("sourceReferences".to_string(), json!([]));
        return;
    };

    for (index, reference) in references.iter_mut().enumerate() {
        let Some(reference_object) = reference.as_object_mut() else {
            continue;
        };

        let id = reference_object
            .get("id")
            .and_then(Value::as_str)
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .map(str::to_string)
            .unwrap_or_else(|| format!("source-{index}"));
        reference_object.insert("id".to_string(), json!(id));

        let label = reference_object
            .get("label")
            .and_then(Value::as_str)
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .unwrap_or("Source");
        reference_object.insert("label".to_string(), json!(label));

        let provider = reference_object
            .get("provider")
            .and_then(Value::as_str)
            .map(normalize_source_provider)
            .unwrap_or("website");
        reference_object.insert("provider".to_string(), json!(provider));

        let url = reference_object
            .get("url")
            .and_then(Value::as_str)
            .map(str::trim)
            .filter(|value| !value.is_empty());
        if let Some(url) = url {
            reference_object.insert("url".to_string(), json!(url));
        } else {
            reference_object.remove("url");
        }

        let external_id = reference_object
            .get("externalId")
            .and_then(Value::as_str)
            .map(str::trim)
            .filter(|value| !value.is_empty());
        if let Some(external_id) = external_id {
            reference_object.insert("externalId".to_string(), json!(external_id));
        } else {
            reference_object.remove("externalId");
        }
    }
}

fn normalize_source_provider(raw: &str) -> &'static str {
    match raw.trim().to_lowercase().as_str() {
        "refero" => "refero",
        "figma" => "figma",
        "notion" => "notion",
        "sheets" => "sheets",
        "user" => "user",
        "website" | "primary" | "competitive" | "web" => "website",
        _ => "website",
    }
}

fn normalize_competitive_analysis(object: &mut Map<String, Value>) {
    let competitive_analysis = object
        .entry("competitiveAnalysis".to_string())
        .or_insert_with(|| json!({ "competitors": [], "matrixRows": [] }));

    let Some(analysis_object) = competitive_analysis.as_object_mut() else {
        object.insert(
            "competitiveAnalysis".to_string(),
            json!({ "competitors": [], "matrixRows": [] }),
        );
        return;
    };

    if let Some(competitors) = analysis_object
        .get_mut("competitors")
        .and_then(Value::as_array_mut)
    {
        for (index, competitor) in competitors.iter_mut().enumerate() {
            let Some(competitor_object) = competitor.as_object_mut() else {
                continue;
            };

            let id = competitor_object
                .get("id")
                .and_then(Value::as_str)
                .map(str::trim)
                .filter(|value| !value.is_empty())
                .map(str::to_string)
                .or_else(|| {
                    competitor_object
                        .get("url")
                        .and_then(Value::as_str)
                        .and_then(crate::research::competitive::competitive_host)
                        .map(|host| format!("competitor-{}", host.replace('.', "-")))
                })
                .unwrap_or_else(|| format!("competitor-{index}"));
            competitor_object.insert("id".to_string(), json!(id));

            let name = competitor_object
                .get("name")
                .and_then(Value::as_str)
                .map(str::trim)
                .filter(|value| !value.is_empty())
                .unwrap_or("Competitor");
            competitor_object.insert("name".to_string(), json!(name));

            competitor_object.insert(
                "strengths".to_string(),
                json!(cap_string_array(
                    competitor_object
                        .get("strengths")
                        .and_then(|value| string_array(value))
                        .unwrap_or_default(),
                    5,
                )),
            );
            competitor_object.insert(
                "weaknesses".to_string(),
                json!(cap_string_array(
                    competitor_object
                        .get("weaknesses")
                        .and_then(|value| string_array(value))
                        .unwrap_or_default(),
                    5,
                )),
            );
            competitor_object.insert(
                "sourceReferenceIds".to_string(),
                json!(
                    competitor_object
                        .get("sourceReferenceIds")
                        .and_then(|value| string_array(value))
                        .unwrap_or_default()
                ),
            );
        }
    } else {
        analysis_object.insert("competitors".to_string(), json!([]));
    }

    if let Some(matrix_rows) = analysis_object
        .get_mut("matrixRows")
        .and_then(Value::as_array_mut)
    {
        let mut index = 0;
        matrix_rows.retain_mut(|row| {
            let valid = normalize_matrix_row(row, index);
            index += 1;
            valid
        });
    } else {
        analysis_object.insert("matrixRows".to_string(), json!([]));
    }
}

fn normalize_matrix_row(row: &mut Value, index: usize) -> bool {
    let Some(row_object) = row.as_object_mut() else {
        return false;
    };

    let label = row_object
        .get("label")
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_string)
        .or_else(|| {
            row_object
                .get("dimension")
                .and_then(Value::as_str)
                .map(str::trim)
                .filter(|value| !value.is_empty())
                .map(str::to_string)
        })
        .or_else(|| {
            row_object
                .get("description")
                .and_then(Value::as_str)
                .map(str::trim)
                .filter(|value| !value.is_empty())
                .map(str::to_string)
        })
        .filter(|value| !is_generic_matrix_label(value));
    let Some(label) = label else {
        return false;
    };

    let id = row_object
        .get("id")
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_string)
        .unwrap_or_else(|| slugify_id(&label, "matrix", index));

    row_object.insert("id".to_string(), json!(id));
    row_object.insert("label".to_string(), json!(label));
    row_object.remove("dimension");
    row_object.remove("description");

    let Some(cells) = row_object.get_mut("cells").and_then(Value::as_array_mut) else {
        return false;
    };

    cells.retain_mut(|cell| {
        let Some(cell_object) = cell.as_object_mut() else {
            return false;
        };

        let Some(competitor_id) = cell_object
            .get("competitorId")
            .or_else(|| cell_object.get("competitor_id"))
            .and_then(Value::as_str)
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .map(str::to_string)
        else {
            return false;
        };
        cell_object.insert("competitorId".to_string(), json!(competitor_id));
        cell_object.remove("competitor_id");

        let Some(raw_score) = cell_object
            .get("score")
            .or_else(|| cell_object.get("rating"))
            .and_then(Value::as_str)
        else {
            return false;
        };
        let Some(score) = normalize_matrix_score_label(raw_score) else {
            return false;
        };
        cell_object.insert("score".to_string(), json!(score));
        cell_object.remove("rating");
        cell_object.remove("note");
        cell_object.remove("notes");
        true
    });

    !cells.is_empty()
}

fn cap_string_array(items: Vec<String>, max_items: usize) -> Vec<String> {
    items
        .into_iter()
        .map(|item| item.trim().to_string())
        .filter(|item| !item.is_empty())
        .take(max_items)
        .collect()
}

fn is_generic_matrix_label(label: &str) -> bool {
    let normalized = label.trim().to_ascii_lowercase();
    normalized == "dimension"
        || normalized
            .strip_prefix("dimension ")
            .is_some_and(|suffix| suffix.parse::<usize>().is_ok())
}

pub fn normalize_matrix_score_label(score: &str) -> Option<&'static str> {
    match score.trim().to_lowercase().as_str() {
        "strong" | "stronger" => Some("Strong"),
        "ok" | "moderate" | "medium" | "average" => Some("OK"),
        "weak" | "low" | "poor" => Some("Weak"),
        _ => None,
    }
}

fn ensure_array_field(object: &mut Map<String, Value>, key: &str) {
    if !object.get(key).is_some_and(Value::is_array) {
        object.insert(key.to_string(), json!([]));
    }
}

fn slugify_id(label: &str, prefix: &str, index: usize) -> String {
    let slug: String = label
        .to_lowercase()
        .chars()
        .map(|character| {
            if character.is_ascii_alphanumeric() {
                character
            } else {
                '-'
            }
        })
        .collect();
    let slug = slug
        .split('-')
        .filter(|segment| !segment.is_empty())
        .collect::<Vec<_>>()
        .join("-");
    if slug.is_empty() {
        format!("{prefix}-{index}")
    } else {
        format!("{prefix}-{slug}")
    }
}

fn label_from_key(key: &str) -> String {
    let spaced = key
        .replace('_', " ")
        .chars()
        .enumerate()
        .map(|(index, character)| {
            if index > 0 && character.is_uppercase() {
                format!(" {character}")
            } else {
                character.to_string()
            }
        })
        .collect::<String>();
    let mut chars = spaced.trim().chars();
    match chars.next() {
        None => key.to_string(),
        Some(first) => first.to_uppercase().collect::<String>() + chars.as_str(),
    }
}

fn string_value(value: &Value) -> Option<String> {
    match value {
        Value::String(text) => {
            let trimmed = text.trim().to_string();
            (!trimmed.is_empty()).then_some(trimmed)
        }
        Value::Number(number) => Some(number.to_string()),
        Value::Bool(boolean) => Some(boolean.to_string()),
        _ => None,
    }
}

fn string_array(value: &Value) -> Option<Vec<String>> {
    match value {
        Value::Array(items) => Some(
            items
                .iter()
                .filter_map(|item| string_value(item))
                .filter(|item| !item.is_empty())
                .collect(),
        ),
        Value::String(text) => {
            let trimmed = text.trim();
            (!trimmed.is_empty()).then(|| vec![trimmed.to_string()])
        }
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::research::ResearchInput;
    use serde_json::json;

    fn sample_input() -> ResearchInput {
        ResearchInput {
            project_id: "project_123".to_string(),
            project_name: "Shopify".to_string(),
            client_name: Some("Lumen Apps".to_string()),
            industry: "E-commerce".to_string(),
            website: Some("https://www.shopify.com".to_string()),
            project_brief: Some("Brief".to_string()),
            competitor_urls: vec!["https://www.amazon.com".to_string()],
            target_users: None,
            additional_notes: None,
            uploaded_asset_ids: vec![],
        }
    }

    #[test]
    fn normalizes_claude_shaped_summary_and_company_snapshot() {
        let mut object = json!({
            "summary": {
                "headline": "B2B Wholesale UX",
                "body": "Key findings for European mid-market retailers."
            },
            "companySnapshot": {
                "name": "Shopify",
                "website": "https://www.shopify.com",
                "industry": "E-commerce",
                "keyStrengths": ["Large ecosystem", "B2B accounts"],
                "keyWeaknesses": ["Plus gate"]
            }
        })
        .as_object()
        .unwrap()
        .clone();

        normalize_research_artifact_fields(&mut object, &sample_input());

        assert_eq!(object["title"], "B2B Wholesale UX");
        assert_eq!(object["summary"][0], "B2B Wholesale UX");
        assert_eq!(
            object["summary"][1],
            "Key findings for European mid-market retailers."
        );
        assert!(
            object["companySnapshot"]
                .as_array()
                .unwrap()
                .iter()
                .any(|row| row["label"] == "Company" && row["value"] == "Shopify")
        );
        let labels = object["companySnapshot"]
            .as_array()
            .unwrap()
            .iter()
            .map(|row| row["label"].as_str().unwrap())
            .collect::<Vec<_>>();
        assert_eq!(labels[0], "Company");
        assert_eq!(labels[1], "Industry");
        assert_eq!(labels[2], "Website");
    }

    #[test]
    fn normalizes_claude_shaped_matrix_rows() {
        let mut object = json!({
            "competitiveAnalysis": {
                "competitors": [{ "id": "amazon", "name": "Amazon", "url": "https://www.amazon.com" }],
                "matrixRows": [{
                    "dimension": "Mobile checkout",
                    "cells": [{ "competitorId": "amazon", "rating": "strong", "notes": "Best in class: https://amazon.com" }]
                }]
            }
        })
        .as_object()
        .unwrap()
        .clone();

        normalize_research_artifact_fields(&mut object, &sample_input());

        let row = &object["competitiveAnalysis"]["matrixRows"][0];
        assert_eq!(row["label"], "Mobile checkout");
        assert_eq!(row["cells"][0]["score"], "Strong");
        assert!(row["cells"][0].get("note").is_none());
    }

    #[test]
    fn drops_generic_matrix_dimensions_instead_of_saving_placeholders() {
        let mut object = json!({
            "competitiveAnalysis": {
                "competitors": [{ "id": "amazon", "name": "Amazon", "url": "https://www.amazon.com" }],
                "matrixRows": [{
                    "label": "Dimension 1",
                    "cells": [{ "competitorId": "amazon", "score": "OK" }]
                }]
            }
        })
        .as_object()
        .unwrap()
        .clone();

        normalize_research_artifact_fields(&mut object, &sample_input());

        assert!(
            object["competitiveAnalysis"]["matrixRows"]
                .as_array()
                .unwrap()
                .is_empty()
        );
    }

    #[test]
    fn keeps_matrix_cells_with_score_and_no_note() {
        let mut object = json!({
            "competitiveAnalysis": {
                "competitors": [{ "id": "amazon", "name": "Amazon", "url": "https://www.amazon.com" }],
                "matrixRows": [{
                    "label": "Pricing clarity",
                    "cells": [{ "competitorId": "amazon", "score": "OK" }]
                }]
            }
        })
        .as_object()
        .unwrap()
        .clone();

        normalize_research_artifact_fields(&mut object, &sample_input());

        let rows = object["competitiveAnalysis"]["matrixRows"]
            .as_array()
            .unwrap();
        assert_eq!(rows.len(), 1);
        assert_eq!(rows[0]["cells"][0]["score"], "OK");
    }

    #[test]
    fn strips_matrix_notes_and_keeps_score_only() {
        let mut object = json!({
            "competitiveAnalysis": {
                "competitors": [{ "id": "amazon", "name": "Amazon", "url": "https://www.amazon.com" }],
                "matrixRows": [{
                    "label": "Navigation",
                    "cells": [{
                        "competitorId": "amazon",
                        "score": "Strong",
                        "note": "Multi-level dropdowns with dedicated B2B pathways"
                    }]
                }]
            }
        })
        .as_object()
        .unwrap()
        .clone();

        normalize_research_artifact_fields(&mut object, &sample_input());

        let cell = &object["competitiveAnalysis"]["matrixRows"][0]["cells"][0];
        assert_eq!(cell["score"], "Strong");
        assert!(cell.get("note").is_none());
    }

    #[test]
    fn drops_matrix_rows_with_missing_scores_instead_of_defaulting_to_ok() {
        let mut object = json!({
            "competitiveAnalysis": {
                "competitors": [{ "id": "amazon", "name": "Amazon", "url": "https://www.amazon.com" }],
                "matrixRows": [{
                    "label": "Pricing clarity",
                    "cells": [{ "competitorId": "amazon", "note": "Pricing is visible" }]
                }]
            }
        })
        .as_object()
        .unwrap()
        .clone();

        normalize_research_artifact_fields(&mut object, &sample_input());

        assert!(
            object["competitiveAnalysis"]["matrixRows"]
                .as_array()
                .unwrap()
                .is_empty()
        );
    }

    #[test]
    fn normalizes_target_users_and_open_questions() {
        let mut object = json!({
            "targetUsers": [{
                "id": "persona-1",
                "name": "Elena",
                "role": "Wholesale Manager",
                "goals": ["Approve accounts"],
                "painPoints": ["Slow onboarding"],
                "behaviours": ["Uses mobile"],
                "quote": "I need my price visible"
            }],
            "openQuestions": [
                { "id": "oq-1", "question": "Which EU markets?", "priority": "high" }
            ]
        })
        .as_object()
        .unwrap()
        .clone();

        normalize_research_artifact_fields(&mut object, &sample_input());

        assert_eq!(
            object["targetUsers"][0]["frustrations"][0],
            "Slow onboarding"
        );
        assert!(
            object["targetUsers"][0]["assumptions"]
                .as_array()
                .unwrap()
                .iter()
                .any(|value| value.as_str().unwrap().contains("Uses mobile"))
        );
        assert_eq!(object["openQuestions"][0], "Which EU markets?");
    }

    #[test]
    fn preserves_target_users_without_role() {
        let mut object = json!({
            "targetUsers": [{
                "id": "retail-ops-manager",
                "name": "Retail Operations Manager",
                "context": "Manages wholesale buyers, approvals, catalogs, and repeat orders.",
                "goals": ["Approve qualified buyers without manual back-and-forth."],
                "frustrations": ["Approval status is scattered across email and spreadsheets."]
            }]
        })
        .as_object()
        .unwrap()
        .clone();

        normalize_research_artifact_fields(&mut object, &sample_input());

        assert_eq!(
            object["targetUsers"][0]["name"],
            "Retail Operations Manager"
        );
        assert_eq!(
            object["targetUsers"][0]["role"],
            "Retail Operations Manager"
        );
    }

    #[test]
    fn preserves_codex_shaped_artifact() {
        let mut object = json!({
            "title": "Shopify B2B Wholesale Research",
            "summary": ["Line one", "Line two"],
            "companySnapshot": [{ "label": "Company", "value": "Shopify" }],
            "competitiveAnalysis": {
                "competitors": [{ "id": "competitor-amazon", "name": "Amazon", "url": "https://www.amazon.com" }],
                "matrixRows": [{
                    "id": "matrix-onboarding",
                    "label": "B2B onboarding clarity",
                    "cells": [{ "competitorId": "competitor-amazon", "score": "OK", "note": "Clear flow: https://amazon.com" }]
                }]
            },
            "targetUsers": [{
                "id": "target-user-1",
                "name": "Elena",
                "role": "Manager",
                "goals": ["Approve"],
                "frustrations": ["Slow"],
                "assumptions": []
            }],
            "openQuestions": ["What markets?"]
        })
        .as_object()
        .unwrap()
        .clone();

        normalize_research_artifact_fields(&mut object, &sample_input());

        assert_eq!(object["title"], "Shopify B2B Wholesale Research");
        assert_eq!(object["summary"][0], "Line one");
        assert_eq!(
            object["competitiveAnalysis"]["matrixRows"][0]["cells"][0]["score"],
            "OK"
        );
    }
}
