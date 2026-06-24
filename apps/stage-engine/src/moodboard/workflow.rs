use std::{net::IpAddr, sync::Arc};

use reqwest::{Url, header::CONTENT_TYPE};
use serde_json::{Value, json};

use crate::convex_store::app_secrets::AppSecretsRepository;
use crate::convex_store::asset_upload::ConvexAssetUploader;
use crate::convex_store::moodboard_repository::{MoodboardRepository, empty_moodboard_artifact};
use crate::figma::service::{FigmaImportedImage, FigmaService};
use crate::helpers::time::now_millis;
use crate::models::errors::{EngineError, EngineErrorCode};
use crate::models::refero::{
    ReferoPlatform, ReferoReference, ReferoReferenceKind, ReferoSearchRequest,
};
use crate::models::runs::{RunEvent, RunStatus, StartRunRequest};
use crate::refero::parse::{infer_image_mime, is_synthetic_reference_id, looks_like_image_bytes};
use crate::refero::service::{ReferoService, infer_refero_file_name};
use crate::runs::RunEventSink;

const MOODBOARD_IMPORT_LIMIT: u8 = 3;
const MAX_URL_IMAGE_BYTES: u64 = 10 * 1024 * 1024;

#[derive(Clone, Debug)]
pub struct MoodboardWorkflow {
    repository: MoodboardRepository,
    secrets: AppSecretsRepository,
    refero: ReferoService,
    figma: FigmaService,
}

impl MoodboardWorkflow {
    pub fn new(
        repository: MoodboardRepository,
        secrets: AppSecretsRepository,
        refero: ReferoService,
        figma: FigmaService,
    ) -> Self {
        Self {
            repository,
            secrets,
            refero,
            figma,
        }
    }

    pub async fn run(
        self: Arc<Self>,
        api_version: &'static str,
        run_id: String,
        request: StartRunRequest,
        auth_token: Option<String>,
        sink: RunEventSink,
        _cancel_rx: tokio::sync::watch::Receiver<bool>,
    ) {
        let provider_id = request.provider_id;
        let project_id = request.context.project_id.clone();
        let auth_token_for_failure = auth_token.clone();
        let mut convex_run_id: Option<String> = None;

        tracing::info!(
            run_id = %run_id,
            project_id = ?project_id,
            source = ?request.context.source,
            "moodboard import workflow started"
        );

        let result = async {
            let auth_token = auth_token.ok_or_else(|| {
                WorkflowError::InvalidRequest("Missing desktop session for Moodboard.".to_string())
            })?;
            let project_id = project_id.as_deref().ok_or_else(|| {
                WorkflowError::InvalidRequest("Missing project id for Moodboard.".to_string())
            })?;

            let source = request.context.source.as_deref().unwrap_or("refero");
            let prompt = request.prompt.trim();
            if prompt.is_empty() {
                return Err(WorkflowError::InvalidRequest(
                    "Moodboard import needs a query or Figma link.".to_string(),
                ));
            }

            // Persist the run as "running" so the tab can restore the generating
            // screen after it unmounts. The terminal status is written below.
            convex_run_id = self
                .repository
                .create_moodboard_run(&auth_token, project_id, &run_id, "Generate moodboard")
                .await?;

            self.tool_started(
                api_version,
                &run_id,
                provider_id,
                &sink,
                "stage-moodboard",
                "Load saved moodboard",
            );
            let mut artifact = self
                .repository
                .fetch_latest_moodboard_artifact(&auth_token, project_id)
                .await?
                .unwrap_or_else(|| {
                    empty_moodboard_artifact(project_id, "Project moodboard", now_millis())
                });
            self.tool_completed(api_version, &run_id, provider_id, &sink, "stage-moodboard");

            self.tool_started(
                api_version,
                &run_id,
                provider_id,
                &sink,
                "moodboard-import",
                match source {
                    "figma" => "Import Figma images",
                    "url" | "image-url" => "Import image URL",
                    _ => "Search Refero screens",
                },
            );

            let references = match source {
                "figma" => self.import_figma(project_id, &auth_token, prompt).await?,
                "url" | "image-url" => {
                    self.import_image_url(project_id, &auth_token, prompt)
                        .await?
                }
                "refero" | "ai" => self.import_refero(project_id, &auth_token, prompt).await?,
                other => {
                    return Err(WorkflowError::InvalidRequest(format!(
                        "Unsupported moodboard import source: {other}"
                    )));
                }
            };
            self.tool_completed(api_version, &run_id, provider_id, &sink, "moodboard-import");

            append_references(
                &mut artifact,
                references,
                match source {
                    "figma" => "figma",
                    "url" | "image-url" => "url",
                    _ => "ai",
                },
                now_millis(),
            )?;

            self.repository
                .save_moodboard_artifact(&auth_token, project_id, &artifact)
                .await?;

            self.repository
                .complete_moodboard_run(&auth_token, project_id, convex_run_id.as_deref())
                .await?;

            sink.send(RunEvent::RunCompleted {
                api_version,
                run_id: run_id.clone(),
                provider_id,
                created_at: now_millis(),
                final_text: Some("Moodboard references imported.".to_string()),
            });

            Ok::<(), WorkflowError>(())
        }
        .await;

        if let Err(error) = result {
            tracing::error!(run_id = %run_id, error = %error, "moodboard import workflow failed");
            if let (Some(token), Some(project_id)) =
                (auth_token_for_failure.as_deref(), project_id.as_deref())
            {
                if let Err(mark_failed_error) = self
                    .repository
                    .fail_moodboard_run(
                        token,
                        project_id,
                        convex_run_id.as_deref(),
                        &error.to_string(),
                    )
                    .await
                {
                    tracing::warn!(%mark_failed_error, "failed to mark Convex moodboard run failed");
                }
            }

            sink.send(RunEvent::RunFailed {
                api_version,
                run_id,
                provider_id,
                created_at: now_millis(),
                error: error.to_engine_error(provider_id),
            });
        }
    }

