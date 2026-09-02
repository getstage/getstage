use crate::helpers::time::now_millis;
use crate::models::providers::ProviderId;
use crate::models::runs::{RunEvent, RunStatus};
use crate::runs::RunEventSink;

pub(crate) fn tool_started(
    api_version: &'static str,
    run_id: &str,
    provider_id: ProviderId,
    sink: &RunEventSink,
    tool_call_id: &str,
    label: &str,
) {
    sink.send(RunEvent::ToolCallStarted {
        api_version,
        run_id: run_id.to_string(),
        provider_id,
        created_at: now_millis(),
        tool_call_id: tool_call_id.to_string(),
        label: label.to_string(),
    });
}

pub(crate) fn tool_completed(
    api_version: &'static str,
    run_id: &str,
    provider_id: ProviderId,
    sink: &RunEventSink,
    tool_call_id: &str,
) {
    sink.send(RunEvent::ToolCallCompleted {
        api_version,
        run_id: run_id.to_string(),
        provider_id,
        created_at: now_millis(),
        tool_call_id: tool_call_id.to_string(),
        status: RunStatus::Completed,
    });
}
