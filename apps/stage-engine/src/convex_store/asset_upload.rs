use anyhow::{Context, bail};
use convex::{ConvexClient, Value};
use reqwest::Client;

use super::value::{args, function_result_to_json};

#[derive(Clone, Debug)]
pub struct ConvexAssetUploader {
    deployment_url: String,
    http: Client,
}

impl ConvexAssetUploader {
    pub fn new(deployment_url: String) -> Self {
        Self {
            deployment_url,
            http: Client::new(),
        }
    }

    pub async fn upload_image(
        &self,
        token: &str,
        project_id: &str,
        purpose: &str,
        file_name: &str,
        mime_type: &str,
        bytes: &[u8],
    ) -> anyhow::Result<String> {
        let mut client = self.authenticated_client(token).await?;
        let mut mutation_args = args();
        mutation_args.insert("purpose".to_string(), Value::from(purpose.to_string()));
        mutation_args.insert("fileName".to_string(), Value::from(file_name.to_string()));
        mutation_args.insert(
            "fileSize".to_string(),
            Value::from(bytes.len() as f64),
        );
        mutation_args.insert("mimeType".to_string(), Value::from(mime_type.to_string()));
        mutation_args.insert("scopeId".to_string(), Value::from(project_id.to_string()));

        let result = client
            .mutation("r2:generateUploadUrl", mutation_args)
            .await
            .context("failed to prepare image upload")?;
        let payload = function_result_to_json(result)?;

        let key = payload
            .get("key")
            .and_then(|value| value.as_str())
            .context("upload response missing key")?
            .to_string();
        let upload_url = payload
            .get("uploadUrl")
            .and_then(|value| value.as_str())
            .context("upload response missing uploadUrl")?;

        let response = self
            .http
            .put(upload_url)
            .header("Content-Type", mime_type)
            .body(bytes.to_vec())
            .send()
            .await
            .context("failed to upload image bytes")?
            .error_for_status()
            .context("image upload rejected")?;

        if !response.status().is_success() {
            bail!("image upload failed with status {}", response.status());
        }

        let mut sync_args = args();
        sync_args.insert("key".to_string(), Value::from(key.clone()));
        client
            .mutation("r2:syncMetadata", sync_args)
            .await
            .context("failed to sync image metadata")?;

        Ok(key)
    }

    pub async fn upload_research_refero_image(
        &self,
        token: &str,
        project_id: &str,
        file_name: &str,
        mime_type: &str,
        bytes: &[u8],
    ) -> anyhow::Result<String> {
        self.upload_image(
            token,
            project_id,
            "research-refero",
            file_name,
            mime_type,
            bytes,
        )
        .await
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
