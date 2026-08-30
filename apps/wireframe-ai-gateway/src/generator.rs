use std::collections::HashSet;

use async_trait::async_trait;
use rig::{client::CompletionClient, completion::Prompt, providers::openai};

use crate::{
    contracts::{GenerateWireframeRequest, GeneratedScreens},
    error::GatewayError,
};

const PREAMBLE: &str = r#"You are Stage's Hi-Fi wireframe designer. Generate every requested React TSX screen as one cohesive product experience.

Design direction:
- First establish one shared visual system internally for the whole batch: typography, spacing rhythm, content widths, palette, radii, surfaces, navigation, and interaction language. Apply it consistently to every screen.
- The supplied designContext is product truth. Use its selected style guide or brand evidence, strategy, research, flows, viewport guidance, and selected design skills. Do not replace them with a generic SaaS aesthetic.
- Give each screen a composition that serves its own intent while clearly belonging to the same product and user journey.
- Use realistic project-specific copy and data. Create clear typographic hierarchy, readable line lengths, balanced density, and deliberate alignment.
- Let content determine page height. Fill each section with meaningful visible content; avoid oversized blank regions, empty viewport fillers, tiny content floating inside large cards, or disconnected grids of identical bordered boxes.
- Use a coherent spacing scale. Keep related items close, separate sections clearly, and keep visual media and text proportional. Prefer normal flex/grid flow for primary content; use layering only when it improves the composition.
- Make the resting frame complete and polished. Hover or motion may enhance it, but important content must already be visible.

Component implementation:
- Each screen includes exact RAG component source bundles assigned to that screen. Adapt at least one of those real components and compose the rest of the page around it.
- You MAY import the exact paths present in those bundles (including `@/components/...` and `@/registry/...`), plus `react`, `lucide-react`, `motion`, and `motion/react`.
- Do not import `@stage/*`, `framer-motion`, or `react-dom/client`, and do not call `createRoot`. Return only a default-exported screen component; Stage mounts it.
- Do not invent component imports, paths, exports, APIs, or packages. Nested registry files included in a bundle are valid source.
- Keep the implementation renderable without runtime fetches. Use Tailwind utilities and accessible semantic React.
- For repair screens, use validationFailures and the previous TSX there to change only what is needed while preserving the shared design.

Return one JSON object only, with camelCase keys:
{"screens":[{"id":"<exact screen id>","tsx":"<complete default-export React component>","dependencies":["external-package"]}]}

Return every requested screen id exactly once. `dependencies` contains only external package names. Do not wrap the JSON in markdown or add prose."#;

#[async_trait]
pub trait WireframeGenerator: Send + Sync {
    fn model(&self) -> &str;

    async fn generate(
        &self,
        request: &GenerateWireframeRequest,
    ) -> Result<GeneratedScreens, GatewayError>;
}

#[derive(Clone)]
pub struct NebiusRigGenerator {
    client: openai::CompletionsClient,
    model: String,
}

impl NebiusRigGenerator {
    pub fn new(api_key: &str, base_url: &str, model: String) -> Result<Self, GatewayError> {
        let client = openai::CompletionsClient::builder()
            .api_key(api_key)
            .base_url(base_url)
            .build()
            .map_err(|_| GatewayError::ProviderUnavailable)?;
        Ok(Self { client, model })
    }
}

#[async_trait]
impl WireframeGenerator for NebiusRigGenerator {
    fn model(&self) -> &str {
        &self.model
    }

    async fn generate(
        &self,
        request: &GenerateWireframeRequest,
    ) -> Result<GeneratedScreens, GatewayError> {
        let context = serde_json::to_string(request).map_err(|_| GatewayError::Serialization)?;
        let agent = self
            .client
            .agent(&self.model)
            .preamble(PREAMBLE)
            .additional_params(serde_json::json!({ "reasoning_effort": "low" }))
            .output_schema::<GeneratedScreens>()
            .build();
        let raw = agent.prompt(context).await.map_err(|error| {
            tracing::error!(%error, "Nebius completion failed");
            GatewayError::ProviderUnavailable
        })?;
        parse_generated_screens(&raw, request)
    }
}

