use std::sync::Arc;
use std::time::Instant;

use crate::convex_store::asset_upload::ConvexAssetUploader;
use crate::convex_store::wireframes_repository::WireframesRepository;
use crate::helpers::provider_json::extract_wireframes_artifact;
use crate::helpers::time::now_millis;
use crate::models::runs::{RunEvent, StartRunRequest};
use crate::models::wireframes::{WireframeBrandSource, WireframeKind};
use crate::providers::adapter::{ProviderRunContext, run_provider_collect};
use crate::providers::process::ProviderProcessOutcome;
use crate::runs::RunEventSink;
use crate::wireframes::debug_dump::WireframesDebugDump;
use crate::wireframes::design_plan::expected_screen_ids;
use crate::wireframes::helper::{
    MAX_MOODBOARD_IMAGES, MAX_PARALLEL_SCREEN_RUNS, WorkflowError,
    configure_provider_workspace_call, configured_screens_from_input, fetch_visual_attachments,
    materialize_common_workspace, materialize_screen_call, merge_tsx_screens, missing_screen_ids,
    offload_rendered_screens, parse_brand_source_from_source, parse_kind_from_source,
    parse_screens_from_source, parse_style_direction_from_source, resolve_design_plan,
    run_screens_in_parallel, safe_context_segment, screen_workspace_required_files,
    selected_moodboard_asset_keys, tool_completed, tool_started,
};
use crate::wireframes::normalize::{apply_scoped_screens, normalize_wireframes_artifact};
use crate::wireframes::prompt::{
    build_wireframes_prompt_with_plan, resolve_hifi_prompt_preferences,
};
use crate::wireframes::provider_workspace::{
    ContextAccessPolicy, ProviderWorkspace,
};
use crate::wireframes::quality::{
    merge_quality_failures, validate_artifact_against_plan,
};
use crate::wireframes::render::{
    RendererLibraries, apply_react_render, brand_theme, react_render_enabled,
    repair_prompt_for_failures,
};
use crate::wireframes::MAX_BRAND_KIT_FILES;

const GENERATED_AT_LABEL: &str = "just now";

#[derive(Clone, Debug)]
pub struct WireframesWorkflow {
    repository: WireframesRepository,
    asset_uploader: ConvexAssetUploader,
    r2_public_base_url: Option<String>,
}

impl WireframesWorkflow {
    pub fn new(
        repository: WireframesRepository,
        asset_uploader: ConvexAssetUploader,
        r2_public_base_url: Option<String>,
    ) -> Self {
        Self {
            repository,
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

            let design_plan = if matches!(wireframe_kind, WireframeKind::Hifi) {
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

            // One provider call per screen, run together. A single call covering every
            // screen is why a six-screen run took ten minutes: the model writes them
            // sequentially into one giant JSON object, and one malformed byte anywhere in
            // it used to lose the whole run. Per screen the wall time collapses to the
            // slowest screen instead of the sum, each response is small enough to survive
            // parsing, and a screen that fails costs only itself.
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
            let final_text = if screen_ids.is_empty() == false {
                let mut requests = Vec::with_capacity(screen_ids.len());
                for screen_id in &screen_ids {
                    let mut screen_request = request.clone();
                    if matches!(wireframe_kind, WireframeKind::Hifi) {
                        let plan_json = design_plan_json.as_deref().ok_or_else(|| {
                            WorkflowError::Internal(
                                "Hi-Fi screen generation requires a validated design plan"
                                    .to_string(),
                            )
                        })?;
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
                        )?;
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
                    screen_count = requests.len(),
                    max_parallel = MAX_PARALLEL_SCREEN_RUNS,
                    prompt_chars,
                    "starting per-screen wireframes provider runs"
                );
                request.prompt = requests
                    .first()
                    .map(|(_, request)| request.prompt.clone())
                    .unwrap_or_default();
                let started = Instant::now();
                let batch = run_screens_in_parallel(
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
                .await?;
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
                if batch.cancelled {
                    completed_screen_ids = batch
                        .screens
                        .iter()
                        .filter_map(|screen| screen.get("id").and_then(serde_json::Value::as_str))
                        .map(str::to_string)
                        .collect();
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
                    "per-screen wireframes provider runs finished"
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
            let artifact = normalize_wireframes_artifact(
                raw_artifact,
                &input,
                wireframe_kind,
                brand_source,
                style_direction_id.as_deref(),
                now_millis(),
                GENERATED_AT_LABEL,
            )?;
            let effective_target_screen_ids = if matches!(wireframe_kind, WireframeKind::Hifi)
                && !completed_screen_ids.is_empty()
            {
                Some(completed_screen_ids.as_slice())
            } else {
                target_screen_ids.as_deref()
            };
            let (mut artifact, _initial_failed_screen_ids) = apply_scoped_screens(
                input.existing_wireframes_artifact_json.as_deref(),
                artifact,
                effective_target_screen_ids,
                wireframe_kind,
            )
            .map_err(|error| WorkflowError::Internal(error.to_string()))?;
            if let Some(plan) = design_plan.as_ref()
                && let Some(object) = artifact.as_object_mut()
            {
                object.insert("designPlan".to_string(), serde_json::to_value(plan)?);
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
                let libraries = RendererLibraries::resolve(&pack_ids);
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
                if react_render_enabled() {
                    let render_started = Instant::now();
                    let outcome = apply_react_render(&mut artifact, &libraries, theme.as_ref())
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
                        "completed initial wireframe quality gates"
                    );
                }
                quality_runtime = Some((pack_ids, libraries, theme));
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
                let Some((pack_ids, libraries, theme)) = quality_runtime.as_ref() else {
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
                            &repair_prompt_for_failures(
                                std::slice::from_ref(failure),
                                libraries,
                            ),
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
                if react_render_enabled() {
                    let outcome = apply_react_render(&mut artifact, libraries, theme.as_ref())
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
                }
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

            let failed_screen_ids = missing_screen_ids(&artifact, &screen_ids);
            if matches!(wireframe_kind, WireframeKind::Hifi) && react_render_enabled() {
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

#[cfg(test)]
#[path = "../testing/wireframes/workflow.rs"]
mod tests;
