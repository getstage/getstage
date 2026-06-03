use anyhow::{Context, bail};
use convex::{ConvexClient, Value};
use serde::Deserialize;
use serde_json::{Map as JsonMap, Value as JsonValue, json};

use crate::config::ConvexConfig;
use crate::models::strategy::StrategyInput;

use super::value::{args, function_result_to_json};

#[derive(Clone, Debug)]
pub struct StrategyRepository {
    deployment_url: String,
}

#[derive(Clone, Copy, Debug)]
struct SectionSpec {
    id: &'static str,
    title: &'static str,
    kind: &'static str,
}

const SECTION_SPECS: [SectionSpec; 7] = [
    SectionSpec {
        id: "direction",
        title: "Design Direction",
        kind: "plain",
    },
    SectionSpec {
        id: "principles",
        title: "Design Principles",
        kind: "principles",
    },
    SectionSpec {
        id: "audience",
        title: "Target Audience Strategy",
        kind: "table",
    },
    SectionSpec {
        id: "content",
        title: "Content Strategy",
        kind: "paragraph",
    },
    SectionSpec {
        id: "positioning",
        title: "Competitive Positioning",
        kind: "boxes",
    },
    SectionSpec {
        id: "pages",
        title: "Key Pages & Objectives",
        kind: "cards",
    },
    SectionSpec {
        id: "accessibility",
        title: "Accessibility & Constraints",
        kind: "table",
    },
];

impl StrategyRepository {
    pub fn new(config: &ConvexConfig) -> Self {
        Self {
            deployment_url: config.deployment_url.clone(),
        }
    }

    pub async fn fetch_strategy_input(
        &self,
        token: &str,
        project_id: &str,
    ) -> anyhow::Result<StrategyInput> {
        let mut client = self.authenticated_client(token).await?;
        let mut query_args = args();
        query_args.insert("projectId".to_string(), Value::from(project_id.to_string()));

        let result = client
            .query("projectAi:getStrategyInput", query_args)
            .await
            .context("failed to fetch strategy input from Convex")?;
        let json = function_result_to_json(result)?;
        let record: ConvexStrategyInput = serde_json::from_value(json)
            .context("Convex strategy input did not match the expected shape")?;

        Ok(record.into_strategy_input())
    }

    pub async fn create_strategy_run(
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
            Value::from("Generate strategy".to_string()),
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
            .mutation("projectAi:createStrategyRun", mutation_args)
            .await
            .context("failed to create strategy run in Convex")?;
        let json = function_result_to_json(result)?;

        Ok(json
            .get("runId")
            .and_then(JsonValue::as_str)
            .map(ToOwned::to_owned))
    }

    pub async fn complete_strategy_run(
        &self,
        token: &str,
        project_id: &str,
        run_id: Option<&str>,
        artifact: &JsonValue,
        research_artifact_id: Option<&str>,
        provider_id: crate::models::providers::ProviderId,
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
                    .unwrap_or("Project Strategy")
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
        if let Some(research_artifact_id) = research_artifact_id {
            mutation_args.insert(
                "researchArtifactId".to_string(),
                Value::from(research_artifact_id.to_string()),
            );
        }
        mutation_args.insert(
            "providerId".to_string(),
            Value::from(match provider_id {
                crate::models::providers::ProviderId::Claude => "claude",
                crate::models::providers::ProviderId::Codex => "codex",
            }),
        );

        let result = client
            .mutation("projectAi:completeStrategyRun", mutation_args)
            .await
            .context("failed to save strategy artifact in Convex")?;
        let json = function_result_to_json(result)?;

        Ok(json
            .get("artifactId")
            .and_then(JsonValue::as_str)
            .map(ToOwned::to_owned))
    }

