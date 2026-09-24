use std::time::Duration;

use crate::helpers::time::now_millis;
use crate::models::errors::{EngineError, EngineErrorCode};
use crate::models::providers::{
    ProviderAuthStatus, ProviderId, ProviderKind, ProviderListResponse, ProviderStatus,
    ProviderStatusRecord, ProviderUpdateResponse, ProviderUpdateStatus,
};
use crate::providers::auth::{LocalAuthProbe, probe_local_auth};
use crate::providers::catalog::{ProviderRuntimeSpec, all_provider_specs, spec_by_route_id};
use crate::providers::command::{command_detail, parse_version, run_command, run_update_command};
use crate::providers::maintenance::{
    invalidate_sense_cache, resolve_update_command, sense_update_available,
};
use crate::providers::models::{invalidate_stage_models_cache, resolve_provider_models};

const VERSION_TIMEOUT: Duration = Duration::from_secs(4);
const UPDATE_TIMEOUT: Duration = Duration::from_secs(120);

pub async fn provider_snapshot(api_version: &'static str) -> ProviderListResponse {
    provider_snapshot_with_options(api_version, false).await
}

pub async fn refresh_provider_snapshot(api_version: &'static str) -> ProviderListResponse {
    provider_snapshot_with_options(api_version, true).await
}

async fn provider_snapshot_with_options(
    api_version: &'static str,
    force_model_refresh: bool,
) -> ProviderListResponse {
    let [claude_spec, codex_spec] = all_provider_specs();
    let (claude, codex) = tokio::join!(
        provider_record(claude_spec, force_model_refresh),
        provider_record(codex_spec, force_model_refresh)
    );

    ProviderListResponse {
        api_version,
        providers: vec![claude, codex],
    }
}

pub async fn update_provider_by_route_id(
    api_version: &'static str,
    provider_id: &str,
) -> Result<ProviderUpdateResponse, EngineError> {
    let Some(spec) = spec_by_route_id(provider_id) else {
        return Err(EngineError {
            code: EngineErrorCode::InvalidRequest,
            message: format!("Unknown provider id `{provider_id}`."),
            provider_id: None,
            retryable: false,
            detail: None,
        });
    };

    Ok(update_provider_with_spec(api_version, spec).await)
}

async fn provider_record(
    spec: ProviderRuntimeSpec,
    force_model_refresh: bool,
) -> ProviderStatusRecord {
    match run_command(
        spec.binary,
        spec.version_args,
        VERSION_TIMEOUT,
        EngineErrorCode::VersionTimeout,
    )
    .await
    {
        Ok(result) => {
            let version = parse_version(&result.stdout).or_else(|| parse_version(&result.stderr));
            let command_failed = result.code != Some(0);
            let auth = probe_local_auth(spec).await;
            let authenticated = matches!(auth, LocalAuthProbe::Authenticated { .. });
            let (auth_status, auth_label, account_email) = match auth {
                LocalAuthProbe::Authenticated { label, email } => {
                    (ProviderAuthStatus::Authenticated, label, email)
                }
                LocalAuthProbe::NotAuthenticated => {
                    (ProviderAuthStatus::NotAuthenticated, None, None)
                }
                LocalAuthProbe::Unknown => (ProviderAuthStatus::Unknown, None, None),
            };
            let status = provider_status(command_failed, authenticated, auth_status);
            let models =
                resolve_provider_models(spec, version.as_deref(), force_model_refresh).await;
            let message = provider_message(command_failed, authenticated, auth_status, &models);
            let update_available =
                sense_update_available(spec, version.as_deref(), force_model_refresh).await;

            ProviderStatusRecord {
                id: spec.id,
                label: spec.label.to_string(),
                kind: ProviderKind::Cli,
                installed: true,
                authenticated,
                auth_status,
                auth_label,
                account_email,
                enabled: true,
                version,
                status,
                update_available,
                update_status: ProviderUpdateStatus::Idle,
                update_hint: Some(spec.update_hint.to_string()),
                checked_at: now_millis(),
                models,
                setup_hint: Some(spec.setup_hint.to_string()),
                message,
                error: if command_failed {
                    Some(EngineError {
                        code: EngineErrorCode::ReadinessFailed,
                        message: format!("{} version command exited unsuccessfully.", spec.label),
                        provider_id: Some(spec.id),
                        retryable: true,
                        detail: command_detail(&result),
                    })
                } else {
                    None
                },
            }
        }
        Err(error) => missing_or_failed_provider(spec, error, force_model_refresh).await,
    }
}

