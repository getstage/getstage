use std::sync::Arc;

use tokio::net::TcpListener;
use tracing::info;
use tracing_subscriber::EnvFilter;
use wireframe_ai_gateway::{
    app::{AppState, router},
    auth::StageApiAuthVerifier,
    config::Config,
    generator::NebiusRigGenerator,
};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    init_tracing();
    let config = Config::from_env()?;
    let generator = NebiusRigGenerator::new(
        &config.nebius_api_key,
        &config.nebius_base_url,
        config.nebius_model.clone(),
    )?;
    let auth = StageApiAuthVerifier::new(&config.stage_api_base_url, config.auth_timeout)?;
    let state = AppState::new(
        Arc::new(generator),
        Arc::new(auth),
        config.max_concurrent_generations,
        config.provider_timeout,
        config.request_limits,
    );
    let app = router(state, config.max_request_bytes);
    let listener = TcpListener::bind(config.bind_addr).await?;

    info!(address = %config.bind_addr, "wireframe AI gateway listening");
    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await?;
    Ok(())
}

fn init_tracing() {
    let filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new("wireframe_ai_gateway=info,tower_http=info,rig=info"));
    tracing_subscriber::fmt()
        .with_env_filter(filter)
        .json()
        .init();
}

async fn shutdown_signal() {
    let ctrl_c = async {
        if let Err(error) = tokio::signal::ctrl_c().await {
            tracing::error!(%error, "failed to install Ctrl+C handler");
        }
    };

    #[cfg(unix)]
    let terminate = async {
        match tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate()) {
            Ok(mut signal) => {
                signal.recv().await;
            }
            Err(error) => tracing::error!(%error, "failed to install SIGTERM handler"),
        }
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        () = ctrl_c => {},
        () = terminate => {},
    }
}
