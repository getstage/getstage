use std::collections::HashSet;

use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::sync::mpsc;
use tokio::time::sleep;

use crate::helpers::time::now_millis;
use crate::models::providers::ProviderId;
use crate::models::runs::RunEvent;
use crate::providers::adapter::ProviderRunContext;
use crate::runs::RunEventSink;

use super::heuristics::{expected_artifact_kind, should_suppress_stderr_warning};
use super::stderr::{StderrArtifactCapture, StderrDiagnostics, append_output};

const PROCESS_DRAIN_GRACE: std::time::Duration = std::time::Duration::from_millis(25);

#[derive(Clone, Copy, Debug)]
pub(super) enum StreamName {
    Stdout,
    Stderr,
}

#[derive(Debug)]
pub(super) struct ProcessLine {
    pub stream: StreamName,
    pub text: String,
}

/// Tracks line-level state for a single provider process attempt. Held by the orchestrator
/// across the `tokio::select!` loop so the retry path can observe whether any stdout was
/// already emitted (in which case retrying would duplicate output).
#[derive(Debug, Default)]
pub(super) struct LineSink {
    pub final_text: String,
    pub stderr_capture: StderrArtifactCapture,
    pub stderr_diag: StderrDiagnostics,
    pub emitted_stdout: bool,
    observed_context_files: HashSet<String>,
}

