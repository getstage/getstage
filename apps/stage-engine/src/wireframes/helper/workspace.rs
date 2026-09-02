use std::path::Path;

use crate::models::runs::StartRunRequest;
use crate::models::wireframes::{WireframeBrandSource, WireframesInput};
use crate::wireframes::helper::error::WorkflowError;
use crate::wireframes::prompt::{
    workspace_director_contract, workspace_library_context, workspace_screen_context,
    workspace_screen_contract, workspace_selected_skills,
};
use crate::wireframes::provider_workspace::{
    ContextAccessPolicy, ProviderCallFiles, ProviderWorkspace,
};

pub(crate) struct ParallelScreenRuns {
    pub(crate) screens: Vec<serde_json::Value>,
    pub(crate) configure: Vec<serde_json::Value>,
    pub(crate) cancelled: bool,
}

#[derive(Debug)]
pub(crate) struct CommonWorkspaceFiles {
    pub(crate) director_required: Vec<String>,
    pub(crate) screen_required: Vec<String>,
    pub(crate) screen_on_demand: Vec<String>,
}

pub(crate) fn screen_workspace_directory(screen_id: &str) -> String {
    format!("screens/{}", safe_context_segment(screen_id))
}

pub(crate) fn screen_workspace_required_files(screen_id: &str) -> Vec<String> {
    let directory = screen_workspace_directory(screen_id);
    [
        "design-plan.json",
        "catalog-requirements.md",
        "flow.json",
        "screen-list.json",
        "prior-screen.json",
        "brand-evidence.md",
    ]
    .into_iter()
    .map(|file_name| format!("{directory}/{file_name}"))
    .collect()
}

pub(crate) fn configure_provider_workspace_call(
    request: &mut StartRunRequest,
    call_files: &ProviderCallFiles,
    task: &str,
) -> Result<(), WorkflowError> {
    let mut allowed_paths = call_files.required_paths.clone();
    allowed_paths.extend(call_files.on_demand_paths.iter().cloned());
    request.context.context_files = Some(allowed_paths);

    let attachment_paths = request
        .attachments
        .iter()
        .filter_map(|attachment| attachment.local_path.as_deref())
        .collect::<std::collections::HashSet<_>>();
    let mut required_context = String::new();
    for path in call_files
        .required_paths
        .iter()
        .filter(|path| attachment_paths.contains(path.as_str()) == false)
    {
        let content = std::fs::read_to_string(path).map_err(|error| {
            WorkflowError::Internal(format!(
                "could not load required provider context {path}: {error}"
            ))
        })?;
        required_context.push_str("\n<stage-context-file path=\"");
        required_context.push_str(path);
        required_context.push_str("\">\n");
        required_context.push_str(&content);
        required_context.push_str("\n</stage-context-file>\n");
    }

    // Stage, not the model, performs the mandatory reads. This keeps the context gate
    // deterministic: a provider cannot ignore the manifest and fail only after a paid call.
    request.context.required_context_files = None;
    request.prompt = format!(
        "{task}\n\nStage already loaded and integrity-verified every required context file below. Treat this envelope as binding input. The embedded call manifest lists additional onDemandFiles; read one only when this context leaves a concrete question unresolved. Do not inspect parent directories, unrelated files, environment variables, credentials, or user-home data. Return only the requested JSON object.\n{required_context}",
    );
    Ok(())
}

pub(crate) async fn write_screen_checkpoint(
    directory: &Path,
    screen_id: &str,
    screen: &serde_json::Value,
) -> Result<(), WorkflowError> {
    tokio::fs::create_dir_all(directory)
        .await
        .map_err(|error| {
            WorkflowError::Internal(format!(
                "could not create screen checkpoint directory: {error}"
            ))
        })?;
    let path = directory.join(format!("{}.json", safe_context_segment(screen_id)));
    let temporary = directory.join(format!(
        ".{}.{}.tmp",
        safe_context_segment(screen_id),
        uuid::Uuid::new_v4()
    ));
    let body = serde_json::to_vec(screen)?;
    tokio::fs::write(&temporary, body).await.map_err(|error| {
        WorkflowError::Internal(format!("could not write screen checkpoint: {error}"))
    })?;
    tokio::fs::rename(&temporary, &path).await.map_err(|error| {
        WorkflowError::Internal(format!("could not commit screen checkpoint: {error}"))
    })
}

pub(crate) fn safe_context_segment(value: &str) -> String {
    let safe = value
        .chars()
        .map(|character| {
            if character.is_ascii_alphanumeric() || matches!(character, '-' | '_') {
                character
            } else {
                '_'
            }
        })
        .collect::<String>();
    if safe.is_empty() {
        "screen".to_string()
    } else {
        safe
    }
}

