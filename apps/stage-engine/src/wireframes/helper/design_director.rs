use std::time::Instant;

use crate::models::providers::ProviderId;
use crate::models::runs::StartRunRequest;
use crate::models::wireframes::WireframesInput;
use crate::providers::adapter::{ProviderRunContext, run_provider_collect};
use crate::providers::process::ProviderProcessOutcome;
use crate::runs::RunEventSink;
use crate::wireframes::debug_dump::WireframesDebugDump;
use crate::wireframes::design_plan::{
    WireframeDesignPlan, design_plan_from_artifact, extract_design_plan,
};
use crate::wireframes::helper::artifact::is_scoped_regeneration_request;
use crate::wireframes::helper::error::WorkflowError;
use crate::wireframes::helper::events::{tool_completed, tool_started};
use crate::wireframes::helper::workspace::{
    CommonWorkspaceFiles, configure_provider_workspace_call,
};
use crate::wireframes::prompt::resolve_hifi_prompt_preferences;
use crate::wireframes::provider_workspace::{ContextAccessPolicy, ProviderWorkspace};
use crate::wireframes::quality::validate_design_plan_libraries;

#[allow(clippy::too_many_arguments)]
pub(crate) async fn resolve_design_plan(
    api_version: &'static str,
    run_id: &str,
    provider_id: ProviderId,
    request: &StartRunRequest,
    input: &WireframesInput,
    target_screen_ids: Option<&[String]>,
    expected_screen_ids: &[String],
    workspace: &mut ProviderWorkspace,
    workspace_files: &CommonWorkspaceFiles,
    sink: &RunEventSink,
    cancel_rx: &tokio::sync::watch::Receiver<bool>,
    dump: &WireframesDebugDump,
) -> Result<Option<WireframeDesignPlan>, WorkflowError> {
    let is_scoped_regeneration = is_scoped_regeneration_request(
        &request.prompt,
        target_screen_ids,
        input.existing_wireframes_artifact_json.is_some(),
    );
    if is_scoped_regeneration {
        let Some(existing) = input.existing_wireframes_artifact_json.as_deref() else {
            return Err(WorkflowError::InvalidRequest(
                "Scoped wireframe regeneration requires an existing artifact.".to_string(),
            ));
        };
        let component_pack_ids = resolve_hifi_prompt_preferences(input).component_pack_ids;
        match design_plan_from_artifact(existing, expected_screen_ids) {
            Ok(mut plan) => {
                match validate_design_plan_libraries(&mut plan, &component_pack_ids) {
                    Ok(()) => {
                        if let Ok(value) = serde_json::to_value(&plan) {
                            dump.write_json("00-design-plan-reused.json", &value);
                        }
                        tracing::info!(
                            run_id = run_id,
                            screens = plan.screens.len(),
                            "reused validated wireframe Design Director plan"
                        );
                        return Ok(Some(plan));
                    }
                    Err(error) => tracing::warn!(
                        run_id = run_id,
                        error = error.to_string(),
                        "saved wireframe design plan no longer matches the selected libraries; rebuilding it for this regeneration"
                    ),
                }
            }
            Err(error) => tracing::info!(
                run_id = run_id,
                error = error.to_string(),
                "saved wireframes predate a reusable design plan; creating one for this regeneration"
            ),
        }
    }

    let mut plan_request = request.clone();
    let call_files = workspace
        .write_call_manifest("design-director", &workspace_files.director_required, &[])
        .map_err(|error| {
            WorkflowError::Internal(format!(
                "could not create Design Director context manifest: {error}"
            ))
        })?;
    workspace.verify_integrity().map_err(|error| {
        WorkflowError::Internal(format!(
            "provider workspace integrity check failed: {error}"
        ))
    })?;
    configure_provider_workspace_call(
        &mut plan_request,
        &call_files,
        "Create the shared Stage Hi-Fi wireframe design plan for every target screen.",
    )?;
    dump.write_prompt("design-director", &plan_request.prompt);
    tool_started(
        api_version,
        run_id,
        provider_id,
        sink,
        "design-director",
        "Create shared wireframe design plan",
    );
    let started = Instant::now();
    let outcome = run_provider_collect(
        ProviderRunContext {
            api_version,
            run_id: run_id.to_string(),
            request: plan_request,
        },
        sink.clone(),
        cancel_rx.clone(),
    )
    .await?;
    workspace.verify_integrity().map_err(|error| {
        WorkflowError::Internal(format!(
            "provider workspace changed during design direction: {error}"
        ))
    })?;
    tool_completed(api_version, run_id, provider_id, sink, "design-director");
    let ProviderProcessOutcome::Completed(raw) = outcome else {
        return Ok(None);
    };
    dump.write_provider_raw("design-director", &raw);
    let component_pack_ids = resolve_hifi_prompt_preferences(input).component_pack_ids;
    let extract_valid_plan = |text: &str| {
        let mut plan = extract_design_plan(text, expected_screen_ids)?;
        validate_design_plan_libraries(&mut plan, &component_pack_ids)?;
        Ok::<_, anyhow::Error>(plan)
    };
    match extract_valid_plan(&raw) {
        Ok(plan) => {
            if let Ok(value) = serde_json::to_value(&plan) {
                dump.write_json("00-design-plan.json", &value);
            }
            tracing::info!(
                run_id = %run_id,
                elapsed_ms = started.elapsed().as_millis(),
                screens = plan.screens.len(),
                "created validated wireframe Design Director plan"
            );
            Ok(Some(plan))
        }
        Err(first_error) => {
            tracing::warn!(
                run_id = %run_id,
                error = %first_error,
                "wireframe design plan failed validation; repairing once"
            );
            let invalid_path = "repairs/design-director-invalid.txt".to_string();
            let error_path = "repairs/design-director-validation.txt".to_string();
            workspace
                .write_text(
                    &invalid_path,
                    "invalid Design Director provider output",
                    ContextAccessPolicy::Required,
                    &["design-director-repair"],
                    &raw,
                )
                .and_then(|()| {
                    workspace.write_text(
                        &error_path,
                        "Design Director validation failure",
                        ContextAccessPolicy::Required,
                        &["design-director-repair"],
                        &first_error.to_string(),
                    )
                })
                .map_err(|error| {
                    WorkflowError::Internal(format!(
                        "could not materialize Design Director repair context: {error}"
                    ))
                })?;
            let mut repair_required = workspace_files.director_required.clone();
            repair_required.extend([invalid_path, error_path]);
            let call_files = workspace
                .write_call_manifest("design-director-repair", &repair_required, &[])
                .map_err(|error| {
                    WorkflowError::Internal(format!(
                        "could not create Design Director repair manifest: {error}"
                    ))
                })?;
            workspace.verify_integrity().map_err(|error| {
                WorkflowError::Internal(format!(
                    "provider workspace integrity check failed: {error}"
                ))
            })?;
            let mut repair_request = request.clone();
            configure_provider_workspace_call(
                &mut repair_request,
                &call_files,
                "Repair the Design Director plan once. Keep valid decisions and change only what is required by the validation failure.",
            )?;
            dump.write_prompt("design-director-repair", &repair_request.prompt);
            tool_started(
                api_version,
                run_id,
                provider_id,
                sink,
                "design-director-repair",
                "Repair shared wireframe design plan",
            );
            let repair_outcome = run_provider_collect(
                ProviderRunContext {
                    api_version,
                    run_id: run_id.to_string(),
                    request: repair_request,
                },
                sink.clone(),
                cancel_rx.clone(),
            )
            .await?;
            workspace.verify_integrity().map_err(|error| {
                WorkflowError::Internal(format!(
                    "provider workspace changed during design direction repair: {error}"
                ))
            })?;
            tool_completed(
                api_version,
                run_id,
                provider_id,
                sink,
                "design-director-repair",
            );
            let ProviderProcessOutcome::Completed(repaired_raw) = repair_outcome else {
                return Ok(None);
            };
            dump.write_provider_raw("design-director-repair", &repaired_raw);
            let plan = extract_valid_plan(&repaired_raw).map_err(|error| {
                WorkflowError::GenerationFailed(format!(
                    "Design Director plan remained invalid after one repair: {error}"
                ))
            })?;
            if let Ok(value) = serde_json::to_value(&plan) {
                dump.write_json("00-design-plan.json", &value);
            }
            tracing::info!(
                run_id = %run_id,
                elapsed_ms = started.elapsed().as_millis(),
                screens = plan.screens.len(),
                "repaired and validated wireframe Design Director plan"
            );
            Ok(Some(plan))
        }
    }
}
