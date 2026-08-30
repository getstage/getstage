use std::path::PathBuf;
use std::sync::Arc;

use crate::helpers::provider_json::extract_wireframes_artifact;
use crate::models::providers::ProviderId;
use crate::models::runs::StartRunRequest;
use crate::providers::adapter::{ProviderRunContext, run_provider_collect};
use crate::providers::process::ProviderProcessOutcome;
use crate::runs::RunEventSink;
use crate::wireframes::debug_dump::WireframesDebugDump;
use crate::wireframes::helper::artifact::validate_single_screen_response;
use crate::wireframes::helper::error::WorkflowError;
use crate::wireframes::helper::events::{tool_completed, tool_started};
use crate::wireframes::helper::workspace::{ParallelScreenRuns, write_screen_checkpoint};

/// Screens designed at the same time. A run's wall time is one wave, so this is set to
/// cover a normal selection in a single wave: at four, a six-screen run needed two waves
/// and took twice as long as the slowest screen for no reason. High enough for that,
/// low enough that selecting every screen does not spawn a dozen provider CLIs at once.
pub(crate) const MAX_PARALLEL_SCREEN_RUNS: usize = 6;

/// Designs each screen in its own provider call, at most
/// `MAX_PARALLEL_SCREEN_RUNS` at a time, and returns the screens that came back.
///
/// A screen whose call fails or returns unparseable output is logged and skipped
/// rather than aborting its siblings; the merge downstream reports what is missing.
/// `None` means the user cancelled the run.
pub(crate) async fn run_screens_in_parallel(
    api_version: &'static str,
    run_id: &str,
    provider_id: ProviderId,
    requests: Vec<(String, StartRunRequest)>,
    checkpoint_directory: Option<PathBuf>,
    sink: &RunEventSink,
    cancel_rx: &tokio::sync::watch::Receiver<bool>,
    dump: WireframesDebugDump,
) -> Result<Option<ParallelScreenRuns>, WorkflowError> {
    let permits = Arc::new(tokio::sync::Semaphore::new(MAX_PARALLEL_SCREEN_RUNS));
    let mut tasks = tokio::task::JoinSet::new();

    for (screen_id, request) in requests {
        // Every screen announces itself up front so the client can show the real set
        // of work in flight instead of a spinner with no idea how much is left.
        tool_started(
            api_version,
            run_id,
            provider_id,
            sink,
            &screen_id,
            &format!("Design {screen_id}"),
        );
        let permits = permits.clone();
        let context = ProviderRunContext {
            api_version,
            run_id: run_id.to_string(),
            request,
        };
        let sink = sink.clone();
        let cancel_rx = cancel_rx.clone();
        tasks.spawn(async move {
            let _permit = permits.acquire_owned().await;
            let outcome = run_provider_collect(context, sink, cancel_rx).await;
            (screen_id, outcome)
        });
    }

    let mut screens = Vec::new();
    // Each per-screen response repeats the whole screen list (the prompt's list rule
    // requires it). Without collecting it, a first Hi-Fi pass — which has no saved
    // artifact to merge into — would save an artifact with no `configureScreens`, and
    // the results grid, which only shows screens present in both lists, would render
    // empty even though every screen generated fine.
    let mut configure: Vec<serde_json::Value> = Vec::new();
    let mut cancelled = false;
    while let Some(joined) = tasks.join_next().await {
        let (screen_id, outcome) = joined
            .map_err(|error| WorkflowError::Internal(format!("screen run task failed: {error}")))?;
        match outcome {
            Ok(ProviderProcessOutcome::Completed(text)) => {
                dump.write_provider_raw(&screen_id, &text);
                match extract_wireframes_artifact(&text).and_then(|artifact| {
                    validate_single_screen_response(&artifact, &screen_id)
                        .map(|screen| (artifact, screen))
                }) {
                    Ok((artifact, screen)) => {
                        tracing::info!(
                            run_id = %run_id,
                            screen_id = %screen_id,
                            output_chars = text.chars().count(),
                            returned = 1,
                            "screen run passed response-integrity gate"
                        );
                        if let Some(directory) = checkpoint_directory.as_deref() {
                            write_screen_checkpoint(directory, &screen_id, &screen).await?;
                        }
                        screens.push(screen);
                        for entry in artifact
                            .get("configureScreens")
                            .and_then(serde_json::Value::as_array)
                            .cloned()
                            .unwrap_or_default()
                        {
                            let Some(id) = entry.get("id").and_then(serde_json::Value::as_str)
                            else {
                                continue;
                            };
                            if configure.iter().any(|seen| {
                                seen.get("id").and_then(serde_json::Value::as_str) == Some(id)
                            }) {
                                continue;
                            }
                            configure.push(entry);
                        }
                    }
                    Err(error) => tracing::error!(
                        run_id = %run_id,
                        screen_id = %screen_id,
                        output_chars = text.chars().count(),
                        %error,
                        "screen run failed response-integrity gate; scheduling bounded repair"
                    ),
                }
            }
            Ok(_) => cancelled = true,
            Err(error) => tracing::error!(
                run_id = %run_id,
                screen_id = %screen_id,
                %error,
                "screen run failed; skipping this screen"
            ),
        }
        tool_completed(api_version, run_id, provider_id, sink, &screen_id);
    }

    // A cancel stops every sibling, so treat the whole run as cancelled rather than
    // saving the handful of screens that happened to finish first.
    if cancelled && screens.is_empty() {
        return Ok(None);
    }
    Ok(Some(ParallelScreenRuns {
        screens,
        configure,
        cancelled,
    }))
}