    async fn import_refero(
        &self,
        project_id: &str,
        auth_token: &str,
        query: &str,
    ) -> Result<Vec<Value>, WorkflowError> {
        let search = ReferoSearchRequest {
            query: query.to_string(),
            platform: ReferoPlatform::Web,
            limit: MOODBOARD_IMPORT_LIMIT,
            tags: Vec::new(),
        };
        let refero = self.resolve_refero(auth_token).await?;
        let mut screens = refero.search_screens(&search).await?;
        let uploader = ConvexAssetUploader::new(self.repository.deployment_url().to_string());
        let mut references = Vec::new();

        for (index, screen) in screens.iter_mut().enumerate() {
            if screen.kind != ReferoReferenceKind::Screen {
                continue;
            }

            let image_key =
                upload_refero_screen_image(&refero, &uploader, auth_token, project_id, screen)
                    .await;
            let image_url = image_key
                .clone()
                .or_else(|| screen.image_url.clone())
                .or_else(|| screen.thumbnail_url.clone())
                .filter(|url| !url.trim().is_empty());
            let Some(image_url) = image_url else {
                continue;
            };

            references.push(refero_moodboard_reference(
                screen, image_url, image_key, index,
            ));
        }

        if references.is_empty() {
            return Err(WorkflowError::InvalidRequest(
                "Refero found screens but no images could be loaded. Try another query or import screenshots manually.".to_string(),
            ));
        }

        tracing::info!(
            reference_count = references.len(),
            query = %query,
            "Moodboard Refero import staged references"
        );

        Ok(references)
    }

    async fn resolve_refero(&self, auth_token: &str) -> Result<ReferoService, WorkflowError> {
        if self.refero.is_configured() {
            return Ok(self.refero.clone());
        }

        let token = self
            .secrets
            .fetch_refero_mcp_token(auth_token)
            .await?
            .ok_or_else(|| {
                WorkflowError::InvalidRequest(
                    "Refero is not configured for this Stage deployment.".to_string(),
                )
            })?;

        self.refero
            .with_token(token)
            .map_err(|error| WorkflowError::InvalidRequest(error.to_string()))
    }

