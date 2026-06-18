use std::collections::HashSet;

use serde_json::{Map, Value, json};

use crate::models::research::ResearchInput;
use crate::research::normalize::normalize_matrix_score_label;

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
        r#"Competitive analysis rules (strict — UI/design output for designers, not business essays):
- competitiveAnalysis.competitors must contain exactly one card for every allowed site below (no omissions, no extras):
{list}
- Do NOT add Shopware, OroCommerce, or any other company not listed above.
- Do NOT infer competitors from industry, brief, Refero results, or general market knowledge.
- These sites are COMPETITORS to benchmark. The client product you are designing is "{client_name}" / project "{project_name}" — never treat a competitor card as the client.
- Card view (competitors[]): short UI positioning only:
  - positioning + summary: max 12 words each (one line).
  - strengths[] + weaknesses[]: 3–5 items each, one short sentence per bullet (UI patterns/components). Do not truncate mid-sentence.
  - Never write pricing tiers, VAT, plan names, or feature lists in card bullets.
- Matrix view (matrixRows[]): compare UI/UX only across these 7 rows (use these exact labels):
  1. Navigation
  2. Onboarding
  3. Visual Style
  4. Content Hierarchy
  5. Mobile Experience
  6. Dashboard Layout
  7. Data Visualization
- Every matrix cell: competitorId + score ("Strong" | "OK" | "Weak") only. Do not include note text.
- Never write paragraphs, URLs, or business strategy in matrix cells."#,
        client_name = input.client_name.as_deref().unwrap_or("the client"),
        project_name = input.project_name,
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
        }));
    }
}

pub struct CompetitiveRepairReport {
    pub unsupported_cells_removed: usize,
}

/// Remove unsupported matrix cells without fabricating replacement content.
pub fn repair_competitive_analysis(
    object: &mut Map<String, Value>,
    input: &ResearchInput,
) -> CompetitiveRepairReport {
    let mut report = CompetitiveRepairReport {
        unsupported_cells_removed: 0,
    };

    let allowed_hosts = allowed_competitive_targets(input)
        .iter()
        .filter_map(|url| competitive_host(url))
        .collect::<HashSet<_>>();

    if let Some(sources) = object
        .get_mut("sourceReferences")
        .and_then(Value::as_array_mut)
    {
        sources.retain(|source| {
            if source.get("provider").and_then(Value::as_str) != Some("website") {
                return true;
            }
            source
                .get("url")
                .and_then(Value::as_str)
                .and_then(competitive_host)
                .is_some_and(|host| allowed_hosts.contains(&host))
        });
    }

    let valid_source_ids = object
        .get("sourceReferences")
        .and_then(Value::as_array)
        .map(|sources| {
            sources
                .iter()
                .filter_map(|source| source.get("id").and_then(Value::as_str))
                .map(str::to_string)
                .collect::<HashSet<_>>()
        })
        .unwrap_or_default();

    let Some(analysis) = object
        .get_mut("competitiveAnalysis")
        .and_then(Value::as_object_mut)
    else {
        return report;
    };

    if let Some(competitors) = analysis
        .get_mut("competitors")
        .and_then(Value::as_array_mut)
    {
        for competitor in competitors {
            let Some(competitor) = competitor.as_object_mut() else {
                continue;
            };
            let source_ids = competitor
                .entry("sourceReferenceIds".to_string())
                .or_insert_with(|| json!([]));
            if let Some(source_ids) = source_ids.as_array_mut() {
                source_ids.retain(|id| id.as_str().is_some_and(|id| valid_source_ids.contains(id)));
            }
        }
    }

    let allowed_ids = analysis
        .get("competitors")
        .and_then(Value::as_array)
        .map(|competitors| {
            competitors
                .iter()
                .filter_map(|competitor| competitor.get("id").and_then(Value::as_str))
                .map(str::to_string)
                .collect::<HashSet<_>>()
        })
        .unwrap_or_default();

    let Some(matrix_rows) = analysis.get_mut("matrixRows").and_then(Value::as_array_mut) else {
        return report;
    };

    for row in matrix_rows {
        let Some(row_object) = row.as_object_mut() else {
            continue;
        };
        let Some(cells) = row_object.get_mut("cells").and_then(Value::as_array_mut) else {
            continue;
        };
        let before = cells.len();
        cells.retain(|cell| {
            let competitor_id = cell
                .get("competitorId")
                .or_else(|| cell.get("competitor_id"))
                .and_then(Value::as_str);
            let score = cell
                .get("score")
                .or_else(|| cell.get("rating"))
                .and_then(Value::as_str);
            match (competitor_id, score) {
                (Some(id), Some(raw_score))
                    if allowed_ids.contains(id)
                        && normalize_matrix_score_label(raw_score).is_some() =>
                {
                    true
                }
                _ => false,
            }
        });
        report.unsupported_cells_removed += before.saturating_sub(cells.len());
    }

    report
}

