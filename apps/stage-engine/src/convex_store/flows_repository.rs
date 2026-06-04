use anyhow::{Context, bail};
use convex::{ConvexClient, Value};
use serde::Deserialize;
use serde_json::Value as JsonValue;

use crate::config::ConvexConfig;
use crate::models::flows::FlowsInput;
use crate::models::providers::ProviderId;

use super::value::{args, function_result_to_json};

#[derive(Clone, Debug)]
pub struct FlowsRepository {
    deployment_url: String,
}

impl FlowsRepository {
    pub fn new(config: &ConvexConfig) -> Self {
        Self {
            deployment_url: config.deployment_url.clone(),
        }
    }

    pub async fn fetch_flows_input(
        &self,
        token: &str,
        project_id: &str,
    ) -> anyhow::Result<FlowsInput> {
        let mut client = self.authenticated_client(token).await?;
        let mut query_args = args();
        query_args.insert("projectId".to_string(), Value::from(project_id.to_string()));

        let result = client
            .query("projectAi:getFlowsInput", query_args)
            .await
            .context("failed to fetch flows input from Convex")?;
        let json = function_result_to_json(result)?;
        let record: ConvexFlowsInput = serde_json::from_value(json)
            .context("Convex flows input did not match the expected shape")?;

        Ok(record.into_flows_input())
    }

    pub async fn create_flows_run(
        &self,
        token: &str,
        project_id: &str,
        external_run_id: &str,
        input_summary: Option<&str>,
    ) -> anyhow::Result<Option<String>> {
        let mut client = self.authenticated_client(token).await?;
        let mut mutation_args = args();
        mutation_args.insert("projectId".to_string(), Value::from(project_id.to_string()));
        mutation_args.insert("title".to_string(), Value::from("Generate flows".to_string()));
        mutation_args.insert(
            "externalRunId".to_string(),
            Value::from(external_run_id.to_string()),
        );
        if let Some(input_summary) = input_summary {
            mutation_args.insert(
                "inputSummary".to_string(),
                Value::from(input_summary.to_string()),
            );
        }

        let result = client
            .mutation("projectAi:createFlowsRun", mutation_args)
            .await
            .context("failed to create flows run in Convex")?;
        let json = function_result_to_json(result)?;

        Ok(json
            .get("runId")
            .and_then(JsonValue::as_str)
            .map(ToOwned::to_owned))
    }

    pub async fn complete_flows_run(
        &self,
        token: &str,
        project_id: &str,
        run_id: Option<&str>,
        artifact: &JsonValue,
        input: &FlowsInput,
        provider_id: ProviderId,
    ) -> anyhow::Result<Option<String>> {
        let mut client = self.authenticated_client(token).await?;
        let mut mutation_args = args();
        mutation_args.insert("projectId".to_string(), Value::from(project_id.to_string()));
        mutation_args.insert(
            "title".to_string(),
            Value::from(
                artifact
                    .get("title")
                    .and_then(JsonValue::as_str)
                    .unwrap_or("Project Flows")
                    .to_string(),
            ),
        );
        mutation_args.insert("summary".to_string(), Value::from(summary_text(artifact)));
        mutation_args.insert(
            "contentJson".to_string(),
            Value::from(serde_json::to_string(artifact)?),
        );
        if let Some(run_id) = run_id {
            mutation_args.insert("runId".to_string(), Value::from(run_id.to_string()));
        }
        mutation_args.insert(
            "researchArtifactId".to_string(),
            Value::from(input.research_artifact_id.clone()),
        );
        mutation_args.insert(
            "strategyArtifactId".to_string(),
            Value::from(input.strategy_artifact_id.clone()),
        );
        mutation_args.insert(
            "moodboardArtifactId".to_string(),
            Value::from(input.moodboard_artifact_id.clone()),
        );
        mutation_args.insert(
            "providerId".to_string(),
            Value::from(match provider_id {
                ProviderId::Claude => "claude",
                ProviderId::Codex => "codex",
            }),
        );

        let result = client
            .mutation("projectAi:completeFlowsRun", mutation_args)
            .await
            .context("failed to save flows artifact in Convex")?;
        let json = function_result_to_json(result)?;

        Ok(json
            .get("artifactId")
            .and_then(JsonValue::as_str)
            .map(ToOwned::to_owned))
    }

