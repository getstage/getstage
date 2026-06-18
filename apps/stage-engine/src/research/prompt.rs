use crate::models::refero::{ReferoContext, ReferoReferenceKind, ReferoUiPatternCategory};
use crate::models::research::ResearchInput;

use super::competitive::{competitive_rules_for_prompt, format_competitive_targets_for_prompt};

pub fn build_research_prompt(input: &ResearchInput, refero_context: &ReferoContext) -> String {
    let competitive_targets = format_competitive_targets_for_prompt(input);
    let competitive_rules = competitive_rules_for_prompt(input);

    let category_lines = refero_context
        .category_searches
        .iter()
        .map(|bucket| {
            let hits = bucket
                .references
                .iter()
                .filter(|reference| reference.kind == ReferoReferenceKind::Screen)
                .count();
            format!(
                "- {} ({} screens): {}",
                bucket.category.display_title(),
                hits,
                bucket.query
            )
        })
        .collect::<Vec<_>>()
        .join("\n");

    let flow_lines = refero_context
        .references
        .iter()
        .filter(|reference| reference.kind == ReferoReferenceKind::Flow)
        .map(|reference| {
            format!(
                "- {} flow{}",
                reference.title,
                reference
                    .product_name
                    .as_deref()
                    .map(|product| format!(" from {product}"))
                    .unwrap_or_default()
            )
        })
        .collect::<Vec<_>>()
        .join("\n");

    format!(
        r#"You are generating the Stage Research artifact.

Return a single valid JSON object matching the Stage ResearchArtifact schema.
Do not return markdown.
Do not invent source references when the source is unknown.

Project:
- Project ID: {project_id}
- Project name: {project_name}
- Client: {client_name}
- Industry: {industry}
- Website: {website}

Project brief:
{project_brief}

Target users:
{target_users}

Additional notes:
{additional_notes}

Allowed competitive sites (and ONLY these):
{competitive_targets}

{competitive_rules}

Web research rules:
- Use web search/fetch to inspect only the project website and allowed competitive sites.
- Inspect at most the homepage plus three relevant pages per site.
- Prefer pricing, product/features, onboarding/signup, checkout, or dashboard evidence.
- Every factual competitive claim must be supported by a real fetched page and represented in sourceReferences with its URL.
- If a claim cannot be supported by fetched evidence, omit it.
- Do not use model memory as evidence.

Refero category searches (UI Patterns are built by Stage from these — do not author uiPatterns):
{category_lines}

Refero flow references (journey context only):
{flow_lines}

Required artifact sections:
- summary
- companySnapshot
- competitiveAnalysis with card view data and matrix rows that follow the required JSON shape below
- targetUsers as generated personas
- opportunities
- openQuestions
- sourceReferences

Output style (Stage is a designer OS — write for UI designers, not investors):
- Be concise. No paragraphs in competitive matrix or card bullets.
- Focus on screens, layout, navigation, flows, components — not pricing plans, VAT, or market strategy.

Required competitiveAnalysis matrix shape:
```json
{{
  "matrixRows": [
    {{
      "id": "matrix-onboarding",
      "label": "Onboarding",
      "cells": [
        {{
          "competitorId": "the exact id from competitiveAnalysis.competitors",
          "score": "OK"
        }}
      ]
    }}
  ]
}}
```
- Use the 7 matrix labels from the competitive rules (Navigation, Onboarding, Visual Style, Content Hierarchy, Mobile Experience, Dashboard Layout, Data Visualization).
- Every matrix cell MUST have `competitorId` and `score` ("Strong" | "OK" | "Weak").
- Matrix `note` must be omitted. Cells are score-only (Strong / OK / Weak).
- Never put URLs or multi-sentence notes in matrix cells.

targetUsers rules:
- Exactly 2 personas max.
- Every persona must include id, name, role, context, goals[], and frustrations[].
- role: short job/decision role label, e.g. "Retail Operations Manager".
- goals[] and frustrations[]: one short sentence each (max 15 words).
- context: one short sentence (max 15 words).

opportunities rules:
- Return 3-5 connected product opportunities grounded in the factual Research you just generated.
- Each opportunity must advise how {project_name} can win versus the allowed competitors or user needs.
- title: 2-4 words.
- description: exactly one sentence, max 25 words. State the gap and why it matters for this product.
- sourceSection must be one of "summary", "companySnapshot", "competitiveAnalysis", "uiPatterns", "targetUsers", or "openQuestions".
- Never invent facts, competitors, user needs, or evidence just to create an opportunity.
- If you cannot generate at least 3 grounded opportunities, return no artifact; do not return an empty opportunities array.

Do NOT include uiPatterns in your JSON — Stage engine builds UI Patterns rows ({ui_pattern_rows}) from Refero screenshots after your response.

The JSON must use:
- apiVersion: "v1"
- artifactKind: "researchArtifact"
- projectId: the provided project ID
"#,
        project_id = input.project_id,
        project_name = input.project_name,
        client_name = input.client_name.as_deref().unwrap_or("Unknown"),
        industry = input.industry,
        website = input.website.as_deref().unwrap_or("Unknown"),
        project_brief = input.project_brief.as_deref().unwrap_or("Not provided."),
        target_users = input.target_users.as_deref().unwrap_or("Not provided."),
        additional_notes = input.additional_notes.as_deref().unwrap_or("Not provided."),
        competitive_targets = competitive_targets,
        competitive_rules = competitive_rules,
        category_lines = if category_lines.is_empty() {
            "No Refero category searches returned.".to_string()
        } else {
            category_lines
        },
        flow_lines = if flow_lines.is_empty() {
            "No Refero flow references returned.".to_string()
        } else {
            flow_lines
        },
        ui_pattern_rows = ReferoUiPatternCategory::all()
            .iter()
            .map(|category| category.display_title())
            .collect::<Vec<_>>()
            .join(", "),
    )
}
