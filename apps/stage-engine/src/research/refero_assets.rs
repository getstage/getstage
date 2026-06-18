use std::collections::{HashMap, HashSet};

use anyhow::Context;
use serde_json::{Value, json};

use crate::convex_store::asset_upload::ConvexAssetUploader;
use crate::models::refero::{
    ReferoCategorySearch, ReferoContext, ReferoReference, ReferoReferenceKind,
    ReferoUiPatternCategory,
};
use crate::refero::parse::{infer_image_mime, looks_like_image_bytes};
use crate::refero::service::{ReferoService, infer_refero_file_name};

pub async fn persist_refero_context_images(
    refero: &ReferoService,
    uploader: &ConvexAssetUploader,
    auth_token: &str,
    project_id: &str,
    context: &mut ReferoContext,
) -> anyhow::Result<HashMap<String, String>> {
    refero
        .hydrate_category_screen_images(&mut context.category_searches)
        .await
        .context("failed to hydrate Refero category screen images")?;

    sync_category_bytes_to_flat_references(context);

    let mut uploaded_keys = HashMap::new();

    for bucket in &mut context.category_searches {
        for reference in &mut bucket.references {
            upload_reference_image(
                uploader,
                auth_token,
                project_id,
                reference,
                &mut uploaded_keys,
            )
            .await;
        }
    }

    sync_category_image_urls_to_flat_references(context);

    Ok(uploaded_keys)
}

pub fn build_ui_patterns_from_refero(
    context: &ReferoContext,
    image_keys: &HashMap<String, String>,
) -> Value {
    let groups = context
        .category_searches
        .iter()
        .filter(|bucket| !bucket.references.is_empty())
        .map(|bucket| build_ui_pattern_group(bucket, image_keys))
        .collect::<Vec<_>>();

    json!(groups)
}

pub fn apply_engine_ui_patterns(
    artifact: &mut Value,
    context: &ReferoContext,
    image_keys: &HashMap<String, String>,
) {
    let ui_patterns = build_ui_patterns_from_refero(context, image_keys);
    if let Some(object) = artifact.as_object_mut() {
        object.insert("uiPatterns".to_string(), ui_patterns);
    }

    wire_refero_images_in_source_references(artifact, image_keys);
}

fn build_ui_pattern_group(
    bucket: &ReferoCategorySearch,
    image_keys: &HashMap<String, String>,
) -> Value {
    let recognized_patterns = collect_recognized_patterns(bucket.category, &bucket.references);
    let pattern_count_label = if recognized_patterns.is_empty() {
        None
    } else {
        Some(format!("{} patterns", recognized_patterns.len()))
    };

    let examples = bucket
        .references
        .iter()
        .filter(|reference| reference.kind == ReferoReferenceKind::Screen)
        .map(|reference| build_ui_pattern_example(reference, image_keys))
        .collect::<Vec<_>>();

    json!({
        "id": bucket.category.row_id(),
        "title": bucket.category.display_title(),
        "summary": build_group_summary(bucket.category, &bucket.references),
        "patternCountLabel": pattern_count_label,
        "recognizedPatterns": recognized_patterns,
        "examples": examples,
    })
}

fn build_ui_pattern_example(
    reference: &ReferoReference,
    image_keys: &HashMap<String, String>,
) -> Value {
    let image_url = image_keys
        .get(&reference.id)
        .cloned()
        .or_else(|| reference.image_url.clone())
        .or_else(|| reference.thumbnail_url.clone());
    let thumbnail_url = reference
        .thumbnail_url
        .clone()
        .or_else(|| image_url.clone());

    json!({
        "id": reference.id,
        "title": reference.title,
        "imageUrl": image_url,
        "thumbnailUrl": thumbnail_url,
        "sourceProduct": reference.product_name,
        "sourceReferenceId": reference.id,
    })
}

fn build_group_summary(
    category: ReferoUiPatternCategory,
    references: &[ReferoReference],
) -> Option<String> {
    if let Some(summary) = references
        .iter()
        .filter_map(|reference| reference.summary.as_deref())
        .find(|summary| !summary.is_empty())
    {
        return Some(summary.to_string());
    }

    let products: Vec<_> = references
        .iter()
        .filter_map(|reference| reference.product_name.as_deref())
        .collect::<HashSet<_>>()
        .into_iter()
        .take(3)
        .collect();

    if products.is_empty() {
        return Some(format!(
            "Refero {} screens for this brief.",
            category.display_title().to_lowercase()
        ));
    }

    Some(format!(
        "{} patterns from {}.",
        category.display_title(),
        products.join(", ")
    ))
}

fn collect_recognized_patterns(
    category: ReferoUiPatternCategory,
    references: &[ReferoReference],
) -> Vec<String> {
    let mut seen = HashSet::new();
    let mut patterns = references
        .iter()
        .flat_map(|reference| reference.tags.iter())
        .filter_map(|tag| normalize_pattern_label(tag))
        .filter_map(|tag| {
            let key = tag.to_ascii_lowercase();
            seen.insert(key).then_some(tag)
        })
        .take(4)
        .collect::<Vec<_>>();

    for fallback in category_pattern_fallbacks(category) {
        if patterns.len() >= 4 {
            break;
        }
        if seen.insert(fallback.to_ascii_lowercase()) {
            patterns.push(fallback.to_string());
        }
    }

    patterns
}