pub fn append_competitive_quality_warnings(
    object: &mut Map<String, Value>,
    report: &CompetitiveRepairReport,
) {
    if report.unsupported_cells_removed == 0 {
        return;
    }

    let warnings = object
        .entry("openQuestions".to_string())
        .or_insert_with(|| json!([]));
    let Some(questions) = warnings.as_array_mut() else {
        return;
    };

    questions.push(Value::String(format!(
        "Competitive matrix: {} comparison cell(s) were omitted because they had no valid Strong/OK/Weak score.",
        report.unsupported_cells_removed
    )));
}

pub fn validate_competitive_analysis(
    object: &Map<String, Value>,
    input: &ResearchInput,
) -> anyhow::Result<()> {
    let required_targets = allowed_competitive_targets(input);
    if required_targets.is_empty() {
        return Ok(());
    }

    let analysis = object
        .get("competitiveAnalysis")
        .and_then(Value::as_object)
        .ok_or_else(|| anyhow::anyhow!("competitiveAnalysis was missing or invalid"))?;
    let competitor_ids = analysis
        .get("competitors")
        .and_then(Value::as_array)
        .map(|competitors| {
            competitors
                .iter()
                .filter_map(|competitor| competitor.get("id").and_then(Value::as_str))
                .collect::<HashSet<_>>()
        })
        .unwrap_or_default();
    if competitor_ids.is_empty() {
        anyhow::bail!("competitiveAnalysis contained no valid competitors");
    }

    Ok(())
}

/// Drop positioning/summary/strengths/weaknesses for competitors with no source IDs.
/// Only safe to call after a repair-style prompt that explicitly requires every claim
/// to reference a returned sourceReference id. NEVER call this on a main-run artifact —
/// the main prompt does not enforce source grounding, so empty sourceReferenceIds is
/// expected, not a signal that the content is fabricated.
pub fn drop_unsourced_competitor_content(object: &mut Map<String, Value>) {
    let Some(analysis) = object
        .get_mut("competitiveAnalysis")
        .and_then(Value::as_object_mut)
    else {
        return;
    };
    let Some(competitors) = analysis
        .get_mut("competitors")
        .and_then(Value::as_array_mut)
    else {
        return;
    };
    for competitor in competitors {
        let Some(competitor) = competitor.as_object_mut() else {
            continue;
        };
        let has_sources = competitor
            .get("sourceReferenceIds")
            .and_then(Value::as_array)
            .map(|ids| !ids.is_empty())
            .unwrap_or(false);
        if has_sources {
            continue;
        }
        for key in ["positioning", "summary"] {
            competitor.remove(key);
        }
        competitor.insert("strengths".to_string(), json!([]));
        competitor.insert("weaknesses".to_string(), json!([]));
    }
}