    async fn import_figma(
        &self,
        project_id: &str,
        auth_token: &str,
        figma_url: &str,
    ) -> Result<Vec<Value>, WorkflowError> {
        let figma_token = self
            .repository
            .fetch_connected_figma_access_token(auth_token, project_id)
            .await?
            .ok_or_else(|| {
                WorkflowError::InvalidRequest(
                    "Connect Figma in Settings before importing Figma screenshots.".to_string(),
                )
            })?;
        let images = self
            .figma
            .import_images_from_link(&figma_token, figma_url)
            .await
            .map_err(|error| WorkflowError::InvalidRequest(error.to_string()))?;
        let uploader = ConvexAssetUploader::new(self.repository.deployment_url().to_string());
        let mut references = Vec::new();

        for (index, image) in images.into_iter().enumerate() {
            let image_key = upload_figma_image(&uploader, auth_token, project_id, &image).await;

            references.push(figma_moodboard_reference(&image, image_key, index));
        }

        if references.is_empty() {
            return Err(WorkflowError::InvalidRequest(
                "Figma returned no renderable images for that link.".to_string(),
            ));
        }

        Ok(references)
    }

    async fn import_image_url(
        &self,
        project_id: &str,
        auth_token: &str,
        image_url: &str,
    ) -> Result<Vec<Value>, WorkflowError> {
        let image = fetch_importable_image_url(image_url).await?;
        let uploader = ConvexAssetUploader::new(self.repository.deployment_url().to_string());
        let image_key = upload_url_image(&uploader, auth_token, project_id, &image).await?;

        Ok(vec![url_moodboard_reference(&image, image_key)])
    }

    fn tool_started(
        &self,
        api_version: &'static str,
        run_id: &str,
        provider_id: crate::models::providers::ProviderId,
        sink: &RunEventSink,
        tool_call_id: &str,
        label: &str,
    ) {
        sink.send(RunEvent::ToolCallStarted {
            api_version,
            run_id: run_id.to_string(),
            provider_id,
            created_at: now_millis(),
            tool_call_id: tool_call_id.to_string(),
            label: label.to_string(),
        });
    }

    fn tool_completed(
        &self,
        api_version: &'static str,
        run_id: &str,
        provider_id: crate::models::providers::ProviderId,
        sink: &RunEventSink,
        tool_call_id: &str,
    ) {
        sink.send(RunEvent::ToolCallCompleted {
            api_version,
            run_id: run_id.to_string(),
            provider_id,
            created_at: now_millis(),
            tool_call_id: tool_call_id.to_string(),
            status: RunStatus::Completed,
        });
    }
}

async fn upload_refero_screen_image(
    refero: &ReferoService,
    uploader: &ConvexAssetUploader,
    auth_token: &str,
    project_id: &str,
    screen: &mut ReferoReference,
) -> Option<String> {
    let Some(bytes) = fetch_refero_screen_bytes(refero, screen).await else {
        return None;
    };

    let mime_type = infer_image_mime(&bytes);
    let file_name = infer_refero_file_name(&screen.id, mime_type);
    match uploader
        .upload_image(
            auth_token,
            project_id,
            "moodboard-refero",
            &file_name,
            mime_type,
            &bytes,
        )
        .await
    {
        Ok(key) => Some(key),
        Err(error) => {
            tracing::warn!(screen_id = %screen.id, %error, "Moodboard Refero image upload failed");
            None
        }
    }
}

async fn fetch_refero_screen_bytes(
    refero: &ReferoService,
    screen: &ReferoReference,
) -> Option<Vec<u8>> {
    // Prefer the full-resolution MCP screenshot (image_size=full), matching Research.
    // The search CDN URLs are only low-res `_thumb.jpg` previews, so use them as a fallback.
    if !is_synthetic_reference_id(&screen.id) {
        match refero.fetch_screen_image_bytes(&screen.id).await {
            Ok(bytes) if looks_like_image_bytes(&bytes) => return Some(bytes),
            Ok(_) => {
                tracing::warn!(
                    screen_id = %screen.id,
                    "Refero MCP returned non-image bytes for moodboard import"
                );
            }
            Err(error) => {
                tracing::warn!(
                    screen_id = %screen.id,
                    %error,
                    "Moodboard Refero MCP full-image fetch failed; falling back to CDN URLs"
                );
            }
        }
    }

    for url in [screen.image_url.as_deref(), screen.thumbnail_url.as_deref()] {
        let Some(url) = url.filter(|value| value.starts_with("https://")) else {
            continue;
        };

        match fetch_importable_image_url(url).await {
            Ok(image) => {
                tracing::info!(
                    screen_id = %screen.id,
                    source_url = %url,
                    "Moodboard Refero image loaded from search CDN URL fallback"
                );
                return Some(image.bytes);
            }
            Err(error) => {
                tracing::warn!(
                    screen_id = %screen.id,
                    source_url = %url,
                    %error,
                    "Moodboard Refero CDN image fetch failed"
                );
            }
        }
    }

    None
}