async fn update_provider_with_spec(
    api_version: &'static str,
    spec: ProviderRuntimeSpec,
) -> ProviderUpdateResponse {
    let version_before = run_command(
        spec.binary,
        spec.version_args,
        VERSION_TIMEOUT,
        EngineErrorCode::VersionTimeout,
    )
    .await
    .ok()
    .and_then(|result| parse_version(&result.stdout).or_else(|| parse_version(&result.stderr)));

    let update = resolve_update_command(spec).await;
    let arg_refs: Vec<&str> = update.args.iter().map(String::as_str).collect();
    let command_label = format!("{} {}", update.program, update.args.join(" "));

    match run_update_command(
        &update.program,
        &arg_refs,
        UPDATE_TIMEOUT,
        EngineErrorCode::RunTimeout,
    )
    .await
    {
        Ok(result) if result.code == Some(0) => {
            let version_after = run_command(
                spec.binary,
                spec.version_args,
                VERSION_TIMEOUT,
                EngineErrorCode::VersionTimeout,
            )
            .await
            .ok()
            .and_then(|result| {
                parse_version(&result.stdout).or_else(|| parse_version(&result.stderr))
            });

            invalidate_stage_models_cache(spec.id).await;
            invalidate_sense_cache(spec.id);

            ProviderUpdateResponse {
                api_version,
                provider_id: spec.id,
                status: ProviderUpdateStatus::Updated,
                version_before,
                version_after,
                message: Some(format!(
                    "{} update completed (`{command_label}`).",
                    spec.label
                )),
                command: Some(command_label),
                output: truncate_command_output(&result),
                error: None,
            }
        }
        Ok(result) => ProviderUpdateResponse {
            api_version,
            provider_id: spec.id,
            status: ProviderUpdateStatus::Failed,
            version_before: version_before.clone(),
            version_after: version_before.clone(),
            message: Some(format!("{} update command failed.", spec.label)),
            command: Some(command_label.clone()),
            output: truncate_command_output(&result),
            error: Some(EngineError {
                code: EngineErrorCode::ProviderProcessFailed,
                message: format!(
                    "{} update exited unsuccessfully (`{command_label}`).",
                    spec.label
                ),
                provider_id: Some(spec.id),
                retryable: true,
                detail: command_detail(&result),
            }),
        },
        Err(error) => ProviderUpdateResponse {
            api_version,
            provider_id: spec.id,
            status: ProviderUpdateStatus::Failed,
            version_before: version_before.clone(),
            version_after: version_before.clone(),
            message: Some(format!(
                "{} update did not finish. Try `{command_label}` in Terminal.",
                spec.label
            )),
            command: Some(command_label),
            output: error.detail.clone(),
            error: Some(with_provider_id(error, spec)),
        },
    }
}

fn truncate_command_output(result: &crate::providers::command::CommandProbe) -> Option<String> {
    const MAX_BYTES: usize = 10_000;
    let combined = [result.stderr.trim(), result.stdout.trim()]
        .into_iter()
        .filter(|part| !part.is_empty())
        .collect::<Vec<_>>()
        .join("\n\n");
    if combined.is_empty() {
        return None;
    }
    if combined.len() <= MAX_BYTES {
        return Some(combined);
    }
    Some(format!("{}…", &combined[..MAX_BYTES]))
}

