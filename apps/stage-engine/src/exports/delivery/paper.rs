use std::collections::BTreeMap;

use reqwest::header::{ACCEPT, CONTENT_TYPE, HeaderMap, HeaderValue};
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};

use crate::config::PaperConfig;
use crate::refero::parse::unwrap_mcp_tool_result;

#[derive(Clone, Debug)]
pub struct PaperClient {
    http: reqwest::Client,
    mcp_url: String,
}

#[derive(Clone, Debug)]
pub struct PaperConnectionStatus {
    pub ready: bool,
    pub message: String,
    pub file_name: Option<String>,
    pub page_name: Option<String>,
}

impl PaperClient {
    pub fn new(config: &PaperConfig) -> anyhow::Result<Self> {
        let mut headers = HeaderMap::new();
        headers.insert(CONTENT_TYPE, HeaderValue::from_static("application/json"));
        headers.insert(
            ACCEPT,
            HeaderValue::from_static("application/json, text/event-stream"),
        );
        Ok(Self {
            http: reqwest::Client::builder()
                .default_headers(headers)
                .timeout(std::time::Duration::from_secs(30))
                .build()?,
            mcp_url: config.mcp_url.clone(),
        })
    }

    pub async fn write_wireframe(
        &self,
        name: &str,
        width: u16,
        height: u16,
        html: &str,
    ) -> anyhow::Result<Option<String>> {
        let session = self.start_session().await.map_err(|error| {
            tracing::debug!(%error, "paper desktop session start failed");
            anyhow::anyhow!("Open Paper Desktop with the target Paper file open, then try again.")
        })?;
        let tools = session.list_tools().await?;
        let create_artboard = require_tool(&tools, "create_artboard")?;
        let write_html = require_tool(&tools, "write_html")?;

        let mut artboard_args = BTreeMap::new();
        insert_if_supported(&mut artboard_args, create_artboard, "name", json!(name));
        if supports(create_artboard, "styles") {
            artboard_args.insert(
                "styles".to_string(),
                json!({ "width": format!("{width}px"), "height": format!("{height}px") }),
            );
        } else {
            insert_if_supported(&mut artboard_args, create_artboard, "width", json!(width));
            insert_if_supported(&mut artboard_args, create_artboard, "height", json!(height));
        }
        let created = session
            .call_tool("create_artboard", json!(artboard_args))
            .await?;
        let artboard_id =
            find_string_field(&created, &["nodeId", "artboardId", "id"]).ok_or_else(|| {
                anyhow::anyhow!("Paper created an artboard but did not return a node id.")
            })?;

        let mut html_args = BTreeMap::new();
        insert_if_supported(&mut html_args, write_html, "html", json!(html));
        insert_if_supported(&mut html_args, write_html, "mode", json!("insert-children"));
        for key in ["targetNodeId", "nodeId", "parentId", "artboardId"] {
            if supports(write_html, key) {
                html_args.insert(key.to_string(), json!(&artboard_id));
                break;
            }
        }
        session.call_tool("write_html", json!(html_args)).await?;
        Ok(Some(artboard_id))
    }

    pub async fn connection_status(&self) -> PaperConnectionStatus {
        match self.check_connection().await {
            Ok(status) => status,
            Err(error) => {
                tracing::debug!(%error, "paper desktop connection check failed");
                PaperConnectionStatus {
                    ready: false,
                    message: "Open Paper Desktop with a target Paper file, then refresh.".to_string(),
                    file_name: None,
                    page_name: None,
                }
            }
        }
    }

    async fn check_connection(&self) -> anyhow::Result<PaperConnectionStatus> {
        let session = self.start_session().await?;
        let tools = session.list_tools().await?;
        require_tool(&tools, "create_artboard")?;
        require_tool(&tools, "write_html")?;

        let info = if tools.iter().any(|tool| tool.name == "get_basic_info") {
            session.call_tool("get_basic_info", json!({})).await.ok()
        } else {
            None
        };

        let file_name = info
            .as_ref()
            .and_then(|value| find_string_field(value, &["fileName", "name"]));
        let page_name = info
            .as_ref()
            .and_then(|value| find_string_field(value, &["pageName", "currentPageName"]));
        let target = file_name
            .as_deref()
            .map(|name| format!("Connected to {name}."))
            .unwrap_or_else(|| "Connected to the open Paper file.".to_string());

        Ok(PaperConnectionStatus {
            ready: true,
            message: target,
            file_name,
            page_name,
        })
    }

