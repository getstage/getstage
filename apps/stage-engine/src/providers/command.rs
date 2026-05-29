use std::io::ErrorKind;
use std::time::Duration;

use tokio::process::Command;
use tokio::time::timeout;

use crate::models::errors::{EngineError, EngineErrorCode};

pub struct CommandProbe {
    pub stdout: String,
    pub stderr: String,
    pub code: Option<i32>,
}

pub async fn run_command(
    binary: &str,
    args: &[&str],
    duration: Duration,
    timeout_code: EngineErrorCode,
) -> Result<CommandProbe, EngineError> {
    let output = timeout(duration, Command::new(binary).args(args).output()).await;

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