    pub async fn fetch_latest_flows_artifact(
        &self,
        token: &str,
        project_id: &str,
    ) -> anyhow::Result<Option<(String, JsonValue)>> {
        let mut client = self.authenticated_client(token).await?;
        let mut query_args = args();
        query_args.insert("projectId".to_string(), Value::from(project_id.to_string()));

        let result = client
            .query("projectAi:getLatestFlowsArtifact", query_args)
            .await
            .context("failed to fetch latest flows artifact from Convex")?;
        let json = function_result_to_json(result)?;

        if json.is_null() {
            return Ok(None);
        }

        let content_json = json
            .get("contentJson")
            .and_then(JsonValue::as_str)
            .context("latest flows artifact missing contentJson")?;
        let artifact_id = json
            .get("id")
            .and_then(JsonValue::as_str)
            .context("latest flows artifact missing id")?
            .to_string();

        let artifact = serde_json::from_str::<JsonValue>(content_json)
            .context("latest flows artifact contentJson was invalid")?;

        Ok(Some((artifact_id, artifact)))
    }

    pub async fn update_flows_artifact(
        &self,
        token: &str,
        project_id: &str,
        artifact_id: &str,
        artifact: &JsonValue,
    ) -> anyhow::Result<()> {
        let mut client = self.authenticated_client(token).await?;
        let mut mutation_args = args();
        mutation_args.insert("projectId".to_string(), Value::from(project_id.to_string()));
        mutation_args.insert(
            "artifactId".to_string(),
            Value::from(artifact_id.to_string()),
        );
        mutation_args.insert(
            "contentJson".to_string(),
            Value::from(serde_json::to_string(artifact)?),
        );
        mutation_args.insert("summary".to_string(), Value::from(summary_text(artifact)));

        let result = client
            .mutation("projectAi:updateFlowsArtifact", mutation_args)
            .await
            .context("failed to update flows artifact in Convex")?;
        function_result_to_json(result).map(|_| ())
    }

    pub async fn fail_flows_run(
        &self,
        token: &str,
        project_id: &str,
        run_id: Option<&str>,
        message: &str,
    ) -> anyhow::Result<()> {
        let Some(run_id) = run_id else {
            return Ok(());
        };

        let mut client = self.authenticated_client(token).await?;
        let mut mutation_args = args();
        mutation_args.insert("projectId".to_string(), Value::from(project_id.to_string()));
        mutation_args.insert("runId".to_string(), Value::from(run_id.to_string()));
        mutation_args.insert("errorMessage".to_string(), Value::from(message.to_string()));

        let result = client
            .mutation("projectAi:failFlowsRun", mutation_args)
            .await
            .context("failed to mark flows run as failed in Convex")?;
        function_result_to_json(result).map(|_| ())
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
#[serde(rename_all = "camelCase")]
struct ConvexFlowsInput {
    project_id: String,
    project_name: String,
    research_artifact_id: String,
    research_artifact_json: String,
    strategy_artifact_id: String,
    strategy_artifact_json: String,
    moodboard_artifact_id: String,
    moodboard_artifact_json: String,
    existing_flows_artifact_id: Option<String>,
    existing_flows_artifact_json: Option<String>,
}

impl ConvexFlowsInput {
    fn into_flows_input(self) -> FlowsInput {
        FlowsInput {
            project_id: self.project_id,
            project_name: self.project_name,
            research_artifact_id: self.research_artifact_id,
            research_artifact_json: self.research_artifact_json,
            strategy_artifact_id: self.strategy_artifact_id,
            strategy_artifact_json: self.strategy_artifact_json,
            moodboard_artifact_id: self.moodboard_artifact_id,
            moodboard_artifact_json: self.moodboard_artifact_json,
            existing_flows_artifact_id: self.existing_flows_artifact_id,
            existing_flows_artifact_json: self.existing_flows_artifact_json,
        }
    }
}

fn summary_text(artifact: &JsonValue) -> String {
    let flows = artifact
        .get("flows")
        .and_then(JsonValue::as_array)
        .map(Vec::len)
        .unwrap_or(0);
    let screens = artifact
        .get("screens")
        .and_then(JsonValue::as_array)
        .map(Vec::len)
        .unwrap_or(0);

    format!("{flows} flows · {screens} screens")
}
