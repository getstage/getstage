use std::process::Stdio;
use std::time::Duration;

use thiserror::Error;
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::process::Command;
use tokio::sync::{mpsc, watch};
use tokio::time::sleep;

use crate::helpers::provider_json::is_complete_json_object;
use crate::helpers::time::now_millis;
use crate::models::errors::{EngineError, EngineErrorCode};
use crate::models::providers::ProviderId;
use crate::models::runs::{RunEvent, RunMode};
use crate::providers::adapter::ProviderRunContext;
use crate::runs::RunEventSink;

const PROCESS_POLL_INTERVAL: Duration = Duration::from_millis(50);
const PROCESS_LINE_CAPACITY: usize = 128;
const PROCESS_DRAIN_GRACE: Duration = Duration::from_millis(25);

#[derive(Clone, Copy, Debug)]
pub enum StreamName {
    Stdout,
    Stderr,
}

#[derive(Debug)]
pub struct ProviderProcessSpec {
    pub binary: &'static str,
    pub args: Vec<String>,
    pub stdin: Option<String>,
    pub working_directory: Option<String>,
}

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
    pub fn to_engine_error(&self, provider_id: ProviderId) -> EngineError {
        match self {
            ProviderProcessError::Spawn { source, .. } => EngineError {
                code: EngineErrorCode::RunSpawnFailed,
                message: "Failed to start provider CLI process.".to_string(),
                provider_id: Some(provider_id),
                retryable: true,
                detail: Some(source.to_string()),
            },
            ProviderProcessError::Io { source, .. } => EngineError {
                code: EngineErrorCode::IoError,
                message: "Provider CLI process I/O failed.".to_string(),
                provider_id: Some(provider_id),
                retryable: true,
                detail: Some(source.to_string()),
            },
        }
    }
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
    let mut command = Command::new(spec.binary);
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

    if let Some(working_directory) = spec.working_directory {
        command.current_dir(working_directory);
    }

    let mut child = command
        .spawn()
        .map_err(|source| ProviderProcessError::Spawn {
            binary: spec.binary,
            source,
        })?;

    let stdout = child.stdout.take();
    let stderr = child.stderr.take();
    let stdin = child.stdin.take();
    let (line_tx, mut line_rx) = mpsc::channel(PROCESS_LINE_CAPACITY);

    if let (Some(mut stdin), Some(input)) = (stdin, spec.stdin) {
        tokio::spawn(async move {
            if let Err(error) = stdin.write_all(input.as_bytes()).await {
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

    let mut final_text = String::new();
    let mut stderr_capture = StderrArtifactCapture::default();
    let capture_multiline_stderr = needs_stderr_artifact_capture(context.request.mode);

    loop {
        tokio::select! {
            changed = cancel.changed() => {
                if changed.is_ok() && *cancel.borrow() {
                    terminate_child(&mut child).await;
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
                handle_process_line(
                    context,
                    &events,
                    &mut final_text,
                    &mut stderr_capture,
                    capture_multiline_stderr,
                    line,
                );
            }
            _ = sleep(PROCESS_POLL_INTERVAL) => {
                match child.try_wait() {
                    Ok(Some(status)) if status.success() => {
                        let _ = child.wait().await;
                        drain_pending_lines(
                            context,
                            &events,
                            &mut line_rx,
                            &mut final_text,
                            &mut stderr_capture,
                            capture_multiline_stderr,
                        )
                        .await;
                        stderr_capture.flush(&mut final_text, capture_multiline_stderr);
                        return Ok(ProviderProcessOutcome::Completed(final_text));
                    }
                    Ok(Some(status)) => {
                        return Err(ProviderProcessError::Io {
                            binary: spec.binary,
                            source: std::io::Error::other(format!(
                                "process exited with status {status}"
                            )),
                        });
                    }
                    Ok(None) => sleep(PROCESS_POLL_INTERVAL).await,
                    Err(source) => {
                        return Err(ProviderProcessError::Io {
                            binary: spec.binary,
                            source,
                        });
                    }
                }
            }
        }
    }
}

#[derive(Debug)]
pub enum ProviderProcessOutcome {
    Completed(String),
    Cancelled,
}

#[derive(Debug, Default)]
struct StderrArtifactCapture {
    pending: Option<String>,
}

impl StderrArtifactCapture {
    fn ingest(&mut self, line: &str, final_text: &mut String, capture_multiline: bool) {
        if looks_like_json_artifact_line(line) {
            self.pending = None;
            append_output(final_text, line.trim());
            return;
        }

        if !capture_multiline {
            return;
        }

        let trimmed = line.trim();
        if self.pending.is_some() || trimmed.starts_with('{') {
            let buffer = self.pending.get_or_insert_with(String::new);
            if !buffer.is_empty() {
                buffer.push('\n');
            }
            buffer.push_str(line);

            if is_complete_json_object(buffer) && buffer.contains("\"artifactKind\"") {
                let completed = self.pending.take().expect("pending stderr json buffer");
                append_output(final_text, completed.trim());
            }
        }
    }

    fn flush(&mut self, final_text: &mut String, capture_multiline: bool) {
        if !capture_multiline {
            return;
        }

        let Some(pending) = self.pending.take() else {
            return;
        };

        let trimmed = pending.trim();
        if is_complete_json_object(trimmed) && trimmed.contains("\"artifactKind\"") {
            append_output(final_text, trimmed);
        }
    }
}

#[derive(Debug)]
struct ProcessLine {
    stream: StreamName,
    text: String,
}

fn needs_stderr_artifact_capture(mode: RunMode) -> bool {
    matches!(
        mode,
        RunMode::Research
            | RunMode::Strategy
            | RunMode::Flows
            | RunMode::Wireframes
            | RunMode::Styleguide
            | RunMode::Generation
    )
}

fn handle_process_line(
    context: &ProviderRunContext,
    events: &RunEventSink,
    final_text: &mut String,
    stderr_capture: &mut StderrArtifactCapture,
    capture_multiline_stderr: bool,
    line: ProcessLine,
) {
    match line.stream {
        StreamName::Stdout => {
            append_output(final_text, &line.text);
            events.send(RunEvent::OutputDelta {
                api_version: context.api_version,
                run_id: context.run_id.clone(),
                provider_id: context.request.provider_id,
                created_at: now_millis(),
                text: format!("{}\n", line.text),
            });
        }
        StreamName::Stderr => {
            if line.text.trim().is_empty() {
                return;
            }

            stderr_capture.ingest(&line.text, final_text, capture_multiline_stderr);

            if should_suppress_stderr_warning(&line.text) {
                tracing::debug!(
                    run_id = %context.run_id,
                    provider_id = ?context.request.provider_id,
                    stderr = %line.text,
                    "provider stderr (suppressed warning)"
                );
                return;
            }

            tracing::warn!(
                run_id = %context.run_id,
                provider_id = ?context.request.provider_id,
                stderr = %line.text,
                "provider stderr"
            );
            events.send(RunEvent::ProviderWarning {
                api_version: context.api_version,
                run_id: context.run_id.clone(),
                provider_id: context.request.provider_id,
                created_at: now_millis(),
                message: line.text,
            });
        }
    }
}

async fn drain_pending_lines(
    context: &ProviderRunContext,
    events: &RunEventSink,
    line_rx: &mut mpsc::Receiver<ProcessLine>,
    final_text: &mut String,
    stderr_capture: &mut StderrArtifactCapture,
    capture_multiline_stderr: bool,
) {
    loop {
        let mut drained_any = false;
        while let Ok(line) = line_rx.try_recv() {
            drained_any = true;
            handle_process_line(
                context,
                events,
                final_text,
                stderr_capture,
                capture_multiline_stderr,
                line,
            );
        }

        if !drained_any {
            break;
        }
    }

    sleep(PROCESS_DRAIN_GRACE).await;

    while let Ok(line) = line_rx.try_recv() {
        handle_process_line(
            context,
            events,
            final_text,
            stderr_capture,
            capture_multiline_stderr,
            line,
        );
    }
}

fn spawn_line_reader<R>(stream: StreamName, reader: R, line_tx: mpsc::Sender<ProcessLine>)
where
    R: tokio::io::AsyncRead + Send + Unpin + 'static,
{
    tokio::spawn(async move {
        let mut lines = BufReader::new(reader).lines();
        loop {
            match lines.next_line().await {
                Ok(Some(text)) => {
                    if line_tx.send(ProcessLine { stream, text }).await.is_err() {
                        break;
                    }
                }
                Ok(None) => break,
                Err(error) => {
                    tracing::debug!(%error, "provider process stream read failed");
                    break;
                }
            }
        }
    });
}

async fn terminate_child(child: &mut tokio::process::Child) {
    if let Err(error) = child.start_kill() {
        tracing::debug!(%error, "failed to signal provider process for cancellation");
        return;
    }

    if let Err(error) = child.wait().await {
        tracing::debug!(%error, "failed to wait for cancelled provider process");
    }
}

fn append_output(final_text: &mut String, text: &str) {
    if !final_text.is_empty() {
        final_text.push('\n');
    }
    final_text.push_str(text);
}

fn looks_like_json_artifact_line(text: &str) -> bool {
    let trimmed = text.trim();
    trimmed.starts_with('{') && trimmed.ends_with('}') && trimmed.contains("\"artifactKind\"")
}

/// Codex often streams artifact JSON and prompt echoes on stderr. Still parsed when needed,
/// but not surfaced as provider_warning (avoids false "something broke" signals in the terminal).
fn should_suppress_stderr_warning(text: &str) -> bool {
    let trimmed = text.trim();
    if trimmed.is_empty() {
        return true;
    }

    if looks_like_json_artifact_line(text) {
        return true;
    }

    if trimmed == "codex" || trimmed.starts_with("tokens used") {
        return true;
    }

    if trimmed.contains("\"artifactKind\"")
        || trimmed.contains("researchArtifact")
        || trimmed.contains("strategyArtifact")
        || trimmed.contains("ui-patterns-")
        || trimmed.contains("recognizedPatterns")
        || trimmed.contains("sourceReferenceId")
        || trimmed.contains("imageUrl")
    {
        return true;
    }

    if trimmed.starts_with("Requirements:")
        || trimmed.starts_with("- Use exactly these seven sections")
        || trimmed.starts_with("- `apiVersion`")
        || trimmed.starts_with("- `artifactKind`")
        || trimmed.starts_with("- Make the strategy specific")
        || trimmed.starts_with("- Set every section to")
        || trimmed.starts_with("- For Content Strategy")
        || trimmed.starts_with("- For Competitive Positioning")
        || trimmed.starts_with("- For Key Pages")
        || trimmed.starts_with("- For `table` sections")
        || trimmed.starts_with("The JSON must use:")
        || trimmed.starts_with("  1. Design Direction")
        || trimmed.starts_with("  2. Design Principles")
        || trimmed.starts_with("  3. Target Audience")
        || trimmed.starts_with("  4. Content Strategy")
        || trimmed.starts_with("  5. Competitive Positioning")
        || trimmed.starts_with("  6. Key Pages")
        || trimmed.starts_with("  7. Accessibility")
    {
        return true;
    }

    // JSON line fragments (Codex pretty-print on stderr)
    let looks_like_json_fragment = (trimmed.starts_with('"') && trimmed.contains("\":"))
        || trimmed == "{"
        || trimmed == "}"
        || trimmed == "],"
        || trimmed.starts_with("},")
        || trimmed.starts_with("{")
        || trimmed.starts_with("[");

    looks_like_json_fragment
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn stderr_capture_accepts_single_line_artifact() {
        let mut capture = StderrArtifactCapture::default();
        let mut final_text = String::new();
        let line = r#"{"apiVersion":"v1","artifactKind":"strategyArtifact","sections":[{"id":"direction","kind":"plain","body":["Go"]}]}"#;

        capture.ingest(line, &mut final_text, true);

        assert!(final_text.contains("strategyArtifact"));
    }

    #[test]
    fn stderr_capture_reassembles_pretty_printed_artifact() {
        let mut capture = StderrArtifactCapture::default();
        let mut final_text = String::new();
        let lines = [
            "{",
            r#"  "apiVersion": "v1","#,
            r#"  "artifactKind": "strategyArtifact","#,
            r#"  "sections": [{"id":"direction","kind":"plain","body":["Go"]}]"#,
            "}",
        ];

        for line in lines {
            capture.ingest(line, &mut final_text, true);
        }

        assert!(final_text.contains("strategyArtifact"));
        assert!(final_text.contains("direction"));
    }

    #[test]
    fn stderr_capture_skips_multiline_capture_for_chat_mode() {
        let mut capture = StderrArtifactCapture::default();
        let mut final_text = String::new();

        capture.ingest("{", &mut final_text, false);
        capture.ingest(
            r#"  "artifactKind": "strategyArtifact""#,
            &mut final_text,
            false,
        );

        assert!(final_text.is_empty());
    }

    #[test]
    fn needs_stderr_artifact_capture_is_true_for_strategy_runs() {
        assert!(needs_stderr_artifact_capture(RunMode::Strategy));
        assert!(!needs_stderr_artifact_capture(RunMode::Chat));
    }
}
