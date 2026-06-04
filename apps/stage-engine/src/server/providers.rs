use axum::{
    Json,
    extract::{Path, State},
    http::StatusCode,
};

use crate::app::AppState;
use crate::models::errors::EngineError;
use crate::models::providers::{ProviderListResponse, ProviderUpdateResponse};
use crate::providers::service::{
    provider_snapshot, refresh_provider_snapshot, update_provider_by_route_id,
};

pub async fn list_providers(State(state): State<AppState>) -> Json<ProviderListResponse> {
    Json(provider_snapshot(state.api_version).await)
}

pub async fn refresh_providers(State(state): State<AppState>) -> Json<ProviderListResponse> {
    Json(refresh_provider_snapshot(state.api_version).await)
}

pub async fn update_provider(
    State(state): State<AppState>,
    Path(provider_id): Path<String>,
) -> Result<Json<ProviderUpdateResponse>, (StatusCode, Json<EngineError>)> {
    match update_provider_by_route_id(state.api_version, &provider_id).await {
        Ok(response) => Ok(Json(response)),
        Err(error) => Err((StatusCode::BAD_REQUEST, Json(error))),
    }
}
