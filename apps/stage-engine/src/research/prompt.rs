use crate::models::refero::{ReferoContext, ReferoReferenceKind, ReferoUiPatternCategory};
use crate::models::research::ResearchInput;

pub fn build_research_prompt(input: &ResearchInput, refero_context: &ReferoContext) -> String {
    let competitor_urls = if input.competitor_urls.is_empty() {
        "None provided.".to_string()
    } else {
        input.competitor_urls.join("\n")
    };

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

Competitors to include:
{competitor_urls}

Refero category searches (UI Patterns are built by Stage from these — do not author uiPatterns):
{category_lines}

Refero flow references (journey context only):
{flow_lines}

Required artifact sections:
- summary
- companySnapshot
- competitiveAnalysis with card view data and matrix rows
- targetUsers as generated personas
- opportunities
- openQuestions
- sourceReferences

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
        competitor_urls = competitor_urls,
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
