use axum::{Json, extract::State};

use crate::app::AppState;
use crate::helpers::time::now_millis;
use crate::models::status::{
    HealthResponse, ReadinessChecks, ReadinessResponse, ServiceStatus, VersionResponse,
};

pub async fn health(State(state): State<AppState>) -> Json<HealthResponse> {
    Json(HealthResponse {
        api_version: state.api_version,
        service: state.service_name,
        status: ServiceStatus::Ok,
        timestamp_ms: now_millis(),
    })
}

pub async fn readiness(State(state): State<AppState>) -> Json<ReadinessResponse> {
    Json(ReadinessResponse {
        api_version: state.api_version,
        service: state.service_name,
        ready: true,
        checks: ReadinessChecks {
            server_started: state.started_at_ms > 0,
            provider_runtime_ready: false,
            websocket_ready: true,
        },
        timestamp_ms: now_millis(),
    })
}

pub async fn version(State(state): State<AppState>) -> Json<VersionResponse> {
    Json(VersionResponse {
        api_version: state.api_version,
        service: state.service_name,
        version: env!("CARGO_PKG_VERSION"),
        rust_edition: "2024",
    })
}
