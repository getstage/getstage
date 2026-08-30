use std::collections::BTreeMap;
use std::sync::Arc;
use std::time::Instant;

use crate::convex_store::asset_upload::ConvexAssetUploader;
use crate::convex_store::catalog_repository::{
    CatalogRepository, CatalogSourceBundle, CatalogSourceFile,
};
use crate::convex_store::wireframes_repository::WireframesRepository;
use crate::helpers::provider_json::extract_wireframes_artifact;
use crate::helpers::time::now_millis;
use crate::models::runs::{RunEvent, StartRunRequest};
use crate::models::wireframes::{WireframeBrandSource, WireframeKind, WireframeViewport};
use crate::providers::adapter::{ProviderRunContext, run_provider_collect};
use crate::providers::process::ProviderProcessOutcome;
use crate::runs::RunEventSink;
use crate::wireframes::MAX_BRAND_KIT_FILES;
use crate::wireframes::debug_dump::WireframesDebugDump;
use crate::wireframes::design_plan::{ScreenDesignPlan, expected_screen_ids};
use crate::wireframes::gateway::{
    GatewayDesignContext, GatewayScreenJob, GatewaySkill, MAX_GATEWAY_SCREENS_PER_REQUEST,
    gateway_health, run_screens_via_gateway,
};
use crate::wireframes::helper::{
    MAX_MOODBOARD_IMAGES, MAX_PARALLEL_SCREEN_RUNS, WorkflowError,
    configure_provider_workspace_call, configured_screens_from_input, fetch_visual_attachments,
    materialize_common_workspace, materialize_screen_call, merge_tsx_screens,
    offload_rendered_screens, parse_brand_source_from_source, parse_kind_from_source,
    parse_screens_from_source, parse_style_direction_from_source, resolve_design_plan,
    run_screens_in_parallel, safe_context_segment, screen_workspace_required_files,
    selected_moodboard_asset_keys, tool_completed, tool_started, uses_nebius_gateway,
};
use crate::wireframes::normalize::{apply_scoped_screens, normalize_wireframes_artifact};
use crate::wireframes::prompt::{
    build_wireframes_prompt_with_plan, resolve_hifi_prompt_preferences, scope_flows_artifact,
    workspace_selected_skills,
};
use crate::wireframes::provider_workspace::{ContextAccessPolicy, ProviderWorkspace};
use crate::wireframes::quality::{merge_quality_failures, validate_artifact_against_plan};
use crate::wireframes::render::{apply_react_render, brand_theme, repair_prompt_for_failures};

const GENERATED_AT_LABEL: &str = "just now";
const MAX_RAG_BUNDLES_PER_SCREEN: usize = 12;

struct ScreenCatalogContext {
    index_json: String,
    source_paths: Vec<String>,
    evidence: serde_json::Value,
    bundles: Vec<CatalogSourceBundle>,
    render_files: Vec<CatalogSourceFile>,
}

async fn materialize_catalog_context(
    catalog: &CatalogRepository,
    auth_token: &str,
    run_id: &str,
    screen_id: &str,
    screen: &ScreenDesignPlan,
    libraries: &[String],
    workspace: &mut ProviderWorkspace,
) -> Result<ScreenCatalogContext, WorkflowError> {
    if libraries.is_empty() {
        return Err(WorkflowError::InvalidRequest(
            "Hi-Fi generation requires at least one selected component library for RAG retrieval."
                .to_string(),
        ));
    }
    let query = format!(
        "{}\n{}\n{}\n{}\n{}",
        screen.purpose,
        screen.screen_role,
        screen.layout_archetype,
        screen.content_requirements.join("\n"),
        screen
            .component_recipe
            .iter()
            .map(|component| format!("{}: {}", component.export_name, component.purpose))
            .collect::<Vec<_>>()
            .join("\n"),
    );
    let search = catalog
        .search_components(
            auth_token,
            &format!("{run_id}:{}", safe_context_segment(screen_id)),
            &query,
            libraries,
            MAX_RAG_BUNDLES_PER_SCREEN as u8,
        )
        .await
        .map_err(|error| {
            WorkflowError::Internal(format!(
                "component search failed for screen {screen_id}: {error}"
            ))
        })?;

    if search.candidates.is_empty() {
        return Err(WorkflowError::GenerationFailed(format!(
            "RAG embedding search returned no verified components for screen {screen_id}. Index the selected libraries before retrying."
        )));
    }

    let call_id = format!("screen-{screen_id}");
    let mut source_paths = Vec::with_capacity(search.candidates.len());
    let mut index = Vec::with_capacity(search.candidates.len());
    let mut bundles = Vec::with_capacity(search.candidates.len());
    for (position, candidate) in search.candidates.into_iter().enumerate() {
        let source = catalog
            .load_component(
                auth_token,
                &candidate.component_id,
                &candidate.source_revision,
            )
            .await
            .map_err(|error| {
                WorkflowError::Internal(format!(
                    "component source load failed for {}: {error}",
                    candidate.component_id
                ))
            })?;
        let path = format!(
            "catalog/{}/{}/{}-{}.json",
            safe_context_segment(screen_id),
            safe_context_segment(&candidate.library),
            safe_context_segment(&candidate.name),
            position + 1,
        );
        let source_json = serde_json::to_string_pretty(&source)?;
        workspace
            .write_text(
                &path,
                "verified component source bundle selected by RAG",
                ContextAccessPolicy::OnDemand,
                &[&call_id],
                &source_json,
            )
            .map_err(|error| {
                WorkflowError::Internal(format!(
                    "could not materialize component source {}: {error}",
                    candidate.component_id
                ))
            })?;
        index.push(serde_json::json!({
            "componentId": candidate.component_id,
            "library": candidate.library,
            "name": candidate.name,
            "kind": candidate.kind,
            "runtime": candidate.runtime,
            "sourceRevision": candidate.source_revision,
            "score": candidate.score,
            "sourcePath": path,
        }));
        source_paths.push(path);
        bundles.push(source);
    }
    tracing::info!(
        run_id,
        screen_id,
        candidate_count = index.len(),
        embedding_tokens = search.embedding_tokens,
        "Qwen RAG search and verified source loading completed"
    );
    let render_files = flatten_catalog_files(bundles.iter());
    let evidence = serde_json::json!({
        "provider": "nebius",
        "model": "Qwen/Qwen3-Embedding-8B",
        "embeddingTokens": search.embedding_tokens,
        "candidateCount": index.len(),
        "components": index,
    });
    Ok(ScreenCatalogContext {
        index_json: serde_json::to_string_pretty(&evidence["components"])?,
        source_paths,
        evidence,
        bundles,
        render_files,
    })
}

fn flatten_catalog_files<'a>(
    bundles: impl IntoIterator<Item = &'a CatalogSourceBundle>,
) -> Vec<CatalogSourceFile> {
    let mut by_path = BTreeMap::new();
    for bundle in bundles {
        for file in &bundle.files {
            by_path
                .entry(file.path.clone())
                .or_insert_with(|| file.clone());
        }
    }
    by_path.into_values().collect()
}

