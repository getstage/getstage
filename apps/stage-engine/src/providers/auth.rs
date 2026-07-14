use std::env;
use std::path::PathBuf;
use std::time::Duration;

use serde_json::Value;
use tokio::fs;

use crate::models::errors::EngineErrorCode;
use crate::models::providers::ProviderId;
use crate::providers::catalog::{AuthFileSpec, ProviderRuntimeSpec};
use crate::providers::command::{provider_cli_working_directory, run_command_in};

const AUTH_STATUS_TIMEOUT: Duration = Duration::from_secs(15);

pub enum LocalAuthProbe {
    Authenticated {
        label: Option<String>,
        email: Option<String>,
    },
    NotAuthenticated,
    Unknown,
}

pub async fn probe_local_auth(spec: ProviderRuntimeSpec) -> LocalAuthProbe {
    if spec.id == ProviderId::Claude {
        if let Some(probe) = probe_claude_cli_auth(spec.binary).await {
            return probe;
        }
    }

    probe_auth_files(spec.auth_files).await
}

async fn probe_claude_cli_auth(binary: &str) -> Option<LocalAuthProbe> {
    let working_directory = provider_cli_working_directory().ok();
    let result = run_command_in(
        binary,
        &["auth", "status"],
        AUTH_STATUS_TIMEOUT,
        EngineErrorCode::VersionTimeout,
        working_directory.as_deref(),
        false,
    )
    .await
    .ok()?;

    if result.code != Some(0) {
        return Some(LocalAuthProbe::NotAuthenticated);
    }

    let payload = result.stdout.trim();
    if payload.is_empty() {
        return None;
    }

    let value = serde_json::from_str::<Value>(payload).ok()?;
    let logged_in = value
        .get("loggedIn")
        .and_then(Value::as_bool)
        .unwrap_or(false);

    if logged_in {
        Some(LocalAuthProbe::Authenticated {
            label: value
                .get("subscriptionType")
                .and_then(Value::as_str)
                .map(str::to_string),
            email: value
                .get("email")
                .and_then(Value::as_str)
                .map(str::to_string),
        })
    } else {
        Some(LocalAuthProbe::NotAuthenticated)
    }
}

async fn probe_auth_files(auth_files: &[AuthFileSpec]) -> LocalAuthProbe {
    let paths = auth_file_paths(auth_files);
    if paths.is_empty() {
        return LocalAuthProbe::Unknown;
    }

    for path in paths {
        let Ok(contents) = fs::read_to_string(path).await else {
            continue;
        };

        if contents.trim().is_empty() {
            continue;
        }

        return match serde_json::from_str::<Value>(&contents) {
            Ok(value) => {
                let metadata = parse_auth_metadata(&value);
                LocalAuthProbe::Authenticated {
                    label: metadata.label,
                    email: metadata.email,
                }
            }
            Err(_) => LocalAuthProbe::Authenticated {
                label: None,
                email: None,
            },
        };
    }

    LocalAuthProbe::NotAuthenticated
}

fn auth_file_paths(auth_files: &[AuthFileSpec]) -> Vec<PathBuf> {
    auth_files
        .iter()
        .filter_map(|spec| {
            let home = spec
                .env_home
                .and_then(env::var_os)
                .or_else(|| env::var_os("HOME"))?;

            Some(PathBuf::from(home).join(spec.relative_path))
        })
        .collect()
}

struct AuthMetadata {
    label: Option<String>,
    email: Option<String>,
}

fn parse_auth_metadata(value: &Value) -> AuthMetadata {
    AuthMetadata {
        label: find_string_by_keys(value, &["subscriptionType", "planType", "plan_type"]),
        email: find_email(value),
    }
}

fn find_email(value: &Value) -> Option<String> {
    find_string_by_predicate(value, &|key, candidate| {
        key.to_ascii_lowercase().contains("email") && candidate.contains('@')
    })
}

fn find_string_by_keys(value: &Value, keys: &[&str]) -> Option<String> {
    find_string_by_predicate(value, &|key, _candidate| keys.contains(&key))
}

fn find_string_by_predicate(
    value: &Value,
    predicate: &dyn Fn(&str, &str) -> bool,
) -> Option<String> {
    match value {
        Value::Object(map) => map.iter().find_map(|(key, value)| match value {
            Value::String(candidate) if predicate(key, candidate) => Some(candidate.clone()),
            nested => find_string_by_predicate(nested, predicate),
        }),
        Value::Array(items) => items
            .iter()
            .find_map(|item| find_string_by_predicate(item, predicate)),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::parse_auth_metadata;

    #[test]
    fn parse_auth_metadata_should_extract_safe_account_fields() {
        let value = json!({
            "token": "secret",
            "oauthAccount": {
                "emailAddress": "user@example.com",
                "subscriptionType": "Claude Pro Subscription"
            }
        });

        let metadata = parse_auth_metadata(&value);

        assert_eq!(metadata.email.as_deref(), Some("user@example.com"));
        assert_eq!(metadata.label.as_deref(), Some("Claude Pro Subscription"));
    }
}