fn normalize_pattern_label(label: &str) -> Option<String> {
    let trimmed = label.trim();
    if trimmed.is_empty() {
        return None;
    }

    let lower = trimmed.to_ascii_lowercase();
    if matches!(
        lower.as_str(),
        "homepage"
            | "landing page"
            | "pricing"
            | "checkout"
            | "dashboard"
            | "onboarding"
            | "web"
            | "desktop"
            | "mobile"
            | "b2b"
            | "e-commerce"
            | "ecommerce"
    ) {
        return None;
    }

    Some(title_case_pattern(trimmed))
}

fn title_case_pattern(label: &str) -> String {
    label
        .split(|c: char| c == '_' || c == '-' || c.is_whitespace())
        .filter(|part| !part.is_empty())
        .map(|part| {
            let mut chars = part.chars();
            match chars.next() {
                Some(first) => {
                    format!(
                        "{}{}",
                        first.to_uppercase(),
                        chars.as_str().to_ascii_lowercase()
                    )
                }
                None => String::new(),
            }
        })
        .collect::<Vec<_>>()
        .join(" ")
}

fn category_pattern_fallbacks(category: ReferoUiPatternCategory) -> &'static [&'static str] {
    match category {
        ReferoUiPatternCategory::Onboarding => &[
            "Guided Setup Steps",
            "Progressive Disclosure",
            "Account Request Clarity",
            "Checklist Based Progress",
        ],
        ReferoUiPatternCategory::Homepage => &[
            "Outcome Led Hero",
            "Segmented Navigation",
            "Proof Near Primary CTA",
            "Product Value Blocks",
        ],
        ReferoUiPatternCategory::Pricing => &[
            "Plan Comparison Cards",
            "Decision Support Near CTA",
            "Transparent Package Hierarchy",
            "Trust Cues Near Commitment",
        ],
        ReferoUiPatternCategory::Checkout => &[
            "Mobile Order Review",
            "Persistent Totals",
            "Low Friction Payment Steps",
            "Business Terms Visibility",
        ],
        ReferoUiPatternCategory::Dashboard => &[
            "Task First Dashboard",
            "Approval Queue Prominence",
            "Operational Status Cards",
            "Quick Action Header",
        ],
    }
}

async fn upload_reference_image(
    uploader: &ConvexAssetUploader,
    auth_token: &str,
    project_id: &str,
    reference: &mut ReferoReference,
    uploaded_keys: &mut HashMap<String, String>,
) {
    let Some(bytes) = reference.raw_image_bytes.take() else {
        return;
    };

    if !looks_like_image_bytes(&bytes) {
        tracing::warn!(
            reference_id = %reference.id,
            byte_len = bytes.len(),
            "Skipping Refero image upload because bytes are not a valid image"
        );
        return;
    }

    let mime_type = infer_image_mime(&bytes);
    let file_name = infer_refero_file_name(&reference.id, mime_type);
    match uploader
        .upload_research_refero_image(auth_token, project_id, &file_name, mime_type, &bytes)
        .await
    {
        Ok(key) => {
            reference.image_url = Some(key.clone());
            if reference.thumbnail_url.is_none() {
                reference.thumbnail_url = Some(key.clone());
            }
            uploaded_keys.insert(reference.id.clone(), key);
        }
        Err(error) => {
            tracing::warn!(
                reference_id = %reference.id,
                %error,
                "Refero image upload failed; continuing research without this image"
            );
            if reference.image_url.is_none() {
                reference.image_url = reference.thumbnail_url.clone();
            }
        }
    }
}

fn sync_category_bytes_to_flat_references(context: &mut ReferoContext) {
    let mut bytes_by_id = HashMap::new();

    for bucket in &context.category_searches {
        for reference in &bucket.references {
            if let Some(bytes) = &reference.raw_image_bytes {
                bytes_by_id.insert(reference.id.clone(), bytes.clone());
            }
        }
    }

    for reference in &mut context.references {
        if reference.raw_image_bytes.is_none() {
            reference.raw_image_bytes = bytes_by_id.remove(&reference.id);
        }
    }
}

fn sync_category_image_urls_to_flat_references(context: &mut ReferoContext) {
    let mut urls_by_id = HashMap::new();

    for bucket in &context.category_searches {
        for reference in &bucket.references {
            urls_by_id.insert(
                reference.id.clone(),
                (reference.image_url.clone(), reference.thumbnail_url.clone()),
            );
        }
    }

    for reference in &mut context.references {
        if let Some((image_url, thumbnail_url)) = urls_by_id.get(&reference.id) {
            if let Some(url) = image_url {
                reference.image_url = Some(url.clone());
            }
            if let Some(url) = thumbnail_url {
                reference.thumbnail_url = Some(url.clone());
            }
        }
    }
}