fn merge_catalog_render_files(
    into: &mut BTreeMap<String, CatalogSourceFile>,
    files: Vec<CatalogSourceFile>,
) {
    for file in files {
        into.entry(file.path.clone()).or_insert(file);
    }
}

fn catalog_library_id(selected_library_id: &str) -> &str {
    match selected_library_id {
        "bklit-ui" => "bklit",
        other => other,
    }
}

#[derive(Clone, Debug)]
pub struct WireframesWorkflow {
    repository: WireframesRepository,
    catalog: CatalogRepository,
    asset_uploader: ConvexAssetUploader,
    r2_public_base_url: Option<String>,
}

impl WireframesWorkflow {
    pub fn new(
        repository: WireframesRepository,
        catalog: CatalogRepository,
        asset_uploader: ConvexAssetUploader,
        r2_public_base_url: Option<String>,
    ) -> Self {
        Self {
            repository,
            catalog,
            asset_uploader,
            r2_public_base_url,
        }
    }

    pub async fn run(
        self: Arc<Self>,
        api_version: &'static str,
        run_id: String,
        mut request: StartRunRequest,
        auth_token: Option<String>,
        sink: RunEventSink,
        cancel_rx: tokio::sync::watch::Receiver<bool>,
    ) {
        let provider_id = request.provider_id;
        let project_id = request.context.project_id.clone();
        let auth_token_for_failure = auth_token.clone();
        let mut convex_run_id: Option<String> = None;

        let wireframe_kind = WireframeKind::parse(
            request
                .context
                .source
                .as_deref()
                .and_then(parse_kind_from_source),
        );
        let brand_source = WireframeBrandSource::parse(
            request
                .context
                .source
                .as_deref()
                .and_then(parse_brand_source_from_source),
        );
        let style_direction_id = request
            .context
            .source
            .as_deref()
            .and_then(parse_style_direction_from_source)
            .map(ToOwned::to_owned);
        let brand_kit_keys = request.context.brand_kit_keys.clone().unwrap_or_default();
        let target_screen_ids = request
            .context
            .source
            .as_deref()
            .and_then(parse_screens_from_source);
        let use_gateway = uses_nebius_gateway(request.context.source.as_deref());

        let workflow_started = Instant::now();
        // The scope is THE thing to know when a run feels slow: "2 screens took 13 minutes"
        // is only actionable once the log proves the run really was scoped to 2.
        tracing::info!(
            run_id = %run_id,
            provider_id = ?provider_id,
            project_id = ?project_id,
            kind = wireframe_kind.as_str(),
            scoped_screen_count = target_screen_ids.as_ref().map_or(0, Vec::len),
            scoped_screen_ids = ?target_screen_ids,
            "wireframes workflow started"
        );
        let dump = WireframesDebugDump::open(&run_id);
        dump.write_readme();

        let result = async {
            let auth_token = auth_token.ok_or_else(|| {
                WorkflowError::InvalidRequest("Missing desktop session for Wireframes.".to_string())
            })?;
            let project_id = project_id.as_deref().ok_or_else(|| {
                WorkflowError::InvalidRequest("Missing project id for Wireframes.".to_string())
            })?;

            tool_started(
                api_version,
                &run_id,
                provider_id,
                &sink,
                "stage-context",
                "Load Stage wireframes input",
            );
            let input_started = Instant::now();
            let input = self
                .repository
                .fetch_wireframes_input(&auth_token, project_id)
                .await?;
            tool_completed(api_version, &run_id, provider_id, &sink, "stage-context");
            tracing::info!(
                run_id = %run_id,
                input_elapsed_ms = input_started.elapsed().as_millis(),
                research_chars = input.research_artifact_json.as_deref().map_or(0, str::len),
                strategy_chars = input.strategy_artifact_json.len(),
                moodboard_chars = input.moodboard_artifact_json.as_deref().map_or(0, str::len),
                flows_chars = input.flows_artifact_json.as_deref().map_or(0, str::len),
                existing_artifact_chars = input
                    .existing_wireframes_artifact_json
                    .as_deref()
                    .map_or(0, str::len),
                "loaded wireframes input from Convex"
            );
            if matches!(wireframe_kind, WireframeKind::Hifi) {
                let preferences = resolve_hifi_prompt_preferences(&input);
                tracing::info!(
                    run_id = %run_id,
                    configured_skill_ids = ?input.enabled_skill_ids,
                    configured_component_pack_ids = ?input.enabled_component_pack_ids,
                    effective_skill_ids = ?preferences.skill_ids,
                    effective_component_pack_ids = ?preferences.component_pack_ids,
                    "resolved Hi-Fi wireframes skills and component libraries"
                );
                dump.write_meta(serde_json::json!({
                    "runId": run_id,
                    "kind": wireframe_kind.as_str(),
                    "providerId": format!("{provider_id:?}"),
                    "projectId": project_id,
                    "scopedScreenIds": target_screen_ids,
                    "configuredSkillIds": input.enabled_skill_ids,
                    "configuredComponentPackIds": input.enabled_component_pack_ids,
                    "effectiveSkillIds": preferences.skill_ids,
                    "effectiveComponentPackIds": preferences.component_pack_ids,
                    "brandSource": brand_source.map(|s| format!("{s:?}")),
                    "styleDirectionId": style_direction_id,
                    "dumpDir": dump.dir().map(|p| p.display().to_string()),
                }));
            } else {
                tracing::info!(
                    run_id = %run_id,
                    kind = wireframe_kind.as_str(),
                    "wireframes skills and component libraries are not applied to Lo-Fi generation"
                );
                dump.write_meta(serde_json::json!({
                    "runId": run_id,
                    "kind": wireframe_kind.as_str(),
                    "providerId": format!("{provider_id:?}"),
                    "projectId": project_id,
                    "scopedScreenIds": target_screen_ids,
                    "note": "Lo-Fi — component packs not applied",
                    "dumpDir": dump.dir().map(|p| p.display().to_string()),
                }));
            }

            convex_run_id = self
                .repository
                .create_wireframes_run(
                    &auth_token,
                    project_id,
                    &run_id,
                    Some(request.prompt.as_str()),
                )
                .await?;

            let expected_plan_screen_ids = expected_screen_ids(
                input.existing_wireframes_artifact_json.as_deref(),
                input.flows_artifact_json.as_deref(),
                target_screen_ids.as_deref(),
            );
            let mut provider_workspace = if matches!(wireframe_kind, WireframeKind::Hifi) {
                Some(ProviderWorkspace::create(&run_id).map_err(|error| {
                    WorkflowError::Internal(format!(
                        "could not create isolated provider workspace: {error}"
                    ))
                })?)
            } else {
                None
            };
            let mut common_workspace_files = if let Some(workspace) = provider_workspace.as_mut() {
                Some(materialize_common_workspace(
                    workspace,
                    &input,
                    &request,
                    &expected_plan_screen_ids,
                    brand_source,
                    style_direction_id.as_deref(),
                )?)
            } else {
                None
            };

            // For a brand-kit Hi-Fi run, fetch the uploaded brand kit files and attach them so
            // the model derives palette/typography/logo from the real brand kit. The user
            // uploaded files expecting them used, so if none can be loaded (R2 base unset,
            // expired URLs, 404s) we fail loudly rather than silently produce a generic result.
            let brand_kit_requested = matches!(brand_source, Some(WireframeBrandSource::BrandKit))
                && !brand_kit_keys.is_empty();
            let brand_kit_attached = if brand_kit_requested {
                let workspace = provider_workspace.as_mut().ok_or_else(|| {
                    WorkflowError::Internal(
                        "brand-kit wireframes require an isolated provider workspace".to_string(),
                    )
                })?;
                let (attachments, brand_files) = fetch_visual_attachments(
                    self.r2_public_base_url.as_deref(),
                    &brand_kit_keys,
                    workspace,
                    "brand-kit",
                    "uploaded brand kit evidence",
                    MAX_BRAND_KIT_FILES,
                    false,
                )
                .await?;
                if attachments.is_empty() {
                    return Err(WorkflowError::InvalidRequest(
                        "Could not load the uploaded brand kit files. Check R2 configuration and the uploads, then try again.".to_string(),
                    ));
                }
                tracing::info!(
                    run_id = %run_id,
                    count = attachments.len(),
                    "attached brand kit files for wireframes provider run"
                );
                request.attachments.extend(attachments);
                if let Some(files) = common_workspace_files.as_mut() {
                    files.director_required.extend(brand_files.iter().cloned());
                    files.screen_required.extend(brand_files);
                }
                true
            } else {
                false
            };

            if matches!(wireframe_kind, WireframeKind::Hifi) {
                let moodboard_keys = selected_moodboard_asset_keys(
                    input.moodboard_artifact_json.as_deref(),
                    style_direction_id.as_deref(),
                );
                let moodboard_images_required = matches!(
                    brand_source,
                    Some(WireframeBrandSource::StyleGuide)
                ) && style_direction_id.is_some();
                if moodboard_images_required && moodboard_keys.is_empty() {
                    return Err(WorkflowError::InvalidRequest(
                        "The selected style direction has no usable moodboard image assets. Re-save the moodboard direction, then try again."
                            .to_string(),
                    ));
                }
                if !moodboard_keys.is_empty() {
                    let workspace = provider_workspace.as_mut().ok_or_else(|| {
                        WorkflowError::Internal(
                            "Hi-Fi moodboard images require an isolated provider workspace"
                                .to_string(),
                        )
                    })?;
                    let (attachments, moodboard_files) = fetch_visual_attachments(
                        self.r2_public_base_url.as_deref(),
                        &moodboard_keys,
                        workspace,
                        "moodboard",
                        "selected moodboard image evidence",
                        MAX_MOODBOARD_IMAGES,
                        true,
                    )
                    .await?;
                    if moodboard_images_required && attachments.is_empty() {
                        return Err(WorkflowError::InvalidRequest(
                            "Could not load the selected moodboard images. Check R2 configuration and the moodboard assets, then try again."
                                .to_string(),
                        ));
                    }
                    tracing::info!(
                        run_id = %run_id,
                        count = attachments.len(),
                        "attached selected moodboard images for wireframes provider run"
                    );
                    request.attachments.extend(attachments);
                    if let Some(files) = common_workspace_files.as_mut() {
                        files.director_required.extend(moodboard_files.iter().cloned());
                        files.screen_required.extend(moodboard_files);
                    }
                }
            }

            if let Some(workspace) = provider_workspace.as_mut() {
                workspace.seal().map_err(|error| {
                    WorkflowError::Internal(format!(
                        "could not seal isolated provider workspace: {error}"
                    ))
                })?;
                request.working_directory = Some(workspace.root().to_string_lossy().into_owned());
                for attachment in request.attachments.iter_mut().filter(|attachment| {
                    attachment.id.starts_with("brand-kit-")
                        || attachment.id.starts_with("moodboard-")
                }) {
                    if let Some(name) = attachment.name.as_deref() {
                        attachment.local_path = Some(
                            workspace
                                .root()
                                .join("assets")
                                .join(name)
                                .to_string_lossy()
                                .into_owned(),
                        );
                    }
                }
                dump.write_json("00-provider-workspace-manifest.json", &workspace.manifest_json());
                tracing::info!(
                    run_id = %run_id,
                    path = %workspace.root().display(),
                    "sealed isolated provider workspace"
                );
            }

            let design_plan = if use_gateway {
                if !matches!(wireframe_kind, WireframeKind::Hifi) {
                    return Err(WorkflowError::InvalidRequest(
                        "Nebius is only available for Hi-Fi wireframes.".to_string(),
                    ));
                }
                gateway_health().await.map_err(WorkflowError::InvalidRequest)?;
                None
            } else if matches!(wireframe_kind, WireframeKind::Hifi) {
                let Some(plan) = resolve_design_plan(
                    api_version,
                    &run_id,
                    provider_id,
                    &request,
                    &input,
                    target_screen_ids.as_deref(),
                    &expected_plan_screen_ids,
                    provider_workspace.as_mut().ok_or_else(|| {
                        WorkflowError::Internal(
                            "Hi-Fi wireframes require a provider workspace".to_string(),
                        )
                    })?,
                    common_workspace_files.as_ref().ok_or_else(|| {
                        WorkflowError::Internal(
                            "Hi-Fi wireframes require a context manifest".to_string(),
                        )
                    })?,
                    &sink,
                    &cancel_rx,
                    &dump,
                )
                .await?
                else {
                    tracing::info!(run_id = %run_id, "wireframes Design Director run cancelled");
                    if let Err(error) = self
                        .repository
                        .cancel_wireframes_run(
                            &auth_token,
                            project_id,
                            convex_run_id.as_deref(),
                        )
                        .await
                    {
                        tracing::warn!(error = error.to_string(), "failed to persist cancelled wireframes run");
                    }
                    return Ok(());
                };
                Some(plan)
            } else {
                None
            };
            let design_plan_json = design_plan
                .as_ref()
                .map(serde_json::to_string)
                .transpose()?;
            let scoped_gateway_flows = target_screen_ids.as_ref().and_then(|ids| {
                input.flows_artifact_json.as_deref().map(|flows| {
                    let ids = ids.iter().map(String::as_str).collect::<Vec<_>>();
                    scope_flows_artifact(flows, &ids)
                })
            });
            let gateway_design_context = use_gateway.then(|| GatewayDesignContext {
                project_name: input.project_name.clone(),
                project_type: input.project_type.clone(),
                viewport_guidance: WireframeViewport::from_project_type(&input.project_type)
                    .prompt_guidance()
                    .to_string(),
                brand_source: match brand_source {
                    Some(WireframeBrandSource::StyleGuide) => "style-guide",
                    Some(WireframeBrandSource::BrandKit) => "brand-kit",
                    None => "none",
                }
                .to_string(),
                style_direction_id: style_direction_id.clone(),
                strategy_artifact: input.strategy_artifact_json.clone(),
                research_artifact: target_screen_ids
                    .is_none()
                    .then(|| input.research_artifact_json.clone())
                    .flatten(),
                moodboard_artifact: input.moodboard_artifact_json.clone(),
                flows_artifact: scoped_gateway_flows
                    .or_else(|| input.flows_artifact_json.clone()),
                selected_skills: workspace_selected_skills(&input)
                    .into_iter()
                    .map(|(id, guidance)| GatewaySkill {
                        id: id.to_string(),
                        guidance,
                    })
                    .collect(),
            });
            if let (Some(workspace), Some(plan_json)) =
                (provider_workspace.as_mut(), design_plan_json.as_deref())
            {
                workspace
                    .write_text(
                        "design/design-plan.json",
                        "validated shared Design Director plan",
                        ContextAccessPolicy::OnDemand,
                        &["screen:*"],
                        plan_json,
                    )
                    .map_err(|error| {
                        WorkflowError::Internal(format!(
                            "could not persist the shared design plan in the provider workspace: {error}"
                        ))
                    })?;
            }

            if let Some(plan) = design_plan.as_ref() {
                let plan_value = serde_json::to_value(plan)?;
                self.repository
                    .checkpoint_wireframes_run(
                        &auth_token,
                        project_id,
                        convex_run_id.as_deref(),
                        "design-plan",
                        None,
                        &plan_value,
                    )
                    .await
                    .map_err(|error| {
                        WorkflowError::Internal(format!(
                            "could not persist Design Director checkpoint: {error}"
                        ))
                    })?;
            }

            // CLI providers keep their isolated per-screen calls. Nebius receives one
            // shared batch so every screen sees the same project, style, and flow context;
            // local rendering and repair remain screen-specific after the response.
            let screen_ids = target_screen_ids
                .as_ref()
                .filter(|ids| !ids.is_empty())
                .cloned()
                .or_else(|| {
                    design_plan.as_ref().map(|plan| {
                        plan.screens
                            .iter()
                            .map(|screen| screen.screen_id.clone())
                            .collect()
                    })
                })
                .unwrap_or_default();
            let mut provider_was_cancelled = false;
            let mut completed_screen_ids = screen_ids.clone();
            let mut catalog_evidence = serde_json::Map::new();
            let mut catalog_render_files = BTreeMap::new();
            let mut gateway_jobs = Vec::with_capacity(screen_ids.len());
            let final_text = if screen_ids.is_empty() == false {
                let configured_screens = configured_screens_from_input(&input);
                let mut requests = Vec::with_capacity(screen_ids.len());
                for screen_id in &screen_ids {
                    let mut screen_request = request.clone();
                    if matches!(wireframe_kind, WireframeKind::Hifi) {
                        let libraries = resolve_hifi_prompt_preferences(&input)
                            .component_pack_ids
                            .into_iter()
                            .map(|library| catalog_library_id(&library).to_string())
                            .collect::<Vec<_>>();
                        if use_gateway {
                            let screen_plan = rag_screen_plan(
                                screen_id,
                                &configured_screens,
                            );
                            let catalog_context = materialize_catalog_context(
                                &self.catalog,
                                &auth_token,
                                &run_id,
                                screen_id,
                                &screen_plan,
                                &libraries,
                                provider_workspace.as_mut().ok_or_else(|| {
                                    WorkflowError::Internal(
                                        "RAG retrieval requires a provider workspace".to_string(),
                                    )
                                })?,
                            )
                            .await?;
                            catalog_evidence.insert(screen_id.clone(), catalog_context.evidence);
                            merge_catalog_render_files(
                                &mut catalog_render_files,
                                catalog_context.render_files,
                            );
                            gateway_jobs.push(GatewayScreenJob {
                                screen_id: screen_id.clone(),
                                title: screen_plan.screen_role.clone(),
                                intent: screen_plan.purpose,
                                libraries,
                                bundles: catalog_context.bundles,
                                validation_failures: Vec::new(),
                            });
                            continue;
                        }
                        let plan_json = design_plan_json.as_deref().ok_or_else(|| {
                            WorkflowError::Internal(
                                "Hi-Fi screen generation requires a validated design plan"
                                    .to_string(),
                            )
                        })?;
                        let catalog_context = {
                            let screen_plan = design_plan
                                .as_ref()
                                .and_then(|plan| {
                                    plan.screens
                                        .iter()
                                        .find(|screen| screen.screen_id.as_str() == screen_id)
                                })
                                .ok_or_else(|| {
                                    WorkflowError::Internal(format!(
                                        "RAG retrieval requires a design plan for screen {screen_id}"
                                    ))
                                })?;
                            let libraries = resolve_hifi_prompt_preferences(&input)
                                .component_pack_ids
                                .into_iter()
                                .map(|library| catalog_library_id(&library).to_string())
                                .collect::<Vec<_>>();
                            materialize_catalog_context(
                                    &self.catalog,
                                    &auth_token,
                                    &run_id,
                                    screen_id,
                                    screen_plan,
                                    &libraries,
                                    provider_workspace.as_mut().ok_or_else(|| {
                                        WorkflowError::Internal(
                                            "RAG retrieval requires a provider workspace".to_string(),
                                        )
                                    })?,
                                )
                                .await?
                        };
                        let call_files = materialize_screen_call(
                            provider_workspace.as_mut().ok_or_else(|| {
                                WorkflowError::Internal(
                                    "Hi-Fi screen generation requires a provider workspace"
                                        .to_string(),
                                )
                            })?,
                            common_workspace_files.as_ref().ok_or_else(|| {
                                WorkflowError::Internal(
                                    "Hi-Fi screen generation requires a context manifest"
                                        .to_string(),
                                )
                            })?,
                            &input,
                            brand_source,
                            style_direction_id.as_deref(),
                            brand_kit_attached,
                            screen_id,
                            plan_json,
                            Some(catalog_context.index_json.as_str()),
                            catalog_context.source_paths.as_slice(),
                        )?;
                        catalog_evidence.insert(screen_id.clone(), catalog_context.evidence);
                        merge_catalog_render_files(
                            &mut catalog_render_files,
                            catalog_context.render_files,
                        );
                        configure_provider_workspace_call(
                            &mut screen_request,
                            &call_files,
                            &format!(
                                "Implement only the planned Stage Hi-Fi React screen `{screen_id}`."
                            ),
                        )?;
                    } else {
                        screen_request.prompt = build_wireframes_prompt_with_plan(
                            &input,
                            wireframe_kind,
                            brand_source,
                            style_direction_id.as_deref(),
                            None,
                            brand_kit_attached,
                            Some(std::slice::from_ref(screen_id)),
                            design_plan_json.as_deref(),
                        );
                    }
                    dump.write_prompt(screen_id, &screen_request.prompt);
                    requests.push((screen_id.clone(), screen_request));
                }
                let prompt_chars: usize = requests
                    .iter()
                    .map(|(_, request)| request.prompt.chars().count())
                    .sum();
                tracing::info!(
                    run_id = %run_id,
                    provider_id = ?provider_id,
                    kind = wireframe_kind.as_str(),
                    screen_count = screen_ids.len(),
                    gateway_batch = use_gateway,
                    max_parallel = MAX_PARALLEL_SCREEN_RUNS,
                    max_gateway_screens_per_request = MAX_GATEWAY_SCREENS_PER_REQUEST,
                    prompt_chars,
                    "starting wireframes screen generation"
                );
                request.prompt = requests
                    .first()
                    .map(|(_, request)| request.prompt.clone())
                    .unwrap_or_default();
                let started = Instant::now();
                let batch = if use_gateway {
                    run_screens_via_gateway(
                        api_version,
                        &run_id,
                        provider_id,
                        &auth_token,
                        gateway_design_context.as_ref().ok_or_else(|| {
                            WorkflowError::Internal(
                                "Nebius batch requires Stage design context".to_string(),
                            )
                        })?,
                        &gateway_jobs,
                        configured_screens,
                        provider_workspace
                            .as_ref()
                            .map(|workspace| workspace.root().join("checkpoints/initial")),
                        &sink,
                        &cancel_rx,
                        dump.clone(),
                    )
                    .await?
                } else {
                    run_screens_in_parallel(
                        api_version,
                        &run_id,
                        provider_id,
                        requests,
                        provider_workspace
                            .as_ref()
                            .map(|workspace| workspace.root().join("checkpoints/initial")),
                        &sink,
                        &cancel_rx,
                        dump.clone(),
                    )
                    .await?
                };
                if let Some(workspace) = provider_workspace.as_ref() {
                    workspace.verify_integrity().map_err(|error| {
                        WorkflowError::Internal(format!(
                            "provider workspace changed during screen generation: {error}"
                        ))
                    })?;
                }
                let Some(batch) = batch else {
                    tracing::info!(run_id = %run_id, "wireframes provider run cancelled");
                    if let Err(error) = self
                        .repository
                        .cancel_wireframes_run(
                            &auth_token,
                            project_id,
                            convex_run_id.as_deref(),
                        )
                        .await
                    {
                        tracing::warn!(error = error.to_string(), "failed to persist cancelled wireframes run");
                    }
                    return Ok(());
                };
                provider_was_cancelled = batch.cancelled;
                let returned_screen_ids = batch
                    .screens
                    .iter()
                    .filter_map(|screen| screen.get("id").and_then(serde_json::Value::as_str))
                    .collect::<std::collections::HashSet<_>>();
                completed_screen_ids = screen_ids
                    .iter()
                    .filter(|id| returned_screen_ids.contains(id.as_str()))
                    .cloned()
                    .collect();
                if batch.cancelled {
                    tracing::info!(
                        run_id = run_id.as_str(),
                        completed_screen_count = completed_screen_ids.len(),
                        "wireframes cancellation preserved completed screens"
                    );
                }
                tracing::info!(
                    run_id = %run_id,
                    provider_elapsed_ms = started.elapsed().as_millis(),
                    screens_returned = batch.screens.len(),
                    screens_requested = screen_ids.len(),
                    configure_entries = batch.configure.len(),
                    "wireframes provider batch finished"
                );
                if batch.screens.is_empty() {
                    return Err(WorkflowError::InvalidRequest(
                        "None of the selected screens could be generated. Try again.".to_string(),
                    ));
                }
                for screen in &batch.screens {
                    dump.write_tsx_from_screen(screen);
                }
                serde_json::json!({
                    "generatedScreens": batch.screens,
                    "configureScreens": configured_screens_from_input(&input),
                })
                .to_string()
            } else {
                request.prompt = build_wireframes_prompt_with_plan(
                    &input,
                    wireframe_kind,
                    brand_source,
                    style_direction_id.as_deref(),
                    None,
                    brand_kit_attached,
                    if screen_ids.is_empty() {
                        target_screen_ids.as_deref()
                    } else {
                        Some(screen_ids.as_slice())
                    },
                    design_plan_json.as_deref(),
                );
                let request_prompt_chars = request.prompt.chars().count();
                let single_label = screen_ids
                    .first()
                    .map(String::as_str)
                    .unwrap_or("single");
                dump.write_prompt(single_label, &request.prompt);
                tracing::info!(
                    run_id = %run_id,
                    provider_id = ?provider_id,
                    kind = wireframe_kind.as_str(),
                    scoped_screen_count = screen_ids.len(),
                    prompt_chars = request_prompt_chars,
                    "starting wireframes provider run"
                );
                let provider_context = ProviderRunContext {
                    api_version,
                    run_id: run_id.clone(),
                    request: request.clone(),
                };
                let provider_started = Instant::now();
                let outcome =
                    run_provider_collect(provider_context, sink.clone(), cancel_rx.clone()).await?;
                tracing::info!(
                    run_id = %run_id,
                    provider_id = ?provider_id,
                    kind = wireframe_kind.as_str(),
                    provider_elapsed_ms = provider_started.elapsed().as_millis(),
                    "wireframes provider run finished"
                );
                let ProviderProcessOutcome::Completed(text) = outcome else {
                    tracing::info!(run_id = %run_id, "wireframes provider run cancelled");
                    if let Err(error) = self
                        .repository
                        .cancel_wireframes_run(
                            &auth_token,
                            project_id,
                            convex_run_id.as_deref(),
                        )
                        .await
                    {
                        tracing::warn!(error = error.to_string(), "failed to persist cancelled wireframes run");
                    }
                    return Ok(());
                };
                dump.write_provider_raw(single_label, &text);
                text
            };
            // "did not contain a valid artifact" cannot distinguish a truncated response
            // from one wrapped in prose or code fences. Log the size and tail so the next
            // failure is diagnosable from the log instead of another rerun.
            let raw_artifact = extract_wireframes_artifact(&final_text).inspect_err(|error| {
                let char_count = final_text.chars().count();
                let tail: String = final_text.chars().skip(char_count.saturating_sub(400)).collect();
                tracing::error!(
                    run_id = %run_id,
                    output_chars = char_count,
                    %error,
                    output_tail = %tail,
                    "wireframes provider output could not be parsed"
                );
            })?;
            let mut artifact = normalize_wireframes_artifact(
                raw_artifact,
                &input,
                wireframe_kind,
                brand_source,
                style_direction_id.as_deref(),
                now_millis(),
                GENERATED_AT_LABEL,
            )?;
            if let Some(plan) = design_plan.as_ref()
                && let Some(object) = artifact.as_object_mut()
            {
                object.insert("designPlan".to_string(), serde_json::to_value(plan)?);
            }
            if matches!(wireframe_kind, WireframeKind::Hifi)
                && let Some(object) = artifact.as_object_mut()
            {
                object.insert(
                    "catalogRetrieval".to_string(),
                    serde_json::json!({
                        "required": true,
                        "screens": catalog_evidence,
                    }),
                );
            }

            if let Some(screens) = artifact
                .get("generatedScreens")
                .and_then(serde_json::Value::as_array)
            {
                for screen in screens {
                    dump.write_tsx_from_screen(screen);
                }
            }

            let mut rendered_css: Option<String> = None;
            let mut gate_failures = Vec::new();
            let mut quality_runtime = None;
            if matches!(wireframe_kind, WireframeKind::Hifi) {
                let pack_ids = resolve_hifi_prompt_preferences(&input).component_pack_ids;
                if let Some(plan) = design_plan.as_ref() {
                    gate_failures = validate_artifact_against_plan(
                        &artifact,
                        plan,
                        &pack_ids,
                        &completed_screen_ids,
                    )
                    .map_err(|error| WorkflowError::GenerationFailed(error.to_string()))?;
                }
                let theme = brand_theme(
                    input.moodboard_artifact_json.as_deref(),
                    style_direction_id.as_deref(),
                );
                tracing::info!(
                    run_id = %run_id,
                    brand_theme_applied = theme.is_some(),
                    plan_gate_failures = gate_failures.len(),
                    "resolved wireframe quality runtime"
                );
                let render_started = Instant::now();
                let catalog_files: Vec<_> = catalog_render_files.values().cloned().collect();
                let render_screen_ids = artifact
                    .get("generatedScreens")
                    .and_then(serde_json::Value::as_array)
                    .into_iter()
                    .flatten()
                    .filter_map(|screen| {
                        screen
                            .get("id")
                            .and_then(serde_json::Value::as_str)
                            .map(str::to_string)
                    })
                    .collect::<Vec<_>>();
                let outcome = apply_react_render(
                    &mut artifact,
                    theme.as_ref(),
                    &catalog_files,
                    &render_screen_ids,
                )
                .await
                .map_err(|error| {
                    WorkflowError::GenerationFailed(format!(
                        "React renderer rejected generated screens: {error}"
                    ))
                })?;
                rendered_css = outcome.css;
                gate_failures = merge_quality_failures(gate_failures, outcome.failures);
                tracing::info!(
                    run_id = %run_id,
                    render_elapsed_ms = render_started.elapsed().as_millis(),
                    failed = gate_failures.len(),
                    "completed mandatory RAG wireframe quality gates"
                );
                quality_runtime = Some((pack_ids, theme));
            }

            if provider_was_cancelled && !gate_failures.is_empty() {
                let failed_ids = gate_failures
                    .iter()
                    .map(|failure| failure.id.as_str())
                    .collect::<std::collections::HashSet<_>>();
                if let Some(screens) = artifact
                    .get_mut("generatedScreens")
                    .and_then(serde_json::Value::as_array_mut)
                {
                    screens.retain(|screen| {
                        screen
                            .get("id")
                            .and_then(serde_json::Value::as_str)
                            .is_none_or(|id| !failed_ids.contains(id))
                    });
                }
                completed_screen_ids.retain(|id| !failed_ids.contains(id.as_str()));
                if completed_screen_ids.is_empty() {
                    tracing::info!(run_id = run_id.as_str(), "cancelled wireframes run had no validated screens to save");
                    if let Err(error) = self
                        .repository
                        .cancel_wireframes_run(
                            &auth_token,
                            project_id,
                            convex_run_id.as_deref(),
                        )
                        .await
                    {
                        tracing::warn!(error = error.to_string(), "failed to persist cancelled wireframes run");
                    }
                    return Ok(());
                }
                tracing::info!(
                    run_id = run_id.as_str(),
                    dropped_failed_screens = gate_failures.len(),
                    "cancelled wireframes run keeps only completed validated screens"
                );
                gate_failures.clear();
            }

            if !gate_failures.is_empty() {
                if use_gateway {
                    tracing::warn!(
                        run_id = %run_id,
                        failed = gate_failures.len(),
                        "repairing failed Nebius screens once"
                    );
                    let repair_started = Instant::now();
                    let mut unresolved_ids = gate_failures
                        .iter()
                        .map(|failure| failure.id.clone())
                        .collect::<std::collections::HashSet<_>>();
                    let repair_jobs = gateway_jobs
                        .iter()
                        .filter_map(|job| {
                            let failure = gate_failures
                                .iter()
                                .find(|failure| failure.id == job.screen_id)?;
                            let mut repair = job.clone();
                            repair.validation_failures = vec![repair_prompt_for_failures(
                                std::slice::from_ref(failure),
                            )];
                            Some(repair)
                        })
                        .collect::<Vec<_>>();
                    let repair_ids = repair_jobs
                        .iter()
                        .map(|job| job.screen_id.clone())
                        .collect::<Vec<_>>();
                    if !repair_jobs.is_empty() {
                        let repair_result = run_screens_via_gateway(
                            api_version,
                            &run_id,
                            provider_id,
                            &auth_token,
                            gateway_design_context.as_ref().ok_or_else(|| {
                                WorkflowError::Internal(
                                    "Nebius repair requires Stage design context".to_string(),
                                )
                            })?,
                            &repair_jobs,
                            Vec::new(),
                            provider_workspace
                                .as_ref()
                                .map(|workspace| workspace.root().join("checkpoints/repair")),
                            &sink,
                            &cancel_rx,
                            dump.clone(),
                        )
                        .await;
                        if let Ok(Some(repair_batch)) = repair_result {
                            merge_tsx_screens(
                                &mut artifact,
                                &serde_json::json!({ "generatedScreens": repair_batch.screens }),
                            );
                            let Some((_, theme)) = quality_runtime.as_ref() else {
                                return Err(WorkflowError::Internal(
                                    "Nebius repair had no Hi-Fi quality runtime".to_string(),
                                ));
                            };
                            let catalog_files: Vec<_> =
                                catalog_render_files.values().cloned().collect();
                            let outcome = apply_react_render(
                                &mut artifact,
                                theme.as_ref(),
                                &catalog_files,
                                &repair_ids,
                            )
                            .await
                            .map_err(|error| {
                                WorkflowError::GenerationFailed(format!(
                                    "React renderer rejected repaired Nebius screens: {error}"
                                ))
                            })?;
                            if outcome.css.is_some() {
                                rendered_css = outcome.css;
                            }
                            let failed_after_repair = outcome
                                .failures
                                .iter()
                                .map(|failure| failure.id.as_str())
                                .collect::<std::collections::HashSet<_>>();
                            for id in &repair_ids {
                                if !failed_after_repair.contains(id.as_str()) {
                                    unresolved_ids.remove(id);
                                }
                            }
                        } else if let Err(error) = repair_result {
                            tracing::warn!(
                                run_id = %run_id,
                                error = %error,
                                "Nebius repair failed; preserving the successful first-pass screens"
                            );
                        }
                    }
                    if !unresolved_ids.is_empty() {
                        tracing::warn!(
                            run_id = %run_id,
                            failed = unresolved_ids.len(),
                            "dropping only screens that remained invalid after repair"
                        );
                        if let Some(screens) = artifact
                            .get_mut("generatedScreens")
                            .and_then(serde_json::Value::as_array_mut)
                        {
                            screens.retain(|screen| {
                                screen
                                    .get("id")
                                    .and_then(serde_json::Value::as_str)
                                    .is_none_or(|id| !unresolved_ids.contains(id))
                            });
                        }
                        completed_screen_ids
                            .retain(|id| !unresolved_ids.contains(id.as_str()));
                    }
                    tracing::info!(
                        run_id = %run_id,
                        repair_elapsed_ms = repair_started.elapsed().as_millis(),
                        repaired = repair_ids.len().saturating_sub(unresolved_ids.len()),
                        "Nebius screen repair finished"
                    );
                    gate_failures.clear();
                } else {
                tracing::warn!(
                    run_id = %run_id,
                    failed = gate_failures.len(),
                    "repairing failed wireframe quality gates once"
                );
                let repair_started = Instant::now();
                let repair_ids = gate_failures
                    .iter()
                    .map(|failure| failure.id.clone())
                    .collect::<Vec<_>>();
                let Some((pack_ids, theme)) = quality_runtime.as_ref() else {
                    return Err(WorkflowError::Internal(
                        "wireframe quality repair had no Hi-Fi runtime".to_string(),
                    ));
                };
                let workspace = provider_workspace.as_mut().ok_or_else(|| {
                    WorkflowError::Internal(
                        "Hi-Fi quality repair requires a provider workspace".to_string(),
                    )
                })?;
                let common = common_workspace_files.as_ref().ok_or_else(|| {
                    WorkflowError::Internal(
                        "Hi-Fi quality repair requires a context manifest".to_string(),
                    )
                })?;
                let mut repair_requests = Vec::with_capacity(gate_failures.len());
                for failure in &gate_failures {
                    let safe_id = safe_context_segment(&failure.id);
                    let evidence_path = format!("repairs/screens/{safe_id}/failure.md");
                    workspace
                        .write_text(
                            &evidence_path,
                            "renderer or design-plan validation failure and previous TSX",
                            ContextAccessPolicy::Required,
                            &[&format!("screen-{}-repair", failure.id)],
                            &repair_prompt_for_failures(std::slice::from_ref(failure)),
                        )
                        .map_err(|error| {
                            WorkflowError::Internal(format!(
                                "could not materialize repair evidence for {}: {error}",
                                failure.id
                            ))
                        })?;
                    let mut required = common.screen_required.clone();
                    required.extend(screen_workspace_required_files(&failure.id));
                    required.push(evidence_path);
                    let call_files = workspace
                        .write_call_manifest(
                            &format!("screen-{}-repair", failure.id),
                            &required,
                            &common.screen_on_demand,
                        )
                        .map_err(|error| {
                            WorkflowError::Internal(format!(
                                "could not create repair manifest for {}: {error}",
                                failure.id
                            ))
                        })?;
                    workspace.verify_integrity().map_err(|error| {
                        WorkflowError::Internal(format!("provider workspace integrity check failed: {error}"))
                    })?;
                    let mut repair_request = request.clone();
                    configure_provider_workspace_call(
                        &mut repair_request,
                        &call_files,
                        &format!(
                            "Repair only the failed Stage Hi-Fi React screen `{}` once.",
                            failure.id
                        ),
                    )?;
                    dump.write_prompt(&format!("repair-{}", failure.id), &repair_request.prompt);
                    repair_requests.push((failure.id.clone(), repair_request));
                }
                let repair_batch = run_screens_in_parallel(
                    api_version,
                    &run_id,
                    provider_id,
                    repair_requests,
                    Some(workspace.root().join("checkpoints/repair")),
                    &sink,
                    &cancel_rx,
                    dump.clone(),
                )
                .await?
                    .ok_or_else(|| {
                        WorkflowError::GenerationFailed(
                            "wireframe quality repair was cancelled".to_string(),
                        )
                    })?;
                workspace.verify_integrity().map_err(|error| {
                    WorkflowError::Internal(format!(
                        "provider workspace changed during screen repair: {error}"
                    ))
                })?;
                let repair_raw = serde_json::json!({
                    "generatedScreens": repair_batch.screens,
                    "configureScreens": repair_batch.configure,
                });
                let repair_normalized = normalize_wireframes_artifact(
                    repair_raw,
                    &input,
                    wireframe_kind,
                    brand_source,
                    style_direction_id.as_deref(),
                    now_millis(),
                    GENERATED_AT_LABEL,
                )?;
                merge_tsx_screens(&mut artifact, &repair_normalized);

                let mut remaining = if let Some(plan) = design_plan.as_ref() {
                    validate_artifact_against_plan(
                        &artifact,
                        plan,
                        pack_ids,
                        &completed_screen_ids,
                    )
                        .map_err(|error| WorkflowError::GenerationFailed(error.to_string()))?
                } else {
                    Vec::new()
                };
                let catalog_files: Vec<_> = catalog_render_files.values().cloned().collect();
                let outcome = apply_react_render(
                    &mut artifact,
                    theme.as_ref(),
                    &catalog_files,
                    &repair_ids,
                )
                .await
                .map_err(|error| {
                    WorkflowError::GenerationFailed(format!(
                        "React renderer rejected repaired screens: {error}"
                    ))
                })?;
                if outcome.css.is_some() {
                    rendered_css = outcome.css;
                }
                remaining = merge_quality_failures(remaining, outcome.failures);
                if !remaining.is_empty() {
                    let reasons = remaining
                        .iter()
                        .map(|failure| format!("{}: {}", failure.id, failure.error))
                        .collect::<Vec<_>>()
                        .join(" | ");
                    return Err(WorkflowError::GenerationFailed(format!(
                        "quality validation failed after one repair: {reasons}"
                    )));
                }
                tracing::info!(
                    run_id = %run_id,
                    repair_elapsed_ms = repair_started.elapsed().as_millis(),
                    repaired = repair_ids.len(),
                    "wireframe quality repair passed all gates"
                );
                }
            }

            let mut accepted_screen_ids = artifact
                .get("generatedScreens")
                .and_then(serde_json::Value::as_array)
                .into_iter()
                .flatten()
                .filter_map(|screen| {
                    screen
                        .get("id")
                        .and_then(serde_json::Value::as_str)
                        .map(str::to_string)
                })
                .collect::<Vec<_>>();
            if accepted_screen_ids.is_empty() {
                return Err(WorkflowError::GenerationFailed(
                    "No generated screen passed local rendering.".to_string(),
                ));
            }
            let merge_failed_screen_ids;
            (artifact, merge_failed_screen_ids) = apply_scoped_screens(
                input.existing_wireframes_artifact_json.as_deref(),
                artifact,
                Some(&accepted_screen_ids),
                wireframe_kind,
            )
            .map_err(|error| WorkflowError::Internal(error.to_string()))?;
            completed_screen_ids.retain(|id| !merge_failed_screen_ids.contains(id));
            accepted_screen_ids.retain(|id| !merge_failed_screen_ids.contains(id));

            if matches!(wireframe_kind, WireframeKind::Hifi)
                && let Some(workspace) = provider_workspace.as_mut()
                && let Some(screens) = artifact
                    .get("generatedScreens")
                    .and_then(serde_json::Value::as_array)
            {
                for screen in screens {
                    let Some(screen_id) = screen.get("id").and_then(serde_json::Value::as_str)
                    else {
                        continue;
                    };
                    if !accepted_screen_ids.iter().any(|id| id == screen_id) {
                        continue;
                    }
                    let body = serde_json::to_string(screen)?;
                    workspace
                        .write_text(
                            &format!(
                                "checkpoints/validated/{}.json",
                                safe_context_segment(screen_id)
                            ),
                            "screen accepted by response, plan, and renderer gates",
                            ContextAccessPolicy::OnDemand,
                            &["recovery"],
                            &body,
                        )
                        .map_err(|error| {
                            WorkflowError::Internal(format!(
                                "could not checkpoint validated screen {screen_id}: {error}"
                            ))
                        })?;
                    let mut durable_screen = screen.clone();
                    if let Some(object) = durable_screen.as_object_mut() {
                        object.remove("html");
                        object.remove("liveHtml");
                        object.remove("htmlUrl");
                        object.remove("liveUrl");
                    }
                    self.repository
                        .checkpoint_wireframes_run(
                            &auth_token,
                            project_id,
                            convex_run_id.as_deref(),
                            "screen",
                            Some(screen_id),
                            &durable_screen,
                        )
                        .await
                        .map_err(|error| {
                            WorkflowError::Internal(format!(
                                "could not persist validated screen checkpoint {screen_id}: {error}"
                            ))
                        })?;
                }
            }

            let failed_screen_ids = screen_ids
                .iter()
                .filter(|id| !completed_screen_ids.contains(id))
                .cloned()
                .collect::<Vec<_>>();
            if matches!(wireframe_kind, WireframeKind::Hifi) {
                dump.write_render_outputs(&artifact);
            }

            // Offload before saving: inline rendered fragments are what pushed the
            // artifact past Convex's 1 MiB document limit and lost whole runs.
            if let Some(css) = rendered_css.as_deref() {
                offload_rendered_screens(&self.asset_uploader, &auth_token, project_id, &mut artifact, css)
                    .await;
            }
            dump.write_artifact_keys(&artifact);
            if let Some(dir) = dump.dir() {
                tracing::info!(
                    run_id = %run_id,
                    path = %dir.display(),
                    "wireframes debug dump complete — open this folder to inspect prompt/tsx/live/static"
                );
            }

            let save_started = Instant::now();
            self.repository
                .complete_wireframes_run(
                    &auth_token,
                    project_id,
                    convex_run_id.as_deref(),
                    &artifact,
                    &input,
                    provider_id,
                    provider_was_cancelled,
                )
                .await?;

            // Delivered vs. scoped is the check that the scope was actually honoured:
            // a run asked for 2 screens must not come back having designed 15.
            tracing::info!(
                run_id = %run_id,
                provider_id = ?provider_id,
                kind = wireframe_kind.as_str(),
                scoped_screen_count = target_screen_ids.as_ref().map_or(0, Vec::len),
                artifact_screen_count = artifact
                    .get("generatedScreens")
                    .and_then(serde_json::Value::as_array)
                    .map_or(0, Vec::len),
                save_elapsed_ms = save_started.elapsed().as_millis(),
                total_elapsed_ms = workflow_started.elapsed().as_millis(),
                "wireframes artifact saved to Convex"
            );

            // A scoped run touches only the selected screens; a count-based message keeps
            // the success copy honest instead of implying a full rebuild. Screens that did
            // not come back are named, so a partial result is never presented as a
            // complete one.
            let final_text = match target_screen_ids.as_ref() {
                Some(ids) => {
                    let updated = ids.len() - failed_screen_ids.len();
                    let verb = if input.existing_wireframes_artifact_json.is_some() {
                        "Updated"
                    } else {
                        "Generated"
                    };
                    if failed_screen_ids.is_empty() {
                        format!("{verb} {updated} wireframe screen(s).")
                    } else {
                        format!(
                            "{verb} {updated} of {} wireframe screen(s). These did not come back and kept their previous design: {}.",
                            ids.len(),
                            failed_screen_ids.join(", ")
                        )
                    }
                }
                None => "Wireframes generated.".to_string(),
            };
            if !provider_was_cancelled {
                sink.send(RunEvent::RunCompleted {
                    api_version,
                    run_id: run_id.clone(),
                    provider_id,
                    created_at: now_millis(),
                    final_text: Some(final_text),
                });
            }

            Ok::<(), WorkflowError>(())
        }
        .await;

        if let Err(error) = result {
            tracing::error!(
                run_id = %run_id,
                provider_id = ?provider_id,
                project_id = ?project_id,
                error = %error,
                "wireframes workflow failed"
            );
            if let (Some(token), Some(project_id)) =
                (auth_token_for_failure.as_deref(), project_id.as_deref())
                && let Err(mark_failed_error) = self
                    .repository
                    .fail_wireframes_run(
                        token,
                        project_id,
                        convex_run_id.as_deref(),
                        &error.to_string(),
                    )
                    .await
            {
                tracing::warn!(%mark_failed_error, "failed to mark Convex wireframes run failed");
            }

            sink.send(RunEvent::RunFailed {
                api_version,
                run_id,
                provider_id,
                created_at: now_millis(),
                error: error.to_engine_error(provider_id),
            });
        }
    }
}

fn rag_screen_plan(screen_id: &str, configured: &[serde_json::Value]) -> ScreenDesignPlan {
    let configured = configured
        .iter()
        .find(|screen| screen.get("id").and_then(serde_json::Value::as_str) == Some(screen_id));
    let title = configured
        .and_then(|screen| screen.get("title").and_then(serde_json::Value::as_str))
        .unwrap_or(screen_id);
    let description = configured
        .and_then(|screen| {
            screen
                .get("description")
                .and_then(serde_json::Value::as_str)
        })
        .unwrap_or("Deliver the screen with retrieved catalog components.");
    ScreenDesignPlan {
        screen_id: screen_id.to_string(),
        purpose: format!("{title}: {description}"),
        screen_role: title.to_string(),
        layout_archetype: description.to_string(),
        density: description.to_string(),
        information_hierarchy: vec![title.to_string(), description.to_string()],
        content_requirements: vec![description.to_string()],
        flow_context: description.to_string(),
        component_recipe: Vec::new(),
        motion_purpose: String::new(),
        avoid_list: Vec::new(),
    }
}

#[cfg(test)]
#[path = "../testing/wireframes/workflow.rs"]
mod tests;
