use std::time::Duration;

use async_trait::async_trait;
use reqwest::{Client, StatusCode, header::AUTHORIZATION};

use crate::error::GatewayError;

#[async_trait]
pub trait AuthVerifier: Send + Sync {
    async fn verify(&self, authorization: &str) -> Result<(), GatewayError>;
}

#[derive(Debug, Clone)]
pub struct StageApiAuthVerifier {
    client: Client,
    me_url: String,
}

impl StageApiAuthVerifier {
    pub fn new(stage_api_base_url: &str, timeout: Duration) -> Result<Self, GatewayError> {
        let client = Client::builder()
            .timeout(timeout)
            .build()
            .map_err(|_| GatewayError::AuthUnavailable)?;
        Ok(Self {
            client,
            me_url: format!("{stage_api_base_url}/me"),
        })
    }
}

#[async_trait]
impl AuthVerifier for StageApiAuthVerifier {
    async fn verify(&self, authorization: &str) -> Result<(), GatewayError> {
        let response = self
            .client
            .get(&self.me_url)
            .header(AUTHORIZATION, authorization)
            .send()
            .await
            .map_err(|_| GatewayError::AuthUnavailable)?;

        match response.status() {
            status if status.is_success() => Ok(()),
            StatusCode::UNAUTHORIZED | StatusCode::FORBIDDEN => Err(GatewayError::Unauthorized),
            _ => Err(GatewayError::AuthUnavailable),
        }
    }
}