#[allow(clippy::too_many_arguments)]
pub(crate) fn materialize_screen_call(
    workspace: &mut ProviderWorkspace,
    common: &CommonWorkspaceFiles,
    input: &WireframesInput,
    brand_source: Option<WireframeBrandSource>,
    style_direction_id: Option<&str>,
    brand_kit_attached: bool,
    screen_id: &str,
    design_plan_json: &str,
    catalog_candidates_json: Option<&str>,
    catalog_source_paths: &[String],
) -> Result<ProviderCallFiles, WorkflowError> {
    let ids = [screen_id.to_string()];
    let context = workspace_screen_context(
        input,
        brand_source,
        style_direction_id,
        brand_kit_attached,
        &ids,
        design_plan_json,
    );
    let directory = screen_workspace_directory(screen_id);
    let entries = [
        (
            "design-plan.json",
            "validated shared design plan scoped to this screen",
            context.design_plan,
        ),
        (
            "catalog-requirements.md",
            "selected-library retrieval requirements for this screen",
            context.recipe_imports,
        ),
        (
            "flow.json",
            "flows and screen definition scoped to this screen",
            context.flows,
        ),
        (
            "screen-list.json",
            "flow and saved screen inventory",
            context.screen_list,
        ),
        (
            "prior-screen.json",
            "redacted prior outline for regeneration",
            context.prior_screen,
        ),
        (
            "brand-evidence.md",
            "binding selected brand evidence",
            context.brand_evidence,
        ),
    ];
    let call_id = format!("screen-{screen_id}");
    let mut required = common.screen_required.clone();
    for (file_name, role, content) in entries {
        let path = format!("{directory}/{file_name}");
        workspace
            .write_text(
                &path,
                role,
                ContextAccessPolicy::Required,
                &[&call_id],
                &content,
            )
            .map_err(|error| {
                WorkflowError::Internal(format!(
                    "could not materialize context for screen {screen_id}: {error}"
                ))
            })?;
        required.push(path);
    }
    if let Some(catalog_candidates_json) = catalog_candidates_json {
        let path = format!("{directory}/catalog-candidates.json");
        workspace
            .write_text(
                &path,
                "verified RAG candidates selected for this screen",
                ContextAccessPolicy::Required,
                &[&call_id],
                catalog_candidates_json,
            )
            .map_err(|error| {
                WorkflowError::Internal(format!(
                    "could not materialize RAG candidates for screen {screen_id}: {error}"
                ))
            })?;
        required.push(path);
    }
    let mut on_demand = common.screen_on_demand.clone();
    on_demand.extend(catalog_source_paths.iter().cloned());
    let call_files = workspace
        .write_call_manifest(&call_id, &required, &on_demand)
        .map_err(|error| {
            WorkflowError::Internal(format!(
                "could not create context manifest for screen {screen_id}: {error}"
            ))
        })?;
    workspace.verify_integrity().map_err(|error| {
        WorkflowError::Internal(format!(
            "provider workspace integrity check failed: {error}"
        ))
    })?;
    Ok(call_files)
}

pub(crate) fn materialize_common_workspace(
    workspace: &mut ProviderWorkspace,
    input: &WireframesInput,
    request: &StartRunRequest,
    expected_screen_ids: &[String],
    brand_source: Option<WireframeBrandSource>,
    style_direction_id: Option<&str>,
) -> Result<CommonWorkspaceFiles, WorkflowError> {
    let write = |result: anyhow::Result<()>| {
        result.map_err(|error| {
            WorkflowError::Internal(format!("could not materialize provider context: {error}"))
        })
    };

    let director_contract = "contracts/design-director.md".to_string();
    let screen_contract = "contracts/screen-implementation.md".to_string();
    let project = "project/run.json".to_string();
    let strategy = "project/strategy.json".to_string();
    let research = "project/research.json".to_string();
    let moodboard = "project/moodboard.json".to_string();
    let flows = "project/flows.json".to_string();
    let libraries = "libraries/selected.md".to_string();

    write(workspace.write_text(
        &director_contract,
        "Design Director output and quality contract",
        ContextAccessPolicy::Required,
        &["director"],
        &workspace_director_contract(),
    ))?;
    write(workspace.write_text(
        &screen_contract,
        "single-screen React output and quality contract",
        ContextAccessPolicy::Required,
        &["screen:*"],
        &workspace_screen_contract(),
    ))?;
    let project_json = serde_json::to_string_pretty(&serde_json::json!({
        "projectId": input.project_id,
        "projectName": input.project_name,
        "projectType": input.project_type,
        "projectTypeLabel": input.project_type_label,
        "targetScreenIds": expected_screen_ids,
        "brandSource": brand_source.map(|source| format!("{source:?}")),
        "styleDirectionId": style_direction_id,
        "request": request.prompt,
    }))?;
    write(workspace.write_text(
        &project,
        "selected project and run scope",
        ContextAccessPolicy::Required,
        &["director", "screen:*"],
        &project_json,
    ))?;
    for (path, role, content) in [
        (
            &strategy,
            "saved strategy artifact",
            input.strategy_artifact_json.as_str(),
        ),
        (
            &research,
            "saved research artifact",
            input.research_artifact_json.as_deref().unwrap_or("null"),
        ),
        (
            &moodboard,
            "saved moodboard artifact",
            input.moodboard_artifact_json.as_deref().unwrap_or("null"),
        ),
        (
            &flows,
            "saved flows artifact",
            input.flows_artifact_json.as_deref().unwrap_or("null"),
        ),
    ] {
        write(workspace.write_text(
            path,
            role,
            ContextAccessPolicy::OnDemand,
            &["director", "screen:*"],
            content,
        ))?;
    }
    write(workspace.write_text(
        &libraries,
        "selected real component exports and composition recipes",
        ContextAccessPolicy::Required,
        &["director", "screen:*"],
        &workspace_library_context(input),
    ))?;

    let mut skill_files = Vec::new();
    for (skill_id, body) in workspace_selected_skills(input) {
        let path = format!("skills/{skill_id}.md");
        write(workspace.write_text(
            &path,
            "selected design skill adapter",
            ContextAccessPolicy::Required,
            &["director", "screen:*"],
            &body,
        ))?;
        skill_files.push(path);
    }

    let mut director_required = vec![
        director_contract,
        project.clone(),
        strategy.clone(),
        research.clone(),
        moodboard.clone(),
        flows.clone(),
        libraries.clone(),
    ];
    director_required.extend(skill_files.iter().cloned());
    let mut screen_required = vec![screen_contract, project, libraries];
    screen_required.extend(skill_files);

    Ok(CommonWorkspaceFiles {
        director_required,
        screen_required,
        screen_on_demand: vec![strategy, research, moodboard, flows],
    })
}