async fn upload_figma_image(
    uploader: &ConvexAssetUploader,
    auth_token: &str,
    project_id: &str,
    image: &FigmaImportedImage,
) -> Option<String> {
    if !looks_like_image_bytes(&image.bytes) {
        return None;
    }

    let mime_type = infer_image_mime(&image.bytes);
    let file_name = format!(
        "{}.{}",
        sanitize_id(&image.id),
        extension_for_mime(mime_type)
    );
    match uploader
        .upload_image(
            auth_token,
            project_id,
            "moodboard-figma",
            &file_name,
            mime_type,
            &image.bytes,
        )
        .await
    {
        Ok(key) => Some(key),
        Err(error) => {
            tracing::warn!(figma_node_id = %image.id, %error, "Moodboard Figma image upload failed");
            None
        }
    }
}

#[derive(Clone, Debug)]
struct UrlImportedImage {
    title: String,
    source_url: String,
    mime_type: &'static str,
    bytes: Vec<u8>,
}

async fn fetch_importable_image_url(raw_url: &str) -> Result<UrlImportedImage, WorkflowError> {
    let url = parse_public_image_url(raw_url)?;
    resolve_public_image_host(&url).await?;

    let response = reqwest::Client::builder()
        .redirect(reqwest::redirect::Policy::limited(3))
        .build()
        .map_err(|error| {
            WorkflowError::InvalidRequest(format!("Could not prepare image fetch: {error}"))
        })?
        .get(url.clone())
        .send()
        .await
        .map_err(|error| {
            WorkflowError::InvalidRequest(format!("Could not fetch that image URL: {error}"))
        })?
        .error_for_status()
        .map_err(|error| {
            WorkflowError::InvalidRequest(format!("That image URL returned an error: {error}"))
        })?;

    if let Some(content_length) = response.content_length() {
        if content_length > MAX_URL_IMAGE_BYTES {
            return Err(WorkflowError::InvalidRequest(
                "That image is too large. Max size is 10 MB.".to_string(),
            ));
        }
    }

    let content_type = response
        .headers()
        .get(CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())
        .and_then(normalize_image_content_type);
    let bytes = read_image_response_with_limit(response).await?;

    if !looks_like_image_bytes(&bytes) {
        return Err(WorkflowError::InvalidRequest(
            "Paste a direct PNG, JPG, WebP, or GIF image URL.".to_string(),
        ));
    }

    let mime_type = content_type.unwrap_or_else(|| infer_image_mime(&bytes));
    let title = image_title_from_url(&url);
    Ok(UrlImportedImage {
        title,
        source_url: url.to_string(),
        mime_type,
        bytes: bytes.to_vec(),
    })
}

async fn upload_url_image(
    uploader: &ConvexAssetUploader,
    auth_token: &str,
    project_id: &str,
    image: &UrlImportedImage,
) -> Result<String, WorkflowError> {
    let file_name = format!(
        "{}.{}",
        sanitize_id(&image.title),
        extension_for_mime(image.mime_type)
    );
    uploader
        .upload_image(
            auth_token,
            project_id,
            "moodboard-url",
            &file_name,
            image.mime_type,
            &image.bytes,
        )
        .await
        .map_err(WorkflowError::Convex)
}

