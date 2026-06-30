pub mod events;
pub mod exports;
pub mod providers;
pub mod runs;
pub mod status;

use axum::{
    Router,
    extract::DefaultBodyLimit,
    routing::{get, post},
};

use crate::app::AppState;

/// Max request body the engine will buffer. Hi-Fi Figma/code exports send the
/// full HTML for every screen in one payload, which easily exceeds axum's 2 MB
/// default and trips a 413. 64 MB leaves generous headroom for large projects.
const MAX_REQUEST_BODY_BYTES: usize = 64 * 1024 * 1024;

pub fn router(state: AppState) -> Router {
    Router::new()
        .route("/v1/health", get(status::health))
        .route("/v1/readiness", get(status::readiness))
        .route("/v1/version", get(status::version))
        .route("/v1/events", get(events::events))
        .route("/v1/providers", get(providers::list_providers))
        .route("/v1/providers/refresh", post(providers::refresh_providers))
        .route(
            "/v1/providers/{provider_id}/update",
            post(providers::update_provider),
        )
        .route("/v1/runs", post(runs::start_run))
        .route("/v1/runs/{run_id}/events", get(runs::run_events))
        .route("/v1/runs/{run_id}/cancel", post(runs::cancel_run))
        .route("/v1/exports/figma", post(exports::create_figma_export))
        .route("/v1/exports/figjam", post(exports::create_figjam_export))
        .route("/v1/exports/code", post(exports::create_code_export))
        .route("/v1/exports/paper/status", get(exports::paper_connection_status))
        .route("/v1/exports/paper", post(exports::create_paper_export))
        .layer(DefaultBodyLimit::max(MAX_REQUEST_BODY_BYTES))
        .with_state(state)
}
