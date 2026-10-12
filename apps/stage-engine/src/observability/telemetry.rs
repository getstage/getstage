//! Testing-only, metadata-only Research diagnostics. Never serialize a RunEvent.
use std::collections::BTreeMap;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use serde::Serialize;
use tokio::sync::mpsc;
use tokio::task::AbortHandle;
use uuid::Uuid;

use crate::helpers::time::now_millis;
use crate::models::errors::EngineErrorCode;
use crate::models::providers::ProviderId;
use crate::models::runs::{RunEvent, RunMode, RunStatus, StartRunRequest};
use crate::research::section::parse_research_section;

const ENDPOINT: &str = "https://testing.getstage.co/api/telemetry";
const QUEUE_CAPACITY: usize = 500;
const BATCH_SIZE: usize = 50;
const BATCH_DELAY: Duration = Duration::from_secs(10);
const MAX_AGE: Duration = Duration::from_secs(15);
const HTTP_TIMEOUT: Duration = Duration::from_secs(5);

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct Metadata {
    app_version: String,
    channel: &'static str,
    os: String,
    session_id: String,
}

impl Metadata {
    fn testing(
        enabled: &str,
        channel: &str,
        convex: &str,
        version: &str,
        os: &str,
    ) -> Option<Self> {
        let numeric = |value: &str| {
            !value.is_empty() && value.len() <= 4 && value.bytes().all(|byte| byte.is_ascii_digit())
        };
        let version_parts: Vec<_> = version.split('.').collect();
        let os_parts = ["macOS ", "Windows ", "Linux "]
            .iter()
            .find_map(|prefix| os.strip_prefix(prefix))?;
        let os_parts: Vec<_> = os_parts.split('.').collect();
        if enabled != "1"
            || channel != "testing"
            || convex != "https://reliable-bullfrog-917.convex.cloud"
            || version_parts.len() != 3
            || !version_parts.iter().all(|part| numeric(part))
            || !(1..=4).contains(&os_parts.len())
            || !os_parts.iter().all(|part| numeric(part))
        {
            return None;
        }
        Some(Self {
            app_version: version.to_string(),
            channel: "testing",
            os: os.to_string(),
            session_id: Uuid::new_v4().to_string(),
        })
    }
}

#[derive(Clone, Copy, Eq, PartialEq, Ord, PartialOrd, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum TelemetryStep {
    VerifyProvider,
    StageContext,
    BriefFiles,
    DetailsContext,
    ReferoContext,
    Provider,
    Parse,
    Save,
}

impl TelemetryStep {
    fn from_tool(id: &str) -> Option<Self> {
        match id {
            "verify-provider" => Some(Self::VerifyProvider),
            "stage-context" => Some(Self::StageContext),
            "details-context" => Some(Self::DetailsContext),
            "refero-context" => Some(Self::ReferoContext),
            _ => None,
        }
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct DiagnosticEvent {
    event: &'static str,
    #[serde(flatten)]
    metadata: Metadata,
    ts: u128,
    run_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    project_id: Option<String>,
    module: &'static str,
    #[serde(skip_serializing_if = "Option::is_none")]
    provider: Option<ProviderId>,
    #[serde(skip_serializing_if = "Option::is_none")]
    step: Option<TelemetryStep>,
    outcome: &'static str,
    duration_ms: u128,
    #[serde(skip_serializing_if = "Option::is_none")]
    error_code: Option<EngineErrorCode>,
    #[serde(skip_serializing_if = "Option::is_none")]
    error_kind: Option<&'static str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    failed_step: Option<TelemetryStep>,
}

// Session credentials are transport-only and deliberately have no Debug/Serialize.
struct Queued {
    token: Arc<str>,
    event: DiagnosticEvent,
    queued_at: Instant,
}

pub struct TelemetryClient {
    sender: mpsc::Sender<Queued>,
    metadata: Metadata,
    enabled: AtomicBool,
    worker: AbortHandle,
}

impl std::fmt::Debug for TelemetryClient {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("TelemetryClient")
            .field("enabled", &self.enabled.load(Ordering::Acquire))
            .finish_non_exhaustive()
    }
}

impl Drop for TelemetryClient {
    fn drop(&mut self) {
        self.worker.abort();
    }
}

impl TelemetryClient {
    pub fn from_env() -> Option<Arc<Self>> {
        let env = |key| std::env::var(key).unwrap_or_default();
        let metadata = Metadata::testing(
            &env("STAGE_TELEMETRY_ENABLED"),
            &env("STAGE_TELEMETRY_CHANNEL"),
            &env("CONVEX_URL"),
            &env("STAGE_APP_VERSION"),
            &env("STAGE_TELEMETRY_OS"),
        )?;
        let http = reqwest::Client::builder()
            .redirect(reqwest::redirect::Policy::none())
            .connect_timeout(Duration::from_secs(2))
            .timeout(HTTP_TIMEOUT)
            .build()
            .ok()?;
        let (sender, receiver) = mpsc::channel(QUEUE_CAPACITY);
        let worker = tokio::spawn(export_batches(http, ENDPOINT, receiver)).abort_handle();
        Some(Arc::new(Self {
            sender,
            metadata,
            enabled: AtomicBool::new(true),
            worker,
        }))
    }