fn parse_public_image_url(raw_url: &str) -> Result<Url, WorkflowError> {
    let trimmed = raw_url.trim();
    if trimmed.is_empty() {
        return Err(WorkflowError::InvalidRequest(
            "Paste an image URL.".to_string(),
        ));
    }

    let normalized = if trimmed.starts_with("http://") || trimmed.starts_with("https://") {
        trimmed.to_string()
    } else {
        format!("https://{trimmed}")
    };
    let url = Url::parse(&normalized)
        .map_err(|_| WorkflowError::InvalidRequest("Paste a valid image URL.".to_string()))?;

    if !matches!(url.scheme(), "http" | "https") {
        return Err(WorkflowError::InvalidRequest(
            "Image URLs must start with http or https.".to_string(),
        ));
    }

    let host = url.host_str().ok_or_else(|| {
        WorkflowError::InvalidRequest("Image URL must include a host.".to_string())
    })?;
    if is_blocked_literal_host(host) {
        return Err(WorkflowError::InvalidRequest(
            "That image URL is not allowed.".to_string(),
        ));
    }

    if let Ok(ip) = host.parse::<IpAddr>() {
        if is_blocked_ip(ip) {
            return Err(WorkflowError::InvalidRequest(
                "That image URL is not allowed.".to_string(),
            ));
        }
    }

    Ok(url)
}

async fn resolve_public_image_host(url: &Url) -> Result<(), WorkflowError> {
    let host = url.host_str().ok_or_else(|| {
        WorkflowError::InvalidRequest("Image URL must include a host.".to_string())
    })?;

    if is_blocked_literal_host(host) {
        return Err(WorkflowError::InvalidRequest(
            "That image URL is not allowed.".to_string(),
        ));
    }

    if let Ok(ip) = host.parse::<IpAddr>() {
        if is_blocked_ip(ip) {
            return Err(WorkflowError::InvalidRequest(
                "That image URL is not allowed.".to_string(),
            ));
        }
        return Ok(());
    }

    let port = url.port_or_known_default().ok_or_else(|| {
        WorkflowError::InvalidRequest("Image URL must include a host.".to_string())
    })?;

    let mut resolved_any = false;
    let addresses = tokio::net::lookup_host((host, port)).await.map_err(|_| {
        WorkflowError::InvalidRequest("Could not resolve that image URL host.".to_string())
    })?;

    for address in addresses {
        resolved_any = true;
        if is_blocked_ip(address.ip()) {
            return Err(WorkflowError::InvalidRequest(
                "That image URL is not allowed.".to_string(),
            ));
        }
    }

    if !resolved_any {
        return Err(WorkflowError::InvalidRequest(
            "Could not resolve that image URL host.".to_string(),
        ));
    }

    Ok(())
}

async fn read_image_response_with_limit(
    mut response: reqwest::Response,
) -> Result<Vec<u8>, WorkflowError> {
    let mut bytes = Vec::new();

    while let Some(chunk) = response.chunk().await.map_err(|error| {
        WorkflowError::InvalidRequest(format!("Could not read that image URL: {error}"))
    })? {
        if bytes.len() + chunk.len() > MAX_URL_IMAGE_BYTES as usize {
            return Err(WorkflowError::InvalidRequest(
                "That image is too large. Max size is 10 MB.".to_string(),
            ));
        }
        bytes.extend_from_slice(&chunk);
    }

    Ok(bytes)
}

fn is_blocked_literal_host(host: &str) -> bool {
    let lower = host.to_ascii_lowercase();
    matches!(lower.as_str(), "localhost" | "0.0.0.0") || lower.ends_with(".localhost")
}

fn is_blocked_ip(ip: IpAddr) -> bool {
    match ip {
        IpAddr::V4(addr) => {
            addr.is_private()
                || addr.is_loopback()
                || addr.is_link_local()
                || addr.is_broadcast()
                || addr.is_documentation()
                || addr.is_unspecified()
        }
        IpAddr::V6(addr) => {
            addr.is_loopback()
                || addr.is_unspecified()
                || addr.is_unique_local()
                || addr.is_unicast_link_local()
        }
    }
}

