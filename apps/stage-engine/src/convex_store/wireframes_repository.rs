use anyhow::{Context, bail};
use convex::{ConvexClient, Value};
use serde::Deserialize;
use serde_json::{Value as JsonValue, json};

use crate::config::ConvexConfig;
use crate::models::providers::ProviderId;
use crate::models::wireframes::WireframesInput;

use super::value::{args, function_result_to_json};

#[derive(Clone, Debug)]
pub struct WireframesRepository {
    deployment_url: String,
}

impl WireframesRepository {
    pub fn new(config: &ConvexConfig) -> Self {
        Self {
            deployment_url: config.deployment_url.clone(),
        }
    }

    pub async fn fetch_wireframes_input(
        &self,
        token: &str,
        project_id: &str,
    ) -> anyhow::Result<WireframesInput> {
        let mut client = self.authenticated_client(token).await?;
        let mut query_args = args();
        query_args.insert("projectId".to_string(), Value::from(project_id.to_string()));

        let result = client
            .query("projectAi:getWireframesInput", query_args)
            .await
            .context("failed to fetch wireframes input from Convex")?;
        let json = function_result_to_json(result)?;
        let record: ConvexWireframesInput = serde_json::from_value(json)
            .context("Convex wireframes input did not match the expected shape")?;

        Ok(record.into_wireframes_input())
    }

    pub async fn create_wireframes_run(
        &self,
        token: &str,
        project_id: &str,
        external_run_id: &str,
        input_summary: Option<&str>,
    ) -> anyhow::Result<Option<String>> {
        let mut client = self.authenticated_client(token).await?;
        let mut mutation_args = args();
        mutation_args.insert("projectId".to_string(), Value::from(project_id.to_string()));
        mutation_args.insert(
            "title".to_string(),
            Value::from("Generate wireframes".to_string()),
        );
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
            .mutation("projectAi:createWireframesRun", mutation_args)
            .await
            .context("failed to create wireframes run in Convex")?;
        let json = function_result_to_json(result)?;

        Ok(json
            .get("runId")
            .and_then(JsonValue::as_str)
            .map(ToOwned::to_owned))
    }

    pub async fn complete_wireframes_run(
        &self,
        token: &str,
        project_id: &str,
        run_id: Option<&str>,
        artifact: &JsonValue,
        input: &WireframesInput,
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
                    .unwrap_or("Project Wireframes")
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
            "strategyArtifactId".to_string(),
            Value::from(input.strategy_artifact_id.clone()),
        );
        if let Some(research_id) = input.research_artifact_id.as_deref() {
            mutation_args.insert(
                "researchArtifactId".to_string(),
                Value::from(research_id.to_string()),
            );
        }
        if let Some(moodboard_id) = input.moodboard_artifact_id.as_deref() {
            mutation_args.insert(
                "moodboardArtifactId".to_string(),
                Value::from(moodboard_id.to_string()),
            );
        }
        if let Some(flows_id) = input.flows_artifact_id.as_deref() {
            mutation_args.insert(
                "flowsArtifactId".to_string(),
                Value::from(flows_id.to_string()),
            );
        }
        mutation_args.insert(
            "providerId".to_string(),
            Value::from(match provider_id {
                ProviderId::Claude => "claude",
                ProviderId::Codex => "codex",
            }),
        );

        let result = client
            .mutation("projectAi:completeWireframesRun", mutation_args)
            .await
            .context("failed to save wireframes artifact in Convex")?;
        let json = function_result_to_json(result)?;

        Ok(json
            .get("artifactId")
            .and_then(JsonValue::as_str)
            .map(ToOwned::to_owned))
    }

    pub async fn fail_wireframes_run(
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
            .mutation("projectAi:failWireframesRun", mutation_args)
            .await
            .context("failed to mark wireframes run as failed in Convex")?;
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
struct ConvexWireframesInput {
    project_id: String,
    project_name: String,
    strategy_artifact_id: String,
    strategy_artifact_json: String,
    research_artifact_id: Option<String>,
    research_artifact_json: Option<String>,
    moodboard_artifact_id: Option<String>,
    moodboard_artifact_json: Option<String>,
    flows_artifact_id: Option<String>,
    flows_artifact_json: Option<String>,
    existing_wireframes_artifact_id: Option<String>,
    existing_wireframes_artifact_json: Option<String>,
}

impl ConvexWireframesInput {
    fn into_wireframes_input(self) -> WireframesInput {
        WireframesInput {
            project_id: self.project_id,
            project_name: self.project_name,
            strategy_artifact_id: self.strategy_artifact_id,
            strategy_artifact_json: self.strategy_artifact_json,
            research_artifact_id: self.research_artifact_id,
            research_artifact_json: self.research_artifact_json,
            moodboard_artifact_id: self.moodboard_artifact_id,
            moodboard_artifact_json: self.moodboard_artifact_json,
            flows_artifact_id: self.flows_artifact_id,
            flows_artifact_json: self.flows_artifact_json,
            existing_wireframes_artifact_id: self.existing_wireframes_artifact_id,
            existing_wireframes_artifact_json: self.existing_wireframes_artifact_json,
        }
    }
}

fn summary_text(artifact: &JsonValue) -> String {
    let screens = artifact
        .get("generatedScreens")
        .and_then(JsonValue::as_array)
        .map(Vec::len)
        .unwrap_or(0);
    let kind = artifact
        .get("wireframeKind")
        .and_then(JsonValue::as_str)
        .unwrap_or("lofi");

    format!("{screens} {kind} wireframes")
}

#[allow(dead_code)]
pub fn empty_wireframes_artifact(project_id: &str, title: &str, generated_at: u128) -> JsonValue {
    json!({
        "apiVersion": "v1",
        "artifactKind": "wireframesArtifact",
        "projectId": project_id,
        "title": title,
        "wireframeKind": "lofi",
        "stats": {
            "flowsScreenCount": 0,
            "moodboardPatternCount": 0,
            "totalConfigureScreenCount": 0
        },
        "configureScreens": [],
        "generatedScreens": [],
        "generatedAt": i64::try_from(generated_at).unwrap_or(i64::MAX),
        "generatedAtLabel": "just now",
        "figmaSymbolUrl": "https://figma.com/"
    })
}
