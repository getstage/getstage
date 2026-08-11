use anyhow::{Context, bail};
use sha2::{Digest, Sha256};
use uuid::Uuid;

use crate::convex_store::asset_upload::ConvexAssetUploader;
use crate::helpers::time::now_millis;

use super::models::{
    CreateFigJamExportRequest, CreateFigmaExportRequest, CreateFigmaExportResponse, CreateJobInput,
    FigJamWriteFlow, FigJamWritePlan, FigmaWriteBlock, FigmaWritePlan, FigmaWriteSection,
    FlowsArtifact, GeneratedBlock, GeneratedScreen, HifiFigmaWritePlan, NodesFigmaWritePlan,
    WireframeFigmaWritePlan, WireframesArtifact,
};
use super::repository::FigmaExportRepository;

const PAIRING_TTL_MS: u128 = 10 * 60 * 1000;
const WIREFRAME_EXPORT_WIDTH: u16 = 1440;
// Upper bound on editable-export layers. A rich full page walks to a few hundred
// nodes; this caps a pathological or hostile payload well before it burdens
// Convex storage or the plugin's node loop.
const MAX_FIGMA_DOM_NODES: usize = 6000;

#[derive(Clone, Debug)]
pub struct FigmaExportService {
    repository: FigmaExportRepository,
    asset_uploader: ConvexAssetUploader,
    r2_public_base_url: Option<String>,
}

