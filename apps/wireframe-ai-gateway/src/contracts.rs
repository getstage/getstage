use std::collections::HashSet;

use rig::schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Copy, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum GenerationAttempt {
    Initial,
    Repair,
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct Viewport {
    pub width: u16,
    pub height: u16,
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ScreenBrief {
    pub title: String,
    pub intent: String,
    pub viewport: Viewport,
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct SourceFile {
    pub path: String,
    pub content: String,
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ComponentBundle {
    pub component_id: String,
    pub library: String,
    pub source_revision: String,
    pub files: Vec<SourceFile>,
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct SelectedSkill {
    pub id: String,
    pub guidance: String,
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct DesignContext {
    pub project_name: String,
    pub project_type: String,
    pub viewport_guidance: String,
    pub brand_source: String,
    pub style_direction_id: Option<String>,
    pub strategy_artifact: String,
    pub research_artifact: Option<String>,
    pub moodboard_artifact: Option<String>,
    pub flows_artifact: Option<String>,
    pub selected_skills: Vec<SelectedSkill>,
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ScreenRequest {
    pub screen_id: String,
    pub attempt: GenerationAttempt,
    pub brief: ScreenBrief,
    pub components: Vec<ComponentBundle>,
    #[serde(default)]
    pub validation_failures: Vec<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct GenerateWireframeRequest {
    pub run_id: Uuid,
    pub selected_libraries: Vec<String>,
    pub design_context: DesignContext,
    pub screens: Vec<ScreenRequest>,
}

#[derive(Debug, Clone, Deserialize, Serialize, JsonSchema, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct GeneratedScreen {
    pub id: String,
    pub tsx: String,
    #[serde(default)]
    pub dependencies: Vec<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize, JsonSchema, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct GeneratedScreens {
    pub screens: Vec<GeneratedScreen>,
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct GenerateWireframeResponse {
    pub run_id: Uuid,
    pub screens: Vec<GeneratedScreen>,
    pub model: String,
}

impl GenerateWireframeRequest {
    pub fn validate(&self, limits: &RequestLimits) -> Result<(), String> {
        if self.selected_libraries.is_empty() {
            return Err("selectedLibraries must contain at least one library".to_owned());
        }
        if self.design_context.project_name.trim().is_empty() {
            return Err("designContext.projectName must not be empty".to_owned());
        }
        if self.design_context.strategy_artifact.trim().is_empty() {
            return Err("designContext.strategyArtifact must not be empty".to_owned());
        }
        if self.screens.is_empty() {
            return Err("screens must contain at least one screen".to_owned());
        }

        let mut ids = HashSet::with_capacity(self.screens.len());
        for screen in &self.screens {
            if screen.screen_id.trim().is_empty() {
                return Err("screens[].screenId must not be empty".to_owned());
            }
            if !ids.insert(screen.screen_id.as_str()) {
                return Err(format!("duplicate screenId {}", screen.screen_id));
            }
            if screen.brief.intent.trim().is_empty() {
                return Err(format!(
                    "brief.intent must not be empty for {}",
                    screen.screen_id
                ));
            }
            if screen.components.is_empty() {
                return Err(format!(
                    "components must contain at least one exact source bundle for {}",
                    screen.screen_id
                ));
            }
            if screen.components.len() > limits.max_component_bundles {
                return Err(format!(
                    "components for {} exceeds the configured limit of {}",
                    screen.screen_id, limits.max_component_bundles
                ));
            }
            if screen.validation_failures.len() > limits.max_validation_failures {
                return Err(format!(
                    "validationFailures for {} exceeds the configured limit of {}",
                    screen.screen_id, limits.max_validation_failures
                ));
            }

            let source_bytes = screen
                .components
                .iter()
                .flat_map(|bundle| &bundle.files)
                .map(|file| file.path.len().saturating_add(file.content.len()))
                .try_fold(0usize, usize::checked_add)
                .ok_or_else(|| "component source size overflowed".to_owned())?;
            if source_bytes > limits.max_source_bytes {
                return Err(format!(
                    "component source for {} exceeds the configured per-screen limit of {} bytes",
                    screen.screen_id, limits.max_source_bytes
                ));
            }

            if screen.attempt == GenerationAttempt::Initial
                && !screen.validation_failures.is_empty()
            {
                return Err(format!(
                    "validationFailures is only valid for a repair attempt ({})",
                    screen.screen_id
                ));
            }
            if screen.attempt == GenerationAttempt::Repair && screen.validation_failures.is_empty()
            {
                return Err(format!(
                    "a repair attempt requires validationFailures ({})",
                    screen.screen_id
                ));
            }
        }
        Ok(())
    }
}

#[derive(Debug, Clone, Copy)]
pub struct RequestLimits {
    pub max_component_bundles: usize,
    pub max_source_bytes: usize,
    pub max_validation_failures: usize,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn request() -> GenerateWireframeRequest {
        GenerateWireframeRequest {
            run_id: Uuid::new_v4(),
            selected_libraries: vec!["origin-ui".to_owned()],
            design_context: DesignContext {
                project_name: "Stage".to_owned(),
                project_type: "web-design".to_owned(),
                viewport_guidance: "Desktop".to_owned(),
                brand_source: "style-guide".to_owned(),
                style_direction_id: Some("direction-1".to_owned()),
                strategy_artifact: "{}".to_owned(),
                research_artifact: None,
                moodboard_artifact: Some("{}".to_owned()),
                flows_artifact: None,
                selected_skills: Vec::new(),
            },
            screens: vec![ScreenRequest {
                screen_id: "marketing-home".to_owned(),
                attempt: GenerationAttempt::Initial,
                brief: ScreenBrief {
                    title: "Marketing home".to_owned(),
                    intent: "Explain the product and convert visitors".to_owned(),
                    viewport: Viewport {
                        width: 1440,
                        height: 900,
                    },
                },
                components: vec![ComponentBundle {
                    component_id: "origin-ui/button".to_owned(),
                    library: "origin-ui".to_owned(),
                    source_revision: "v1".to_owned(),
                    files: vec![SourceFile {
                        path: "components/ui/button.tsx".to_owned(),
                        content: "export function Button() {}".to_owned(),
                    }],
                }],
                validation_failures: Vec::new(),
            }],
        }
    }

    fn limits() -> RequestLimits {
        RequestLimits {
            max_component_bundles: 8,
            max_source_bytes: 1024,
            max_validation_failures: 8,
        }
    }

    #[test]
    fn generated_batch_schema_matches_the_gateway_contract() {
        let schema = serde_json::to_value(rig::schemars::schema_for!(GeneratedScreens))
            .expect("schema should serialize");
        assert!(schema["properties"]["screens"].is_object());
        assert_eq!(
            schema["$defs"]["GeneratedScreen"]["properties"]
                .as_object()
                .map(|properties| properties.keys().cloned().collect::<Vec<_>>()),
            Some(vec![
                "dependencies".to_owned(),
                "id".to_owned(),
                "tsx".to_owned()
            ])
        );
    }

    #[test]
    fn accepts_bounded_batch_request() {
        let mut request = request();
        let mut second = request.screens[0].clone();
        second.screen_id = "pricing".to_owned();
        request.screens.push(second);
        assert!(request.validate(&limits()).is_ok());
    }

    #[test]
    fn rejects_duplicate_screen_ids() {
        let mut request = request();
        request.screens.push(request.screens[0].clone());
        assert!(
            request
                .validate(&limits())
                .is_err_and(|message| message.contains("duplicate screenId"))
        );
    }

    #[test]
    fn rejects_initial_request_with_repair_failures() {
        let mut request = request();
        request.screens[0].validation_failures = vec!["broken import".to_owned()];
        assert!(
            request
                .validate(&limits())
                .is_err_and(|message| message.contains("only valid for a repair"))
        );
    }

    #[test]
    fn rejects_oversized_component_source_per_screen() {
        let mut request = request();
        request.screens[0].components[0].files[0].content = "x".repeat(2048);
        assert!(
            request
                .validate(&limits())
                .is_err_and(|message| message.contains("per-screen limit"))
        );
    }
}
