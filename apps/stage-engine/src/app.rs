use axum::Router;
use std::sync::Arc;

use crate::config::AppConfig;
use crate::helpers::time::now_millis;
use crate::runs::RunManager;
use crate::server;

#[derive(Clone, Debug)]
pub struct AppState {
    pub api_version: &'static str,
    pub service_name: &'static str,
    pub started_at_ms: u128,
    pub runs: Arc<RunManager>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            api_version: "v1",
            service_name: "stage-engine",
            started_at_ms: now_millis(),
            runs: Arc::new(RunManager::new("v1")),
        }
    }
}

pub fn build_app(_config: AppConfig) -> Router {
    server::router(AppState::new())
}
