mod error;
mod heuristics;
mod line;
mod stderr;

use std::path::PathBuf;
use std::process::Stdio;
use std::time::Duration;

use tokio::io::AsyncWriteExt;
use tokio::process::Command;
use tokio::sync::{mpsc, watch};
use tokio::time::sleep;

use crate::helpers::time::now_millis;
use crate::models::errors::EngineErrorCode;
use crate::models::providers::ProviderId;
use crate::models::runs::RunEvent;
use crate::providers::adapter::ProviderRunContext;
use crate::providers::command::{
    configure_provider_process, provider_cli_working_directory, run_command_in,
};
use crate::runs::RunEventSink;

pub use error::ProviderProcessError;

use error::provider_exit_error;
use heuristics::needs_stderr_artifact_capture;
use line::{
    LineSink, ProcessLine, StreamName, drain_pending_lines, spawn_line_reader, terminate_child,
};

const PROCESS_POLL_INTERVAL: Duration = Duration::from_millis(50);
const PROCESS_LINE_CAPACITY: usize = 128;
const AUTH_WARMUP_DELAY: Duration = Duration::from_millis(300);
const AUTH_WARMUP_TIMEOUT: Duration = Duration::from_secs(15);

#[derive(Clone, Debug)]
pub struct ProviderProcessSpec {
    pub binary: &'static str,
    pub args: Vec<String>,
    pub stdin: Option<String>,
    pub working_directory: Option<String>,
}

#[derive(Debug)]
pub enum ProviderProcessOutcome {
    Completed(String),
    Cancelled,
}

pub async fn run_provider_process(
    context: ProviderRunContext,
    spec: ProviderProcessSpec,
    events: RunEventSink,
    cancel: &mut watch::Receiver<bool>,
) {
    let binary = spec.binary;
    match run_provider_process_collect(&context, spec, events.clone(), cancel).await {
        Ok(ProviderProcessOutcome::Completed(final_text)) => {
            events.send(RunEvent::RunCompleted {
                api_version: context.api_version,
                run_id: context.run_id,
                provider_id: context.request.provider_id,
                created_at: now_millis(),
                final_text: Some(final_text),
            });
        }
        Ok(ProviderProcessOutcome::Cancelled) => {}
        Err(error) => {
            tracing::error!(
                run_id = %context.run_id,
                provider_id = ?context.request.provider_id,
                binary,
                error = %error,
                "provider process failed"
            );
            events.send(RunEvent::RunFailed {
                api_version: context.api_version,
                run_id: context.run_id,
                provider_id: context.request.provider_id,
                created_at: now_millis(),
                error: error.to_engine_error(context.request.provider_id),
            });
        }
    }
}

pub async fn run_provider_process_collect(
    context: &ProviderRunContext,
    spec: ProviderProcessSpec,
    events: RunEventSink,
    cancel: &mut watch::Receiver<bool>,
) -> Result<ProviderProcessOutcome, ProviderProcessError> {
    let provider_id = context.request.provider_id;
    let retry_spec = spec.clone();

    let first = attempt_provider_process(context, spec, events.clone(), cancel).await;

    let AttemptOutcome {
        result,
        emitted_stdout,
    } = first;

    match result {
        Ok(outcome) => Ok(outcome),
        Err(error) if !emitted_stdout && error.is_auth_failure() => {
            tracing::warn!(
                run_id = %context.run_id,
                provider_id = ?provider_id,
                "provider auth failed before any output; warming credentials and retrying once"
            );

            sleep(AUTH_WARMUP_DELAY).await;
            warm_provider_auth(provider_id).await;

            attempt_provider_process(context, retry_spec, events, cancel)
                .await
                .result
        }
        Err(error) => Err(error),
    }
}

/// Runs `claude auth status` (or the codex equivalent) to force the CLI to re-read its
/// credentials file. The Claude CLI rotates its refresh token on each call, so when another
/// client (Cursor, ChatBox, a parallel Stage run) has just rotated the token, this call
/// brings the on-disk credentials back into a usable state without any Terminal step.
async fn warm_provider_auth(provider_id: ProviderId) -> bool {
    let (binary, args): (&str, &[&str]) = match provider_id {
        ProviderId::Claude => ("claude", &["auth", "status"]),
        ProviderId::Codex => return false,
    };

    let working_directory = provider_cli_working_directory().ok();
    let result = run_command_in(
        binary,
        args,
        AUTH_WARMUP_TIMEOUT,
        EngineErrorCode::VersionTimeout,
        working_directory.as_deref(),
    )
    .await;

    match result {
        Ok(probe) if probe.code == Some(0) => true,
        Ok(probe) => {
            tracing::debug!(
                provider_id = ?provider_id,
                exit = ?probe.code,
                stderr = %probe.stderr.trim(),
                "auth warmup probe returned non-zero exit"
            );
            false
        }
        Err(error) => {
            tracing::debug!(
                provider_id = ?provider_id,
                error = %error.message,
                "auth warmup probe failed to run"
            );
            false
        }
    }
}

#[derive(Debug)]
struct AttemptOutcome {
    result: Result<ProviderProcessOutcome, ProviderProcessError>,
    emitted_stdout: bool,
}

