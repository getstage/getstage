use super::*;
use serde_json::json;

#[test]
fn direction_reference_metadata_keeps_visual_fields() {
    let metadata = direction_reference_metadata(&json!({
        "id": "ref_1",
        "title": "Checkout screen",
        "source": "figma",
        "sourceUrl": "https://figma.example/file",
        "imageUrl": "moodboard/ref_1.png",
        "thumbnailUrl": "https://thumb.example/ref_1.png",
        "imageAssetKey": "assets/ref_1.png",
        "thumbnailAssetKey": "assets/ref_1_thumb.png",
        "uploadedAssetId": "asset_1",
        "notes": "not needed by styleguide prompt"
    }));

    assert_eq!(
        metadata.get("imageUrl"),
        Some(&json!("moodboard/ref_1.png"))
    );
    assert_eq!(
        metadata.get("thumbnailAssetKey"),
        Some(&json!("assets/ref_1_thumb.png"))
    );
    assert!(!metadata.contains_key("notes"));
}

#[test]
fn reference_has_visual_input_requires_non_empty_visual_field() {
    assert!(reference_has_visual_input(&json!({
        "imageUrl": "moodboard/ref_1.png"
    })));
    assert!(!reference_has_visual_input(&json!({
        "imageUrl": " ",
        "title": "Text-only reference"
    })));
}
