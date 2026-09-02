use crate::models::runs::{RunAttachment, RunAttachmentKind};
use crate::wireframes::MAX_BRAND_KIT_BYTES;
use crate::wireframes::helper::brand_kit::{
    brand_kit_attachment_kind, brand_kit_extension_allowed, extension_from_key, fetch_url_bytes,
    resolve_brand_kit_url,
};
use crate::wireframes::helper::error::WorkflowError;
use crate::wireframes::provider_workspace::{ContextAccessPolicy, ProviderWorkspace};

pub(crate) const MAX_MOODBOARD_IMAGES: usize = 4;

pub(crate) async fn fetch_visual_attachments(
    r2_public_base_url: Option<&str>,
    keys: &[String],
    workspace: &mut ProviderWorkspace,
    file_prefix: &str,
    description: &str,
    limit: usize,
    images_only: bool,
) -> Result<(Vec<RunAttachment>, Vec<String>), WorkflowError> {
    let mut attachments = Vec::new();
    let mut workspace_paths = Vec::new();
    for (index, key) in keys.iter().take(limit).enumerate() {
        let Some(url) = resolve_brand_kit_url(key, r2_public_base_url) else {
            tracing::warn!(key = %key, "could not resolve brand kit url");
            continue;
        };
        let extension = extension_from_key(key);
        if !brand_kit_extension_allowed(extension)
            || (images_only
                && !matches!(
                    brand_kit_attachment_kind(extension),
                    RunAttachmentKind::Image
                ))
        {
            tracing::warn!(key = %key, extension, "skipping unsupported visual asset");
            continue;
        }

        let bytes = match fetch_url_bytes(&url).await {
            Ok(bytes) => bytes,
            Err(error) => {
                tracing::warn!(url = %url, %error, "could not fetch brand kit file");
                continue;
            }
        };
        if bytes.len() > MAX_BRAND_KIT_BYTES {
            tracing::warn!(url = %url, size = bytes.len(), "skipping oversize brand kit file");
            continue;
        }

        let file_name = format!("{file_prefix}-{index}.{extension}");
        let relative_path = format!("assets/{file_name}");
        workspace
            .write_bytes(
                &relative_path,
                description,
                ContextAccessPolicy::Required,
                &["director", "screen:*"],
                &bytes,
            )
            .map_err(|error| {
                WorkflowError::Internal(format!("could not materialize brand kit file: {error}"))
            })?;
        let file_path = workspace.root().join(&relative_path);
        attachments.push(RunAttachment {
            id: format!("{file_prefix}-{index}"),
            kind: brand_kit_attachment_kind(extension),
            name: Some(file_name),
            url: None,
            mime_type: None,
            local_path: Some(file_path.to_string_lossy().to_string()),
        });
        workspace_paths.push(relative_path);
    }

    Ok((attachments, workspace_paths))
}
