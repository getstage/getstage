use axum::extract::{Path, State};
use axum::http::{HeaderMap, StatusCode};
use axum::response::sse::{Event, KeepAlive, Sse};
use axum::{Json, response::IntoResponse};
use std::convert::Infallible;
use tokio_stream::wrappers::BroadcastStream;
use tokio_stream::{StreamExt, iter};

use crate::app::AppState;
use crate::models::errors::EngineError;
use crate::models::runs::{CancelRunResponse, StartRunRequest, StartRunResponse};

pub async fn start_run(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(request): Json<StartRunRequest>,
) -> Json<StartRunResponse> {
    Json(state.runs.start_run(request, bearer_token(&headers)).await)
}

pub async fn run_events(
    State(state): State<AppState>,
    Path(run_id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, Json<EngineError>)> {
    let subscription = state
        .runs
        .subscribe(&run_id)
        .await
        .map_err(|error| (StatusCode::NOT_FOUND, Json(error.to_engine_error())))?;

    let history = subscription.history.into_iter().filter_map(event_to_sse);
    let live = BroadcastStream::new(subscription.receiver).filter_map(|event| match event {
        Ok(event) => event_to_sse(event),
        Err(error) => {
            tracing::debug!(%error, "run event receiver lagged");
            None
        }
    });
    let stream = iter(history).chain(live);

    Ok(Sse::new(stream).keep_alive(KeepAlive::default()))
}

pub async fn cancel_run(
    State(state): State<AppState>,
    Path(run_id): Path<String>,
) -> Result<Json<CancelRunResponse>, (StatusCode, Json<EngineError>)> {
    state
        .runs
        .cancel_run(&run_id)
        .await
        .map(Json)
        .map_err(|error| (StatusCode::NOT_FOUND, Json(error.to_engine_error())))
}

fn event_to_sse(event: crate::models::runs::RunEvent) -> Option<Result<Event, Infallible>> {
    match serde_json::to_string(&event) {
        Ok(data) => Some(Ok(Event::default().event("run_event").data(data))),
        Err(error) => {
            tracing::error!(%error, "failed to serialize run event");
            None
        }
    }
}

fn bearer_token(headers: &HeaderMap) -> Option<String> {
    let header = headers.get(axum::http::header::AUTHORIZATION)?;
    let value = header.to_str().ok()?.trim();
    value
        .strip_prefix("Bearer ")
        .map(str::trim)
        .filter(|token| !token.is_empty())
        .map(ToOwned::to_owned)
}