fn normalize_image_content_type(value: &str) -> Option<&'static str> {
    match value
        .split(';')
        .next()?
        .trim()
        .to_ascii_lowercase()
        .as_str()
    {
        "image/jpeg" => Some("image/jpeg"),
        "image/png" => Some("image/png"),
        "image/webp" => Some("image/webp"),
        "image/gif" => Some("image/gif"),
        _ => None,
    }
}

fn image_title_from_url(url: &Url) -> String {
    url.path_segments()
        .and_then(|segments| {
            segments
                .filter(|segment| !segment.trim().is_empty())
                .next_back()
        })
        .map(|segment| segment.to_string())
        .or_else(|| url.host_str().map(ToOwned::to_owned))
        .unwrap_or_else(|| "Image URL".to_string())
}

fn optional_https_url(value: Option<&str>) -> Option<String> {
    let raw = value?.trim();
    if raw.is_empty() {
        return None;
    }

    let parsed = Url::parse(raw).ok()?;
    if parsed.scheme() != "http" && parsed.scheme() != "https" {
        return None;
    }

    Some(parsed.to_string())
}

fn refero_moodboard_reference(
    screen: &ReferoReference,
    image_url: String,
    image_key: Option<String>,
    order: usize,
) -> Value {
    let mut reference = serde_json::Map::new();
    reference.insert(
        "id".to_string(),
        json!(format!("refero-{}-{}", screen.id, now_millis())),
    );
    reference.insert("title".to_string(), json!(screen.title));
    reference.insert("imageUrl".to_string(), json!(image_url));
    if let Some(image_key) = image_key.filter(|key| !key.trim().is_empty()) {
        reference.insert("imageAssetKey".to_string(), json!(image_key.clone()));
        reference.insert("thumbnailAssetKey".to_string(), json!(image_key.clone()));
        let thumbnail_fallback = screen
            .thumbnail_url
            .as_deref()
            .or(screen.image_url.as_deref())
            .filter(|url| url.starts_with("https://") && !url.trim().is_empty())
            .unwrap_or(&image_key);
        reference.insert("thumbnailUrl".to_string(), json!(thumbnail_fallback));
    } else if let Some(thumbnail_url) = screen
        .thumbnail_url
        .as_deref()
        .filter(|url| url.starts_with("https://") && !url.trim().is_empty())
    {
        reference.insert("thumbnailUrl".to_string(), json!(thumbnail_url));
    }
    reference.insert("source".to_string(), json!("url"));
    if let Some(source_url) = optional_https_url(screen.source_url.as_deref()) {
        reference.insert("sourceUrl".to_string(), json!(source_url));
    }
    reference.insert("directionId".to_string(), Value::Null);
    reference.insert("isInMoodboard".to_string(), json!(false));
    reference.insert("order".to_string(), json!(order));
    Value::Object(reference)
}

fn figma_moodboard_reference(
    image: &FigmaImportedImage,
    image_key: Option<String>,
    order: usize,
) -> Value {
    let image_url = image_key
        .clone()
        .unwrap_or_else(|| image.render_url.clone());
    let mut reference = serde_json::Map::new();
    reference.insert(
        "id".to_string(),
        json!(format!("figma-{}-{}", sanitize_id(&image.id), now_millis())),
    );
    reference.insert("title".to_string(), json!(image.title));
    reference.insert("imageUrl".to_string(), json!(image_url));
    if let Some(image_key) = image_key.filter(|key| !key.trim().is_empty()) {
        reference.insert("imageAssetKey".to_string(), json!(image_key.clone()));
        reference.insert("thumbnailAssetKey".to_string(), json!(image_key));
        reference.insert("thumbnailUrl".to_string(), json!(image.render_url));
    }
    reference.insert("source".to_string(), json!("figma"));
    if let Some(source_url) = optional_https_url(Some(image.source_url.as_str())) {
        reference.insert("sourceUrl".to_string(), json!(source_url));
    }
    reference.insert("directionId".to_string(), Value::Null);
    reference.insert("isInMoodboard".to_string(), json!(false));
    reference.insert("order".to_string(), json!(order));
    Value::Object(reference)
}

