use axum::extract::State;
use axum::http::{HeaderMap, StatusCode};
use axum::{Json, response::IntoResponse};

use crate::app::AppState;
use crate::exports::delivery::models::{
    CodeExportResponse, PaperConnectionStatusResponse, PaperExportResponse,
    WireframeDeliveryRequest,
};
use crate::exports::figma::models::CreateFigJamExportRequest;
use crate::exports::figma::models::{CreateFigmaExportRequest, CreateFigmaExportResponse};

pub async fn create_figma_export(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(request): Json<CreateFigmaExportRequest>,
) -> Result<Json<CreateFigmaExportResponse>, impl IntoResponse> {
    let Some(token) = bearer_token(&headers) else {
        return Err((
            StatusCode::UNAUTHORIZED,
            "Missing Stage authentication token.".to_string(),
        ));
    };

    state
        .figma_exports
        .create_export(&token, request)
        .await
        .map(Json)
        .map_err(|error| {
            tracing::warn!(%error, "failed to create Figma export");
            (StatusCode::BAD_REQUEST, error.to_string())
        })
}

pub async fn create_figjam_export(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(request): Json<CreateFigJamExportRequest>,
) -> Result<Json<CreateFigmaExportResponse>, impl IntoResponse> {
    let Some(token) = bearer_token(&headers) else {
        return Err((
            StatusCode::UNAUTHORIZED,
            "Missing Stage authentication token.".to_string(),
        ));
    };
    state
        .figma_exports
        .create_figjam_export(&token, request)
        .await
        .map(Json)
        .map_err(|error| {
            tracing::warn!(%error, "failed to create FigJam export");
            (StatusCode::BAD_REQUEST, error.to_string())
        })
}

pub async fn create_code_export(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(request): Json<WireframeDeliveryRequest>,
) -> Result<Json<CodeExportResponse>, impl IntoResponse> {
    let Some(token) = bearer_token(&headers) else {
        return Err((
            StatusCode::UNAUTHORIZED,
            "Missing Stage authentication token.".to_string(),
        ));
    };
    state
        .delivery_exports
        .create_code_export(&token, request)
        .await
        .map(Json)
        .map_err(|error| {
            tracing::warn!(%error, "failed to create code export");
            (StatusCode::BAD_REQUEST, error.to_string())
        })
}

pub async fn create_paper_export(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(request): Json<WireframeDeliveryRequest>,
) -> Result<Json<PaperExportResponse>, impl IntoResponse> {
    let Some(token) = bearer_token(&headers) else {
        return Err((
            StatusCode::UNAUTHORIZED,
            "Missing Stage authentication token.".to_string(),
        ));
    };
    state
        .delivery_exports
        .create_paper_export(&token, request)
        .await
        .map(Json)
        .map_err(|error| {
            tracing::warn!(%error, "failed to create Paper export");
            (StatusCode::BAD_REQUEST, error.to_string())
        })
}

pub async fn paper_connection_status(
    State(state): State<AppState>,
) -> Json<PaperConnectionStatusResponse> {
    Json(state.delivery_exports.paper_connection_status().await)
}

fn bearer_token(headers: &HeaderMap) -> Option<String> {
    headers
        .get(axum::http::header::AUTHORIZATION)?
        .to_str()
        .ok()?
        .trim()
        .strip_prefix("Bearer ")
        .map(str::trim)
        .filter(|token| !token.is_empty())
        .map(ToOwned::to_owned)
}
