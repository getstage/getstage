use axum::{
    Json,
    http::StatusCode,
    response::{IntoResponse, Response},
};
use serde::Serialize;
use uuid::Uuid;

#[derive(Debug, thiserror::Error)]
pub enum GatewayError {
    #[error("authorization is required")]
    MissingAuthorization,
    #[error("authorization was rejected")]
    Unauthorized,
    #[error("authorization verification failed")]
    AuthUnavailable,
    #[error("invalid request: {0}")]
    InvalidRequest(String),
    #[error("generation capacity is currently exhausted")]
    Overloaded,
    #[error("the model request timed out")]
    ProviderTimeout,
    #[error("the model did not return structured screen data")]
    ProviderNoData,
    #[error("the model returned malformed structured data")]
    ProviderMalformedOutput,
    #[error("the model provider request failed")]
    ProviderUnavailable,
    #[error("gateway serialization failed")]
    Serialization,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ErrorBody {
    request_id: Uuid,
    code: &'static str,
    message: String,
}

impl IntoResponse for GatewayError {
    fn into_response(self) -> Response {
        let (status, code) = match self {
            Self::MissingAuthorization | Self::Unauthorized => {
                (StatusCode::UNAUTHORIZED, "unauthorized")
            }
            Self::AuthUnavailable => (StatusCode::SERVICE_UNAVAILABLE, "auth_unavailable"),
            Self::InvalidRequest(_) => (StatusCode::BAD_REQUEST, "invalid_request"),
            Self::Overloaded => (StatusCode::TOO_MANY_REQUESTS, "overloaded"),
            Self::ProviderTimeout => (StatusCode::GATEWAY_TIMEOUT, "provider_timeout"),
            Self::ProviderNoData => (StatusCode::BAD_GATEWAY, "provider_no_data"),
            Self::ProviderMalformedOutput => (StatusCode::BAD_GATEWAY, "provider_malformed_output"),
            Self::ProviderUnavailable => (StatusCode::BAD_GATEWAY, "provider_unavailable"),
            Self::Serialization => (StatusCode::INTERNAL_SERVER_ERROR, "serialization_failed"),
        };
        let body = ErrorBody {
            request_id: Uuid::new_v4(),
            code,
            message: self.to_string(),
        };
        (status, Json(body)).into_response()
    }
}
