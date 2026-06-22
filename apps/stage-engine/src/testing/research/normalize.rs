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
fn maps_competitor_website_to_url_so_filtering_keeps_strengths() {
    let mut object = json!({
        "competitiveAnalysis": {
            "competitors": [{
                "id": "amazon",
                "name": "Amazon",
                "website": "https://www.amazon.com",
                "strengths": ["Centered cards keep tasks focused"],
                "weaknesses": ["Auth screens feel emotionally flat"]
            }],
            "matrixRows": []
        }
    })
    .as_object()
    .unwrap()
    .clone();

    normalize_research_artifact_fields(&mut object, &sample_input());

    let competitor = &object["competitiveAnalysis"]["competitors"][0];
    assert_eq!(competitor["url"], "https://www.amazon.com");
    assert_eq!(competitor["strengths"].as_array().unwrap().len(), 1);
    assert_eq!(competitor["weaknesses"].as_array().unwrap().len(), 1);
}

#[test]
fn maps_competitor_website_url_to_url_so_filtering_keeps_strengths() {
    let mut object = json!({
        "competitiveAnalysis": {
            "competitors": [{
                "id": "squarespace",
                "name": "Squarespace",
                "websiteUrl": "https://www.squarespace.com",
                "strengths": ["Landing pages use strong hierarchy"],
                "weaknesses": ["Dashboard patterns are not prominent"]
            }],
            "matrixRows": []
        }
    })
    .as_object()
    .unwrap()
    .clone();

    normalize_research_artifact_fields(&mut object, &sample_input());

    let competitor = &object["competitiveAnalysis"]["competitors"][0];
    assert_eq!(competitor["url"], "https://www.squarespace.com");
    assert_eq!(competitor["strengths"].as_array().unwrap().len(), 1);
    assert_eq!(competitor["weaknesses"].as_array().unwrap().len(), 1);
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