pub fn competitive_analysis_needs_repair(object: &Map<String, Value>) -> bool {
    let Some(analysis) = object.get("competitiveAnalysis").and_then(Value::as_object) else {
        return true;
    };
    let competitor_ids = analysis
        .get("competitors")
        .and_then(Value::as_array)
        .map(|competitors| {
            competitors
                .iter()
                .filter_map(|competitor| competitor.get("id").and_then(Value::as_str))
                .collect::<HashSet<_>>()
        })
        .unwrap_or_default();
    if competitor_ids.is_empty() {
        return false;
    }

    let Some(rows) = analysis.get("matrixRows").and_then(Value::as_array) else {
        return true;
    };
    if rows.is_empty() {
        return true;
    }

    rows.iter().any(|row| {
        let cell_ids = row
            .get("cells")
            .and_then(Value::as_array)
            .map(|cells| {
                cells
                    .iter()
                    .filter_map(|cell| cell.get("competitorId").and_then(Value::as_str))
                    .collect::<HashSet<_>>()
            })
            .unwrap_or_default();
        cell_ids != competitor_ids
    })
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

    #[test]
    fn repair_keeps_score_cells_without_url_notes() {
        let mut object = Map::from_iter([(
            "competitiveAnalysis".to_string(),
            json!({
                "competitors": [
                    {
                        "id": "competitor-squarespace-com",
                        "name": "Squarespace",
                        "url": "https://www.squarespace.com",
                        "positioning": "Premium template-driven site builder."
                    },
                    {
                        "id": "competitor-amazon-com",
                        "name": "Amazon",
                        "url": "https://www.amazon.com",
                        "positioning": "Marketplace giant with self-serve seller tools."
                    }
                ],
                "matrixRows": [{
                    "id": "onboarding",
                    "label": "Progressive disclosure in onboarding",
                    "cells": [{
                        "competitorId": "competitor-amazon-com",
                        "score": "Strong",
                        "note": "Amazon surfaces account setup in clear steps."
                    }]
                }]
            }),
        )]);
        let input = ResearchInput {
            project_id: "p1".to_string(),
            project_name: "Test".to_string(),
            client_name: None,
            industry: "Retail".to_string(),
            website: Some("https://client.com".to_string()),
            project_brief: None,
            competitor_urls: vec![
                "https://www.squarespace.com".to_string(),
                "https://www.amazon.com".to_string(),
            ],
            target_users: None,
            additional_notes: None,
            uploaded_asset_ids: vec![],
        };

        let report = repair_competitive_analysis(&mut object, &input);

        assert_eq!(report.unsupported_cells_removed, 0);
        let cells = object["competitiveAnalysis"]["matrixRows"][0]["cells"]
            .as_array()
            .unwrap();
        assert_eq!(cells.len(), 1);
        assert_eq!(cells[0]["score"], "Strong");
        validate_competitive_analysis(&object, &input).unwrap();
    }

    #[test]
    fn repair_keeps_score_only_cells() {
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
                    "label": "Pricing clarity",
                    "cells": [{ "competitorId": "competitor-shopify-com", "score": "OK" }]
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

        let report = repair_competitive_analysis(&mut object, &input);

        assert_eq!(report.unsupported_cells_removed, 0);
        let cells = object["competitiveAnalysis"]["matrixRows"][0]["cells"]
            .as_array()
            .unwrap();
        assert_eq!(cells.len(), 1);
        assert_eq!(cells[0]["score"], "OK");
    }

    #[test]
    fn validation_accepts_complete_evidence_based_matrix() {
        let object = Map::from_iter([(
            "competitiveAnalysis".to_string(),
            json!({
                "competitors": [{
                    "id": "competitor-shopify-com",
                    "name": "Shopify",
                    "url": "https://shopify.com",
                    "positioning": "Commerce platform for independent merchants.",
                    "strengths": ["Mature payments stack"],
                    "weaknesses": ["Theme system feels dated"]
                }],
                "matrixRows": [{
                    "id": "pricing",
                    "label": "Pricing clarity",
                    "cells": [{
                        "competitorId": "competitor-shopify-com",
                        "score": "Strong",
                        "note": "Pricing tiers and feature limits are visible before signup."
                    }]
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

        validate_competitive_analysis(&object, &input).unwrap();
        assert!(!competitive_analysis_needs_repair(&object));
    }

    #[test]
    fn main_run_keeps_competitor_content_without_source_ids() {
        // Regression: the main research prompt never instructs the LLM to populate
        // `sourceReferenceIds`, so empty source IDs are expected. The main path
        // (`repair_competitive_analysis`) must NOT wipe competitor content based on
        // that absence — only the explicit repair pass does that, via
        // `drop_unsourced_competitor_content`.
        let mut object = Map::from_iter([(
            "competitiveAnalysis".to_string(),
            json!({
                "competitors": [{
                    "id": "competitor-shopify-com",
                    "name": "Shopify",
                    "url": "https://shopify.com",
                    "positioning": "Commerce platform for independent merchants.",
                    "strengths": ["Mature payments stack"],
                    "weaknesses": ["Theme system feels dated"]
                }],
                "matrixRows": [{
                    "id": "pricing",
                    "label": "Pricing clarity",
                    "cells": [{ "competitorId": "competitor-shopify-com", "score": "OK" }]
                }],
                "sourceReferences": []
            }),
        )]);
        let input = ResearchInput {
            project_id: "p1".to_string(),
            project_name: "Test".to_string(),
            client_name: None,
            industry: "Retail".to_string(),
            website: Some("https://shopify.com".to_string()),
            project_brief: None,
            competitor_urls: vec!["https://shopify.com".to_string()],
            target_users: None,
            additional_notes: None,
            uploaded_asset_ids: vec![],
        };

        repair_competitive_analysis(&mut object, &input);

        let competitor = &object["competitiveAnalysis"]["competitors"][0];
        assert_eq!(
            competitor["positioning"], "Commerce platform for independent merchants.",
            "positioning was wiped on main-run path",
        );
        assert_eq!(
            competitor["strengths"].as_array().unwrap().len(),
            1,
            "strengths were reset on main-run path",
        );
        assert_eq!(
            competitor["weaknesses"].as_array().unwrap().len(),
            1,
            "weaknesses were reset on main-run path",
        );
        validate_competitive_analysis(&object, &input).unwrap();
    }

    #[test]
    fn repair_path_drops_unsourced_competitor_content() {
        // The repair prompt explicitly requires every claim to reference a source id.
        // `drop_unsourced_competitor_content` enforces that — competitors without any
        // sourceReferenceIds get their content cleared so it can be regenerated.
        let mut object = Map::from_iter([(
            "competitiveAnalysis".to_string(),
            json!({
                "competitors": [{
                    "id": "competitor-shopify-com",
                    "name": "Shopify",
                    "positioning": "Hallucinated claim.",
                    "strengths": ["Unsupported strength"],
                    "weaknesses": ["Unsupported weakness"],
                    "sourceReferenceIds": []
                }]
            }),
        )]);

        drop_unsourced_competitor_content(&mut object);

        let competitor = &object["competitiveAnalysis"]["competitors"][0];
        assert!(competitor.get("positioning").is_none());
        assert_eq!(competitor["strengths"].as_array().unwrap().len(), 0);
        assert_eq!(competitor["weaknesses"].as_array().unwrap().len(), 0);
    }
}
