use anyhow::{Context, bail};
use convex::{ConvexClient, Value};
use serde_json::{Value as JsonValue, json};

use crate::config::ConvexConfig;

use super::value::{args, function_result_to_json};

#[derive(Clone, Debug)]
pub struct MoodboardRepository {
    deployment_url: String,
}

impl MoodboardRepository {
    pub fn new(config: &ConvexConfig) -> Self {
        Self {
            deployment_url: config.deployment_url.clone(),
        }
    }

    pub fn deployment_url(&self) -> &str {
        &self.deployment_url
    }

    pub async fn fetch_latest_moodboard_artifact(
        &self,
        token: &str,
        project_id: &str,
    ) -> anyhow::Result<Option<JsonValue>> {
        let mut client = self.authenticated_client(token).await?;
        let mut args = args();
        args.insert("projectId".to_string(), Value::from(project_id.to_string()));

        let result = client
            .query("projectAi:getLatestMoodboardArtifact", args)
            .await
            .context("failed to fetch latest moodboard artifact from Convex")?;
        let json = function_result_to_json(result)?;

        if json.is_null() {
            return Ok(None);
        }

        let content_json = json
            .get("contentJson")
            .and_then(JsonValue::as_str)
            .context("latest moodboard artifact missing contentJson")?;

        serde_json::from_str::<JsonValue>(content_json)
            .map(Some)
            .context("latest moodboard artifact contentJson was invalid")
    }

    pub async fn save_moodboard_artifact(
        &self,
        token: &str,
        project_id: &str,
        artifact: &JsonValue,
    ) -> anyhow::Result<Option<String>> {
        let mut client = self.authenticated_client(token).await?;
        let mut args = args();
        args.insert("projectId".to_string(), Value::from(project_id.to_string()));
        args.insert(
            "title".to_string(),
            Value::from(
                artifact
                    .get("title")
                    .and_then(JsonValue::as_str)
                    .unwrap_or("Project moodboard")
                    .to_string(),
            ),
        );
        args.insert(
            "contentJson".to_string(),
            Value::from(serde_json::to_string(artifact)?),
        );

        let result = client
            .mutation("projectAi:saveMoodboardArtifact", args)
            .await
            .context("failed to save moodboard artifact in Convex")?;
        let json = function_result_to_json(result)?;

        Ok(json
            .get("artifactId")
            .and_then(JsonValue::as_str)
            .map(ToOwned::to_owned))
    }

    pub async fn fetch_connected_figma_access_token(
        &self,
        token: &str,
        project_id: &str,
    ) -> anyhow::Result<Option<String>> {
        let mut client = self.authenticated_client(token).await?;
        let mut args = args();
        args.insert("projectId".to_string(), Value::from(project_id.to_string()));

        let result = client
            .query("projectAi:getConnectedFigmaAccessToken", args)
            .await
            .context("failed to fetch connected Figma token from Convex")?;
        let json = function_result_to_json(result)?;

        if json.is_null() {
            return Ok(None);
        }

        Ok(json
            .get("accessToken")
            .and_then(JsonValue::as_str)
            .map(ToOwned::to_owned))
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

pub fn empty_moodboard_artifact(project_id: &str, title: &str, generated_at: u128) -> JsonValue {
    json!({
        "apiVersion": "v1",
        "artifactKind": "moodboardArtifact",
        "projectId": project_id,
        "title": title,
        "directions": [],
        "references": [],
        "uploadedFiles": [],
        "styleGuides": [],
        "generatedAt": i64::try_from(generated_at).unwrap_or(i64::MAX),
    })
}
