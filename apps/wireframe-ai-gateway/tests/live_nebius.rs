use std::env;

use uuid::Uuid;
use wireframe_ai_gateway::{
    contracts::{
        ComponentBundle, DesignContext, GenerateWireframeRequest, GenerationAttempt, ScreenBrief,
        ScreenRequest, SourceFile, Viewport,
    },
    generator::{NebiusRigGenerator, WireframeGenerator},
};

const DEFAULT_NEBIUS_BASE_URL: &str = "https://api.tokenfactory.nebius.com/v1";

#[tokio::test]
#[ignore = "requires an explicit live Nebius API call"]
async fn generates_one_typed_batch_with_nebius() -> Result<(), Box<dyn std::error::Error>> {
    let api_key = env::var("NEBIUS_API_KEY")?;
    let model = env::var("NEBIUS_MODEL")?;
    let base_url =
        env::var("NEBIUS_BASE_URL").unwrap_or_else(|_| DEFAULT_NEBIUS_BASE_URL.to_owned());
    let generator = NebiusRigGenerator::new(&api_key, &base_url, model)?;
    let request = fixture();

    let generated = generator.generate(&request).await?;
    let screen = &generated.screens[0];

    assert_eq!(screen.id, request.screens[0].screen_id);
    assert!(!screen.tsx.trim().is_empty());
    assert!(screen.tsx.contains("function") || screen.tsx.contains("=>"));
    Ok(())
}

fn fixture() -> GenerateWireframeRequest {
    GenerateWireframeRequest {
        run_id: Uuid::new_v4(),
        selected_libraries: vec!["test-library".to_owned()],
        design_context: DesignContext {
            project_name: "Gateway proof".to_owned(),
            project_type: "web-design".to_owned(),
            viewport_guidance: "Design for a desktop frame.".to_owned(),
            brand_source: "style-guide".to_owned(),
            style_direction_id: None,
            strategy_artifact: r#"{"positioning":"Clear and direct"}"#.to_owned(),
            research_artifact: None,
            moodboard_artifact: None,
            flows_artifact: None,
            selected_skills: Vec::new(),
        },
        screens: vec![ScreenRequest {
            screen_id: "gateway-smoke-test".to_owned(),
            attempt: GenerationAttempt::Initial,
            brief: ScreenBrief {
                title: "Gateway smoke test".to_owned(),
                intent: "Render a compact heading and one primary action button.".to_owned(),
                viewport: Viewport {
                    width: 1280,
                    height: 720,
                },
            },
            components: vec![ComponentBundle {
                component_id: "test-library/button".to_owned(),
                library: "test-library".to_owned(),
                source_revision: "fixture-v1".to_owned(),
                files: vec![SourceFile {
                    path: "components/button.tsx".to_owned(),
                    content: "export function Button({ children }: { children: React.ReactNode }) { return <button type=\"button\">{children}</button>; }".to_owned(),
                }],
            }],
            validation_failures: Vec::new(),
        }],
    }
}
