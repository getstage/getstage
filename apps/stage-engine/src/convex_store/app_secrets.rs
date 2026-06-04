use anyhow::{Context, bail};
use convex::ConvexClient;
use serde::Deserialize;

use crate::config::ConvexConfig;

use super::value::{args, function_result_to_json};

#[derive(Clone, Debug)]
pub struct AppSecretsRepository {
    deployment_url: String,
}

impl AppSecretsRepository {
    pub fn new(config: &ConvexConfig) -> Self {
        Self {
            deployment_url: config.deployment_url.clone(),
        }
    }

    pub async fn fetch_refero_mcp_token(&self, token: &str) -> anyhow::Result<Option<String>> {
        let mut client = self.authenticated_client(token).await?;
        let result = client
            .query("appSecrets:getReferoMcpToken", args())
            .await
            .context("failed to fetch Refero MCP token from Convex")?;
        let json = function_result_to_json(result)?;
        let record: ReferoTokenResponse = serde_json::from_value(json)
            .context("Convex Refero token response did not match the expected shape")?;

        Ok(record.token.filter(|token| !token.trim().is_empty()))
    }

    async fn authenticated_client(&self, token: &str) -> anyhow::Result<ConvexClient> {
        if token.trim().is_empty() {
            bail!("missing desktop auth token for Convex");
        }

        let mut client = ConvexClient::new(&self.deployment_url)
            .await
            .with_context(|| format!("failed to connect to Convex at {}", self.deployment_url))?;
        client.set_auth(Some(token.to_string())).await;
        Ok(client)
    }
}

#[derive(Debug, Deserialize)]
struct ReferoTokenResponse {
    token: Option<String>,
}
