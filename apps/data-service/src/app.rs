use axum::Router;

use crate::config::AppConfig;
use crate::helpers::time::now_millis;
use crate::server;

#[derive(Clone, Debug)]
pub struct AppState {
    pub api_version: &'static str,
    pub service_name: &'static str,
    pub started_at_ms: u128,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            api_version: "v1",
            service_name: "stage-data-service",
            started_at_ms: now_millis(),
        }
    }
}

pub fn build_app(_config: AppConfig) -> Router {
    server::router(AppState::new())
}