    pub fn disable(&self) {
        self.enabled.store(false, Ordering::Release);
        // Abort drops the receiver, queued credentials and any in-flight request.
        self.worker.abort();
    }

    pub fn research(
        self: &Arc<Self>,
        request: &StartRunRequest,
        run_id: &str,
        token: Option<&str>,
    ) -> Option<Arc<RunDiagnostics>> {
        if request.mode != RunMode::Research || !self.enabled.load(Ordering::Acquire) {
            return None;
        }
        let token = token.filter(|token| !token.is_empty() && token.len() <= 16_384)?;
        let project_id = request
            .context
            .project_id
            .as_ref()
            .filter(|id| {
                (16..=64).contains(&id.len())
                    && id
                        .bytes()
                        .all(|byte| byte.is_ascii_lowercase() || byte.is_ascii_digit())
            })
            .cloned();
        Some(Arc::new(RunDiagnostics {
            client: Arc::clone(self),
            token: Arc::from(token),
            run_id: run_id.to_string(),
            project_id,
            module: if parse_research_section(request.context.source.as_deref()).is_some() {
                "research_section"
            } else {
                "research"
            },
            provider: request.provider_id,
            started: Instant::now(),
            terminal: AtomicBool::new(false),
            steps: Mutex::new(BTreeMap::new()),
        }))
    }

    fn emit(&self, token: Arc<str>, event: DiagnosticEvent) {
        if self.enabled.load(Ordering::Acquire) {
            let _ = self.sender.try_send(Queued {
                token,
                event,
                queued_at: Instant::now(),
            });
        }
    }
}

async fn export_batches(
    http: reqwest::Client,
    endpoint: &str,
    mut receiver: mpsc::Receiver<Queued>,
) {
    // No timer or polling while idle. A first event starts the batch deadline.
    while let Some(first) = receiver.recv().await {
        let mut batch = vec![first];
        let deadline = tokio::time::sleep(BATCH_DELAY);
        tokio::pin!(deadline);
        while batch.len() < BATCH_SIZE {
            tokio::select! {
                _ = &mut deadline => break,
                next = receiver.recv() => match next { Some(next) => batch.push(next), None => break },
            }
        }
        let mut groups: BTreeMap<Arc<str>, Vec<DiagnosticEvent>> = BTreeMap::new();
        for queued in batch {
            if queued.queued_at.elapsed() <= MAX_AGE {
                groups.entry(queued.token).or_default().push(queued.event);
            }
        }
        // Bound the entire flush, including distinct sessions. Never retry/requeue.
        let _ = tokio::time::timeout(HTTP_TIMEOUT, async {
            for (token, events) in groups {
                let _ = http
                    .post(endpoint)
                    .bearer_auth(token.as_ref())
                    .json(&serde_json::json!({ "events": events }))
                    .send()
                    .await;
            }
        })
        .await;
    }
}

pub struct RunDiagnostics {
    client: Arc<TelemetryClient>,
    token: Arc<str>,
    run_id: String,
    project_id: Option<String>,
    module: &'static str,
    provider: ProviderId,
    started: Instant,
    terminal: AtomicBool,
    steps: Mutex<BTreeMap<TelemetryStep, Instant>>,
}

impl std::fmt::Debug for RunDiagnostics {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("RunDiagnostics").finish_non_exhaustive()
    }
}