fn parse_generated_screens(
    raw: &str,
    request: &GenerateWireframeRequest,
) -> Result<GeneratedScreens, GatewayError> {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return Err(GatewayError::ProviderNoData);
    }
    let payload = strip_json_fence(trimmed);
    let generated = deserialize_screens(payload)
        .or_else(|| extract_json_object(payload).and_then(deserialize_screens))
        .ok_or_else(|| {
            tracing::warn!(
                preview = %payload.chars().take(240).collect::<String>(),
                "Nebius returned content that is not a GeneratedScreens JSON object"
            );
            GatewayError::ProviderMalformedOutput
        })?;

    let expected = request
        .screens
        .iter()
        .map(|screen| screen.screen_id.as_str())
        .collect::<HashSet<_>>();
    let mut seen = HashSet::new();
    let mut screens = Vec::with_capacity(generated.screens.len());
    for mut screen in generated.screens {
        screen.id = screen.id.trim().to_string();
        if screen.id.is_empty() || screen.tsx.trim().is_empty() || !seen.insert(screen.id.clone()) {
            continue;
        }
        screens.push(screen);
    }
    let returned = screens
        .iter()
        .map(|screen| screen.id.as_str())
        .collect::<HashSet<_>>();
    if screens.is_empty() || !returned.iter().any(|id| expected.contains(*id)) {
        tracing::warn!(
            ?expected,
            ?returned,
            "Nebius batch contained no requested screen ids"
        );
        return Err(GatewayError::ProviderMalformedOutput);
    }
    if !returned.is_subset(&expected) {
        tracing::warn!(
            ?expected,
            ?returned,
            "Nebius returned extra screen ids; keeping requested screens and extras for the engine"
        );
    }
    Ok(GeneratedScreens { screens })
}

fn deserialize_screens(payload: &str) -> Option<GeneratedScreens> {
    serde_json::from_str(payload).ok()
}

fn strip_json_fence(raw: &str) -> &str {
    let trimmed = raw.trim();
    let Some(rest) = trimmed.strip_prefix("```") else {
        return trimmed;
    };
    let rest = rest
        .strip_prefix("json")
        .or_else(|| rest.strip_prefix("JSON"))
        .unwrap_or(rest)
        .trim_start_matches('\n');
    rest.strip_suffix("```")
        .map(str::trim)
        .unwrap_or(rest.trim())
}

