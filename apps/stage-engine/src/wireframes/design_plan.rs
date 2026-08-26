use std::collections::HashSet;

use anyhow::{Context, bail};
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;

use crate::helpers::provider_json::matching_object_end;

pub const DESIGN_PLAN_SCHEMA_VERSION: &str = "1";

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WireframeDesignPlan {
    pub schema_version: String,
    pub aesthetic_thesis: String,
    pub target_audience: String,
    pub design_system: DesignSystemPlan,
    pub shared_patterns: SharedPatternPlan,
    pub screens: Vec<ScreenDesignPlan>,
    #[serde(default)]
    pub conflict_resolutions: Vec<SkillConflictResolution>,
    pub avoid_list: Vec<String>,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DesignSystemPlan {
    pub typography: TypographyPlan,
    pub palette: PalettePlan,
    pub spacing_scale: Vec<String>,
    pub radii: Vec<String>,
    pub elevation: Vec<String>,
    pub surface_treatment: String,
    pub icon_treatment: String,
    pub information_density: String,
    pub visual_variance: String,
    pub motion: MotionVocabulary,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TypographyPlan {
    pub display: String,
    pub body: String,
    pub label: String,
    pub data: String,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PalettePlan {
    pub background: String,
    pub surface: String,
    pub foreground: String,
    pub muted: String,
    pub accent: String,
    pub border: String,
    pub semantic: String,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MotionVocabulary {
    pub principle: String,
    pub durations: String,
    pub easing: String,
    pub reduced_motion: String,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SharedPatternPlan {
    pub navigation: String,
    pub forms: String,
    pub tables_and_lists: String,
    pub feedback: String,
    pub empty_states: String,
    pub validation: String,
    pub loading: String,
    pub modal_dialog: String,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScreenDesignPlan {
    pub screen_id: String,
    pub purpose: String,
    pub screen_role: String,
    pub layout_archetype: String,
    pub density: String,
    pub information_hierarchy: Vec<String>,
    pub content_requirements: Vec<String>,
    pub flow_context: String,
    pub component_recipe: Vec<PlannedComponent>,
    pub motion_purpose: String,
    pub avoid_list: Vec<String>,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PlannedComponent {
    pub library_id: String,
    pub export_name: String,
    pub purpose: String,
    pub placement: String,
    pub required_props: Vec<String>,
    pub motion_purpose: String,
    #[serde(default)]
    pub signature: bool,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SkillConflictResolution {
    pub conflict: String,
    pub decision: String,
    pub evidence: String,
}

impl WireframeDesignPlan {
    pub fn validate(&self, expected_screen_ids: &[String]) -> anyhow::Result<()> {
        if self.schema_version != DESIGN_PLAN_SCHEMA_VERSION {
            bail!("design plan schemaVersion must be {DESIGN_PLAN_SCHEMA_VERSION}");
        }

        require_text("aestheticThesis", &self.aesthetic_thesis)?;
        require_text("targetAudience", &self.target_audience)?;
        self.design_system.validate()?;
        self.shared_patterns.validate()?;
        require_list("avoidList", &self.avoid_list, 1)?;
        if self.screens.is_empty() {
            bail!("design plan must contain at least one screen recipe");
        }

        let mut seen = HashSet::with_capacity(self.screens.len());
        let mut layout_archetypes = HashSet::with_capacity(self.screens.len());
        for screen in &self.screens {
            screen.validate()?;
            if !seen.insert(screen.screen_id.as_str()) {
                bail!(
                    "design plan contains duplicate screen id {}",
                    screen.screen_id
                );
            }
            let layout = screen.layout_archetype.trim().to_ascii_lowercase();
            if matches!(
                layout.as_str(),
                "dashboard" | "standard dashboard" | "standard page" | "card grid" | "generic page"
            ) {
                bail!(
                    "screen {} uses the generic layout archetype `{}`",
                    screen.screen_id,
                    screen.layout_archetype
                );
            }
            if !layout_archetypes.insert(layout) {
                bail!(
                    "design plan repeats layout archetype `{}`; every target screen needs a distinct composition",
                    screen.layout_archetype
                );
            }
        }
        for expected in expected_screen_ids {
            if !seen.contains(expected.as_str()) {
                bail!("design plan is missing screen recipe {expected}");
            }
        }
        for resolution in &self.conflict_resolutions {
            require_text("conflictResolutions[].conflict", &resolution.conflict)?;
            require_text("conflictResolutions[].decision", &resolution.decision)?;
            require_text("conflictResolutions[].evidence", &resolution.evidence)?;
        }
        Ok(())
    }
}

impl DesignSystemPlan {
    fn validate(&self) -> anyhow::Result<()> {
        self.typography.validate()?;
        self.palette.validate()?;
        require_list("designSystem.spacingScale", &self.spacing_scale, 3)?;
        require_list("designSystem.radii", &self.radii, 2)?;
        require_list("designSystem.elevation", &self.elevation, 2)?;
        require_text("designSystem.surfaceTreatment", &self.surface_treatment)?;
        require_text("designSystem.iconTreatment", &self.icon_treatment)?;
        require_text("designSystem.informationDensity", &self.information_density)?;
        require_text("designSystem.visualVariance", &self.visual_variance)?;
        self.motion.validate()
    }
}

impl TypographyPlan {
    fn validate(&self) -> anyhow::Result<()> {
        require_text("designSystem.typography.display", &self.display)?;
        require_text("designSystem.typography.body", &self.body)?;
        require_text("designSystem.typography.label", &self.label)?;
        require_text("designSystem.typography.data", &self.data)
    }
}

impl PalettePlan {
    fn validate(&self) -> anyhow::Result<()> {
        require_text("designSystem.palette.background", &self.background)?;
        require_text("designSystem.palette.surface", &self.surface)?;
        require_text("designSystem.palette.foreground", &self.foreground)?;
        require_text("designSystem.palette.muted", &self.muted)?;
        require_text("designSystem.palette.accent", &self.accent)?;
        require_text("designSystem.palette.border", &self.border)?;
        require_text("designSystem.palette.semantic", &self.semantic)
    }
}

impl MotionVocabulary {
    fn validate(&self) -> anyhow::Result<()> {
        require_text("designSystem.motion.principle", &self.principle)?;
        require_text("designSystem.motion.durations", &self.durations)?;
        require_text("designSystem.motion.easing", &self.easing)?;
        require_text("designSystem.motion.reducedMotion", &self.reduced_motion)
    }
}

impl SharedPatternPlan {
    fn validate(&self) -> anyhow::Result<()> {
        require_text("sharedPatterns.navigation", &self.navigation)?;
        require_text("sharedPatterns.forms", &self.forms)?;
        require_text("sharedPatterns.tablesAndLists", &self.tables_and_lists)?;
        require_text("sharedPatterns.feedback", &self.feedback)?;
        require_text("sharedPatterns.emptyStates", &self.empty_states)?;
        require_text("sharedPatterns.validation", &self.validation)?;
        require_text("sharedPatterns.loading", &self.loading)?;
        require_text("sharedPatterns.modalDialog", &self.modal_dialog)
    }
}

impl ScreenDesignPlan {
    fn validate(&self) -> anyhow::Result<()> {
        require_text("screens[].screenId", &self.screen_id)?;
        require_text("screens[].purpose", &self.purpose)?;
        require_text("screens[].screenRole", &self.screen_role)?;
        require_text("screens[].layoutArchetype", &self.layout_archetype)?;
        require_text("screens[].density", &self.density)?;
        require_list(
            "screens[].informationHierarchy",
            &self.information_hierarchy,
            2,
        )?;
        require_list(
            "screens[].contentRequirements",
            &self.content_requirements,
            1,
        )?;
        require_text("screens[].flowContext", &self.flow_context)?;
        require_text("screens[].motionPurpose", &self.motion_purpose)?;
        require_list("screens[].avoidList", &self.avoid_list, 1)?;
        if self.component_recipe.is_empty() {
            bail!("screen {} has an empty component recipe", self.screen_id);
        }
        for component in &self.component_recipe {
            require_text("componentRecipe[].libraryId", &component.library_id)?;
            require_text("componentRecipe[].exportName", &component.export_name)?;
            require_text("componentRecipe[].purpose", &component.purpose)?;
            require_text("componentRecipe[].placement", &component.placement)?;
            require_text("componentRecipe[].motionPurpose", &component.motion_purpose)?;
        }
        Ok(())
    }
}

fn require_text(field: &str, value: &str) -> anyhow::Result<()> {
    if value.trim().is_empty() {
        bail!("design plan field {field} must not be empty");
    }
    Ok(())
}

fn require_list(field: &str, values: &[String], minimum: usize) -> anyhow::Result<()> {
    if values.len() < minimum || values.iter().any(|value| value.trim().is_empty()) {
        bail!("design plan field {field} must contain at least {minimum} non-empty values");
    }
    Ok(())
}

pub fn extract_design_plan(
    provider_text: &str,
    expected_screen_ids: &[String],
) -> anyhow::Result<WireframeDesignPlan> {
    let object = find_design_plan_object(provider_text)
        .context("provider output did not contain a wireframe design plan object")?;
    let value = object.get("designPlan").cloned().unwrap_or(object);
    let plan = serde_json::from_value::<WireframeDesignPlan>(value)
        .context("provider output did not match the wireframe design plan schema")?;
    plan.validate(expected_screen_ids)?;
    Ok(plan)
}

fn find_design_plan_object(text: &str) -> Option<JsonValue> {
    let trimmed = text.trim();
    if let Ok(value) = serde_json::from_str::<JsonValue>(trimmed)
        && is_design_plan_object(&value)
    {
        return Some(value);
    }

    let mut found = None;
    for (start, _) in text.match_indices('{') {
        let Some(end) = matching_object_end(text, start) else {
            continue;
        };
        let Ok(value) = serde_json::from_str::<JsonValue>(&text[start..=end]) else {
            continue;
        };
        if is_design_plan_object(&value) {
            found = Some(value);
        }
    }
    found
}

fn is_design_plan_object(value: &JsonValue) -> bool {
    value
        .get("schemaVersion")
        .and_then(JsonValue::as_str)
        .is_some()
        || value
            .get("designPlan")
            .and_then(|plan| plan.get("schemaVersion"))
            .and_then(JsonValue::as_str)
            .is_some()
}

pub fn design_plan_from_artifact(
    artifact_json: &str,
    expected_screen_ids: &[String],
) -> anyhow::Result<WireframeDesignPlan> {
    let artifact = serde_json::from_str::<JsonValue>(artifact_json)
        .context("existing wireframes artifact is invalid JSON")?;
    let value = artifact
        .get("designPlan")
        .cloned()
        .context("existing wireframes artifact has no designPlan")?;
    let plan = serde_json::from_value::<WireframeDesignPlan>(value)
        .context("existing wireframes designPlan has an invalid schema")?;
    plan.validate(expected_screen_ids)?;
    Ok(plan)
}

pub fn expected_screen_ids(
    input_existing_artifact: Option<&str>,
    flows_artifact: Option<&str>,
    target_screen_ids: Option<&[String]>,
) -> Vec<String> {
    if let Some(ids) = target_screen_ids.filter(|ids| !ids.is_empty()) {
        return unique_ids(ids.iter().map(String::as_str));
    }

    let from_flows = flows_artifact
        .and_then(|raw| serde_json::from_str::<JsonValue>(raw).ok())
        .and_then(|value| value.get("screens").and_then(JsonValue::as_array).cloned())
        .map(|screens| {
            unique_ids(
                screens
                    .iter()
                    .filter_map(|screen| screen.get("id").and_then(JsonValue::as_str)),
            )
        })
        .unwrap_or_default();
    if !from_flows.is_empty() {
        return from_flows;
    }

    input_existing_artifact
        .and_then(|raw| serde_json::from_str::<JsonValue>(raw).ok())
        .and_then(|value| {
            value
                .get("configureScreens")
                .and_then(JsonValue::as_array)
                .cloned()
        })
        .map(|screens| {
            unique_ids(screens.iter().filter_map(|screen| {
                let selected = screen
                    .get("selected")
                    .and_then(JsonValue::as_bool)
                    .unwrap_or(true);
                selected
                    .then(|| screen.get("id").and_then(JsonValue::as_str))
                    .flatten()
            }))
        })
        .unwrap_or_default()
}

fn unique_ids<'a>(ids: impl Iterator<Item = &'a str>) -> Vec<String> {
    let mut seen = HashSet::new();
    ids.filter_map(|id| {
        let id = id.trim();
        (!id.is_empty() && seen.insert(id.to_string())).then(|| id.to_string())
    })
    .collect()
}

#[cfg(test)]
#[path = "../testing/wireframes/design_plan.rs"]
mod tests;
