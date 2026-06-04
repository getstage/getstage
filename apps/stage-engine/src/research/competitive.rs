use std::collections::HashSet;

use serde_json::{Map, Value, json};

use crate::models::research::ResearchInput;

pub fn allowed_competitive_targets(input: &ResearchInput) -> Vec<String> {
    if !input.competitor_urls.is_empty() {
        return input
            .competitor_urls
            .iter()
            .map(|url| url.trim().to_string())
            .filter(|url| !url.is_empty())
            .collect();
    }

    input
        .website
        .as_deref()
        .map(str::trim)
        .filter(|website| !website.is_empty() && !website.eq_ignore_ascii_case("unknown"))
        .map(str::to_string)
        .into_iter()
        .collect()
}

pub fn format_competitive_targets_for_prompt(input: &ResearchInput) -> String {
    let targets = allowed_competitive_targets(input);
    if targets.is_empty() {
        return "None — return competitiveAnalysis with empty competitors [] and empty matrixRows []."
            .to_string();
    }

    targets
        .iter()
        .map(|url| format!("- {url}"))
        .collect::<Vec<_>>()
        .join("\n")
}

pub fn competitive_rules_for_prompt(input: &ResearchInput) -> String {
    let targets = allowed_competitive_targets(input);
    if targets.is_empty() {
        return r#"Competitive analysis rules (strict):
- Return competitiveAnalysis with empty competitors [] and empty matrixRows [].
- Do NOT invent or infer competitor companies."#
            .to_string();
    }

    let list = targets
        .iter()
        .map(|url| format!("- {url}"))
        .collect::<Vec<_>>()
        .join("\n");

    format!(
        r#"Competitive analysis rules (strict):
- competitiveAnalysis.competitors must contain exactly one card for every allowed site below (no omissions, no extras):
{list}
- Do NOT add Shopware, OroCommerce, or any other company not listed above.
- Do NOT infer competitors from industry, brief, Refero results, or general market knowledge.
- matrixRows cells must include every competitor id from that same list."#
    )
}

pub fn filter_competitive_analysis(object: &mut Map<String, Value>, input: &ResearchInput) {
    let allowed_hosts = allowed_competitive_targets(input)
        .iter()
        .filter_map(|url| competitive_host(url))
        .collect::<HashSet<_>>();

    let Some(competitive_analysis) = object.get_mut("competitiveAnalysis") else {
        return;
    };
    let Some(analysis_object) = competitive_analysis.as_object_mut() else {
        return;
    };

    if allowed_hosts.is_empty() {
        analysis_object.insert("competitors".to_string(), json!([]));
        analysis_object.insert("matrixRows".to_string(), json!([]));
        return;
    }

    let allowed_ids = {
        let Some(competitors) = analysis_object
            .get_mut("competitors")
            .and_then(Value::as_array_mut)
        else {
            return;
        };

        competitors.retain(|competitor| {
            competitor
                .get("url")
                .and_then(Value::as_str)
                .and_then(competitive_host)
                .is_some_and(|host| allowed_hosts.contains(&host))
        });

        competitors
            .iter()
            .filter_map(|competitor| competitor.get("id").and_then(Value::as_str))
            .map(str::to_string)
            .collect::<HashSet<_>>()
    };

    let Some(matrix_rows) = analysis_object
        .get_mut("matrixRows")
        .and_then(Value::as_array_mut)
    else {
        return;
    };

    for row in matrix_rows {
        let Some(row_object) = row.as_object_mut() else {
            continue;
        };
        let Some(cells) = row_object.get_mut("cells").and_then(Value::as_array_mut) else {
            continue;
        };
        cells.retain(|cell| {
            cell.get("competitorId")
                .or_else(|| cell.get("competitor_id"))
                .and_then(Value::as_str)
                .is_some_and(|id| allowed_ids.contains(id))
        });
    }

    ensure_competitive_competitors(object, input);
}

