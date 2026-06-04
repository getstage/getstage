mod app;
mod config;
mod convex_store;
mod figma;
mod flows;
mod helpers;
mod models;
mod moodboard;
mod observability;
mod providers;
mod refero;
mod research;
mod runs;
mod server;
mod strategy;
mod wireframes;

use anyhow::Context;
use config::AppConfig;
use observability::init_tracing;
use tokio::net::TcpListener;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    init_tracing();

    let config = AppConfig::from_env()?;
    let address = config.socket_addr();
    let router = app::build_app(config);

    let listener = TcpListener::bind(address)
        .await
        .with_context(|| format!("failed to bind Stage Engine to {address}"))?;

    tracing::info!(%address, "stage engine listening");

    axum::serve(listener, router)
        .with_graceful_shutdown(shutdown_signal())
        .await
        .context("stage engine stopped unexpectedly")?;

    Ok(())
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
            Err(error) => {
                tracing::error!(%error, "failed to install terminate signal handler");
            }
        }
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => {},
        _ = terminate => {},
    }

    tracing::info!("stage engine shutdown requested");
}
