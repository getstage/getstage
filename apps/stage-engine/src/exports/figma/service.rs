use anyhow::{Context, bail};
use sha2::{Digest, Sha256};
use uuid::Uuid;

use crate::helpers::time::now_millis;

use super::models::{
    CreateFigJamExportRequest, CreateFigmaExportRequest, CreateFigmaExportResponse, CreateJobInput,
    FigJamWriteFlow, FigJamWritePlan, FigmaWriteBlock, FigmaWritePlan, FigmaWriteSection,
    FlowsArtifact, GeneratedBlock, GeneratedScreen, WireframesArtifact,
};
use super::repository::FigmaExportRepository;

const PAIRING_TTL_MS: u128 = 10 * 60 * 1000;

#[derive(Clone, Debug)]
pub struct FigmaExportService {
    repository: FigmaExportRepository,
}

impl FigmaExportService {
    pub fn new(repository: FigmaExportRepository) -> Self {
        Self { repository }
    }

    pub async fn create_export(
        &self,
        token: &str,
        request: CreateFigmaExportRequest,
    ) -> anyhow::Result<CreateFigmaExportResponse> {
        let artifact_record = self
            .repository
            .fetch_latest_wireframes_artifact(token, &request.project_id)
            .await?;
        if artifact_record.id != request.artifact_id {
            bail!("Selected wireframes artifact is no longer the latest artifact.");
        }

        let content_json = artifact_record
            .content_json
            .context("wireframes artifact has no content")?;
        let artifact: WireframesArtifact = serde_json::from_str(&content_json)
            .context("wireframes artifact content is invalid")?;
        let screen = artifact
            .generated_screens
            .iter()
            .find(|screen| screen.id == request.screen_id)
            .context("selected wireframe screen was not found")?;
        let write_plan = compile_write_plan(screen);
        let write_plan_json =
            serde_json::to_string(&write_plan).context("failed to serialize Figma write plan")?;
        let pairing_code = pairing_code();
        let expires_at = now_millis() + PAIRING_TTL_MS;
        let job = self
            .repository
            .create_job(
                token,
                CreateJobInput {
                    project_id: request.project_id,
                    artifact_id: request.artifact_id,
                    screen_id: request.screen_id,
                    write_plan_json,
                    pairing_code_hash: hash_secret(&pairing_code),
                    pairing_expires_at: expires_at,
                    export_kind: "wireframe",
                },
            )
            .await?;

        Ok(CreateFigmaExportResponse {
            api_version: "v1",
            job_id: job.job_id,
            pairing_code,
            expires_at,
            status: job.status,
        })
    }

    pub async fn create_figjam_export(
        &self,
        token: &str,
        request: CreateFigJamExportRequest,
    ) -> anyhow::Result<CreateFigmaExportResponse> {
        let artifact_record = self
            .repository
            .fetch_latest_flows_artifact(token, &request.project_id)
            .await?;
        if artifact_record.id != request.artifact_id {
            bail!("Selected flows artifact is no longer the latest artifact.");
        }

        let content_json = artifact_record
            .content_json
            .context("flows artifact has no content")?;
        let artifact: FlowsArtifact =
            serde_json::from_str(&content_json).context("flows artifact content is invalid")?;
        let write_plan = FigJamWritePlan {
            api_version: "v1",
            kind: "figjam-flow-map",
            name: artifact.title,
            flows: artifact
                .flows
                .into_iter()
                .map(|flow| FigJamWriteFlow {
                    id: flow.id,
                    title: flow.title,
                    description: flow.description,
                    steps: flow.steps,
                })
                .collect(),
        };
        let pairing_code = pairing_code();
        let expires_at = now_millis() + PAIRING_TTL_MS;
        let job = self
            .repository
            .create_job(
                token,
                CreateJobInput {
                    project_id: request.project_id,
                    artifact_id: request.artifact_id,
                    screen_id: "flow-map".to_string(),
                    write_plan_json: serde_json::to_string(&write_plan)
                        .context("failed to serialize FigJam write plan")?,
                    pairing_code_hash: hash_secret(&pairing_code),
                    pairing_expires_at: expires_at,
                    export_kind: "figjam_flow_map",
                },
            )
            .await?;

        Ok(CreateFigmaExportResponse {
            api_version: "v1",
            job_id: job.job_id,
            pairing_code,
            expires_at,
            status: job.status,
        })
    }
}

fn compile_write_plan(screen: &GeneratedScreen) -> FigmaWritePlan {
    FigmaWritePlan {
        api_version: "v1",
        kind: "wireframe",
        name: format!("{} Wireframe", screen.title),
        width: 1440,
        sections: screen
            .sections
            .iter()
            .map(|section| FigmaWriteSection {
                id: section.id.clone(),
                title: section.title.clone(),
                blocks: section.blocks.iter().map(compile_block).collect(),
            })
            .collect(),
    }
}

fn compile_block(block: &GeneratedBlock) -> FigmaWriteBlock {
    FigmaWriteBlock {
        id: block.id.clone(),
        kind: block.kind.clone(),
        label: block
            .copy_slots
            .get("headline")
            .cloned()
            .unwrap_or_else(|| block.intent.clone()),
        height: match block.emphasis.as_str() {
            "primary" => 240,
            "tertiary" => 80,
            _ => 140,
        },
    }
}

fn pairing_code() -> String {
    Uuid::new_v4()
        .simple()
        .to_string()
        .chars()
        .take(12)
        .collect::<String>()
        .to_uppercase()
}

fn hash_secret(value: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(value.trim().to_uppercase().as_bytes());
    format!("{:x}", hasher.finalize())
}

#[cfg(test)]
mod tests {
    use std::collections::BTreeMap;

    use super::*;

    #[test]
    fn compile_write_plan_should_map_blocks_to_editable_layout_commands() {
        let screen = GeneratedScreen {
            id: "home".to_string(),
            title: "Homepage".to_string(),
            sections: vec![super::super::models::GeneratedSection {
                id: "hero-section".to_string(),
                title: "Hero".to_string(),
                blocks: vec![GeneratedBlock {
                    id: "hero".to_string(),
                    kind: "hero".to_string(),
                    intent: "Introduce the product".to_string(),
                    copy_slots: BTreeMap::from([(
                        "headline".to_string(),
                        "Build better products".to_string(),
                    )]),
                    emphasis: "primary".to_string(),
                }],
            }],
        };

        let plan = compile_write_plan(&screen);

        assert_eq!(plan.name, "Homepage Wireframe");
        assert_eq!(plan.sections[0].blocks[0].label, "Build better products");
        assert_eq!(plan.sections[0].blocks[0].height, 240);
    }

    #[test]
    fn hash_secret_should_match_case_insensitively() {
        assert_eq!(hash_secret("abcd1234"), hash_secret("ABCD1234"));
    }
}
