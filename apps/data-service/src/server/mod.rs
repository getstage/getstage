pub mod status;

use axum::{Router, routing::get};

use crate::app::AppState;

pub fn router(state: AppState) -> Router {
    Router::new()
        .route("/v1/health", get(status::health))
        .route("/v1/readiness", get(status::readiness))
        .route("/v1/version", get(status::version))
        .with_state(state)
}