/// After filtering invented competitors, guarantee one card (and matrix cells) per allowed target URL.
pub fn ensure_competitive_competitors(object: &mut Map<String, Value>, input: &ResearchInput) {
    let targets = allowed_competitive_targets(input);
    if targets.is_empty() {
        return;
    }

    let competitive_analysis = object
        .entry("competitiveAnalysis".to_string())
        .or_insert_with(|| json!({ "competitors": [], "matrixRows": [] }));

    let Some(analysis_object) = competitive_analysis.as_object_mut() else {
        return;
    };

    let competitors = analysis_object
        .entry("competitors".to_string())
        .or_insert_with(|| json!([]));
    let Some(competitors_array) = competitors.as_array_mut() else {
        return;
    };

    for url in targets {
        let Some(host) = competitive_host(&url) else {
            continue;
        };

        let already_present = competitors_array.iter().any(|competitor| {
            competitor
                .get("url")
                .and_then(Value::as_str)
                .and_then(competitive_host)
                .is_some_and(|competitor_host| competitor_host == host)
        });

        if already_present {
            continue;
        }

        let id = competitor_id_from_host(&host);
        let name = competitor_display_name(&host);
        competitors_array.push(json!({
            "id": id,
            "name": name,
            "url": url,
            "summary": format!(
                "Include a concise competitive read for {name} based on public positioning, B2B UX patterns, and the project brief."
            ),
        }));
    }

    ensure_matrix_cells_for_competitors(analysis_object);
}

fn ensure_matrix_cells_for_competitors(analysis_object: &mut Map<String, Value>) {
    let competitor_ids: Vec<String> = analysis_object
        .get("competitors")
        .and_then(Value::as_array)
        .map(|competitors| {
            competitors
                .iter()
                .filter_map(|competitor| {
                    competitor
                        .get("id")
                        .and_then(Value::as_str)
                        .map(str::to_string)
                })
                .collect()
        })
        .unwrap_or_default();

    if competitor_ids.is_empty() {
        return;
    }

    let matrix_rows = analysis_object
        .entry("matrixRows".to_string())
        .or_insert_with(|| json!([]));
    let Some(matrix_rows) = matrix_rows.as_array_mut() else {
        return;
    };

    if matrix_rows.is_empty() {
        matrix_rows.push(json!({
            "id": "matrix-overview",
            "label": "Overall competitive fit",
            "cells": competitor_ids.iter().map(|id| json!({
                "competitorId": id,
                "score": "OK",
                "note": "Baseline comparison — refine with a fresh research run."
            })).collect::<Vec<_>>()
        }));
        return;
    }

    for row in matrix_rows {
        let Some(row_object) = row.as_object_mut() else {
            continue;
        };
        let cells = row_object
            .entry("cells".to_string())
            .or_insert_with(|| json!([]));
        let Some(cells) = cells.as_array_mut() else {
            continue;
        };

        for competitor_id in &competitor_ids {
            let has_cell = cells.iter().any(|cell| {
                cell.get("competitorId")
                    .or_else(|| cell.get("competitor_id"))
                    .and_then(Value::as_str)
                    == Some(competitor_id.as_str())
            });

            if has_cell {
                continue;
            }

            cells.push(json!({
                "competitorId": competitor_id,
                "score": "OK",
                "note": "Add qualitative scoring after reviewing this competitor's public UX and positioning."
            }));
        }
    }
}

fn competitor_id_from_host(host: &str) -> String {
    format!("competitor-{}", host.replace('.', "-"))
}

fn competitor_display_name(host: &str) -> String {
    host.split('.')
        .next()
        .filter(|segment| !segment.is_empty())
        .map(|segment| {
            let mut chars = segment.chars();
            match chars.next() {
                None => segment.to_string(),
                Some(first) => first.to_uppercase().collect::<String>() + chars.as_str(),
            }
        })
        .unwrap_or_else(|| host.to_string())
}