impl FigmaExportService {
    pub fn new(
        repository: FigmaExportRepository,
        asset_uploader: ConvexAssetUploader,
        r2_public_base_url: Option<String>,
    ) -> Self {
        Self {
            repository,
            asset_uploader,
            r2_public_base_url,
        }
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
        let write_plan = self
            .compile_wireframe_write_plan(token, &request, screen)
            .await?;
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

    async fn compile_wireframe_write_plan(
        &self,
        token: &str,
        request: &CreateFigmaExportRequest,
        screen: &GeneratedScreen,
    ) -> anyhow::Result<WireframeFigmaWritePlan> {
        // Best fidelity: the desktop walked the rendered DOM into an editable layer
        // tree. Reject an over-sized payload (DoS guard) rather than forwarding an
        // unbounded node list to Convex and the plugin.
        if let Some(dom) = &request.hifi_figma_nodes
            && !dom.nodes.is_empty()
        {
            if dom.nodes.len() > MAX_FIGMA_DOM_NODES {
                bail!(
                    "Hi-Fi wireframe has too many layers to export ({} > {MAX_FIGMA_DOM_NODES}).",
                    dom.nodes.len()
                );
            }
            return Ok(WireframeFigmaWritePlan::Nodes(NodesFigmaWritePlan {
                api_version: "v1",
                kind: "hifi-wireframe-nodes",
                name: format!("{} Wireframe", screen.title),
                width: dom.width.max(1),
                height: dom.height.max(1),
                nodes: dom.nodes.clone(),
            }));
        }

        // Hi-Fi is driven by the desktop, exactly like the Paper export: if it
        // rendered a preview PNG, place that image. We do NOT re-derive the
        // decision from the engine's fetched `screen.html` — that copy can lag
        // the desktop's and previously dropped the export to an empty Lo-Fi frame.
        let Some(data_url) = request
            .hifi_preview_data_url
            .as_deref()
            .map(str::trim)
            .filter(|value| !value.is_empty())
        else {
            return Ok(WireframeFigmaWritePlan::Lofi(compile_write_plan(screen)));
        };
        let preview_png = decode_png_data_url(data_url)
            .context("Hi-Fi wireframe preview image is not a valid data URL")?;

        let width = request
            .hifi_preview_width
            .filter(|value| *value > 0)
            .context("Hi-Fi wireframe export is missing preview width.")?;
        let height = request
            .hifi_preview_height
            .filter(|value| *value > 0)
            .context("Hi-Fi wireframe export is missing preview height.")?;

        let file_name = format!("{}-figma-export.png", slug(&screen.title));
        let key = self
            .asset_uploader
            .upload_image(
                token,
                &request.project_id,
                "generated-design",
                &file_name,
                "image/png",
                &preview_png,
            )
            .await
            .context("failed to upload Hi-Fi wireframe preview image")?;
        let image_url = resolve_public_asset_url(&key, self.r2_public_base_url.as_deref())
            .context("R2 public asset URL is not configured for Hi-Fi Figma export")?;

        Ok(WireframeFigmaWritePlan::Hifi(HifiFigmaWritePlan {
            api_version: "v1",
            kind: "hifi-wireframe",
            name: format!("{} Wireframe", screen.title),
            width,
            height,
            image_url,
        }))
    }
}

fn compile_write_plan(screen: &GeneratedScreen) -> FigmaWritePlan {
    FigmaWritePlan {
        api_version: "v1",
        kind: "wireframe",
        name: format!("{} Wireframe", screen.title),
        width: WIREFRAME_EXPORT_WIDTH,
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

fn decode_png_data_url(data_url: &str) -> anyhow::Result<Vec<u8>> {
    use base64::Engine;
    let encoded = data_url
        .split_once(";base64,")
        .map(|(_, payload)| payload)
        .unwrap_or(data_url)
        .trim();
    base64::engine::general_purpose::STANDARD
        .decode(encoded)
        .context("failed to base64-decode preview image")
}

fn resolve_public_asset_url(key: &str, r2_public_base_url: Option<&str>) -> Option<String> {
    let trimmed = key.trim();
    if trimmed.is_empty()
        || trimmed.contains("://")
        || trimmed.starts_with('/')
        || trimmed.contains("..")
    {
        return None;
    }

    let base = r2_public_base_url
        .filter(|base| !base.trim().is_empty())?
        .trim_end_matches('/');
    Some(format!("{base}/{trimmed}"))
}

fn slug(value: &str) -> String {
    let value = value
        .chars()
        .map(|character| {
            if character.is_ascii_alphanumeric() {
                character.to_ascii_lowercase()
            } else {
                '-'
            }
        })
        .collect::<String>();
    let parts = value.split('-').filter(|part| !part.is_empty());
    let slug = parts.collect::<Vec<_>>().join("-");
    if slug.is_empty() {
        "stage-wireframe".to_string()
    } else {
        slug
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
            html: None,
            html_url: None,
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
    fn resolve_public_asset_url_should_build_a_public_r2_url() {
        assert_eq!(
            resolve_public_asset_url(
                "generated-designs/projects/p1/users/u1/images/id.png",
                Some("https://assets-testing.getstage.co"),
            ),
            Some("https://assets-testing.getstage.co/generated-designs/projects/p1/users/u1/images/id.png".to_string())
        );
    }

    #[test]
    fn hash_secret_should_match_case_insensitively() {
        assert_eq!(hash_secret("abcd1234"), hash_secret("ABCD1234"));
    }

    #[test]
    fn hifi_figma_nodes_should_roundtrip_camel_case_fields() {
        use super::super::models::{FigmaDomNode, HifiFigmaNodes};

        // The desktop walker and the plugin both speak camelCase; the engine must
        // deserialize and re-serialize the same shape (regression guard for the
        // per-variant rename_all fix).
        let json = r##"{"width":1440,"height":900,"nodes":[
            {"type":"text","x":1,"y":2,"w":300,"text":"Hi","fontSize":18,"fontFamily":"Inter","fontWeight":600,"color":"#111111","align":"left"}
        ]}"##;
        let parsed: HifiFigmaNodes =
            serde_json::from_str(json).expect("camelCase text node should deserialize");
        assert!(matches!(parsed.nodes[0], FigmaDomNode::Text { .. }));

        let out = serde_json::to_string(&parsed.nodes).expect("nodes should serialize");
        assert!(out.contains("fontSize"), "expected camelCase field, got: {out}");
        assert!(!out.contains("font_size"), "leaked snake_case field: {out}");
    }
}
