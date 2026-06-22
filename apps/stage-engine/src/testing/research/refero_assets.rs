use super::*;
use crate::models::refero::ReferoPlatform;

fn sample_screen(id: &str, category: ReferoUiPatternCategory, product: &str) -> ReferoReference {
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
fn recognized_patterns_are_detailed_designer_observations() {
    let references = vec![
        sample_screen("uuid-a", ReferoUiPatternCategory::Pricing, "Editor X"),
        sample_screen("uuid-b", ReferoUiPatternCategory::Pricing, "Wix"),
    ];

    let patterns = collect_recognized_patterns(ReferoUiPatternCategory::Pricing, &references);

    assert_eq!(patterns.len(), 4);
    assert!(patterns[0].starts_with("Comparison-first plan grid — "));
    assert!(patterns[0].contains("screens from Editor X and Wix"));
    assert!(
        !patterns
            .iter()
            .any(|pattern| pattern == "Button" || pattern == "Currency")
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