    pub async fn fetch_latest_strategy_artifact(
        &self,
        token: &str,
        project_id: &str,
    ) -> anyhow::Result<Option<(String, JsonValue)>> {
        let mut client = self.authenticated_client(token).await?;
        let mut query_args = args();
        query_args.insert("projectId".to_string(), Value::from(project_id.to_string()));

        let result = client
            .query("projectAi:getLatestStrategyArtifact", query_args)
            .await
            .context("failed to fetch latest strategy artifact from Convex")?;
        let json = function_result_to_json(result)?;

        if json.is_null() {
            return Ok(None);
        }

        let content_json = json
            .get("contentJson")
            .and_then(JsonValue::as_str)
            .context("latest strategy artifact missing contentJson")?;
        let artifact_id = json
            .get("id")
            .and_then(JsonValue::as_str)
            .context("latest strategy artifact missing id")?
            .to_string();

        let artifact = serde_json::from_str::<JsonValue>(content_json)
            .context("latest strategy artifact contentJson was invalid")?;

        Ok(Some((artifact_id, artifact)))
    }

    pub async fn update_strategy_artifact(
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
            .mutation("projectAi:updateStrategyArtifact", mutation_args)
            .await
            .context("failed to update strategy artifact in Convex")?;
        function_result_to_json(result).map(|_| ())
    }