    async fn start_session(&self) -> anyhow::Result<PaperSession> {
        let response = self
            .http
            .post(&self.mcp_url)
            .json(&JsonRpcRequest {
                jsonrpc: "2.0",
                id: 1,
                method: "initialize",
                params: json!({
                    "protocolVersion": "2025-03-26",
                    "capabilities": {},
                    "clientInfo": { "name": "stage-engine", "version": env!("CARGO_PKG_VERSION") },
                }),
            })
            .send()
            .await?
            .error_for_status()?;
        let session_id = response
            .headers()
            .get("mcp-session-id")
            .and_then(|value| value.to_str().ok())
            .map(ToOwned::to_owned);
        decode_response(response).await?;

        let session = PaperSession {
            http: self.http.clone(),
            mcp_url: self.mcp_url.clone(),
            session_id,
        };
        session.initialized().await?;
        Ok(session)
    }
}

#[derive(Clone, Debug)]
struct PaperSession {
    http: reqwest::Client,
    mcp_url: String,
    session_id: Option<String>,
}

impl PaperSession {
    async fn initialized(&self) -> anyhow::Result<()> {
        let mut request = self.http.post(&self.mcp_url).json(&json!({
            "jsonrpc": "2.0",
            "method": "notifications/initialized",
            "params": {},
        }));
        if let Some(session_id) = &self.session_id {
            request = request.header("mcp-session-id", session_id);
        }
        request.send().await?.error_for_status()?;
        Ok(())
    }

    async fn list_tools(&self) -> anyhow::Result<Vec<McpTool>> {
        let result = self.call("tools/list", json!({})).await?;
        serde_json::from_value(result.get("tools").cloned().unwrap_or(Value::Null))
            .map_err(Into::into)
    }

    async fn call_tool(&self, name: &str, arguments: Value) -> anyhow::Result<Value> {
        let result = self
            .call(
                "tools/call",
                json!({ "name": name, "arguments": arguments }),
            )
            .await?;
        if result
            .get("isError")
            .and_then(Value::as_bool)
            .unwrap_or(false)
        {
            anyhow::bail!("Paper `{name}` failed: {}", tool_result_text(&result));
        }
        Ok(unwrap_mcp_tool_result(&result))
    }

    async fn call(&self, method: &'static str, params: Value) -> anyhow::Result<Value> {
        let mut request = self.http.post(&self.mcp_url).json(&JsonRpcRequest {
            jsonrpc: "2.0",
            id: 1,
            method,
            params,
        });
        if let Some(session_id) = &self.session_id {
            request = request.header("mcp-session-id", session_id);
        }
        let response = decode_response(request.send().await?.error_for_status()?).await?;
        if let Some(error) = response.error {
            anyhow::bail!("Paper MCP request failed: {}", error.message);
        }
        Ok(response.result.unwrap_or(Value::Null))
    }
}

async fn decode_response(response: reqwest::Response) -> anyhow::Result<JsonRpcResponse> {
    let content_type = response
        .headers()
        .get(CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())
        .unwrap_or_default()
        .to_string();
    let body = response.text().await?;
    let json_body = if content_type.starts_with("text/event-stream") {
        body.lines()
            .find_map(|line| line.strip_prefix("data:"))
            .map(str::trim)
            .ok_or_else(|| anyhow::anyhow!("Paper MCP returned an empty event stream"))?
    } else {
        body.trim()
    };
    serde_json::from_str(json_body).map_err(Into::into)
}

fn require_tool<'a>(tools: &'a [McpTool], name: &str) -> anyhow::Result<&'a McpTool> {
    tools
        .iter()
        .find(|tool| tool.name == name)
        .ok_or_else(|| anyhow::anyhow!("Paper MCP does not expose the required `{name}` tool"))
}

fn supports(tool: &McpTool, property: &str) -> bool {
    tool.input_schema
        .get("properties")
        .and_then(Value::as_object)
        .is_some_and(|properties| properties.contains_key(property))
}

fn insert_if_supported(
    arguments: &mut BTreeMap<String, Value>,
    tool: &McpTool,
    property: &str,
    value: Value,
) {
    if supports(tool, property) {
        arguments.insert(property.to_string(), value);
    }
}

fn find_string_field(value: &Value, names: &[&str]) -> Option<String> {
    match value {
        Value::Object(object) => {
            for name in names {
                if let Some(value) = object.get(*name).and_then(Value::as_str) {
                    return Some(value.to_string());
                }
            }
            object
                .values()
                .find_map(|value| find_string_field(value, names))
        }
        Value::Array(values) => values
            .iter()
            .find_map(|value| find_string_field(value, names)),
        _ => None,
    }
}

fn tool_result_text(value: &Value) -> String {
    value
        .get("content")
        .and_then(Value::as_array)
        .and_then(|content| {
            content.iter().find_map(|item| {
                item.get("text")
                    .and_then(Value::as_str)
                    .map(str::trim)
                    .filter(|text| !text.is_empty())
                    .map(ToOwned::to_owned)
            })
        })
        .unwrap_or_else(|| "Paper returned a tool error without details.".to_string())
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct McpTool {
    name: String,
    input_schema: Value,
}

#[derive(Debug, Serialize)]
struct JsonRpcRequest {
    jsonrpc: &'static str,
    id: u8,
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
