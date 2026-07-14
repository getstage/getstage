use std::io::ErrorKind;
use std::path::Path;
use std::time::Duration;

use tokio::process::Command;
use tokio::time::timeout;

use crate::models::errors::{EngineError, EngineErrorCode};

pub struct CommandProbe {
    pub stdout: String,
    pub stderr: String,
    pub code: Option<i32>,
}

pub fn provider_cli_working_directory() -> std::io::Result<std::path::PathBuf> {
    let directory = std::env::temp_dir().join("stage-engine-provider");
    std::fs::create_dir_all(&directory)?;
    Ok(directory)
}

fn apply_provider_cli_env(command: &mut Command) {
    for key in ["HOME", "USER", "LOGNAME", "PATH", "LANG", "LC_ALL", "SHELL"] {
        if let Ok(value) = std::env::var(key) {
            command.env(key, value);
        }
    }
}

/// Homebrew auto-update can hang GUI-spawned upgrades for minutes; Synara-style
/// one-click updates should stay non-interactive and bounded.
fn apply_update_command_env(command: &mut Command, binary: &str) {
    apply_provider_cli_env(command);
    if binary == "brew" {
        command.env("HOMEBREW_NO_AUTO_UPDATE", "1");
        command.env("HOMEBREW_NO_ENV_HINTS", "1");
        command.env("HOMEBREW_NO_ANALYTICS", "1");
        command.env("CI", "1");
    }
    if binary == "npm" {
        command.env("npm_config_fund", "false");
        command.env("npm_config_audit", "false");
    }
}

pub fn configure_provider_process(command: &mut Command) {
    apply_provider_cli_env(command);
}

pub async fn run_command(
    binary: &str,
    args: &[&str],
    duration: Duration,
    timeout_code: EngineErrorCode,
) -> Result<CommandProbe, EngineError> {
    run_command_in(binary, args, duration, timeout_code, None, false).await
}

pub async fn run_update_command(
    binary: &str,
    args: &[&str],
    duration: Duration,
    timeout_code: EngineErrorCode,
) -> Result<CommandProbe, EngineError> {
    run_command_in(binary, args, duration, timeout_code, None, true).await
}

pub async fn run_command_in(
    binary: &str,
    args: &[&str],
    duration: Duration,
    timeout_code: EngineErrorCode,
    working_directory: Option<&Path>,
    for_update: bool,
) -> Result<CommandProbe, EngineError> {
    let mut command = Command::new(binary);
    command.args(args);
    if for_update {
        apply_update_command_env(&mut command, binary);
    } else {
        apply_provider_cli_env(&mut command);
    }
    // Critical: without this, a timed-out update keeps running and the UI looks stuck.
    command.kill_on_drop(true);
    if let Some(working_directory) = working_directory {
        command.current_dir(working_directory);
    }

    let output = timeout(duration, command.output()).await;

    match output {
        Ok(Ok(output)) => Ok(CommandProbe {
            stdout: String::from_utf8_lossy(&output.stdout).to_string(),
            stderr: String::from_utf8_lossy(&output.stderr).to_string(),
            code: output.status.code(),
        }),
        Ok(Err(error)) if error.kind() == ErrorKind::NotFound => Err(EngineError {
            code: EngineErrorCode::MissingBinary,
            message: format!("`{binary}` was not found on PATH."),
            provider_id: None,
            retryable: true,
            detail: None,
        }),
        Ok(Err(error)) => Err(EngineError {
            code: EngineErrorCode::IoError,
            message: format!("Failed to run `{binary}`."),
            provider_id: None,
            retryable: true,
            detail: Some(error.to_string()),
        }),
        Err(_) => Err(EngineError {
            code: timeout_code,
            message: format!("`{binary}` command timed out."),
            provider_id: None,
            retryable: true,
            detail: None,
        }),
    }
}

pub fn command_detail(result: &CommandProbe) -> Option<String> {
    let stderr = result.stderr.trim();
    if !stderr.is_empty() {
        return Some(stderr.to_string());
    }

    let stdout = result.stdout.trim();
    if !stdout.is_empty() {
        return Some(stdout.to_string());
    }

    result
        .code
        .map(|code| format!("Command exited with code {code}."))
}

pub fn parse_version(output: &str) -> Option<String> {
    output
        .split(|character: char| !character.is_ascii_alphanumeric() && character != '.')
        .find(|part| {
            let mut segments = part.split('.');
            matches!(
                (segments.next(), segments.next(), segments.next()),
                (Some(major), Some(minor), Some(patch))
                    if major.chars().all(|c| c.is_ascii_digit())
                        && minor.chars().all(|c| c.is_ascii_digit())
                        && patch.chars().all(|c| c.is_ascii_digit())
            )
        })
        .map(ToString::to_string)
}
