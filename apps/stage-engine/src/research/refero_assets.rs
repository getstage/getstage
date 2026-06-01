use std::collections::HashMap;

use anyhow::Context;
use serde_json::{Value, json};

use crate::convex_store::asset_upload::ConvexAssetUploader;
use crate::models::refero::ReferoContext;
use crate::refero::service::{ReferoService, infer_refero_file_name};
use crate::refero::parse::{infer_image_mime, looks_like_image_bytes};

pub async fn persist_refero_context_images(
    refero: &ReferoService,
    uploader: &ConvexAssetUploader,
    auth_token: &str,
    project_id: &str,
    context: &mut ReferoContext,
) -> anyhow::Result<HashMap<String, String>> {
    refero
        .hydrate_reference_images(&mut context.references)
        .await
        .context("failed to hydrate Refero reference images")?;

    let mut uploaded_keys = HashMap::new();

    for reference in &mut context.references {
        let Some(bytes) = reference.raw_image_bytes.take() else {
            continue;
        };

        if !looks_like_image_bytes(&bytes) {
            tracing::warn!(
                reference_id = %reference.id,
                byte_len = bytes.len(),
                "Skipping Refero image upload because bytes are not a valid image"
            );
            continue;
        }

        let mime_type = infer_image_mime(&bytes);
        let file_name = infer_refero_file_name(&reference.id, mime_type);
        match uploader
            .upload_research_refero_image(auth_token, project_id, &file_name, mime_type, &bytes)
            .await
        {
            Ok(key) => {
                reference.image_url = Some(key.clone());
                reference.thumbnail_url = Some(key.clone());
                uploaded_keys.insert(reference.id.clone(), key);
            }
            Err(error) => {
                tracing::warn!(
                    reference_id = %reference.id,
                    %error,
                    "Refero image upload failed; continuing research without this image"
                );
            }
        }
    }

    Ok(uploaded_keys)
}

pub fn wire_refero_images_in_artifact(
    artifact: &mut Value,
    image_keys: &HashMap<String, String>,
) {
    if image_keys.is_empty() {
        return;
    }

    let fallback_keys: Vec<String> = image_keys.values().cloned().collect();

    if let Some(ui_patterns) = artifact.get_mut("uiPatterns").and_then(Value::as_array_mut) {
        let mut fallback_index = 0usize;

        for group in ui_patterns {
            let Some(examples) = group.get_mut("examples").and_then(Value::as_array_mut) else {
                continue;
            };

            for example in examples {
                let object = example.as_object_mut().expect("ui pattern example must be object");
                if object.get("imageUrl").and_then(Value::as_str).is_some() {
                    continue;
                }

                let source_reference_id = object
                    .get("sourceReferenceId")
                    .and_then(Value::as_str)
                    .unwrap_or_default();

                if let Some(key) = image_keys.get(source_reference_id) {
                    object.insert("imageUrl".to_string(), json!(key));
                    continue;
                }

                let title = object.get("title").and_then(Value::as_str).unwrap_or_default();
                if source_reference_id.contains("refero") || title.to_lowercase().contains("refero") {
                    if let Some(key) = fallback_keys.get(fallback_index) {
                        object.insert("imageUrl".to_string(), json!(key));
                        fallback_index += 1;
                    }
                }
            }
        }
    }

    if let Some(source_references) = artifact
        .get_mut("sourceReferences")
        .and_then(Value::as_array_mut)
    {
        for source in source_references {
            let Some(id) = source.get("id").and_then(Value::as_str) else {
                continue;
            };

            if let Some(key) = image_keys.get(id) {
                let object = source.as_object_mut().expect("source reference must be object");
                object.insert("url".to_string(), json!(key));
            }
        }
    }
}
