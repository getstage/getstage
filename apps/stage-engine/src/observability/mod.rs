use tracing_subscriber::{EnvFilter, fmt};

pub fn init_tracing() {
    let filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new("stage_engine=info,tower_http=info"));

    // Timestamps are what make a slow run diagnosable: without them a log is just an
    // ordered list and every "why did this take 13 minutes" needs a rerun with a stopwatch.
    fmt().with_env_filter(filter).with_target(true).init();
}
