use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::sync::mpsc;
use tokio::time::sleep;

use crate::helpers::time::now_millis;
use crate::models::runs::RunEvent;
use crate::providers::adapter::ProviderRunContext;
use crate::runs::RunEventSink;

use super::heuristics::should_suppress_stderr_warning;
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
}

impl LineSink {
    pub(super) fn handle(
        &mut self,
        context: &ProviderRunContext,
        events: &RunEventSink,
        capture_multiline_stderr: bool,
        line: ProcessLine,
    ) {
        match line.stream {
            StreamName::Stdout => {
                self.emitted_stdout = true;
                append_output(&mut self.final_text, &line.text);
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

                self.stderr_capture.ingest(
                    &line.text,
                    &mut self.final_text,
                    capture_multiline_stderr,
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

    pub(super) fn flush_stderr(&mut self, capture_multiline_stderr: bool) {
        self.stderr_capture
            .flush(&mut self.final_text, capture_multiline_stderr);
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
