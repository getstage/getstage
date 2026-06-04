#![allow(dead_code)]
// Refero MCP client boundary. The first vertical slice wires this into the
// Research workflow after the contracts are verified across TypeScript/Rust.

use reqwest::header::{AUTHORIZATION, CONTENT_TYPE, HeaderMap, HeaderValue};
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use thiserror::Error;

use crate::config::ReferoConfig;

#[derive(Clone, Debug)]
pub struct ReferoClient {
    http: reqwest::Client,
    mcp_url: String,
    auth_configured: bool,
}

impl ReferoClient {
    pub fn new(config: &ReferoConfig) -> Result<Self, ReferoClientError> {
        Self::from_parts(config.mcp_url.clone(), config.token.clone())
    }

    pub fn from_parts(
        mcp_url: String,
        token: Option<String>,
    ) -> Result<Self, ReferoClientError> {
        let mut headers = HeaderMap::new();
        headers.insert(CONTENT_TYPE, HeaderValue::from_static("application/json"));

        if let Some(token) = &token {
            let value = HeaderValue::from_str(&format!("Bearer {token}"))
                .map_err(|_| ReferoClientError::InvalidTokenHeader)?;
            headers.insert(AUTHORIZATION, value);
        }

        let http = reqwest::Client::builder()
            .default_headers(headers)
            .build()?;

        Ok(Self {
            http,
            mcp_url,
            auth_configured: token.is_some(),
        })
    }

    pub fn mcp_url(&self) -> &str {
        &self.mcp_url
    }

    pub fn is_configured(&self) -> bool {
        self.auth_configured
    }

    pub async fn call_tool(
        &self,
        tool_name: &str,
        arguments: Value,
    ) -> Result<Value, ReferoClientError> {
        let request = JsonRpcRequest {
            jsonrpc: "2.0",
            id: 1,
            method: "tools/call",
            params: json!({
                "name": tool_name,
                "arguments": arguments,
            }),
        };

        let response = self
            .http
            .post(&self.mcp_url)
            .json(&request)
            .send()
            .await?
            .error_for_status()?
            .json::<JsonRpcResponse>()
            .await?;

        if let Some(error) = response.error {
            return Err(ReferoClientError::ToolCallFailed {
                message: error.message,
            });
        }

        Ok(response.result.unwrap_or(Value::Null))
    }
}

#[derive(Debug, Serialize)]
struct JsonRpcRequest {
    jsonrpc: &'static str,
    id: u64,
    method: &'static str,
    params: Value,
}

#[derive(Debug, Deserialize)]
struct JsonRpcResponse {
    result: Option<Value>,
    error: Option<JsonRpcError>,
}

#[derive(Debug, Deserialize)]
struct JsonRpcError {
    message: String,
}

#[derive(Debug, Error)]
pub enum ReferoClientError {
    #[error("failed to build Refero HTTP client: {0}")]
    HttpClient(#[from] reqwest::Error),

    #[error("Refero token could not be used as an authorization header")]
    InvalidTokenHeader,

    #[error("Refero tool call failed: {message}")]
    ToolCallFailed { message: String },
}