fn extract_json_object(raw: &str) -> Option<&str> {
    let start = raw.find('{')?;
    let end = raw.rfind('}')?;
    (end > start).then_some(&raw[start..=end])
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::contracts::{
        ComponentBundle, DesignContext, GenerationAttempt, ScreenBrief, ScreenRequest, SourceFile,
        Viewport,
    };
    use uuid::Uuid;

    fn request(ids: &[&str]) -> GenerateWireframeRequest {
        GenerateWireframeRequest {
            run_id: Uuid::new_v4(),
            selected_libraries: vec!["shadcn-ui".to_owned()],
            design_context: DesignContext {
                project_name: "TradeAxis".to_owned(),
                project_type: "web-design".to_owned(),
                viewport_guidance: "Desktop".to_owned(),
                brand_source: "style-guide".to_owned(),
                style_direction_id: None,
                strategy_artifact: "{}".to_owned(),
                research_artifact: None,
                moodboard_artifact: None,
                flows_artifact: None,
                selected_skills: Vec::new(),
            },
            screens: ids
                .iter()
                .map(|id| ScreenRequest {
                    screen_id: (*id).to_owned(),
                    attempt: GenerationAttempt::Initial,
                    brief: ScreenBrief {
                        title: (*id).to_owned(),
                        intent: "Build the screen".to_owned(),
                        viewport: Viewport {
                            width: 1440,
                            height: 900,
                        },
                    },
                    components: vec![ComponentBundle {
                        component_id: "shadcn-ui/button".to_owned(),
                        library: "shadcn-ui".to_owned(),
                        source_revision: "v1".to_owned(),
                        files: vec![SourceFile {
                            path: "components/ui/button.tsx".to_owned(),
                            content: "export function Button() {}".to_owned(),
                        }],
                    }],
                    validation_failures: Vec::new(),
                })
                .collect(),
        }
    }

    #[test]
    fn preamble_preserves_exact_registry_paths_and_shared_design() {
        assert!(PREAMBLE.contains("exact paths present"));
        assert!(PREAMBLE.contains("@/registry/"));
        assert!(PREAMBLE.contains("shared visual system"));
        assert!(PREAMBLE.contains("style guide"));
    }

    #[test]
    fn parses_complete_batch_json() {
        let parsed = parse_generated_screens(
            r#"{"screens":[{"id":"home","tsx":"export default function Screen() { return <main />; }","dependencies":[]},{"id":"pricing","tsx":"export default function Screen() { return <main />; }","dependencies":[]}]}"#,
            &request(&["home", "pricing"]),
        )
        .expect("valid batch should parse");
        assert_eq!(parsed.screens.len(), 2);
    }

    #[test]
    fn accepts_partial_batch_for_targeted_retry() {
        let parsed = parse_generated_screens(
            r#"{"screens":[{"id":"home","tsx":"export default function Screen() { return <main />; }","dependencies":[]}]}"#,
            &request(&["home", "pricing"]),
        )
        .expect("a valid partial response can be retried by the engine");
        assert_eq!(parsed.screens.len(), 1);
    }

    #[test]
    fn rejects_a_batch_with_only_unrequested_ids() {
        assert!(matches!(
            parse_generated_screens(
                r#"{"screens":[{"id":"other","tsx":"export default function Screen() { return <main />; }","dependencies":[]}]}"#,
                &request(&["home"]),
            ),
            Err(GatewayError::ProviderMalformedOutput)
        ));
    }

    #[test]
    fn keeps_requested_screens_when_the_batch_includes_an_extra_id() {
        let parsed = parse_generated_screens(
            r#"{"screens":[{"id":"home","tsx":"export default function Home() { return <main />; }","dependencies":[]},{"id":"screen-project-dashboard","tsx":"export default function Dashboard() { return <main />; }","dependencies":[]}]}"#,
            &request(&["home", "pricing"]),
        )
        .expect("an extra real screen must not discard the requested ones");
        assert_eq!(parsed.screens.len(), 2);
        assert_eq!(parsed.screens[0].id, "home");
        assert_eq!(parsed.screens[1].id, "screen-project-dashboard");
    }

    #[test]
    fn drops_empty_tsx_without_failing_the_batch() {
        let parsed = parse_generated_screens(
            r#"{"screens":[{"id":"home","tsx":"","dependencies":[]},{"id":"pricing","tsx":"export default function Pricing() { return <main />; }","dependencies":[]}]}"#,
            &request(&["home", "pricing"]),
        )
        .expect("one empty screen is omitted, not a malformed batch");
        assert_eq!(parsed.screens.len(), 1);
        assert_eq!(parsed.screens[0].id, "pricing");
    }

    #[test]
    fn parses_fenced_batch_json() {
        let parsed = parse_generated_screens(
            "```json\n{\"screens\":[{\"id\":\"home\",\"tsx\":\"export default function Screen() { return <main />; }\",\"dependencies\":[]}]}\n```",
            &request(&["home"]),
        )
        .expect("fenced batch should parse");
        assert_eq!(parsed.screens[0].id, "home");
    }

    #[test]
    fn empty_content_is_no_data() {
        assert!(matches!(
            parse_generated_screens("   ", &request(&["home"])),
            Err(GatewayError::ProviderNoData)
        ));
    }
}
