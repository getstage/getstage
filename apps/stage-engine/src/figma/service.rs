use anyhow::{Context, bail};
use reqwest::header::HeaderValue;
use serde::Deserialize;

use crate::config::FigmaConfig;

const MAX_FIGMA_IMPORTS: usize = 12;

#[derive(Clone, Debug)]
pub struct FigmaService {
    http: reqwest::Client,
}

#[derive(Clone, Debug)]
pub struct FigmaImportedImage {
    pub id: String,
    pub title: String,
    pub source_url: String,
    pub render_url: String,
    pub bytes: Vec<u8>,
}

#[derive(Clone, Debug)]
struct ParsedFigmaLink {
    file_key: String,
    node_id: Option<String>,
    original_url: String,
}

impl FigmaService {
    pub fn new(_config: &FigmaConfig) -> anyhow::Result<Self> {
        Ok(Self {
            http: reqwest::Client::builder()
                .build()
                .context("failed to build Figma HTTP client")?,
        })
    }

    pub async fn import_images_from_link(
        &self,
        access_token: &str,
        figma_url: &str,
    ) -> anyhow::Result<Vec<FigmaImportedImage>> {
        if access_token.trim().is_empty() {
            bail!("Connect Figma in Settings before importing Figma screenshots.");
        }

        let link = parse_figma_link(figma_url)?;
        let node_ids = if let Some(node_id) = &link.node_id {
            vec![node_id.clone()]
        } else {
            self.fetch_top_level_node_ids(access_token, &link.file_key)
                .await?
        };

        if node_ids.is_empty() {
            bail!("No importable Figma frames were found in that file.");
        }

        let image_response = self
            .fetch_image_urls(access_token, &link.file_key, &node_ids)
            .await?;
        let mut imported = Vec::new();

        for node_id in node_ids {
            if imported.len() >= MAX_FIGMA_IMPORTS {
                break;
            }

            let Some(render_url) = image_response.images.get(&node_id).cloned().flatten() else {
                continue;
            };

            let bytes = self.download_image(&render_url).await?;
            imported.push(FigmaImportedImage {
                id: node_id.clone(),
                title: image_response
                    .node_names
                    .get(&node_id)
                    .cloned()
                    .unwrap_or_else(|| format!("Figma frame {node_id}")),
                source_url: source_url_for_node(&link, &node_id),
                render_url,
                bytes,
            });
        }

        Ok(imported)
    }

    async fn fetch_top_level_node_ids(
        &self,
        access_token: &str,
        file_key: &str,
    ) -> anyhow::Result<Vec<String>> {
        let file_url = format!("https://api.figma.com/v1/files/{file_key}?depth=2");
        let file = self
            .http
            .get(file_url)
            .header("X-Figma-Token", figma_header(access_token)?)
            .send()
            .await
            .context("failed to fetch Figma file")?
            .error_for_status()
            .context("Figma file request failed")?
            .json::<FigmaFileResponse>()
            .await
            .context("failed to parse Figma file response")?;

        let mut node_ids = Vec::new();
        collect_frame_ids(&file.document, &mut node_ids);
        node_ids.truncate(MAX_FIGMA_IMPORTS);
        Ok(node_ids)
    }

    async fn fetch_image_urls(
        &self,
        access_token: &str,
        file_key: &str,
        node_ids: &[String],
    ) -> anyhow::Result<FigmaImageResponse> {
        let ids = node_ids.join(",");
        let image_url =
            format!("https://api.figma.com/v1/images/{file_key}?ids={ids}&format=png&scale=2");
        self.http
            .get(image_url)
            .header("X-Figma-Token", figma_header(access_token)?)
            .send()
            .await
            .context("failed to fetch Figma image URLs")?
            .error_for_status()
            .context("Figma image render request failed")?
            .json::<FigmaImageResponse>()
            .await
            .context("failed to parse Figma image response")
    }

    async fn download_image(&self, url: &str) -> anyhow::Result<Vec<u8>> {
        Ok(self
            .http
            .get(url)
            .send()
            .await
            .context("failed to download Figma image")?
            .error_for_status()
            .context("Figma image download failed")?
            .bytes()
            .await
            .context("failed to read Figma image bytes")?
            .to_vec())
    }
}

fn figma_header(access_token: &str) -> anyhow::Result<HeaderValue> {
    HeaderValue::from_str(access_token.trim()).context("invalid Figma token header")
}

#[derive(Debug, Deserialize)]
struct FigmaFileResponse {
    document: FigmaNode,
}

#[derive(Debug, Deserialize)]
struct FigmaNode {
    id: String,
    #[serde(rename = "type")]
    node_type: String,
    #[serde(default)]
    children: Vec<FigmaNode>,
}

#[derive(Debug, Deserialize)]
struct FigmaImageResponse {
    #[serde(default)]
    images: std::collections::HashMap<String, Option<String>>,
    #[serde(default)]
    node_names: std::collections::HashMap<String, String>,
}

fn collect_frame_ids(root: &FigmaNode, out: &mut Vec<String>) {
    let mut stack: Vec<&FigmaNode> = vec![root];

    while let Some(node) = stack.pop() {
        if out.len() >= MAX_FIGMA_IMPORTS {
            return;
        }

        if matches!(
            node.node_type.as_str(),
            "FRAME" | "COMPONENT" | "COMPONENT_SET" | "INSTANCE" | "SECTION"
        ) {
            out.push(node.id.clone());
        }

        for child in node.children.iter().rev() {
            stack.push(child);
        }
    }
}

fn parse_figma_link(raw_url: &str) -> anyhow::Result<ParsedFigmaLink> {
    let original_url = normalize_url(raw_url);
    let lower = original_url.to_lowercase();
    if !lower.contains("figma.com/") {
        bail!("Paste a valid Figma link.");
    }

    let file_key = ["/design/", "/file/"]
        .iter()
        .find_map(|marker| extract_path_segment(&original_url, marker))
        .context("Figma link must include a file key.")?;
    let node_id =
        extract_query_value(&original_url, "node-id").map(|value| value.replace('-', ":"));

    Ok(ParsedFigmaLink {
        file_key,
        node_id,
        original_url,
    })
}

fn normalize_url(value: &str) -> String {
    let trimmed = value.trim();
    if trimmed.starts_with("http://") || trimmed.starts_with("https://") {
        trimmed.to_string()
    } else {
        format!("https://{trimmed}")
    }
}

fn extract_path_segment(url: &str, marker: &str) -> Option<String> {
    let start = url.find(marker)? + marker.len();
    let rest = &url[start..];
    let end = rest.find(['/', '?', '#']).unwrap_or(rest.len());
    let value = &rest[..end];
    (!value.trim().is_empty()).then(|| value.to_string())
}

fn extract_query_value(url: &str, key: &str) -> Option<String> {
    let query = url.split_once('?')?.1.split('#').next().unwrap_or("");
    for pair in query.split('&') {
        let (name, value) = pair.split_once('=')?;
        if name == key && !value.trim().is_empty() {
            return Some(value.to_string());
        }
    }
    None
}

fn source_url_for_node(link: &ParsedFigmaLink, node_id: &str) -> String {
    if link.node_id.is_some() {
        return link.original_url.clone();
    }

    let separator = if link.original_url.contains('?') {
        "&"
    } else {
        "?"
    };
    format!(
        "{}{separator}node-id={}",
        link.original_url,
        node_id.replace(':', "-")
    )
}
