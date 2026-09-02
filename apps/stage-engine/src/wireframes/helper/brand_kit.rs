use crate::models::runs::RunAttachmentKind;
use crate::wireframes::helper::error::WorkflowError;

pub(crate) fn resolve_brand_kit_url(key: &str, r2_public_base_url: Option<&str>) -> Option<String> {
    let trimmed = key.trim();
    // Default-deny: accept only a relative R2 object key, never a caller-supplied URL,
    // absolute path, or traversal. Otherwise a run could make the local engine fetch
    // arbitrary or internal network URLs (SSRF).
    if trimmed.is_empty()
        || trimmed.contains("://")
        || trimmed.starts_with('/')
        || trimmed.contains("..")
    {
        return None;
    }

    let base = r2_public_base_url
        .filter(|base| !base.trim().is_empty())?
        .trim_end_matches('/');
    Some(format!("{base}/{trimmed}"))
}

pub(crate) fn extension_from_key(key: &str) -> &str {
    key.rsplit('/')
        .next()
        .and_then(|name| name.rsplit_once('.'))
        .map(|(_, ext)| ext)
        .filter(|ext| {
            !ext.is_empty() && ext.len() <= 5 && ext.chars().all(|c| c.is_ascii_alphanumeric())
        })
        .unwrap_or("bin")
}

pub(crate) fn brand_kit_extension_allowed(extension: &str) -> bool {
    matches!(
        extension.to_ascii_lowercase().as_str(),
        "jpg" | "jpeg" | "png" | "webp" | "gif" | "svg" | "pdf"
    )
}

pub(crate) fn brand_kit_attachment_kind(extension: &str) -> RunAttachmentKind {
    match extension.to_ascii_lowercase().as_str() {
        "jpg" | "jpeg" | "png" | "webp" | "gif" | "svg" => RunAttachmentKind::Image,
        _ => RunAttachmentKind::Document,
    }
}

pub(crate) async fn fetch_url_bytes(url: &str) -> Result<Vec<u8>, WorkflowError> {
    let response = reqwest::Client::builder()
        .redirect(reqwest::redirect::Policy::limited(3))
        .build()
        .map_err(|error| {
            WorkflowError::Internal(format!("could not prepare brand kit fetch: {error}"))
        })?
        .get(url)
        .send()
        .await
        .map_err(|error| {
            WorkflowError::Internal(format!("could not fetch brand kit file: {error}"))
        })?
        .error_for_status()
        .map_err(|error| WorkflowError::Internal(format!("brand kit fetch failed: {error}")))?;

    let bytes = response.bytes().await.map_err(|error| {
        WorkflowError::Internal(format!("could not read brand kit bytes: {error}"))
    })?;
    Ok(bytes.to_vec())
}
