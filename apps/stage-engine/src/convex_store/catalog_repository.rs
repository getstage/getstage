use std::collections::BTreeMap;

use convex::{ConvexClient, FunctionResult, Value};
use serde::{Deserialize, Serialize};
use thiserror::Error;

use crate::config::ConvexConfig;

const MAX_QUERY_CHARACTERS: usize = 2_000;
const MAX_LIBRARIES: usize = 8;
pub const MAX_CANDIDATES_PER_SEARCH: u8 = 12;

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CatalogCandidate {
    pub component_id: String,
    pub library: String,
    pub name: String,
    pub kind: String,
    pub runtime: String,
    pub source_revision: String,
    pub score: f64,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CatalogSearchResult {
    pub candidates: Vec<CatalogCandidate>,
    pub embedding_tokens: f64,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CatalogSourceFile {
    pub path: String,
    pub content: String,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CatalogSourceBundle {
    pub component_id: String,
    pub library: String,
    pub name: String,
    pub kind: String,
    pub runtime: String,
    pub source_revision: String,
    pub files: Vec<CatalogSourceFile>,
    pub css: Option<String>,
    pub dependencies: Vec<String>,
    pub registry_dependencies: Vec<String>,
}

#[derive(Debug, Error)]
pub enum CatalogRepositoryError {
    #[error("invalid catalog request: {0}")]
    InvalidRequest(String),
    #[error("catalog connection failed: {0}")]
    Connection(String),
    #[error("catalog request failed: {0}")]
    Request(String),
    #[error("catalog response was invalid: {0}")]
    InvalidResponse(String),
}

#[derive(Clone, Debug)]
pub struct CatalogRepository {
    deployment_url: String,
}

impl CatalogRepository {
    pub fn new(config: &ConvexConfig) -> Self {
        Self {
            deployment_url: config.deployment_url.clone(),
        }
    }

    #[tracing::instrument(
        name = "wireframes.catalog.search",
        skip(self, token, query),
        fields(correlation_id, library_count = libraries.len(), limit)
    )]
    pub async fn search_components(
        &self,
        token: &str,
        correlation_id: &str,
        query: &str,
        libraries: &[String],
        limit: u8,
    ) -> Result<CatalogSearchResult, CatalogRepositoryError> {
        validate_search(query, libraries, limit)?;
        let mut client = self.authenticated_client(token).await?;
        let mut action_args = BTreeMap::new();
        action_args.insert("query".to_string(), Value::from(query.trim().to_string()));
        action_args.insert(
            "libraries".to_string(),
            Value::from(
                libraries
                    .iter()
                    .map(|library| Value::from(library.trim().to_string()))
                    .collect::<Vec<_>>(),
            ),
        );
        action_args.insert("runtime".to_string(), Value::from("client".to_string()));
        action_args.insert("limit".to_string(), Value::from(limit as f64));
        action_args.insert(
            "correlationId".to_string(),
            Value::from(correlation_id.to_string()),
        );

        let result = client
            .action("wireframeCatalog:searchCatalog", action_args)
            .await
            .map_err(|error| CatalogRepositoryError::Request(error.to_string()))?;
        decode_result(result)
    }

    #[tracing::instrument(
        name = "wireframes.catalog.load",
        skip(self, token),
        fields(component_id, source_revision)
    )]
    pub async fn load_component(
        &self,
        token: &str,
        component_id: &str,
        source_revision: &str,
    ) -> Result<CatalogSourceBundle, CatalogRepositoryError> {
        if component_id.trim().is_empty() || source_revision.trim().is_empty() {
            return Err(CatalogRepositoryError::InvalidRequest(
                "component id and source revision are required".to_string(),
            ));
        }
        let mut client = self.authenticated_client(token).await?;
        let mut action_args = BTreeMap::new();
        action_args.insert(
            "componentId".to_string(),
            Value::from(component_id.to_string()),
        );
        action_args.insert(
            "sourceRevision".to_string(),
            Value::from(source_revision.to_string()),
        );
        let result = client
            .action("wireframeCatalog:loadCatalogSource", action_args)
            .await
            .map_err(|error| CatalogRepositoryError::Request(error.to_string()))?;
        decode_result(result)
    }

    async fn authenticated_client(
        &self,
        token: &str,
    ) -> Result<ConvexClient, CatalogRepositoryError> {
        if token.trim().is_empty() {
            return Err(CatalogRepositoryError::InvalidRequest(
                "missing desktop auth token for Convex".to_string(),
            ));
        }
        let mut client = ConvexClient::new(&self.deployment_url)
            .await
            .map_err(|error| CatalogRepositoryError::Connection(error.to_string()))?;
        client.set_auth(Some(token.to_string())).await;
        Ok(client)
    }
}

fn validate_search(
    query: &str,
    libraries: &[String],
    limit: u8,
) -> Result<(), CatalogRepositoryError> {
    if query.trim().is_empty() || query.len() > MAX_QUERY_CHARACTERS {
        return Err(CatalogRepositoryError::InvalidRequest(
            "query must contain 1-2000 characters".to_string(),
        ));
    }
    if libraries.is_empty()
        || libraries.len() > MAX_LIBRARIES
        || libraries.iter().any(|library| library.trim().is_empty())
    {
        return Err(CatalogRepositoryError::InvalidRequest(
            "select between 1 and 8 component libraries".to_string(),
        ));
    }
    if limit == 0 || limit > MAX_CANDIDATES_PER_SEARCH {
        return Err(CatalogRepositoryError::InvalidRequest(format!(
            "candidate limit must be 1-{MAX_CANDIDATES_PER_SEARCH}"
        )));
    }
    Ok(())
}

fn decode_result<T: for<'de> Deserialize<'de>>(
    result: FunctionResult,
) -> Result<T, CatalogRepositoryError> {
    let value = match result {
        FunctionResult::Value(value) => serde_json::Value::from(value),
        FunctionResult::ErrorMessage(message) => {
            return Err(CatalogRepositoryError::Request(message));
        }
        FunctionResult::ConvexError(error) => {
            return Err(CatalogRepositoryError::Request(error.message));
        }
    };
    serde_json::from_value(value)
        .map_err(|error| CatalogRepositoryError::InvalidResponse(error.to_string()))
}

#[cfg(test)]
mod tests {
    use convex::{FunctionResult, Value};

    use super::{CatalogRepositoryError, CatalogSearchResult, decode_result, validate_search};

    #[test]
    fn search_validation_enforces_budgets() {
        let libraries = vec!["magic-ui".to_string()];
        assert!(validate_search("pricing dashboard", &libraries, 8).is_ok());
        assert!(matches!(
            validate_search("", &libraries, 8),
            Err(CatalogRepositoryError::InvalidRequest(_))
        ));
        assert!(validate_search("query", &libraries, 13).is_err());
    }

    #[test]
    fn search_response_decodes_typed_candidates() {
        let response = serde_json::json!({
            "candidates": [{
                "componentId": "magic-ui/number-ticker",
                "library": "magic-ui",
                "name": "number-ticker",
                "kind": "registry:ui",
                "runtime": "client",
                "sourceRevision": "v1",
                "score": 0.88
            }],
            "embeddingTokens": 12
        });
        let decoded: CatalogSearchResult =
            decode_result(FunctionResult::Value(Value::try_from(response).unwrap())).unwrap();
        assert_eq!(decoded.candidates[0].component_id, "magic-ui/number-ticker");
        assert_eq!(decoded.embedding_tokens, 12.0);
    }
}
