pub mod events;
pub mod status;

use axum::{Router, routing::get};

use crate::app::AppState;

pub fn router(state: AppState) -> Router {
    Router::new()
        .route("/v1/health", get(status::health))
        .route("/v1/readiness", get(status::readiness))
        .route("/v1/version", get(status::version))
        .route("/v1/events", get(events::events))
        .with_state(state)
}
