use std::time::Duration;

use crate::helpers::time::now_millis;
use crate::models::errors::{EngineError, EngineErrorCode};
use crate::models::providers::{
    ProviderAuthStatus, ProviderKind, ProviderListResponse, ProviderStatus, ProviderStatusRecord,
    ProviderUpdateResponse, ProviderUpdateStatus,
};
use crate::providers::auth::{LocalAuthProbe, probe_local_auth};
use crate::providers::catalog::{
    ProviderRuntimeSpec, all_provider_specs, fallback_models, spec_by_route_id,
};
use crate::providers::command::{command_detail, parse_version, run_command};

const VERSION_TIMEOUT: Duration = Duration::from_secs(4);
const UPDATE_TIMEOUT: Duration = Duration::from_secs(120);

pub async fn provider_snapshot(api_version: &'static str) -> ProviderListResponse {
    let [claude_spec, codex_spec] = all_provider_specs();
    let (claude, codex) = tokio::join!(provider_record(claude_spec), provider_record(codex_spec));

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

async fn provider_record(spec: ProviderRuntimeSpec) -> ProviderStatusRecord {
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
                update_available: None,
                update_status: ProviderUpdateStatus::Idle,
                update_hint: Some(spec.update_hint.to_string()),
                checked_at: now_millis(),
                models: fallback_models(spec.id),
                setup_hint: Some(spec.setup_hint.to_string()),
                message: provider_message(command_failed, authenticated, auth_status),
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
        Err(error) => missing_or_failed_provider(spec, error),
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

    match run_command(
        spec.binary,
        spec.update_args,
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

            ProviderUpdateResponse {
                api_version,
                provider_id: spec.id,
                status: ProviderUpdateStatus::Updated,
                version_before,
                version_after,
                message: Some(format!("{} update command completed.", spec.label)),
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
            error: Some(EngineError {
                code: EngineErrorCode::ProviderProcessFailed,
                message: format!("{} update command exited unsuccessfully.", spec.label),
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
            message: None,
            error: Some(with_provider_id(error, spec)),
        },
    }
}

fn missing_or_failed_provider(
    spec: ProviderRuntimeSpec,
    mut error: EngineError,
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
        update_available: None,
        update_status: ProviderUpdateStatus::Idle,
        update_hint: Some(spec.update_hint.to_string()),
        checked_at: now_millis(),
        models: fallback_models(spec.id),
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
) -> Option<String> {
    if command_failed {
        return None;
    }

    if authenticated {
        return Some(
            "Provider appears authenticated from local credential metadata. Provider-reported model refresh is still pending."
                .to_string(),
        );
    }

    if matches!(auth_status, ProviderAuthStatus::NotAuthenticated) {
        return Some("Provider binary was found, but no local auth file was detected.".to_string());
    }

    Some("Provider binary was found, but auth status could not be verified.".to_string())
}

fn with_provider_id(mut error: EngineError, spec: ProviderRuntimeSpec) -> EngineError {
    error.provider_id = Some(spec.id);
    error
}
