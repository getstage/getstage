use tracing_subscriber::{EnvFilter, fmt};

pub fn init_tracing() {
    let filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new("stage_data_service=info,tower_http=info"));

    fmt()
        .with_env_filter(filter)
        .with_target(true)
        .without_time()
        .init();
}
