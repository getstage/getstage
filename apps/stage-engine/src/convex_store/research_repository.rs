use anyhow::{Context, bail};
use convex::{ConvexClient, Value};
use serde::Deserialize;
use serde_json::{Value as JsonValue, json};

use crate::config::ConvexConfig;
use crate::models::research::ResearchInput;

use super::value::{args, function_result_to_json};

#[derive(Clone, Debug)]
pub struct ResearchRepository {
    deployment_url: String,
}

impl ResearchRepository {
    pub fn new(config: &ConvexConfig) -> Self {
        Self {
            deployment_url: config.deployment_url.clone(),
        }
    }

    pub fn deployment_url(&self) -> &str {
        &self.deployment_url
    }

    pub async fn fetch_research_input(
        &self,
        token: &str,
        project_id: &str,
    ) -> anyhow::Result<ResearchInput> {
        let mut client = self.authenticated_client(token).await?;
        let mut args = args();
        args.insert("projectId".to_string(), Value::from(project_id.to_string()));

        let result = client
            .query("projectAi:getResearchInput", args)
            .await
            .context("failed to fetch research context from Convex")?;
        let json = function_result_to_json(result)?;
        let record: ConvexResearchInput = serde_json::from_value(json)
            .context("Convex research context did not match the expected shape")?;

        Ok(record.into_research_input())
    }

    pub async fn create_research_run(
        &self,
        token: &str,
        project_id: &str,
        external_run_id: &str,
        input_summary: Option<&str>,
    ) -> anyhow::Result<Option<String>> {
        let mut client = self.authenticated_client(token).await?;
        let mut args = args();
        args.insert("projectId".to_string(), Value::from(project_id.to_string()));
        args.insert(
            "title".to_string(),
            Value::from("Generate research".to_string()),
        );
        args.insert(
            "externalRunId".to_string(),
            Value::from(external_run_id.to_string()),
        );
        if let Some(input_summary) = input_summary {
            args.insert(
                "inputSummary".to_string(),
                Value::from(input_summary.to_string()),
            );
        }

        let result = client
            .mutation("projectAi:createResearchRun", args)
            .await
            .context("failed to create research run in Convex")?;
        let json = function_result_to_json(result)?;

        Ok(json
            .get("runId")
            .and_then(JsonValue::as_str)
            .map(ToOwned::to_owned))
    }

