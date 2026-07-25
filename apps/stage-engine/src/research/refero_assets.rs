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

const REFERO_UPLOAD_CONCURRENCY: usize = 4;

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

    let mut upload_jobs = Vec::new();
    for bucket in &context.category_searches {
        for reference in &bucket.references {
            let Some(bytes) = reference.raw_image_bytes.as_ref() else {
                continue;
            };
            if !looks_like_image_bytes(bytes) {
                tracing::warn!(
                    reference_id = %reference.id,
                    byte_len = bytes.len(),
                    "Skipping Refero image upload because bytes are not a valid image"
                );
                continue;
            }
            let mime_type = infer_image_mime(bytes).to_string();
            let file_name = infer_refero_file_name(&reference.id, &mime_type);
            upload_jobs.push((reference.id.clone(), file_name, mime_type, bytes.clone()));
        }
    }

    let mut jobs = upload_jobs.into_iter().enumerate();
    let mut join_set = tokio::task::JoinSet::new();
    let mut indexed_results = Vec::new();
    loop {
        for _ in 0..REFERO_UPLOAD_CONCURRENCY {
            let Some((index, (reference_id, file_name, mime_type, bytes))) = jobs.next() else {
                break;
            };
            let uploader = uploader.clone();
            let auth_token = auth_token.to_string();
            let project_id = project_id.to_string();
            join_set.spawn(async move {
                let result = uploader
                    .upload_research_refero_image(
                        &auth_token,
                        &project_id,
                        &file_name,
                        &mime_type,
                        &bytes,
                    )
                    .await;
                (index, reference_id, result)
            });
        }

        if join_set.is_empty() {
            break;
        }
        while let Some(joined) = join_set.join_next().await {
            match joined {
                Ok(result) => indexed_results.push(result),
                Err(error) => tracing::warn!(%error, "Refero image upload task failed"),
            }
        }
    }
    indexed_results.sort_by_key(|(index, _, _)| *index);

    let mut uploaded_keys = HashMap::new();
    for (_index, reference_id, result) in indexed_results {
        match result {
            Ok(key) => {
                for bucket in &mut context.category_searches {
                    for reference in &mut bucket.references {
                        if reference.id == reference_id {
                            reference.image_url = Some(key.clone());
                            if reference.thumbnail_url.is_none() {
                                reference.thumbnail_url = Some(key.clone());
                            }
                            // Bytes already persisted to R2 — drop them from memory.
                            reference.raw_image_bytes = None;
                        }
                    }
                }
                uploaded_keys.insert(reference_id, key);
            }
            Err(error) => {
                tracing::warn!(
                    reference_id = %reference_id,
                    %error,
                    "Refero image upload failed; continuing research without this image"
                );
                for bucket in &mut context.category_searches {
                    for reference in &mut bucket.references {
                        if reference.id == reference_id {
                            reference.raw_image_bytes = None;
                            if reference.image_url.is_none() {
                                reference.image_url = reference.thumbnail_url.clone();
                            }
                        }
                    }
                }
            }
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

    ensure_refero_source_references(artifact, context, image_keys);
    wire_refero_images_in_source_references(artifact, image_keys);
}

fn ensure_refero_source_references(
    artifact: &mut Value,
    context: &ReferoContext,
    image_keys: &HashMap<String, String>,
) {
    let Some(object) = artifact.as_object_mut() else {
        return;
    };
    let source_references = object
        .entry("sourceReferences".to_string())
        .or_insert_with(|| json!([]));
    let Some(source_references) = source_references.as_array_mut() else {
        return;
    };

    let mut existing_ids = source_references
        .iter()
        .filter_map(|source| source.get("id").and_then(Value::as_str))
        .map(str::to_string)
        .collect::<HashSet<_>>();

    for reference in context
        .category_searches
        .iter()
        .flat_map(|bucket| bucket.references.iter())
        .filter(|reference| reference.kind == ReferoReferenceKind::Screen)
    {
        if !existing_ids.insert(reference.id.clone()) {
            continue;
        }
        let url = image_keys
            .get(&reference.id)
            .cloned()
            .or_else(|| reference.image_url.clone())
            .or_else(|| reference.thumbnail_url.clone())
            .or_else(|| reference.source_url.clone());
        source_references.push(json!({
            "id": reference.id,
            "provider": "refero",
            "label": reference.title,
            "url": url,
            "externalId": reference.id,
        }));
    }
}

fn build_ui_pattern_group(
    bucket: &ReferoCategorySearch,
    image_keys: &HashMap<String, String>,
) -> Value {
    let recognized_patterns = collect_recognized_patterns(bucket.category, &bucket.references);
    let pattern_count_label = if recognized_patterns.is_empty() {
        None
    } else {
        Some(format!(
            "{} recognized patterns from {} Refero screens",
            recognized_patterns.len(),
            bucket.references.len()
        ))
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
    Some(category_summary(category, &reference_evidence(references)))
}

fn collect_recognized_patterns(
    category: ReferoUiPatternCategory,
    references: &[ReferoReference],
) -> Vec<String> {
    let evidence = reference_evidence(references);
    category_pattern_insights(category, &evidence)
        .into_iter()
        .map(|(title, body)| format!("{title} — {body}"))
        .collect()
}

fn reference_evidence(references: &[ReferoReference]) -> String {
    let mut products = references
        .iter()
        .filter_map(|reference| reference.product_name.as_deref())
        .map(str::trim)
        .filter(|product| !product.is_empty())
        .collect::<Vec<_>>();
    products.sort_unstable();
    products.dedup();

    if products.is_empty() {
        return "the selected Refero screens".to_string();
    }

    match products.as_slice() {
        [one] => format!("screens from {one}"),
        [one, two] => format!("screens from {one} and {two}"),
        [one, two, three, ..] => format!("screens from {one}, {two}, and {three}"),
        [] => "the selected Refero screens".to_string(),
    }
}

fn category_summary(category: ReferoUiPatternCategory, evidence: &str) -> String {
    match category {
        ReferoUiPatternCategory::Onboarding => {
            format!(
                "Refero onboarding {evidence} show how first-run setup is broken into visible, low-risk decisions."
            )
        }
        ReferoUiPatternCategory::Homepage => {
            format!(
                "Refero homepage {evidence} show how marketing pages frame value, proof, and primary action hierarchy."
            )
        }
        ReferoUiPatternCategory::Pricing => {
            format!(
                "Refero pricing {evidence} show how plan comparison, billing details, and commitment cues are arranged."
            )
        }
        ReferoUiPatternCategory::Checkout => {
            format!(
                "Refero checkout {evidence} show how review, payment, totals, and submission stay close together."
            )
        }
        ReferoUiPatternCategory::Dashboard => {
            format!(
                "Refero dashboard {evidence} show how activity, status, and next actions are prioritized after login."
            )
        }
    }
}

fn category_pattern_insights(
    category: ReferoUiPatternCategory,
    evidence: &str,
) -> Vec<(&'static str, String)> {
    match category {
        ReferoUiPatternCategory::Onboarding => vec![
            (
                "Single-purpose setup step",
                format!(
                    "{evidence} show setup working best when each screen asks for one decision, then defers account, catalog, and approval complexity."
                ),
            ),
            (
                "Visible progress cue",
                format!(
                    "{evidence} use checklist, stepper, or completion states to show where the user is and what remains before the account is usable."
                ),
            ),
            (
                "Low-risk first action",
                format!(
                    "{evidence} suggest starting with a reversible action like invite, sample catalog, or verification before asking for heavy configuration."
                ),
            ),
            (
                "Contextual help near fields",
                format!(
                    "{evidence} keep business-specific guidance close to fields instead of forcing users into a separate help center."
                ),
            ),
        ],
        ReferoUiPatternCategory::Homepage => vec![
            (
                "Outcome-led hero",
                format!(
                    "{evidence} lead with the outcome first, then support it with product visuals, proof, and a single primary CTA."
                ),
            ),
            (
                "Segmented entry paths",
                format!(
                    "{evidence} separate entry paths so users can self-route without reading the full marketing page."
                ),
            ),
            (
                "Proof beside action",
                format!(
                    "{evidence} place proof or trust cues near the CTA so commitment is supported at the decision point."
                ),
            ),
            (
                "Section rhythm",
                format!(
                    "{evidence} alternate explanation, visual example, and action blocks so the page stays scannable."
                ),
            ),
        ],
        ReferoUiPatternCategory::Pricing => vec![
            (
                "Comparison-first plan grid",
                format!(
                    "{evidence} use side-by-side cards or tables so price, limits, and included capabilities can be compared before commitment."
                ),
            ),
            (
                "Billing detail near CTA",
                format!(
                    "{evidence} keep currency, billing cadence, discounts, and trial language close to the plan button to reduce hesitation."
                ),
            ),
            (
                "Progressive feature depth",
                format!(
                    "{evidence} show the most important differences first, then let detailed feature rows expand below for proof."
                ),
            ),
            (
                "FAQ at decision point",
                format!(
                    "{evidence} answer cancellation, payment, and plan-switching doubts directly under the comparison."
                ),
            ),
        ],
        ReferoUiPatternCategory::Checkout => vec![
            (
                "Persistent order summary",
                format!(
                    "{evidence} keep totals, shipping, tax, and item count visible while users edit payment or address details."
                ),
            ),
            (
                "Short payment path",
                format!(
                    "{evidence} reduce the path to review, payment, and confirmation so repeat buyers can complete faster."
                ),
            ),
            (
                "Error prevention before submit",
                format!(
                    "{evidence} surface missing address, invalid payment, or unavailable item states before the final CTA."
                ),
            ),
            (
                "Business terms visibility",
                format!(
                    "{evidence} point to exposing approval status, payment terms, and purchase-order context near final review."
                ),
            ),
        ],
        ReferoUiPatternCategory::Dashboard => vec![
            (
                "Activity-first landing",
                format!(
                    "{evidence} open on recent activity, pending work, and store status so users understand what changed first."
                ),
            ),
            (
                "Operational status cards",
                format!(
                    "{evidence} use compact cards for sales, sessions, orders, and setup progress so the page is readable at a glance."
                ),
            ),
            (
                "Left-rail workflow map",
                format!(
                    "{evidence} use a persistent sidebar to make store, orders, products, analytics, and marketing feel connected."
                ),
            ),
            (
                "Primary action stays visible",
                format!(
                    "{evidence} keep the next commercial action, such as design site, upgrade, or manage store, visible above the fold."
                ),
            ),
        ],
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
#[path = "../testing/research/refero_assets.rs"]
mod tests;