impl RunDiagnostics {
    fn event(
        &self,
        event: &'static str,
        outcome: &'static str,
        started: Instant,
    ) -> DiagnosticEvent {
        DiagnosticEvent {
            event,
            metadata: self.client.metadata.clone(),
            ts: now_millis(),
            run_id: self.run_id.clone(),
            project_id: self.project_id.clone(),
            module: self.module,
            provider: (event == "run").then_some(self.provider),
            step: None,
            outcome,
            duration_ms: started.elapsed().as_millis().min(86_400_000),
            error_code: None,
            error_kind: None,
            failed_step: None,
        }
    }

    pub fn step_started(&self, step: TelemetryStep) {
        if !self.terminal.load(Ordering::Acquire)
            && self.client.enabled.load(Ordering::Acquire)
            && let Ok(mut steps) = self.steps.try_lock()
        {
            steps.entry(step).or_insert_with(Instant::now);
        }
    }

    pub fn step_completed(&self, step: TelemetryStep) {
        if let Ok(mut steps) = self.steps.try_lock()
            && let Some(started) = steps.remove(&step)
        {
            let mut event = self.event("step", "succeeded", started);
            event.step = Some(step);
            self.client.emit(Arc::clone(&self.token), event);
        }
    }

    pub fn observe(&self, event: &RunEvent) {
        match event {
            RunEvent::ToolCallStarted { tool_call_id, .. } => {
                if let Some(step) = TelemetryStep::from_tool(tool_call_id) {
                    self.step_started(step);
                }
                return;
            }
            RunEvent::ToolCallCompleted {
                tool_call_id,
                status: RunStatus::Completed,
                ..
            } => {
                if let Some(step) = TelemetryStep::from_tool(tool_call_id) {
                    self.step_completed(step);
                }
                return;
            }
            _ => {}
        }
        let (outcome, code, kind) = match event {
            RunEvent::RunCompleted { .. } => ("succeeded", None, None),
            RunEvent::RunCancelled { .. } => ("cancelled", None, Some("cancelled_by_user")),
            RunEvent::RunFailed { error, .. } => {
                let kind = match error.code {
                    EngineErrorCode::MissingBinary => "provider_missing_binary",
                    EngineErrorCode::NotAuthenticated => "provider_not_authenticated",
                    EngineErrorCode::RunSpawnFailed => "provider_spawn_failed",
                    EngineErrorCode::RunTimeout => "provider_timeout",
                    EngineErrorCode::ProviderProcessFailed => "provider_exit_nonzero",
                    _ => "unknown",
                };
                ("failed", Some(error.code.clone()), Some(kind))
            }
            _ => return, // Output, tool text, paths, warnings and raw errors never enter the queue.
        };
        if self.terminal.swap(true, Ordering::AcqRel) {
            return;
        }
        let mut terminal = self.event("run", outcome, self.started);
        terminal.error_code = code;
        terminal.error_kind = kind;
        if let Ok(mut steps) = self.steps.try_lock() {
            if outcome == "failed" {
                terminal.failed_step = steps
                    .iter()
                    .max_by_key(|(_, started)| **started)
                    .map(|(step, _)| *step);
                // Some artifact validators reuse ProviderProcessFailed after the CLI succeeded.
                if terminal.failed_step == Some(TelemetryStep::Parse) {
                    terminal.error_kind = Some("artifact_invalid");
                }
            }
            for (step, started) in std::mem::take(&mut *steps) {
                let mut event = self.event(
                    "step",
                    if outcome == "failed" {
                        "failed"
                    } else {
                        "skipped"
                    },
                    started,
                );
                event.step = Some(step);
                event.error_kind = terminal.error_kind;
                self.client.emit(Arc::clone(&self.token), event);
            }
        }
        self.client.emit(Arc::clone(&self.token), terminal);
    }
}

#[cfg(test)]
#[path = "telemetry_tests.rs"]
mod tests;
