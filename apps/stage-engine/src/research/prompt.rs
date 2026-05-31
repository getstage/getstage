use crate::models::refero::ReferoContext;
use crate::models::research::ResearchInput;

pub fn build_research_prompt(input: &ResearchInput, refero_context: &ReferoContext) -> String {
    let competitor_urls = if input.competitor_urls.is_empty() {
        "None provided.".to_string()
    } else {
        input.competitor_urls.join("\n")
    };

    let reference_lines = refero_context
        .references
        .iter()
        .map(|reference| {
            format!(
                "- {} ({:?}){}",
                reference.title,
                reference.kind,
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

Refero context query:
{refero_query}

Refero references:
{reference_lines}

Required artifact sections:
- summary
- companySnapshot
- competitiveAnalysis with card view data and matrix rows
- uiPatterns with Refero screenshots/references when available
- targetUsers as generated personas
- opportunities
- openQuestions
- sourceReferences

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
        refero_query = refero_context.query,
        reference_lines = if reference_lines.is_empty() {
            "No Refero references returned.".to_string()
        } else {
            reference_lines
        },
    )
}