fn wire_refero_images_in_source_references(
    artifact: &mut Value,
    image_keys: &HashMap<String, String>,
) {
    let Some(source_references) = artifact
        .get_mut("sourceReferences")
        .and_then(Value::as_array_mut)
    else {
        return;
    };

    for source in source_references {
        let Some(id) = source.get("id").and_then(Value::as_str) else {
            continue;
        };

        if let Some(key) = image_keys.get(id) {
            let object = source
                .as_object_mut()
                .expect("source reference must be object");
            object.insert("url".to_string(), json!(key));
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::refero::ReferoPlatform;

    fn sample_screen(
        id: &str,
        category: ReferoUiPatternCategory,
        product: &str,
    ) -> ReferoReference {
        ReferoReference {
            id: id.to_string(),
            kind: ReferoReferenceKind::Screen,
            title: format!("Screen {id}"),
            product_name: Some(product.to_string()),
            product_url: None,
            platform: ReferoPlatform::Web,
            source_url: None,
            thumbnail_url: Some(format!("https://images.refero.design/screenshots/{id}.png")),
            image_url: None,
            summary: None,
            tags: vec![
                "Checklist".to_string(),
                "Progressive disclosure".to_string(),
            ],
            screen_type: None,
            flow_type: None,
            step_count: None,
            style_type: None,
            ui_pattern_category: Some(category),
            raw_image_bytes: None,
        }
    }

    #[test]
    fn collect_recognized_patterns_dedupes_and_caps_at_four() {
        let references = vec![
            sample_screen("uuid-a", ReferoUiPatternCategory::Onboarding, "Shopify"),
            ReferoReference {
                tags: vec![
                    "Progressive disclosure".to_string(),
                    "Wizard".to_string(),
                    "Stepper".to_string(),
                    "Extra".to_string(),
                ],
                ..sample_screen("uuid-b", ReferoUiPatternCategory::Onboarding, "Stripe")
            },
        ];

        assert_eq!(
            collect_recognized_patterns(ReferoUiPatternCategory::Onboarding, &references),
            vec![
                "Checklist".to_string(),
                "Progressive Disclosure".to_string(),
                "Wizard".to_string(),
                "Stepper".to_string(),
            ]
        );
    }

    #[test]
    fn builds_distinct_ui_pattern_groups_per_category() {
        let context = ReferoContext {
            query: "onboarding | pricing".to_string(),
            references: vec![],
            category_searches: vec![
                ReferoCategorySearch {
                    category: ReferoUiPatternCategory::Onboarding,
                    query: "onboarding".to_string(),
                    references: vec![sample_screen(
                        "uuid-onboard",
                        ReferoUiPatternCategory::Onboarding,
                        "Shopify",
                    )],
                },
                ReferoCategorySearch {
                    category: ReferoUiPatternCategory::Pricing,
                    query: "pricing".to_string(),
                    references: vec![sample_screen(
                        "uuid-pricing",
                        ReferoUiPatternCategory::Pricing,
                        "Stripe",
                    )],
                },
            ],
            fetched_at: 1,
        };

        let mut keys = HashMap::new();
        keys.insert(
            "uuid-onboard".to_string(),
            "research/proj/uuid-onboard.png".to_string(),
        );
        keys.insert(
            "uuid-pricing".to_string(),
            "research/proj/uuid-pricing.png".to_string(),
        );

        let groups = build_ui_patterns_from_refero(&context, &keys);
        let array = groups.as_array().expect("ui patterns array");
        assert_eq!(array.len(), 2);
        assert_eq!(array[0]["title"], "Onboarding");
        assert_eq!(array[0]["examples"][0]["sourceReferenceId"], "uuid-onboard");
        assert_eq!(
            array[0]["examples"][0]["thumbnailUrl"],
            "https://images.refero.design/screenshots/uuid-onboard.png"
        );
        assert_eq!(array[1]["examples"][0]["sourceReferenceId"], "uuid-pricing");
        assert_ne!(
            array[0]["examples"][0]["imageUrl"],
            array[1]["examples"][0]["imageUrl"]
        );
    }

    #[test]
    fn uses_refero_thumbnail_when_r2_image_key_is_missing() {
        let context = ReferoContext {
            query: "onboarding".to_string(),
            references: vec![],
            category_searches: vec![ReferoCategorySearch {
                category: ReferoUiPatternCategory::Onboarding,
                query: "onboarding".to_string(),
                references: vec![sample_screen(
                    "uuid-onboard",
                    ReferoUiPatternCategory::Onboarding,
                    "Shopify",
                )],
            }],
            fetched_at: 1,
        };

        let groups = build_ui_patterns_from_refero(&context, &HashMap::new());
        let example = &groups.as_array().expect("ui patterns array")[0]["examples"][0];
        let image_url = &example["imageUrl"];
        assert_eq!(
            image_url,
            "https://images.refero.design/screenshots/uuid-onboard.png"
        );
        assert_eq!(
            example["thumbnailUrl"],
            "https://images.refero.design/screenshots/uuid-onboard.png"
        );
    }
}
