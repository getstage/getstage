use anyhow::{Context, bail};
use convex::{ConvexClient, Value};

use crate::config::ConvexConfig;
use crate::convex_store::value::{args, function_result_to_json};

use super::models::{CreateJobInput, CreateJobResult, WireframeArtifactRecord};

#[derive(Clone, Debug)]
pub struct FigmaExportRepository {
    deployment_url: String,
}

impl FigmaExportRepository {
    pub fn new(config: &ConvexConfig) -> Self {
        Self {
            deployment_url: config.deployment_url.clone(),
        }
    }

    pub async fn fetch_latest_wireframes_artifact(
        &self,
        token: &str,
        project_id: &str,
    ) -> anyhow::Result<WireframeArtifactRecord> {
        let mut client = self.authenticated_client(token).await?;
        let mut query_args = args();
        query_args.insert("projectId".to_string(), Value::from(project_id.to_string()));
        let result = client
            .query("projectAi:getLatestWireframesArtifact", query_args)
            .await
            .context("failed to fetch wireframes artifact for Figma export")?;
        let json = function_result_to_json(result)?;
        serde_json::from_value(json).context("wireframes artifact record has an invalid shape")
    }

    pub async fn fetch_latest_flows_artifact(
        &self,
        token: &str,
        project_id: &str,
    ) -> anyhow::Result<WireframeArtifactRecord> {
        let mut client = self.authenticated_client(token).await?;
        let mut query_args = args();
        query_args.insert("projectId".to_string(), Value::from(project_id.to_string()));
        let result = client
            .query("projectAi:getLatestFlowsArtifact", query_args)
            .await
            .context("failed to fetch flows artifact for FigJam export")?;
        let json = function_result_to_json(result)?;
        serde_json::from_value(json).context("flows artifact record has an invalid shape")
    }

    pub async fn create_job(
        &self,
        token: &str,
        input: CreateJobInput,
    ) -> anyhow::Result<CreateJobResult> {
        let expires_at =
            i64::try_from(input.pairing_expires_at).context("pairing expiry is too large")?;
        let mut client = self.authenticated_client(token).await?;
        let mut mutation_args = args();
        mutation_args.insert("projectId".to_string(), Value::from(input.project_id));
        mutation_args.insert("artifactId".to_string(), Value::from(input.artifact_id));
        mutation_args.insert("screenId".to_string(), Value::from(input.screen_id));
        mutation_args.insert(
            "writePlanJson".to_string(),
            Value::from(input.write_plan_json),
        );
        mutation_args.insert(
            "pairingCodeHash".to_string(),
            Value::from(input.pairing_code_hash),
        );
        mutation_args.insert("pairingExpiresAt".to_string(), Value::from(expires_at as f64));
        mutation_args.insert(
            "exportKind".to_string(),
            Value::from(input.export_kind.to_string()),
        );

        let result = client
            .mutation(
                "integrations/contentPlatforms:createFigmaCanvasExportJob",
                mutation_args,
            )
            .await
            .context("failed to create Figma export job")?;
        let json = function_result_to_json(result)?;
        serde_json::from_value(json).context("Figma export job response has an invalid shape")
    }

    async fn authenticated_client(&self, token: &str) -> anyhow::Result<ConvexClient> {
        if token.trim().is_empty() {
            bail!("missing desktop auth token for Figma export");
        }

        let mut client = ConvexClient::new(&self.deployment_url)
            .await
            .with_context(|| format!("failed to connect to Convex at {}", self.deployment_url))?;
        client.set_auth(Some(token.to_string())).await;
        Ok(client)
    }
}
