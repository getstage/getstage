use thiserror::Error;

use crate::models::errors::{EngineError, EngineErrorCode};
use crate::models::providers::ProviderId;

use super::heuristics::{
    extract_provider_exit_payload, looks_like_provider_auth_failure,
    looks_like_provider_session_limit,
};
use super::stderr::{stderr_diag_max_chars, truncate_line, StderrDiagnostics};

#[derive(Debug, Error)]
pub enum ProviderProcessError {
    #[error("failed to spawn provider process `{binary}`: {source}")]
    Spawn {
        binary: &'static str,
        source: std::io::Error,
    },

    #[error("provider process `{binary}` failed: {source}")]
    Io {
        binary: &'static str,
        source: std::io::Error,
    },
}

impl ProviderProcessError {
    fn detail_text(&self) -> String {
        match self {
            ProviderProcessError::Spawn { source, binary } => {
                format!("failed to spawn `{binary}`: {source}")
            }
            ProviderProcessError::Io { source, binary } => {
                format!("provider process `{binary}` failed: {source}")
            }
        }
    }

    fn user_message(&self, provider_id: ProviderId) -> String {
        let (label, login_cmd) = match provider_id {
            ProviderId::Claude => ("Claude", "claude auth login"),
            ProviderId::Codex => ("Codex", "codex login"),
        };

        match self {
            ProviderProcessError::Spawn { source, .. } => {
                if source.kind() == std::io::ErrorKind::NotFound {
                    return format!(
                        "{label} CLI not found on PATH. Install it, then run `{login_cmd}` in Terminal and refresh Settings → Integrations."
                    );
                }

                format!(
                    "Could not start {label}. Open Settings → Integrations and confirm the CLI is installed."
                )
            }
            ProviderProcessError::Io { source, .. } => {
                let detail = source.to_string();
                let payload = extract_provider_exit_payload(&detail)
                    .or_else(|| {
                        detail
                            .split_once("failed: ")
                            .map(|(_, rest)| rest.trim().to_string())
                    })
                    .filter(|value| !value.is_empty());

                if let Some(payload) = payload.as_deref() {
                    if looks_like_provider_session_limit(payload) {
                        return format!(
                            "{label} session limit reached. Wait until the limit resets, then try again. ({payload})"
                        );
                    }

                    if looks_like_provider_auth_failure(payload) {
                        return format!(
                            "{label} is not logged in. Run `{login_cmd}` in Terminal, then refresh Settings → Integrations."
                        );
                    }

                    if !payload.starts_with("process exited with status") {
                        return format!("{label} failed: {payload}");
                    }
                }

                if looks_like_provider_session_limit(&detail) {
                    return format!(
                        "{label} session limit reached. Wait until the limit resets, then try again."
                    );
                }

                if looks_like_provider_auth_failure(&detail) {
                    return format!(
                        "{label} is not logged in. Run `{login_cmd}` in Terminal, then refresh Settings → Integrations."
                    );
                }

                format!(
                    "{label} exited unexpectedly. Run `{login_cmd}` in Terminal, then try again."
                )
            }
        }
    }

    pub fn to_engine_error(&self, provider_id: ProviderId) -> EngineError {
        let detail = self.detail_text();
        let code = match self {
            ProviderProcessError::Spawn { source, .. } => {
                if source.kind() == std::io::ErrorKind::NotFound {
                    EngineErrorCode::MissingBinary
                } else {
                    EngineErrorCode::RunSpawnFailed
                }
            }
            ProviderProcessError::Io { source, .. } => {
                if looks_like_provider_auth_failure(&source.to_string()) {
                    EngineErrorCode::NotAuthenticated
                } else {
                    EngineErrorCode::ProviderProcessFailed
                }
            }
        };

        let retryable = !matches!(
            &code,
            EngineErrorCode::MissingBinary | EngineErrorCode::NotAuthenticated
        );

        EngineError {
            code,
            message: self.user_message(provider_id),
            provider_id: Some(provider_id),
            retryable,
            detail: Some(detail),
        }
    }

