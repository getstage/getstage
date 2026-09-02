use std::{sync::Arc, time::Duration};

use axum::{
    Json, Router,
    extract::{DefaultBodyLimit, State},
    http::{HeaderMap, StatusCode, header::AUTHORIZATION},
    routing::{get, post},
};
use serde::Serialize;
use tokio::{sync::Semaphore, time::timeout};
use tower_http::{catch_panic::CatchPanicLayer, trace::TraceLayer};

use crate::{
    auth::AuthVerifier,
    contracts::{GenerateWireframeRequest, GenerateWireframeResponse, RequestLimits},
    error::GatewayError,
    generator::WireframeGenerator,
};

#[derive(Clone)]
pub struct AppState {
    generator: Arc<dyn WireframeGenerator>,
    auth: Arc<dyn AuthVerifier>,
    permits: Arc<Semaphore>,
    provider_timeout: Duration,
    request_limits: RequestLimits,
}

impl AppState {
    pub fn new(
        generator: Arc<dyn WireframeGenerator>,
        auth: Arc<dyn AuthVerifier>,
        max_concurrent_generations: usize,
        provider_timeout: Duration,
        request_limits: RequestLimits,
    ) -> Self {
        Self {
            generator,
            auth,
            permits: Arc::new(Semaphore::new(max_concurrent_generations)),
            provider_timeout,
            request_limits,
        }
    }
}

pub fn router(state: AppState, max_request_bytes: usize) -> Router {
    Router::new()
        .route("/v1/health", get(health))
        .route("/v1/readiness", get(readiness))
        .route("/v1/wireframes/generate", post(generate))
        .layer(DefaultBodyLimit::max(max_request_bytes))
        .layer(CatchPanicLayer::new())
        .layer(TraceLayer::new_for_http())
        .with_state(state)
}

#[derive(Debug, Serialize)]
struct StatusBody {
    status: &'static str,
}

async fn health() -> Json<StatusBody> {
    Json(StatusBody { status: "ok" })
}

async fn readiness() -> (StatusCode, Json<StatusBody>) {
    (StatusCode::OK, Json(StatusBody { status: "ready" }))
}

async fn generate(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(request): Json<GenerateWireframeRequest>,
) -> Result<Json<GenerateWireframeResponse>, GatewayError> {
    let authorization = headers
        .get(AUTHORIZATION)
        .and_then(|value| value.to_str().ok())
        .filter(|value| value.starts_with("Bearer "))
        .ok_or(GatewayError::MissingAuthorization)?;
    state.auth.verify(authorization).await?;
    request
        .validate(&state.request_limits)
        .map_err(GatewayError::InvalidRequest)?;

    let permit = state
        .permits
        .clone()
        .try_acquire_owned()
        .map_err(|_| GatewayError::Overloaded)?;
    let result = timeout(state.provider_timeout, state.generator.generate(&request))
        .await
        .map_err(|_| GatewayError::ProviderTimeout)??;
    drop(permit);

    Ok(Json(GenerateWireframeResponse {
        run_id: request.run_id,
        screens: result.screens,
        model: state.generator.model().to_owned(),
    }))
}

#[cfg(test)]
mod tests {
    use async_trait::async_trait;
    use axum::{
        body::{Body, to_bytes},
        http::{Request, StatusCode, header::CONTENT_TYPE},
    };
    use tower::ServiceExt;
    use uuid::Uuid;

    use super::*;
    use crate::{
        contracts::{
            ComponentBundle, DesignContext, GeneratedScreen, GeneratedScreens, GenerationAttempt,
            ScreenBrief, ScreenRequest, SourceFile, Viewport,
        },
        error::GatewayError,
    };

    struct AllowAuth;

    #[async_trait]
    impl AuthVerifier for AllowAuth {
        async fn verify(&self, _authorization: &str) -> Result<(), GatewayError> {
            Ok(())
        }
    }

    struct MockGenerator;

    #[async_trait]
    impl WireframeGenerator for MockGenerator {
        fn model(&self) -> &str {
            "mock-model"
        }