async fn missing_or_failed_provider(
    spec: ProviderRuntimeSpec,
    mut error: EngineError,
    force_model_refresh: bool,
) -> ProviderStatusRecord {
    error.provider_id = Some(spec.id);
    let missing = matches!(error.code, EngineErrorCode::MissingBinary);

    ProviderStatusRecord {
        id: spec.id,
        label: spec.label.to_string(),
        kind: ProviderKind::Cli,
        installed: false,
        authenticated: false,
        auth_status: ProviderAuthStatus::Unknown,
        auth_label: None,
        account_email: None,
        enabled: true,
        version: None,
        status: if missing {
            ProviderStatus::Missing
        } else {
            ProviderStatus::Error
        },
        update_available: Some(false),
        update_status: ProviderUpdateStatus::Idle,
        update_hint: Some(spec.update_hint.to_string()),
        checked_at: now_millis(),
        models: resolve_provider_models(spec, None, force_model_refresh).await,
        setup_hint: Some(spec.setup_hint.to_string()),
        message: Some(error.message.clone()),
        error: Some(error),
    }
}

fn provider_status(
    command_failed: bool,
    authenticated: bool,
    auth_status: ProviderAuthStatus,
) -> ProviderStatus {
    if command_failed {
        ProviderStatus::Error
    } else if authenticated {
        ProviderStatus::Ready
    } else if matches!(auth_status, ProviderAuthStatus::NotAuthenticated) {
        ProviderStatus::NotAuthenticated
    } else {
        ProviderStatus::Warning
    }
}

fn provider_message(
    command_failed: bool,
    authenticated: bool,
    auth_status: ProviderAuthStatus,
    models: &[crate::models::providers::ProviderModel],
) -> Option<String> {
    if command_failed {
        return None;
    }

    if authenticated {
        use crate::models::providers::ProviderModelSource;

        let source = models
            .first()
            .map(|model| match model.source {
                ProviderModelSource::Provider => "provider",
                ProviderModelSource::Fallback => "fallback",
                ProviderModelSource::Custom => "custom",
                ProviderModelSource::Unknown => "unknown",
            })
            .unwrap_or("fallback");

        return Some(format!(
            "Provider is ready. Model list source: {source} ({} models).",
            models.len()
        ));
    }

    if matches!(auth_status, ProviderAuthStatus::NotAuthenticated) {
        return Some(
            "Provider CLI reports you are not logged in. Re-run the login command, then refresh."
                .to_string(),
        );
    }

    Some("Provider binary was found, but auth status could not be verified.".to_string())
}

fn with_provider_id(mut error: EngineError, spec: ProviderRuntimeSpec) -> EngineError {
    error.provider_id = Some(spec.id);
    error
}

#[derive(Debug, Clone)]
pub struct ProviderRunBlocked {
    pub message: String,
}

/// Live provider gate before expensive workflow steps (Refero, Convex writes, etc.).
pub async fn assert_provider_ready_for_run(
    provider_id: ProviderId,
) -> Result<(), ProviderRunBlocked> {
    let route = match provider_id {
        ProviderId::Claude => "claude",
        ProviderId::Codex => "codex",
    };
    let Some(spec) = spec_by_route_id(route) else {
        return Err(ProviderRunBlocked {
            message: format!("Unknown provider `{route}`."),
        });
    };

    if run_command(
        spec.binary,
        spec.version_args,
        VERSION_TIMEOUT,
        EngineErrorCode::VersionTimeout,
    )
    .await
    .is_err()
    {
        return Err(ProviderRunBlocked {
            message: spec.setup_hint.to_string(),
        });
    }

    match probe_local_auth(spec).await {
        LocalAuthProbe::Authenticated { .. } => Ok(()),
        LocalAuthProbe::NotAuthenticated => Err(ProviderRunBlocked {
            message: format!(
                "{} is not logged in. Run the login command in Terminal, then refresh Settings → Integrations.",
                spec.label
            ),
        }),
        LocalAuthProbe::Unknown => Err(ProviderRunBlocked {
            message: format!(
                "{} is installed but Stage could not verify login. {}",
                spec.label, spec.setup_hint
            ),
        }),
    }
}