pub fn competitive_host(raw: &str) -> Option<String> {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return None;
    }

    let without_scheme = trimmed
        .strip_prefix("https://")
        .or_else(|| trimmed.strip_prefix("http://"))
        .unwrap_or(trimmed);
    let host = without_scheme.split('/').next()?.split(':').next()?;
    let host = host.strip_prefix("www.").unwrap_or(host).to_lowercase();
    if host.is_empty() { None } else { Some(host) }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn allowed_targets_prefers_user_competitors() {
        let input = ResearchInput {
            project_id: "p1".to_string(),
            project_name: "Test".to_string(),
            client_name: None,
            industry: "Retail".to_string(),
            website: Some("https://client.com".to_string()),
            project_brief: None,
            competitor_urls: vec!["https://competitor.com".to_string()],
            target_users: None,
            additional_notes: None,
            uploaded_asset_ids: vec![],
        };

        assert_eq!(
            allowed_competitive_targets(&input),
            vec!["https://competitor.com".to_string()]
        );
    }

    #[test]
    fn allowed_targets_falls_back_to_client_website() {
        let input = ResearchInput {
            project_id: "p1".to_string(),
            project_name: "Test".to_string(),
            client_name: None,
            industry: "Retail".to_string(),
            website: Some("https://shopify.com".to_string()),
            project_brief: None,
            competitor_urls: vec![],
            target_users: None,
            additional_notes: None,
            uploaded_asset_ids: vec![],
        };

        assert_eq!(
            allowed_competitive_targets(&input),
            vec!["https://shopify.com".to_string()]
        );
    }

    #[test]
    fn filter_drops_invented_competitors() {
        let mut object = Map::from_iter([(
            "competitiveAnalysis".to_string(),
            json!({
                "competitors": [
                    {
                        "id": "shopify",
                        "name": "Shopify",
                        "url": "https://shopify.com"
                    },
                    {
                        "id": "shopware",
                        "name": "Shopware",
                        "url": "https://shopware.com"
                    }
                ],
                "matrixRows": [{
                    "id": "pricing",
                    "label": "Pricing",
                    "cells": [
                        { "competitorId": "shopify", "score": "Strong" },
                        { "competitorId": "shopware", "score": "OK" }
                    ]
                }]
            }),
        )]);

        let input = ResearchInput {
            project_id: "p1".to_string(),
            project_name: "Test".to_string(),
            client_name: None,
            industry: "Retail".to_string(),
            website: Some("https://shopify.com".to_string()),
            project_brief: None,
            competitor_urls: vec![],
            target_users: None,
            additional_notes: None,
            uploaded_asset_ids: vec![],
        };

        filter_competitive_analysis(&mut object, &input);

        let analysis = &object["competitiveAnalysis"];
        assert_eq!(analysis["competitors"].as_array().unwrap().len(), 1);
        assert_eq!(
            analysis["competitors"][0]["id"].as_str().unwrap(),
            "shopify"
        );
        assert_eq!(
            analysis["matrixRows"][0]["cells"].as_array().unwrap().len(),
            1
        );
    }

    #[test]
    fn ensure_adds_missing_user_competitors_after_filter() {
        let mut object = Map::from_iter([(
            "competitiveAnalysis".to_string(),
            json!({
                "competitors": [{
                    "id": "competitor-shopify-com",
                    "name": "Shopify",
                    "url": "https://shopify.com"
                }],
                "matrixRows": [{
                    "id": "pricing",
                    "label": "Pricing",
                    "cells": [{ "competitorId": "competitor-shopify-com", "score": "Strong" }]
                }]
            }),
        )]);

        let input = ResearchInput {
            project_id: "p1".to_string(),
            project_name: "Test".to_string(),
            client_name: None,
            industry: "Retail".to_string(),
            website: Some("https://shopify.com".to_string()),
            project_brief: None,
            competitor_urls: vec![
                "https://amazon.com".to_string(),
                "https://www.amazon.com".to_string(),
            ],
            target_users: None,
            additional_notes: None,
            uploaded_asset_ids: vec![],
        };

        filter_competitive_analysis(&mut object, &input);

        let competitors = object["competitiveAnalysis"]["competitors"]
            .as_array()
            .unwrap();
        assert_eq!(competitors.len(), 1);
        assert_eq!(competitors[0]["name"], "Amazon");
    }
}