        async fn generate(
            &self,
            request: &GenerateWireframeRequest,
        ) -> Result<GeneratedScreens, GatewayError> {
            Ok(GeneratedScreens {
                screens: request
                    .screens
                    .iter()
                    .map(|screen| GeneratedScreen {
                        id: screen.screen_id.clone(),
                        tsx: "export default function Screen() { return <main />; }".to_owned(),
                        dependencies: Vec::new(),
                    })
                    .collect(),
            })
        }
    }

    fn test_app() -> Router {
        let state = AppState::new(
            Arc::new(MockGenerator),
            Arc::new(AllowAuth),
            1,
            Duration::from_secs(1),
            RequestLimits {
                max_component_bundles: 4,
                max_source_bytes: 4096,
                max_validation_failures: 4,
            },
        );
        router(state, 16_384)
    }

    fn valid_request() -> GenerateWireframeRequest {
        GenerateWireframeRequest {
            run_id: Uuid::new_v4(),
            selected_libraries: vec!["origin-ui".to_owned()],
            design_context: DesignContext {
                project_name: "Stage".to_owned(),
                project_type: "web-design".to_owned(),
                viewport_guidance: "Desktop".to_owned(),
                brand_source: "style-guide".to_owned(),
                style_direction_id: None,
                strategy_artifact: "{}".to_owned(),
                research_artifact: None,
                moodboard_artifact: None,
                flows_artifact: None,
                selected_skills: Vec::new(),
            },
            screens: vec![ScreenRequest {
                screen_id: "marketing-home".to_owned(),
                attempt: GenerationAttempt::Initial,
                brief: ScreenBrief {
                    title: "Marketing home".to_owned(),
                    intent: "Explain Stage".to_owned(),
                    viewport: Viewport {
                        width: 1440,
                        height: 900,
                    },
                },
                components: vec![ComponentBundle {
                    component_id: "origin-ui/button".to_owned(),
                    library: "origin-ui".to_owned(),
                    source_revision: "v1".to_owned(),
                    files: vec![SourceFile {
                        path: "components/ui/button.tsx".to_owned(),
                        content: "export function Button() {}".to_owned(),
                    }],
                }],
                validation_failures: Vec::new(),
            }],
        }
    }

    #[tokio::test]
    async fn health_does_not_require_authentication() {
        let response = test_app()
            .oneshot(
                Request::builder()
                    .uri("/v1/health")
                    .body(Body::empty())
                    .expect("test request must be valid"),
            )
            .await
            .expect("router must respond");

        assert_eq!(response.status(), StatusCode::OK);
    }

    #[tokio::test]
    async fn generation_requires_bearer_authentication() {
        let body = serde_json::to_vec(&valid_request()).expect("test fixture must serialize");
        let response = test_app()
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/v1/wireframes/generate")
                    .header(CONTENT_TYPE, "application/json")
                    .body(Body::from(body))
                    .expect("test request must be valid"),
            )
            .await
            .expect("router must respond");

        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    }

    #[tokio::test]
    async fn generation_returns_typed_screen() {
        let request = valid_request();
        let run_id = request.run_id;
        let body = serde_json::to_vec(&request).expect("test fixture must serialize");
        let response = test_app()
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/v1/wireframes/generate")
                    .header(CONTENT_TYPE, "application/json")
                    .header(AUTHORIZATION, "Bearer test-token")
                    .body(Body::from(body))
                    .expect("test request must be valid"),
            )
            .await
            .expect("router must respond");

        assert_eq!(response.status(), StatusCode::OK);
        let body = to_bytes(response.into_body(), 4096)
            .await
            .expect("response body must be readable");
        let response: GenerateWireframeResponse =
            serde_json::from_slice(&body).expect("response must match the contract");
        assert_eq!(response.run_id, run_id);
        assert_eq!(response.screens[0].id, "marketing-home");
        assert_eq!(response.model, "mock-model");
    }
}