impl LineSink {
    pub(super) fn handle(
        &mut self,
        context: &ProviderRunContext,
        events: &RunEventSink,
        capture_multiline_stderr: bool,
        line: ProcessLine,
    ) {
        let expected_kind = expected_artifact_kind(context.request.mode);
        match line.stream {
            StreamName::Stdout => {
                self.emitted_stdout = true;
                if let Some(event) = structured_provider_event(context, &line.text) {
                    match event {
                        StructuredProviderEvent::FinalText(text) => {
                            self.final_text = text.clone();
                            events.send(RunEvent::OutputDelta {
                                api_version: context.api_version,
                                run_id: context.run_id.clone(),
                                provider_id: context.request.provider_id,
                                created_at: now_millis(),
                                text,
                            });
                        }
                        StructuredProviderEvent::Read(paths) => {
                            for path in paths {
                                tracing::info!(
                                    run_id = context.run_id.as_str(),
                                    provider_id = ?context.request.provider_id,
                                    path,
                                    "provider context file read"
                                );
                                self.observed_context_files.insert(path);
                            }
                        }
                        StructuredProviderEvent::Other => {}
                    }
                } else {
                    append_output(&mut self.final_text, &line.text);
                    events.send(RunEvent::OutputDelta {
                        api_version: context.api_version,
                        run_id: context.run_id.clone(),
                        provider_id: context.request.provider_id,
                        created_at: now_millis(),
                        text: format!("{}\n", line.text),
                    });
                }
            }
            StreamName::Stderr => {
                if line.text.trim().is_empty() {
                    return;
                }

                self.stderr_capture.ingest(
                    &line.text,
                    &mut self.final_text,
                    capture_multiline_stderr,
                    expected_kind,
                );
                self.stderr_diag.record(&line.text);

                if capture_multiline_stderr || should_suppress_stderr_warning(&line.text) {
                    tracing::debug!(
                        run_id = %context.run_id,
                        provider_id = ?context.request.provider_id,
                        stderr = %line.text,
                        "provider stderr (suppressed)"
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

    pub(super) fn missing_required_reads(&self, context: &ProviderRunContext) -> Vec<String> {
        if !matches!(
            context.request.provider_id,
            ProviderId::Claude | ProviderId::Codex
        ) {
            return Vec::new();
        }
        context
            .request
            .context
            .required_context_files
            .iter()
            .flatten()
            .filter(|path| !self.observed_context_files.contains(path.as_str()))
            .cloned()
            .collect()
    }

    pub(super) fn flush_stderr(
        &mut self,
        context: &ProviderRunContext,
        capture_multiline_stderr: bool,
    ) {
        let expected_kind = expected_artifact_kind(context.request.mode);
        self.stderr_capture.flush(
            &mut self.final_text,
            capture_multiline_stderr,
            expected_kind,
        );
    }
}

enum StructuredProviderEvent {
    FinalText(String),
    Read(Vec<String>),
    Other,
}

fn structured_provider_event(
    context: &ProviderRunContext,
    line: &str,
) -> Option<StructuredProviderEvent> {
    let value = serde_json::from_str::<serde_json::Value>(line).ok()?;
    match context.request.provider_id {
        ProviderId::Claude => parse_claude_event(&value),
        ProviderId::Codex => parse_codex_event(context, &value),
    }
}

fn parse_claude_event(value: &serde_json::Value) -> Option<StructuredProviderEvent> {
    if value.get("type").and_then(serde_json::Value::as_str) == Some("result") {
        return value
            .get("result")
            .and_then(serde_json::Value::as_str)
            .map(|text| StructuredProviderEvent::FinalText(text.to_string()))
            .or(Some(StructuredProviderEvent::Other));
    }
    let paths = value
        .pointer("/message/content")
        .and_then(serde_json::Value::as_array)
        .into_iter()
        .flatten()
        .filter(|item| {
            item.get("type").and_then(serde_json::Value::as_str) == Some("tool_use")
                && item.get("name").and_then(serde_json::Value::as_str) == Some("Read")
        })
        .filter_map(|item| {
            item.pointer("/input/file_path")
                .or_else(|| item.pointer("/input/path"))
                .and_then(serde_json::Value::as_str)
                .map(str::to_string)
        })
        .collect::<Vec<_>>();
    Some(if paths.is_empty() {
        StructuredProviderEvent::Other
    } else {
        StructuredProviderEvent::Read(paths)
    })
}

fn parse_codex_event(
    context: &ProviderRunContext,
    value: &serde_json::Value,
) -> Option<StructuredProviderEvent> {
    let item = value.get("item")?;
    match item.get("type").and_then(serde_json::Value::as_str) {
        Some("agent_message") => item
            .get("text")
            .and_then(serde_json::Value::as_str)
            .map(|text| StructuredProviderEvent::FinalText(text.to_string()))
            .or(Some(StructuredProviderEvent::Other)),
        Some("command_execution") => {
            let command = item
                .get("command")
                .and_then(serde_json::Value::as_str)
                .unwrap_or_default();
            let paths = context
                .request
                .context
                .context_files
                .iter()
                .flatten()
                .filter(|path| command.contains(path.as_str()))
                .cloned()
                .collect::<Vec<_>>();
            Some(if paths.is_empty() {
                StructuredProviderEvent::Other
            } else {
                StructuredProviderEvent::Read(paths)
            })
        }
        _ => Some(StructuredProviderEvent::Other),
    }
}

pub(super) async fn drain_pending_lines(
    context: &ProviderRunContext,
    events: &RunEventSink,
    line_rx: &mut mpsc::Receiver<ProcessLine>,
    sink: &mut LineSink,
    capture_multiline_stderr: bool,
) {
    loop {
        let mut drained_any = false;
        while let Ok(line) = line_rx.try_recv() {
            drained_any = true;
            sink.handle(context, events, capture_multiline_stderr, line);
        }

        if !drained_any {
            break;
        }
    }

    sleep(PROCESS_DRAIN_GRACE).await;

    while let Ok(line) = line_rx.try_recv() {
        sink.handle(context, events, capture_multiline_stderr, line);
    }
}

pub(super) fn spawn_line_reader<R>(
    stream: StreamName,
    reader: R,
    line_tx: mpsc::Sender<ProcessLine>,
) where
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

pub(super) async fn terminate_child(child: &mut tokio::process::Child) {
    if let Err(error) = child.start_kill() {
        tracing::debug!(%error, "failed to signal provider process for cancellation");
        return;
    }

    if let Err(error) = child.wait().await {
        tracing::debug!(%error, "failed to wait for cancelled provider process");
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::runs::{RunContext, RunMode, StartRunRequest};

    fn codex_context(path: &str) -> ProviderRunContext {
        ProviderRunContext {
            api_version: "v1",
            run_id: "run-read-events".to_string(),
            request: StartRunRequest {
                provider_id: ProviderId::Codex,
                model_id: "codex-default".to_string(),
                prompt: String::new(),
                mode: RunMode::Wireframes,
                context: RunContext {
                    context_files: Some(vec![path.to_string()]),
                    ..Default::default()
                },
                attachments: vec![],
                model_options: vec![],
                working_directory: None,
            },
        }
    }

    #[test]
    fn parses_codex_0144_completed_command_read_event() {
        let path = "/tmp/stage-context/required.md";
        let value = serde_json::json!({
            "type": "item.completed",
            "item": {
                "id": "item_2",
                "type": "command_execution",
                "command": format!("/bin/zsh -lc \"sed -n '1,120p' {path}\""),
                "aggregated_output": "context",
                "exit_code": 0,
                "status": "completed"
            }
        });

        match parse_codex_event(&codex_context(path), &value) {
            Some(StructuredProviderEvent::Read(paths)) => assert_eq!(paths, vec![path]),
            _ => panic!("expected a normalized Codex file-read event"),
        }
    }
}
