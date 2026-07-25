use std::collections::HashSet;

use anyhow::{Result, ensure};
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};

use crate::models::research::{
    ResearchCompanySnapshotRow, ResearchCompetitiveAnalysis, ResearchInput, ResearchOpportunity,
    ResearchSourceReference, ResearchTargetUser,
};

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ContextJobOutput {
    #[serde(default)]
    pub company_snapshot: Vec<ResearchCompanySnapshotRow>,
    #[serde(default)]
    pub target_users: Vec<ResearchTargetUser>,
    #[serde(default)]
    pub open_questions: Vec<String>,
    #[serde(default)]
    pub source_references: Vec<ResearchSourceReference>,
}

impl ContextJobOutput {
    pub fn validate(&self) -> Result<()> {
        ensure!(
            !self.company_snapshot.is_empty(),
            "context job returned no company snapshot"
        );
        ensure!(
            !self.target_users.is_empty(),
            "context job returned no target users"
        );
        Ok(())
    }
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CompetitiveJobOutput {
    pub competitive_analysis: ResearchCompetitiveAnalysis,
    #[serde(default)]
    pub source_references: Vec<ResearchSourceReference>,
}

impl CompetitiveJobOutput {
    pub fn validate(&self, requires_competitors: bool) -> Result<()> {
        if !requires_competitors {
            return Ok(());
        }
        ensure!(
            !self.competitive_analysis.competitors.is_empty(),
            "competitive job returned no competitors"
        );
        ensure!(
            !self.competitive_analysis.matrix_rows.is_empty(),
            "competitive job returned no matrix rows"
        );
        Ok(())
    }
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SynthesisJobOutput {
    #[serde(default)]
    pub summary: Vec<String>,
    #[serde(default)]
    pub opportunities: Vec<ResearchOpportunity>,
}

impl SynthesisJobOutput {
    pub fn validate(&self) -> Result<()> {
        ensure!(
            !self.summary.is_empty(),
            "synthesis job returned no summary"
        );
        ensure!(
            !self.opportunities.is_empty(),
            "synthesis job returned no opportunities"
        );
        Ok(())
    }
}

pub fn assemble_artifact(
    input: &ResearchInput,
    context: ContextJobOutput,
    competitive: CompetitiveJobOutput,
    synthesis: SynthesisJobOutput,
) -> Value {
    let source_references =
        merge_source_references(context.source_references, competitive.source_references);

    json!({
        "apiVersion": "v1",
        "artifactKind": "researchArtifact",
        "projectId": input.project_id,
        "title": format!("{} Research", input.project_name),
        "summary": synthesis.summary,
        "companySnapshot": context.company_snapshot,
        "competitiveAnalysis": competitive.competitive_analysis,
        "uiPatterns": [],
        "targetUsers": context.target_users,
        "opportunities": synthesis.opportunities,
        "openQuestions": context.open_questions,
        "sourceReferences": source_references,
    })
}

fn merge_source_references(
    context: Vec<ResearchSourceReference>,
    competitive: Vec<ResearchSourceReference>,
) -> Vec<ResearchSourceReference> {
    let mut seen = HashSet::new();
    context
        .into_iter()
        .chain(competitive)
        .filter(|source| seen.insert(source.id.clone()))
        .collect()
}

#[cfg(test)]
#[path = "../testing/research/pipeline.rs"]
mod tests;
