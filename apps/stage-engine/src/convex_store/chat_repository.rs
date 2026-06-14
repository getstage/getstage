use anyhow::{Context, bail};
use convex::{ConvexClient, Value};

use crate::config::ConvexConfig;
use crate::models::chat::ChatProjectContext;

use super::value::{args, function_result_to_json};

#[derive(Clone, Debug)]
pub struct ChatRepository {
    deployment_url: String,
}

impl ChatRepository {
    pub fn new(config: &ConvexConfig) -> Self {
        Self {
            deployment_url: config.deployment_url.clone(),
        }
    }

    pub async fn fetch_project_context(
        &self,
        token: &str,
        project_id: &str,
    ) -> anyhow::Result<ChatProjectContext> {
        let mut client = self.authenticated_client(token).await?;
        let mut query_args = args();
        query_args.insert("projectId".to_string(), Value::from(project_id.to_string()));

        let result = client
            .query("projectAi:getChatProjectContext", query_args)
            .await
            .context("failed to fetch chat project context from Convex")?;
        let json = function_result_to_json(result)?;
        if json.is_null() {
            bail!("project was not found or is not accessible");
        }

        serde_json::from_value(json).context("chat project context did not match expected shape")
    }

    async fn authenticated_client(&self, token: &str) -> anyhow::Result<ConvexClient> {
        if token.trim().is_empty() {
            bail!("missing desktop auth token for chat project context");
        }

        let mut client = ConvexClient::new(&self.deployment_url)
            .await
            .with_context(|| format!("failed to connect to Convex at {}", self.deployment_url))?;
        client.set_auth(Some(token.to_string())).await;
        Ok(client)
    }
}