async fn attempt_provider_process(
    context: &ProviderRunContext,
    spec: ProviderProcessSpec,
    events: RunEventSink,
    cancel: &mut watch::Receiver<bool>,
) -> AttemptOutcome {
    let mut command = Command::new(spec.binary);
    configure_provider_process(&mut command);
    command
        .args(&spec.args)
        .stdin(if spec.stdin.is_some() {
            Stdio::piped()
        } else {
            Stdio::null()
        })
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .kill_on_drop(true);

    let working_directory = match provider_working_directory(spec.working_directory.as_deref()) {
        Ok(dir) => dir,
        Err(source) => {
            return AttemptOutcome {
                result: Err(ProviderProcessError::Io {
                    binary: spec.binary,
                    source,
                }),
                emitted_stdout: false,
            };
        }
    };
    command.current_dir(working_directory);

    let mut child = match command.spawn() {
        Ok(child) => child,
        Err(source) => {
            return AttemptOutcome {
                result: Err(ProviderProcessError::Spawn {
                    binary: spec.binary,
                    source,
                }),
                emitted_stdout: false,
            };
        }
    };

    let stdout = child.stdout.take();
    let stderr = child.stderr.take();
    let stdin = child.stdin.take();
    let (line_tx, mut line_rx) = mpsc::channel(PROCESS_LINE_CAPACITY);

    if let (Some(mut stdin), Some(input)) = (stdin, spec.stdin) {
        tokio::spawn(async move {
            let write_result = async {
                stdin.write_all(input.as_bytes()).await?;
                stdin.shutdown().await
            }
            .await;

            if let Err(error) = write_result {
                tracing::debug!(%error, "failed to write provider prompt to stdin");
            }
        });
    }

    if let Some(stdout) = stdout {
        spawn_line_reader(StreamName::Stdout, stdout, line_tx.clone());
    }

    if let Some(stderr) = stderr {
        spawn_line_reader(StreamName::Stderr, stderr, line_tx);
    }

    let mut sink = LineSink::default();
    let capture_multiline_stderr = needs_stderr_artifact_capture(context.request.mode);

    let result = drive_process_loop(
        context,
        &events,
        spec.binary,
        &mut child,
        &mut line_rx,
        &mut sink,
        capture_multiline_stderr,
        cancel,
    )
    .await;

    AttemptOutcome {
        result,
        emitted_stdout: sink.emitted_stdout,
    }
}

#[allow(clippy::too_many_arguments)]
async fn drive_process_loop(
    context: &ProviderRunContext,
    events: &RunEventSink,
    binary: &'static str,
    child: &mut tokio::process::Child,
    line_rx: &mut mpsc::Receiver<ProcessLine>,
    sink: &mut LineSink,
    capture_multiline_stderr: bool,
    cancel: &mut watch::Receiver<bool>,
) -> Result<ProviderProcessOutcome, ProviderProcessError> {
    loop {
        tokio::select! {
            changed = cancel.changed() => {
                if changed.is_ok() && *cancel.borrow() {
                    terminate_child(child).await;
                    events.send(RunEvent::RunCancelled {
                        api_version: context.api_version,
                        run_id: context.run_id.clone(),
                        provider_id: context.request.provider_id,
                        created_at: now_millis(),
                        reason: Some("Run cancelled by user.".to_string()),
                    });
                    return Ok(ProviderProcessOutcome::Cancelled);
                }
            }
            Some(line) = line_rx.recv() => {
                sink.handle(context, events, capture_multiline_stderr, line);
            }
            _ = sleep(PROCESS_POLL_INTERVAL) => {
                match child.try_wait() {
                    Ok(Some(status)) if status.success() => {
                        let _ = child.wait().await;
                        drain_pending_lines(context, events, line_rx, sink, capture_multiline_stderr).await;
                        sink.flush_stderr(context, capture_multiline_stderr);
                        return Ok(ProviderProcessOutcome::Completed(std::mem::take(&mut sink.final_text)));
                    }
                    Ok(Some(status)) => {
                        let _ = child.wait().await;
                        drain_pending_lines(context, events, line_rx, sink, capture_multiline_stderr).await;
                        sink.flush_stderr(context, capture_multiline_stderr);
                        return Err(provider_exit_error(
                            binary,
                            status,
                            &sink.stderr_diag,
                            &sink.final_text,
                        ));
                    }
                    Ok(None) => sleep(PROCESS_POLL_INTERVAL).await,
                    Err(source) => {
                        return Err(ProviderProcessError::Io {
                            binary,
                            source,
                        });
                    }
                }
            }
        }
    }
}

fn provider_working_directory(requested: Option<&str>) -> std::io::Result<PathBuf> {
    if let Some(requested) = requested.filter(|value| !value.trim().is_empty()) {
        return Ok(PathBuf::from(requested));
    }

    provider_cli_working_directory()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn provider_working_directory_keeps_an_explicit_directory() {
        let requested = std::env::temp_dir().join("stage-explicit-provider-directory");
        let resolved = provider_working_directory(requested.to_str()).expect("resolve directory");

        assert_eq!(resolved, requested);
    }

    #[test]
    fn provider_working_directory_defaults_to_an_isolated_temp_directory() {
        let resolved = provider_working_directory(None).expect("create isolated directory");

        assert_eq!(resolved, std::env::temp_dir().join("stage-engine-provider"));
        assert!(resolved.is_dir());
    }
}
