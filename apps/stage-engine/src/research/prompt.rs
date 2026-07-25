use crate::models::refero::{ReferoReference, ReferoReferenceKind};
use crate::models::research::ResearchInput;

use super::competitive::{competitive_rules_for_prompt, format_competitive_targets_for_prompt};

pub fn build_context_prompt(input: &ResearchInput) -> String {
    format!(
        r#"You are generating the context section of a Stage Research artifact.
Return exactly one JSON object. Do not return markdown or commentary.
Use only the project facts below. Do not browse the web and do not use model memory as evidence.

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

Return this exact top-level shape:
{{
  "companySnapshot": [{{"label": "Industry", "value": "..."}}],
  "targetUsers": [{{
    "id": "persona-1", "name": "...", "role": "...", "goals": ["..."],
    "frustrations": ["..."], "context": "...", "relevance": "...", "assumptions": []
  }}],
  "openQuestions": ["..."],
  "sourceReferences": []
}}

Rules:
- companySnapshot must contain 3-6 concise rows grounded in the provided facts.
- Exactly 2 personas max.
- Every persona must include id, name, role, context, goals[], and frustrations[].
- Keep persona goals, frustrations, and context to one short sentence each.
- Put uncertainty into openQuestions instead of inventing facts.
- sourceReferences must remain empty because this job does not fetch sources.
"#,
        project_id = input.project_id,
        project_name = input.project_name,
        client_name = input.client_name.as_deref().unwrap_or("Unknown"),
        industry = input.industry,
        website = input.website.as_deref().unwrap_or("Unknown"),
        project_brief = input.project_brief.as_deref().unwrap_or("Not provided."),
        target_users = input.target_users.as_deref().unwrap_or("Not provided."),
        additional_notes = input.additional_notes.as_deref().unwrap_or("Not provided."),
    )
}

pub fn build_competitive_prompt(
    input: &ResearchInput,
    competitor_evidence: &[(String, Vec<ReferoReference>)],
) -> String {
    format!(
        r#"You are generating the competitive section of a Stage Research artifact.
Return exactly one JSON object. Do not return markdown or commentary.

Allowed competitive sites (and ONLY these):
{competitive_targets}

{competitive_rules}

Real Refero UI evidence:
{competitor_evidence}

Evidence rules:
- Treat Refero screenshots as reliable visual evidence and prefer them over web pages.
- Browse only an allowed site that has no Refero screens or has a specific evidence gap.
- For a missing site, inspect at most its homepage and one relevant product page.
- Every web claim must cite a fetched URL in sourceReferences.
- Never use model memory as evidence and never score a site down because it is bot-gated.

Return this exact top-level shape:
{{
  "competitiveAnalysis": {{
    "competitors": [{{
      "id": "stable-slug", "name": "...", "url": "...", "logoUrl": null,
      "mark": null, "color": null, "positioning": "...", "summary": "...",
      "strengths": ["..."], "weaknesses": ["..."], "sourceReferenceIds": ["..."]
    }}],
    "matrixRows": [{{
      "id": "matrix-navigation", "label": "Navigation",
      "cells": [{{"competitorId": "stable-slug", "score": "OK"}}]
    }}]
  }},
  "sourceReferences": [{{
    "id": "web-1", "provider": "website", "label": "...",
    "url": "https://...", "externalId": null
  }}]
}}

Rules:
- Include every allowed competitor exactly once.
- Use all 7 required matrix labels and one cell per competitor per row.
- score must be exactly "Strong", "OK", or "Weak"; omit matrix notes.
- Keep strengths, weaknesses, positioning, and summary concise and design-focused.
- Refero sourceReferenceIds are the screenshot IDs shown below; Stage adds their source rows.
"#,
        competitive_targets = format_competitive_targets_for_prompt(input),
        competitive_rules = competitive_rules_for_prompt(input),
        competitor_evidence = format_competitor_evidence(competitor_evidence),
    )
}

pub fn build_synthesis_prompt(
    input: &ResearchInput,
    context_json: &str,
    competitive_json: &str,
) -> String {
    format!(
        r#"You are synthesizing a Stage Research artifact for {project_name}.
Return exactly one JSON object. Do not browse the web. Do not return markdown or commentary.
Use only the validated context and competitive evidence below.

Context:
{context_json}

Competitive analysis:
{competitive_json}

Return this exact top-level shape:
{{
  "summary": ["..."],
  "opportunities": [{{
    "id": "opportunity-1", "title": "...", "description": "...",
    "sourceSection": "competitiveAnalysis"
  }}]
}}

Rules:
- summary: 3-5 short bullets, each one sentence and at most 20 words.
- Cover what was benchmarked, the dominant UI pattern, the biggest UX gap, and the headline opportunity.
- opportunities: 3-5 connected product opportunities grounded only in the supplied evidence.
- title: 2-4 words; description: exactly one sentence and at most 25 words.
- sourceSection must be "companySnapshot", "competitiveAnalysis", or "targetUsers".
- Do not invent facts, users, competitors, or evidence.
"#,
        project_name = input.project_name,
    )
}

fn format_competitor_evidence(competitor_evidence: &[(String, Vec<ReferoReference>)]) -> String {
    competitor_evidence
        .iter()
        .map(|(name, screens)| {
            let screen_lines = screens
                .iter()
                .filter(|reference| reference.kind == ReferoReferenceKind::Screen)
                .map(|reference| {
                    let screen_type = reference.screen_type.as_deref().unwrap_or("screen");
                    let summary = reference
                        .summary
                        .as_deref()
                        .filter(|summary| !summary.is_empty())
                        .map(|summary| format!(" — {summary}"))
                        .unwrap_or_default();
                    format!(
                        "  - id={} | {} ({}){}",
                        reference.id, reference.title, screen_type, summary
                    )
                })
                .collect::<Vec<_>>();
            if screen_lines.is_empty() {
                format!("- {name}: no Refero screens found.")
            } else {
                format!("- {name}:\n{}", screen_lines.join("\n"))
            }
        })
        .collect::<Vec<_>>()
        .join("\n")
}