fn url_moodboard_reference(image: &UrlImportedImage, image_key: String) -> Value {
    let mut reference = serde_json::Map::new();
    reference.insert(
        "id".to_string(),
        json!(format!(
            "url-{}-{}",
            sanitize_id(&image.title),
            now_millis()
        )),
    );
    reference.insert("title".to_string(), json!(image.title));
    reference.insert("imageUrl".to_string(), json!(image_key.clone()));
    reference.insert("imageAssetKey".to_string(), json!(image_key.clone()));
    reference.insert("thumbnailUrl".to_string(), json!(image.source_url));
    reference.insert("thumbnailAssetKey".to_string(), json!(image_key));
    reference.insert("source".to_string(), json!("url"));
    if let Some(source_url) = optional_https_url(Some(image.source_url.as_str())) {
        reference.insert("sourceUrl".to_string(), json!(source_url));
    }
    reference.insert("directionId".to_string(), Value::Null);
    reference.insert("isInMoodboard".to_string(), json!(false));
    reference.insert("order".to_string(), json!(0));
    Value::Object(reference)
}

fn append_references(
    artifact: &mut Value,
    mut references: Vec<Value>,
    import_mode: &str,
    generated_at: u128,
) -> Result<(), WorkflowError> {
    let Some(object) = artifact.as_object_mut() else {
        return Err(WorkflowError::InvalidArtifact(
            "Moodboard artifact was not an object.".to_string(),
        ));
    };

    let existing_count = object
        .entry("references".to_string())
        .or_insert_with(|| json!([]))
        .as_array()
        .map(Vec::len)
        .unwrap_or(0);

    for (index, reference) in references.iter_mut().enumerate() {
        if let Some(reference_object) = reference.as_object_mut() {
            reference_object.insert("order".to_string(), json!(existing_count + index));
        }
    }

    let references_value = object
        .entry("references".to_string())
        .or_insert_with(|| json!([]));
    let Some(existing) = references_value.as_array_mut() else {
        return Err(WorkflowError::InvalidArtifact(
            "Moodboard references were not an array.".to_string(),
        ));
    };
    existing.extend(references);

    object.insert("importMode".to_string(), json!(import_mode));
    object.insert(
        "generatedAt".to_string(),
        json!(i64::try_from(generated_at).unwrap_or(i64::MAX)),
    );
    Ok(())
}

fn sanitize_id(value: &str) -> String {
    value
        .chars()
        .map(|ch| if ch.is_ascii_alphanumeric() { ch } else { '-' })
        .collect::<String>()
        .trim_matches('-')
        .to_string()
}

fn extension_for_mime(mime_type: &str) -> &'static str {
    match mime_type {
        "image/jpeg" => "jpg",
        "image/webp" => "webp",
        "image/gif" => "gif",
        _ => "png",
    }
}

#[derive(Debug, thiserror::Error)]
enum WorkflowError {
    #[error("{0}")]
    InvalidRequest(String),

    #[error("{0}")]
    InvalidArtifact(String),

    #[error(transparent)]
    Convex(#[from] anyhow::Error),

    #[error(transparent)]
    Refero(#[from] crate::refero::service::ReferoServiceError),
}

impl WorkflowError {
    fn to_engine_error(&self, provider_id: crate::models::providers::ProviderId) -> EngineError {
        let code = match self {
            WorkflowError::InvalidRequest(_) | WorkflowError::InvalidArtifact(_) => {
                EngineErrorCode::InvalidRequest
            }
            WorkflowError::Convex(_) | WorkflowError::Refero(_) => EngineErrorCode::InternalError,
        };

        EngineError {
            code,
            message: user_message(self),
            provider_id: Some(provider_id),
            retryable: !matches!(self, WorkflowError::InvalidRequest(_)),
            detail: Some(self.to_string()),
        }
    }
}

fn user_message(error: &WorkflowError) -> String {
    match error {
        WorkflowError::InvalidRequest(message) | WorkflowError::InvalidArtifact(message) => {
            message.clone()
        }
        WorkflowError::Convex(_) => "Stage could not save the moodboard import.".to_string(),
        WorkflowError::Refero(_) => "Refero could not prepare moodboard screens.".to_string(),
    }
}
