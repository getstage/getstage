use std::sync::Arc;

use anyhow::{Context, bail};
use convex::{ConvexClient, Value};
use tokio::sync::Mutex;

use crate::config::ConvexConfig;
use crate::models::chat::ChatProjectContext;

use super::value::{args, function_result_to_json};

#[derive(Clone)]
pub struct ChatRepository {
    deployment_url: String,
    client: Arc<Mutex<Option<CachedConvexClient>>>,
}

struct CachedConvexClient {
    auth_token: String,
    client: ConvexClient,
}

impl std::fmt::Debug for ChatRepository {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("ChatRepository")
            .field("deployment_url", &self.deployment_url)
            .finish_non_exhaustive()
    }
}

impl ChatRepository {
    pub fn new(config: &ConvexConfig) -> Self {
        Self {
            deployment_url: config.deployment_url.clone(),
            client: Arc::new(Mutex::new(None)),
        }
    }

    pub async fn fetch_project_context(
        &self,
        token: &str,
        project_id: &str,
    ) -> anyhow::Result<ChatProjectContext> {
        let mut cache = self.client.lock().await;
        self.ensure_client(&mut cache, token).await?;

        let mut query_args = args();
        query_args.insert("projectId".to_string(), Value::from(project_id.to_string()));

        let entry = cache.as_mut().expect("cached Convex client should exist");
        let result = entry
            .client
            .query("projectAi:getChatProjectContext", query_args)
            .await
            .context("failed to fetch chat project context from Convex")?;
        let json = function_result_to_json(result)?;
        if json.is_null() {
            bail!("project was not found or is not accessible");
        }

        serde_json::from_value(json).context("chat project context did not match expected shape")
    }

    async fn ensure_client(
        &self,
        cache: &mut Option<CachedConvexClient>,
        token: &str,
    ) -> anyhow::Result<()> {
        if token.trim().is_empty() {
            bail!("missing desktop auth token for chat project context");
        }

        let needs_new_client = match cache.as_ref() {
            None => true,
            Some(entry) => entry.auth_token != token,
        };

        if needs_new_client {
            let mut client = ConvexClient::new(&self.deployment_url)
                .await
                .with_context(|| format!("failed to connect to Convex at {}", self.deployment_url))?;
            client.set_auth(Some(token.to_string())).await;
            *cache = Some(CachedConvexClient {
                auth_token: token.to_string(),
                client,
            });
        }

        Ok(())
    }
}
