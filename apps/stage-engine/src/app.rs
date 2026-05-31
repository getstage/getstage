use axum::Router;
use std::sync::Arc;

use crate::config::AppConfig;
use crate::convex_store::research_repository::ResearchRepository;
use crate::helpers::time::now_millis;
use crate::refero::client::ReferoClient;
use crate::refero::service::ReferoService;
use crate::research::service::ResearchService;
use crate::research::workflow::ResearchWorkflow;
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
    pub fn new(config: &AppConfig) -> anyhow::Result<Self> {
        let refero_client = ReferoClient::new(&config.refero)?;
        let refero = ReferoService::new(refero_client);
        let research = Arc::new(ResearchWorkflow::new(
            ResearchRepository::new(&config.convex),
            ResearchService::new(refero),
        ));

        Ok(Self {
            api_version: "v1",
            service_name: "stage-engine",
            started_at_ms: now_millis(),
            runs: Arc::new(RunManager::new("v1", Some(research))),
        })
    }
}

pub fn build_app(config: AppConfig) -> Router {
    tracing::info!(
        refero_configured = config.refero.is_configured(),
        refero_mcp_url = %config.refero.mcp_url,
        convex_url = %config.convex.deployment_url,
        "stage engine config loaded"
    );

    let state = AppState::new(&config).expect("failed to build Stage Engine app state");
    server::router(state)
}
