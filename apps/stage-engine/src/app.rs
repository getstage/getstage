use axum::Router;
use std::sync::Arc;

use crate::chat::workflow::ChatWorkflow;
use crate::config::AppConfig;
use crate::convex_store::app_secrets::AppSecretsRepository;
use crate::convex_store::asset_upload::ConvexAssetUploader;
use crate::convex_store::chat_repository::ChatRepository;
use crate::convex_store::flows_repository::FlowsRepository;
use crate::convex_store::moodboard_repository::MoodboardRepository;
use crate::convex_store::research_repository::ResearchRepository;
use crate::convex_store::strategy_repository::StrategyRepository;
use crate::convex_store::wireframes_repository::WireframesRepository;
use crate::exports::delivery::paper::PaperClient;
use crate::exports::delivery::service::DeliveryExportService;
use crate::exports::figma::repository::FigmaExportRepository;
use crate::exports::figma::service::FigmaExportService;
use crate::figma::service::FigmaService;
use crate::flows::workflow::FlowsWorkflow;
use crate::helpers::time::now_millis;
use crate::moodboard::workflow::MoodboardWorkflow;
use crate::refero::client::ReferoClient;
use crate::refero::service::ReferoService;
use crate::research::service::ResearchService;
use crate::research::workflow::ResearchWorkflow;
use crate::runs::RunManager;
use crate::server;
use crate::strategy::workflow::StrategyWorkflow;
use crate::styleguide::StyleguideWorkflow;
use crate::wireframes::workflow::WireframesWorkflow;

#[derive(Clone, Debug)]
pub struct AppState {
    pub api_version: &'static str,
    pub service_name: &'static str,
    pub started_at_ms: u128,
    pub runs: Arc<RunManager>,
    pub figma_exports: Arc<FigmaExportService>,
    pub delivery_exports: Arc<DeliveryExportService>,
}

impl AppState {
    pub fn new(config: &AppConfig) -> anyhow::Result<Self> {
        let refero_client = ReferoClient::new(&config.refero)?;
        let refero = ReferoService::new(refero_client);
        let figma = FigmaService::new(&config.figma)?;
        let research = Arc::new(ResearchWorkflow::new(
            ResearchRepository::new(&config.convex),
            AppSecretsRepository::new(&config.convex),
            ResearchService::new(refero.clone()),
        ));
        let moodboard = Arc::new(MoodboardWorkflow::new(
            MoodboardRepository::new(&config.convex),
            AppSecretsRepository::new(&config.convex),
            refero,
            figma,
        ));
        let strategy = Arc::new(StrategyWorkflow::new(StrategyRepository::new(
            &config.convex,
        )));
        let styleguide = Arc::new(StyleguideWorkflow::new(
            MoodboardRepository::new(&config.convex),
            StrategyRepository::new(&config.convex),
            config.r2_public_base_url.clone(),
        ));
        let flows = Arc::new(FlowsWorkflow::new(FlowsRepository::new(&config.convex)));
        let wireframes = Arc::new(WireframesWorkflow::new(
            WireframesRepository::new(&config.convex),
            config.r2_public_base_url.clone(),
        ));
        let chat = Arc::new(ChatWorkflow::new(ChatRepository::new(&config.convex)));

        Ok(Self {
            api_version: "v1",
            service_name: "stage-engine",
            started_at_ms: now_millis(),
            runs: Arc::new(RunManager::new(
                "v1",
                Some(chat),
                Some(research),
                Some(strategy),
                Some(styleguide),
                Some(moodboard),
                Some(flows),
                Some(wireframes),
            )),
            figma_exports: Arc::new(FigmaExportService::new(
                FigmaExportRepository::new(&config.convex),
                ConvexAssetUploader::new(config.convex.deployment_url.clone()),
                config.r2_public_base_url.clone(),
            )),
            delivery_exports: Arc::new(DeliveryExportService::new(
                FigmaExportRepository::new(&config.convex),
                PaperClient::new(&config.paper)?,
            )),
        })
    }
}

pub fn build_app(config: AppConfig) -> Router {
    tracing::info!(
        refero_configured = config.refero.is_configured(),
        refero_mcp_url = %config.refero.mcp_url,
        paper_mcp_url = %config.paper.mcp_url,
        convex_url = %config.convex.deployment_url,
        "stage engine config loaded"
    );

    let state = AppState::new(&config).expect("failed to build Stage Engine app state");
    server::router(state)
}