    /// Whether the failure looks like an auth/credentials problem and is therefore a
    /// candidate for an in-engine retry after warming the provider's credentials file.
    pub(super) fn is_auth_failure(&self) -> bool {
        match self {
            ProviderProcessError::Spawn { .. } => false,
            ProviderProcessError::Io { source, .. } => {
                looks_like_provider_auth_failure(&source.to_string())
            }
        }
    }
}

pub(super) fn provider_exit_error(
    binary: &'static str,
    status: std::process::ExitStatus,
    stderr_diag: &StderrDiagnostics,
    stdout_text: &str,
) -> ProviderProcessError {
    let mut message = format!("process exited with status {status}");
    let mut parts = Vec::new();

    if let Some(summary) = stderr_diag.summary() {
        parts.push(summary);
    }

    let stdout_trimmed = stdout_text.trim();
    if !stdout_trimmed.is_empty() {
        parts.push(truncate_line(stdout_trimmed, stderr_diag_max_chars()));
    }

    if !parts.is_empty() {
        message.push_str(": ");
        message.push_str(&parts.join(" | "));
    }

    ProviderProcessError::Io {
        binary,
        source: std::io::Error::other(message),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn provider_auth_failure_maps_to_not_authenticated_message() {
        let error = ProviderProcessError::Io {
            binary: "claude",
            source: std::io::Error::other(
                "process exited with status exit status: 1: Failed to authenticate. API Error: 401",
            ),
        };

        let engine_error = error.to_engine_error(ProviderId::Claude);
        assert!(matches!(
            engine_error.code,
            EngineErrorCode::NotAuthenticated
        ));
        assert!(engine_error.message.contains("claude auth login"));
    }

    #[test]
    fn provider_exit_error_includes_stdout_when_stderr_is_empty() {
        let diag = StderrDiagnostics::default();
        let error = provider_exit_error(
            "claude",
            std::process::Command::new("false")
                .status()
                .expect("false exits"),
            &diag,
            "Failed to authenticate. API Error: 401 Invalid authentication credentials",
        );

        let engine_error = error.to_engine_error(ProviderId::Claude);
        assert!(matches!(
            engine_error.code,
            EngineErrorCode::NotAuthenticated
        ));
        assert!(!engine_error.message.contains("failed: 1"));
    }

    #[test]
    fn session_limit_maps_to_actionable_message_not_auth_login() {
        let error = ProviderProcessError::Io {
            binary: "claude",
            source: std::io::Error::other(
                "process exited with status exit status: 1: You've hit your session limit · resets 6:50pm (Europe/Amsterdam)",
            ),
        };

        let engine_error = error.to_engine_error(ProviderId::Claude);
        assert!(matches!(
            engine_error.code,
            EngineErrorCode::ProviderProcessFailed
        ));
        assert!(engine_error.message.contains("session limit reached"));
        assert!(!engine_error.message.contains("auth login"));
        assert!(engine_error.retryable);
    }

    #[test]
    fn bare_exit_status_one_does_not_surface_as_failed_one_message() {
        let error = ProviderProcessError::Io {
            binary: "claude",
            source: std::io::Error::other("process exited with status exit status: 1"),
        };

        let message = error.to_engine_error(ProviderId::Claude).message;
        assert!(!message.contains("failed: 1"));
        assert!(message.contains("claude auth login") || message.contains("exited unexpectedly"));
    }

    #[test]
    fn missing_binary_spawn_maps_to_setup_message() {
        let error = ProviderProcessError::Spawn {
            binary: "codex",
            source: std::io::Error::new(std::io::ErrorKind::NotFound, "No such file"),
        };

        let engine_error = error.to_engine_error(ProviderId::Codex);
        assert!(matches!(engine_error.code, EngineErrorCode::MissingBinary));
        assert!(engine_error.message.contains("codex login"));
    }

    #[test]
    fn is_auth_failure_detects_401_in_io_source() {
        let error = ProviderProcessError::Io {
            binary: "claude",
            source: std::io::Error::other("API Error: 401 Invalid authentication credentials"),
        };

        assert!(error.is_auth_failure());
    }

    #[test]
    fn is_auth_failure_false_for_spawn_errors() {
        let error = ProviderProcessError::Spawn {
            binary: "claude",
            source: std::io::Error::new(std::io::ErrorKind::NotFound, "missing"),
        };

        assert!(!error.is_auth_failure());
    }
}