    pub async fn complete_research_run(
        &self,
        token: &str,
        project_id: &str,
        run_id: Option<&str>,
        artifact: &JsonValue,
        provider_id: crate::models::providers::ProviderId,
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
                    .unwrap_or("Research Artifact")
                    .to_string(),
            ),
        );
        args.insert(
            "summary".to_string(),
            Value::from(
                summary_text(artifact).unwrap_or_else(|| "Research generated.".to_string()),
            ),
        );
        args.insert(
            "contentJson".to_string(),
            Value::from(serde_json::to_string(artifact)?),
        );
        if let Some(run_id) = run_id {
            args.insert("runId".to_string(), Value::from(run_id.to_string()));
        }
        args.insert(
            "providerId".to_string(),
            Value::from(match provider_id {
                crate::models::providers::ProviderId::Claude => "claude",
                crate::models::providers::ProviderId::Codex => "codex",
            }),
        );

        let result = client
            .mutation("projectAi:completeResearchRun", args)
            .await
            .context("failed to save research artifact in Convex")?;
        let json = function_result_to_json(result)?;

        Ok(json
            .get("artifactId")
            .and_then(JsonValue::as_str)
            .map(ToOwned::to_owned))
    }

    pub async fn fetch_latest_research_artifact(
        &self,
        token: &str,
        project_id: &str,
    ) -> anyhow::Result<Option<(String, JsonValue)>> {
        let mut client = self.authenticated_client(token).await?;
        let mut args = args();
        args.insert("projectId".to_string(), Value::from(project_id.to_string()));

        let result = client
            .query("projectAi:getLatestResearchArtifact", args)
            .await
            .context("failed to fetch latest research artifact from Convex")?;
        let json = function_result_to_json(result)?;

        if json.is_null() {
            return Ok(None);
        }

        let content_json = json
            .get("contentJson")
            .and_then(JsonValue::as_str)
            .context("latest research artifact missing contentJson")?;
        let artifact_id = json
            .get("id")
            .and_then(JsonValue::as_str)
            .context("latest research artifact missing id")?
            .to_string();

        let artifact = serde_json::from_str::<JsonValue>(content_json)
            .context("latest research artifact contentJson was invalid")?;

        Ok(Some((artifact_id, artifact)))
    }

    pub async fn update_research_artifact(
        &self,
        token: &str,
        project_id: &str,
        artifact_id: &str,
        artifact: &JsonValue,
    ) -> anyhow::Result<()> {
        let mut client = self.authenticated_client(token).await?;
        let mut args = args();
        args.insert("projectId".to_string(), Value::from(project_id.to_string()));
        args.insert(
            "artifactId".to_string(),
            Value::from(artifact_id.to_string()),
        );
        args.insert(
            "contentJson".to_string(),
            Value::from(serde_json::to_string(artifact)?),
        );
        if let Some(summary) = summary_text(artifact) {
            args.insert("summary".to_string(), Value::from(summary));
        }

        let result = client
            .mutation("projectAi:updateResearchArtifact", args)
            .await
            .context("failed to update research artifact in Convex")?;
        function_result_to_json(result).map(|_| ())
    }

    pub async fn fail_research_run(
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
        let mut args = args();
        args.insert("projectId".to_string(), Value::from(project_id.to_string()));
        args.insert("runId".to_string(), Value::from(run_id.to_string()));
        args.insert("errorMessage".to_string(), Value::from(message.to_string()));

        let result = client
            .mutation("projectAi:failResearchRun", args)
            .await
            .context("failed to mark research run as failed in Convex")?;
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
struct ConvexResearchInput {
    project_id: String,
    project_name: String,
    client_name: Option<String>,
    industry: Option<String>,
    website: Option<String>,
    project_brief: Option<String>,
    #[serde(default)]
    competitor_urls: Vec<String>,
    target_users: Option<String>,
    additional_notes: Option<String>,
    #[serde(default)]
    uploaded_asset_ids: Vec<String>,
}

impl ConvexResearchInput {
    fn into_research_input(self) -> ResearchInput {
        ResearchInput {
            project_id: self.project_id,
            project_name: self.project_name,
            client_name: self.client_name,
            industry: self.industry.unwrap_or_else(|| "Unknown".to_string()),
            website: self.website,
            project_brief: self.project_brief,
            competitor_urls: self.competitor_urls,
            target_users: self.target_users,
            additional_notes: self.additional_notes,
            uploaded_asset_ids: self.uploaded_asset_ids,
        }
    }
}

pub fn enrich_research_artifact(
    mut artifact: JsonValue,
    input: &ResearchInput,
    refero_context: JsonValue,
    generated_at: u128,
) -> anyhow::Result<JsonValue> {
    let Some(object) = artifact.as_object_mut() else {
        bail!("research provider output was not a JSON object");
    };

    object.insert("apiVersion".to_string(), json!("v1"));
    object.insert("artifactKind".to_string(), json!("researchArtifact"));
    object.insert("projectId".to_string(), json!(input.project_id));
    object.insert("referoContext".to_string(), refero_context);
    let generated_at = i64::try_from(generated_at).unwrap_or(i64::MAX);
    object.insert("generatedAt".to_string(), json!(generated_at));
    crate::research::normalize::normalize_research_artifact_fields(object, input);
    normalize_competitive_matrix_scores(object);
    crate::research::competitive::filter_competitive_analysis(object, input);
    let repair_report = crate::research::competitive::repair_competitive_analysis(object, input);
    crate::research::competitive::append_competitive_quality_warnings(object, &repair_report);
    crate::research::competitive::validate_competitive_analysis(object, input)?;

    Ok(JsonValue::Object(object.clone()))
}

fn normalize_competitive_matrix_scores(object: &mut serde_json::Map<String, JsonValue>) {
    let Some(competitive_analysis) = object.get_mut("competitiveAnalysis") else {
        return;
    };
    let Some(analysis_object) = competitive_analysis.as_object_mut() else {
        return;
    };
    let Some(matrix_rows) = analysis_object
        .get_mut("matrixRows")
        .and_then(JsonValue::as_array_mut)
    else {
        return;
    };

    for row in matrix_rows {
        let Some(row_object) = row.as_object_mut() else {
            continue;
        };
        let Some(cells) = row_object
            .get_mut("cells")
            .and_then(JsonValue::as_array_mut)
        else {
            continue;
        };

        for cell in cells {
            let Some(cell_object) = cell.as_object_mut() else {
                continue;
            };
            let Some(score) = cell_object.get("score").and_then(JsonValue::as_str) else {
                continue;
            };
            if let Some(normalized) = normalize_matrix_score(score) {
                cell_object.insert("score".to_string(), json!(normalized));
            } else if let Some(fallback) =
                crate::research::normalize::normalize_matrix_score_label(score)
            {
                cell_object.insert("score".to_string(), json!(fallback));
            }
        }
    }
}

fn normalize_matrix_score(score: &str) -> Option<&'static str> {
    match score.trim() {
        "Strong" | "OK" | "Weak" => None,
        "strong" => Some("Strong"),
        "ok" => Some("OK"),
        "weak" => Some("Weak"),
        _ => None,
    }
}

pub use crate::helpers::provider_json::{
    extract_json_object, extract_research_artifact, extract_strategy_artifact,
};

fn summary_text(artifact: &JsonValue) -> Option<String> {
    match artifact.get("summary")? {
        JsonValue::Array(items) => {
            let summary = items
                .iter()
                .filter_map(JsonValue::as_str)
                .map(str::trim)
                .filter(|value| !value.is_empty())
                .collect::<Vec<_>>()
                .join(" ");
            (!summary.is_empty()).then_some(summary)
        }
        JsonValue::Object(map) => {
            let headline = map
                .get("headline")
                .and_then(JsonValue::as_str)
                .unwrap_or("");
            let body = map.get("body").and_then(JsonValue::as_str).unwrap_or("");
            let summary = [headline.trim(), body.trim()]
                .into_iter()
                .filter(|value| !value.is_empty())
                .collect::<Vec<_>>()
                .join(" ");
            (!summary.is_empty()).then_some(summary)
        }
        JsonValue::String(text) => {
            let trimmed = text.trim();
            (!trimmed.is_empty()).then(|| trimmed.to_string())
        }
        _ => None,
    }
}