    pub async fn fail_strategy_run(
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
            .mutation("projectAi:failStrategyRun", mutation_args)
            .await
            .context("failed to mark strategy run as failed in Convex")?;
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
struct ConvexStrategyInput {
    project_id: String,
    project_name: String,
    research_artifact_id: String,
    research_artifact_json: String,
    #[serde(default)]
    focus_areas: Vec<String>,
    additional_notes: Option<String>,
}

impl ConvexStrategyInput {
    fn into_strategy_input(self) -> StrategyInput {
        StrategyInput {
            project_id: self.project_id,
            project_name: self.project_name,
            research_artifact_id: self.research_artifact_id,
            research_artifact_json: self.research_artifact_json,
            focus_areas: self.focus_areas,
            additional_notes: self.additional_notes,
        }
    }
}

pub fn normalize_strategy_artifact(
    mut artifact: JsonValue,
    input: &StrategyInput,
    generated_at: u128,
) -> anyhow::Result<JsonValue> {
    let Some(object) = artifact.as_object_mut() else {
        bail!("strategy provider output was not a JSON object");
    };

    let sections = object
        .get("sections")
        .and_then(JsonValue::as_array)
        .context("strategy artifact missing sections array")?;

    let normalized_sections = SECTION_SPECS
        .iter()
        .map(|spec| {
            let section = sections
                .iter()
                .find(|section| section_matches(section, spec))
                .with_context(|| format!("strategy artifact missing `{}` section", spec.title))?;
            normalize_section(section, spec)
        })
        .collect::<anyhow::Result<Vec<_>>>()?;

    object.insert("apiVersion".to_string(), json!("v1"));
    object.insert("artifactKind".to_string(), json!("strategyArtifact"));
    object.insert("projectId".to_string(), json!(input.project_id));
    object.insert(
        "researchArtifactId".to_string(),
        json!(input.research_artifact_id),
    );
    object.insert(
        "title".to_string(),
        json!(
            object
                .get("title")
                .and_then(JsonValue::as_str)
                .map(str::trim)
                .filter(|value| !value.is_empty())
                .unwrap_or("Project Strategy")
        ),
    );
    let generated_at = i64::try_from(generated_at).unwrap_or(i64::MAX);
    object.insert("generatedAt".to_string(), json!(generated_at));
    object.insert(
        "sections".to_string(),
        JsonValue::Array(normalized_sections),
    );

    Ok(JsonValue::Object(object.clone()))
}

fn normalize_section(section: &JsonValue, spec: &SectionSpec) -> anyhow::Result<JsonValue> {
    let _source = section
        .as_object()
        .with_context(|| format!("strategy section `{}` was not an object", spec.id))?;
    let mut normalized = JsonMap::new();
    normalized.insert("id".to_string(), json!(spec.id));
    normalized.insert("title".to_string(), json!(spec.title));
    normalized.insert("kind".to_string(), json!(spec.kind));
    normalized.insert("status".to_string(), json!("action"));

    match spec.kind {
        "plain" | "paragraph" => {
            normalized.insert(
                "body".to_string(),
                JsonValue::Array(normalize_body(section)?),
            );
        }
        "principles" => {
            normalized.insert(
                "principles".to_string(),
                JsonValue::Array(normalize_principles(section)?),
            );
        }
        "table" => {
            normalized.insert(
                "table".to_string(),
                JsonValue::Array(normalize_table(section)?),
            );
        }
        "cards" => {
            normalized.insert(
                "cards".to_string(),
                JsonValue::Array(normalize_cards(section)?),
            );
        }
        "boxes" => {
            normalized.insert(
                "boxes".to_string(),
                JsonValue::Array(normalize_boxes(section)?),
            );
        }
        _ => bail!("unsupported strategy section kind `{}`", spec.kind),
    }

    Ok(JsonValue::Object(normalized))
}

fn normalize_body(section: &JsonValue) -> anyhow::Result<Vec<JsonValue>> {
    let body = section
        .get("body")
        .and_then(JsonValue::as_array)
        .context("strategy section missing body array")?;

    let normalized = body
        .iter()
        .filter_map(JsonValue::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(|value| json!(value))
        .collect::<Vec<_>>();

    if normalized.is_empty() {
        bail!("strategy section body array was empty");
    }

    Ok(normalized)
}

fn normalize_principles(section: &JsonValue) -> anyhow::Result<Vec<JsonValue>> {
    let principles = section
        .get("principles")
        .and_then(JsonValue::as_array)
        .context("strategy section missing principles array")?;

    let normalized = principles
        .iter()
        .map(|principle| {
            let object = principle
                .as_object()
                .context("strategy principle was not an object")?;
            let title = required_text(object.get("title"), "strategy principle title")?;
            let body = required_text(object.get("body"), "strategy principle body")?;
            let mut entry = JsonMap::new();
            entry.insert("title".to_string(), json!(title));
            entry.insert("body".to_string(), json!(body));
            if let Some(research) = optional_text(object.get("research")) {
                entry.insert("research".to_string(), json!(research));
            }
            Ok(JsonValue::Object(entry))
        })
        .collect::<anyhow::Result<Vec<_>>>()?;

    if normalized.is_empty() {
        bail!("strategy principles array was empty");
    }

    Ok(normalized)
}

fn normalize_table(section: &JsonValue) -> anyhow::Result<Vec<JsonValue>> {
    let table = section
        .get("table")
        .and_then(JsonValue::as_array)
        .context("strategy section missing table rows")?;

    let normalized = table
        .iter()
        .filter_map(|row| match coerce_table_row_to_pair(row) {
            Ok(Some(pair)) => Some(Ok(pair)),
            Ok(None) => None,
            Err(error) => Some(Err(error)),
        })
        .collect::<anyhow::Result<Vec<_>>>()?;

    if normalized.is_empty() {
        bail!("strategy table rows were empty");
    }

    Ok(normalized)
}

/// Coerce provider table rows into `[label, value]` pairs (UI + Zod contract).
/// Accepts 1..N columns; never fails on column count alone.
fn coerce_table_row_to_pair(row: &JsonValue) -> anyhow::Result<Option<JsonValue>> {
    if let Some(object) = row.as_object() {
        let label = object
            .get("label")
            .or_else(|| object.get("title"))
            .or_else(|| object.get("audience"))
            .or_else(|| object.get("area"));
        let value = object
            .get("value")
            .or_else(|| object.get("body"))
            .or_else(|| object.get("strategy"))
            .or_else(|| object.get("requirement"));
        if label.is_some() || value.is_some() {
            let label = optional_text(label).unwrap_or_else(|| "Item".to_string());
            let value = optional_text(value).unwrap_or_else(|| "—".to_string());
            if label.is_empty() && value == "—" {
                return Ok(None);
            }
            return Ok(Some(json!([label, value])));
        }
    }

    let cells: Vec<String> = match row.as_array() {
        Some(array) => array
            .iter()
            .filter_map(table_cell_to_string)
            .map(|cell| cell.trim().to_string())
            .filter(|cell| !cell.is_empty())
            .collect(),
        None => {
            let Some(single) = table_cell_to_string(row) else {
                return Ok(None);
            };
            if single.trim().is_empty() {
                return Ok(None);
            }
            return Ok(Some(json!([single.trim().to_string(), "—".to_string()])));
        }
    };

    if cells.is_empty() {
        return Ok(None);
    }

    if cells.len() == 1 {
        return Ok(Some(json!([cells[0].clone(), "—".to_string()])));
    }

    if cells.len() == 2 {
        return Ok(Some(json!([cells[0].clone(), cells[1].clone()])));
    }

    // 3+ columns: first cell is the row label; remaining cells are merged into the value.
    let label = cells[0].clone();
    let value = cells[1..].join(" · ");
    Ok(Some(json!([label, value])))
}

fn table_cell_to_string(cell: &JsonValue) -> Option<String> {
    match cell {
        JsonValue::String(value) => Some(value.clone()),
        JsonValue::Number(value) => Some(value.to_string()),
        JsonValue::Bool(value) => Some(value.to_string()),
        JsonValue::Null => None,
        other => serde_json::to_string(other).ok(),
    }
}

fn normalize_cards(section: &JsonValue) -> anyhow::Result<Vec<JsonValue>> {
    let cards = section
        .get("cards")
        .and_then(JsonValue::as_array)
        .context("strategy section missing cards array")?;

    let normalized = cards
        .iter()
        .map(|card| {
            let object = card
                .as_object()
                .context("strategy card was not an object")?;
            Ok(json!({
                "title": required_text(object.get("title"), "strategy card title")?,
                "objective": required_text(object.get("objective"), "strategy card objective")?,
                "kpi": required_text(object.get("kpi"), "strategy card KPI")?,
                "keyElement": required_text(object.get("keyElement"), "strategy card key element")?,
            }))
        })
        .collect::<anyhow::Result<Vec<_>>>()?;

    if normalized.is_empty() {
        bail!("strategy cards array was empty");
    }

    Ok(normalized)
}

fn normalize_boxes(section: &JsonValue) -> anyhow::Result<Vec<JsonValue>> {
    let boxes = section
        .get("boxes")
        .and_then(JsonValue::as_array)
        .context("strategy section missing boxes array")?;

    let normalized = boxes
        .iter()
        .map(|box_entry| {
            let object = box_entry
                .as_object()
                .context("strategy box was not an object")?;
            let bullets = object
                .get("bullets")
                .and_then(JsonValue::as_array)
                .context("strategy box missing bullets array")?
                .iter()
                .filter_map(JsonValue::as_str)
                .map(str::trim)
                .filter(|value| !value.is_empty())
                .map(|value| json!(value))
                .collect::<Vec<_>>();
            if bullets.is_empty() {
                bail!("strategy box bullets were empty");
            }
            Ok(json!({
                "title": required_text(object.get("title"), "strategy box title")?,
                "bullets": bullets,
            }))
        })
        .collect::<anyhow::Result<Vec<_>>>()?;

    if normalized.is_empty() {
        bail!("strategy boxes array was empty");
    }

    Ok(normalized)
}

fn section_matches(section: &JsonValue, spec: &SectionSpec) -> bool {
    let id_matches = section.get("id").and_then(JsonValue::as_str) == Some(spec.id);
    let title_matches = section
        .get("title")
        .and_then(JsonValue::as_str)
        .map(|value| value.trim().eq_ignore_ascii_case(spec.title))
        .unwrap_or(false);
    id_matches || title_matches
}

fn required_text(value: Option<&JsonValue>, label: &str) -> anyhow::Result<String> {
    value
        .and_then(JsonValue::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(ToOwned::to_owned)
        .with_context(|| format!("{label} was missing"))
}

fn optional_text(value: Option<&JsonValue>) -> Option<String> {
    value
        .and_then(JsonValue::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(ToOwned::to_owned)
}

fn summary_text(artifact: &JsonValue) -> String {
    let Some(sections) = artifact.get("sections").and_then(JsonValue::as_array) else {
        return "Strategy generated.".to_string();
    };
    format!("{} sections generated for review.", sections.len())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_input() -> StrategyInput {
        StrategyInput {
            project_id: "project_123".to_string(),
            project_name: "Acme".to_string(),
            research_artifact_id: "research_123".to_string(),
            research_artifact_json: "{}".to_string(),
            focus_areas: vec!["Onboarding".to_string()],
            additional_notes: Some("Keep it practical".to_string()),
        }
    }

    #[test]
    fn normalize_strategy_artifact_orders_and_enriches_sections() {
        let artifact = json!({
            "title": "Custom strategy",
            "sections": [
                { "id": "pages", "status": "action", "kind": "cards", "cards": [{ "title": "Dashboard", "objective": "Return visits", "kpi": "DAU", "keyElement": "Useful overview" }] },
                { "id": "positioning", "kind": "boxes", "boxes": [{ "title": "FOLLOW", "bullets": ["Best practices"] }] },
                { "id": "direction", "kind": "plain", "body": ["Fast and practical."] },
                { "id": "principles", "kind": "principles", "principles": [{ "title": "Clarity", "body": "Reduce friction." }] },
                { "id": "audience", "kind": "table", "table": [["Primary user", "Product teams"]] },
                { "id": "content", "kind": "paragraph", "body": ["Voice: clear and direct."] },
                { "id": "accessibility", "kind": "table", "table": [["WCAG", "AA"]] }
            ]
        });

        let normalized = normalize_strategy_artifact(artifact, &sample_input(), 123).unwrap();

        assert_eq!(normalized["artifactKind"], "strategyArtifact");
        assert_eq!(normalized["projectId"], "project_123");
        assert_eq!(normalized["researchArtifactId"], "research_123");
        assert_eq!(normalized["sections"][0]["id"], "direction");
        assert_eq!(normalized["sections"][0]["status"], "action");
        assert_eq!(normalized["sections"][1]["status"], "action");
        assert_eq!(normalized["sections"][6]["id"], "accessibility");
    }

    #[test]
    fn normalize_table_coerces_multi_column_rows() {
        let section = json!({
            "kind": "table",
            "table": [
                ["Audience", "Strategic role", "Primary needs", "Design implication"],
                [
                    "Wholesale Operations Manager",
                    "Primary MVP operator",
                    "Approve companies, assign catalogs",
                    "Lead with an approval queue"
                ],
                ["WCAG level", "AA minimum", "Must remain readable"]
            ]
        });

        let rows = normalize_table(&section).unwrap();
        assert_eq!(rows.len(), 3);
        assert_eq!(rows[0], json!(["Audience", "Strategic role · Primary needs · Design implication"]));
        assert_eq!(
            rows[1],
            json!([
                "Wholesale Operations Manager",
                "Primary MVP operator · Approve companies, assign catalogs · Lead with an approval queue"
            ])
        );
        assert_eq!(rows[2], json!(["WCAG level", "AA minimum · Must remain readable"]));
    }

    #[test]
    fn normalize_strategy_artifact_fails_when_required_section_missing() {
        let artifact = json!({
            "sections": [
                { "id": "direction", "kind": "plain", "body": ["One line"] }
            ]
        });

        let error = normalize_strategy_artifact(artifact, &sample_input(), 123).unwrap_err();

        assert!(error.to_string().contains("missing"));
    }
}
