use super::*;
use crate::models::research::{
    ResearchArtifactSection, ResearchCompetitiveAnalysis, ResearchCompetitiveMatrixCell,
    ResearchCompetitiveMatrixRow, ResearchCompetitor, ResearchMatrixScore, ResearchOpportunity,
    ResearchSourceProvider, ResearchSourceReference, ResearchTargetUser,
};
use crate::research::fixtures::benchmark_input;

fn sample_input() -> ResearchInput {
    benchmark_input(2)
}

fn sample_context() -> ContextJobOutput {
    ContextJobOutput {
        company_snapshot: vec![ResearchCompanySnapshotRow {
            label: "Industry".to_string(),
            value: "Enterprise project management".to_string(),
        }],
        target_users: vec![ResearchTargetUser {
            id: "persona-1".to_string(),
            name: "Alex".to_string(),
            role: "Operations lead".to_string(),
            goals: vec!["Ship clearer handoffs".to_string()],
            frustrations: vec!["Tools fragment review".to_string()],
            context: Some("Leads distributed teams".to_string()),
            relevance: None,
            assumptions: vec![],
        }],
        open_questions: vec!["How deep is mobile review usage?".to_string()],
        source_references: vec![ResearchSourceReference {
            id: "context-site".to_string(),
            provider: ResearchSourceProvider::Website,
            label: "Client site".to_string(),
            url: Some("https://example.com".to_string()),
            external_id: None,
        }],
    }
}

fn sample_competitive() -> CompetitiveJobOutput {
    CompetitiveJobOutput {
        competitive_analysis: ResearchCompetitiveAnalysis {
            competitors: vec![ResearchCompetitor {
                id: "competitor-1".to_string(),
                name: "Competitor 1".to_string(),
                url: Some("https://competitor-1.example".to_string()),
                logo_url: None,
                mark: None,
                color: None,
                positioning: Some("Dense ops workspace".to_string()),
                summary: Some("Strong navigation, weak onboarding".to_string()),
                strengths: vec!["Clear nav".to_string()],
                weaknesses: vec!["Slow onboarding".to_string()],
                source_reference_ids: vec!["refero-1".to_string()],
            }],
            matrix_rows: vec![ResearchCompetitiveMatrixRow {
                id: "matrix-navigation".to_string(),
                label: "Navigation".to_string(),
                cells: vec![ResearchCompetitiveMatrixCell {
                    competitor_id: "competitor-1".to_string(),
                    score: ResearchMatrixScore::Strong,
                    note: None,
                }],
            }],
        },
        source_references: vec![
            ResearchSourceReference {
                id: "context-site".to_string(),
                provider: ResearchSourceProvider::Website,
                label: "Duplicate client site".to_string(),
                url: Some("https://example.com".to_string()),
                external_id: None,
            },
            ResearchSourceReference {
                id: "web-1".to_string(),
                provider: ResearchSourceProvider::Website,
                label: "Competitor homepage".to_string(),
                url: Some("https://competitor-1.example".to_string()),
                external_id: None,
            },
        ],
    }
}

fn sample_synthesis() -> SynthesisJobOutput {
    SynthesisJobOutput {
        summary: vec![
            "Benchmarked two competitors on navigation and onboarding.".to_string(),
            "Dominant pattern is dense left navigation.".to_string(),
            "Biggest gap is guided first-run setup.".to_string(),
        ],
        opportunities: vec![ResearchOpportunity {
            id: "opportunity-1".to_string(),
            title: Some("Guided Setup".to_string()),
            description: "Ship a short first-run checklist so teams reach value faster."
                .to_string(),
            source_section: Some(ResearchArtifactSection::CompetitiveAnalysis),
        }],
    }
}

#[test]
fn validates_required_job_fields() {
    assert!(sample_context().validate().is_ok());
    assert!(sample_competitive().validate().is_ok());
    assert!(sample_synthesis().validate().is_ok());

    let mut empty_context = sample_context();
    empty_context.company_snapshot.clear();
    assert!(empty_context.validate().is_err());

    let mut empty_competitive = sample_competitive();
    empty_competitive.competitive_analysis.matrix_rows.clear();
    assert!(empty_competitive.validate().is_err());

    let mut empty_synthesis = sample_synthesis();
    empty_synthesis.opportunities.clear();
    assert!(empty_synthesis.validate().is_err());
}

#[test]
fn assembles_artifact_and_dedupes_sources() {
    let artifact = assemble_artifact(
        &sample_input(),
        sample_context(),
        sample_competitive(),
        sample_synthesis(),
    );

    assert_eq!(artifact["apiVersion"], "v1");
    assert_eq!(artifact["artifactKind"], "researchArtifact");
    assert_eq!(artifact["projectId"], "benchmark-2");
    assert_eq!(artifact["title"], "Enterprise Operations Hub Research");
    assert_eq!(artifact["summary"].as_array().unwrap().len(), 3);
    assert_eq!(artifact["uiPatterns"], json!([]));
    assert_eq!(artifact["sourceReferences"].as_array().unwrap().len(), 2);
    assert_eq!(artifact["sourceReferences"][0]["id"], "context-site");
    assert_eq!(artifact["sourceReferences"][1]["id"], "web-1");
}
