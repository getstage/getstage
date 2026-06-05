use std::collections::HashMap;
use std::env;
use std::path::PathBuf;

use serde::{Deserialize, Serialize};
use tokio::fs;

use crate::helpers::time::now_millis;
use crate::models::providers::{
    ProviderId, ProviderModel, ProviderModelSource, ProviderOptionChoice, ProviderOptionDescriptor,
};
use crate::providers::catalog::{ProviderRuntimeSpec, fallback_models};

const STAGE_MODELS_CACHE_FILE: &str = ".stage/provider-models-cache.json";

#[derive(Debug, Serialize, Deserialize)]
struct StageModelsCacheFile {
    providers: HashMap<String, StageProviderModelsCache>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct StageProviderModelsCache {
    provider_version: String,
    fetched_at: u128,
    models: Vec<ProviderModel>,
}

#[derive(Debug, Deserialize)]
struct CodexModelsCacheFile {
    #[serde(rename = "client_version")]
    _client_version: Option<String>,
    models: Vec<CodexCachedModel>,
}

#[derive(Debug, Deserialize)]
struct CodexCachedModel {
    slug: String,
    display_name: String,
    #[serde(rename = "description")]
    _description: Option<String>,
    #[serde(default)]
    visibility: Option<String>,
    is_default: Option<bool>,
    default_reasoning_level: Option<String>,
    supported_reasoning_levels: Option<Vec<CodexReasoningLevel>>,
    additional_speed_tiers: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
struct CodexReasoningLevel {
    effort: String,
    description: Option<String>,
}

pub async fn resolve_provider_models(
    spec: ProviderRuntimeSpec,
    provider_version: Option<&str>,
    force_refresh: bool,
) -> Vec<ProviderModel> {
    let version = provider_version.unwrap_or("unknown").to_string();

    if !force_refresh {
        if let Some(cached) = load_stage_cache(spec.id, &version).await {
            return cached;
        }
    }

    let fetched = fetch_provider_models(spec, &version).await;
    if !fetched.is_empty() {
        store_stage_cache(spec.id, &version, &fetched).await;
        return fetched;
    }

    fallback_models(spec.id)
}

async fn fetch_provider_models(
    spec: ProviderRuntimeSpec,
    provider_version: &str,
) -> Vec<ProviderModel> {
    match spec.id {
        ProviderId::Codex => fetch_codex_models(provider_version).await,
        ProviderId::Claude => fetch_claude_models(provider_version).await,
    }
}

async fn fetch_codex_models(_provider_version: &str) -> Vec<ProviderModel> {
    let Some(path) = codex_models_cache_path() else {
        return Vec::new();
    };

    let Ok(contents) = fs::read_to_string(&path).await else {
        return Vec::new();
    };

    let Ok(cache) = serde_json::from_str::<CodexModelsCacheFile>(&contents) else {
        return Vec::new();
    };

    let source = ProviderModelSource::Provider;

    cache
        .models
        .into_iter()
        .filter(|model| model.visibility.as_deref().unwrap_or("list") == "list")
        .map(|model| codex_cached_model_to_provider_model(model, source))
        .collect()
}

fn codex_cached_model_to_provider_model(
    model: CodexCachedModel,
    source: ProviderModelSource,
) -> ProviderModel {
    let reasoning_options: Vec<ProviderOptionChoice> = model
        .supported_reasoning_levels
        .unwrap_or_default()
        .into_iter()
        .map(|level| ProviderOptionChoice {
            id: map_codex_effort_id(&level.effort),
            label: humanize_effort(&level.effort),
            description: level.description,
            is_default: model
                .default_reasoning_level
                .as_deref()
                .is_some_and(|default| default == level.effort)
                .then_some(true),
        })
        .collect();

    let mut options = Vec::new();
    if !reasoning_options.is_empty() {
        options.push(ProviderOptionDescriptor::Select {
            id: "reasoning_effort".to_string(),
            label: "Reasoning effort".to_string(),
            description: None,
            options: reasoning_options,
            current_value: model
                .default_reasoning_level
                .map(|effort| map_codex_effort_id(&effort)),
        });
    }

    if model
        .additional_speed_tiers
        .as_ref()
        .is_some_and(|tiers| tiers.iter().any(|tier| tier == "fast"))
    {
        options.push(ProviderOptionDescriptor::Select {
            id: "response_speed".to_string(),
            label: "Speed".to_string(),
            description: Some("Fast uses the provider's priority speed tier.".to_string()),
            options: vec![
                ProviderOptionChoice {
                    id: "default".to_string(),
                    label: "Default".to_string(),
                    description: None,
                    is_default: Some(true),
                },
                ProviderOptionChoice {
                    id: "fast".to_string(),
                    label: "Fast".to_string(),
                    description: None,
                    is_default: None,
                },
            ],
            current_value: Some("default".to_string()),
        });
    }

    ProviderModel {
        id: model.slug,
        label: model.display_name,
        source,
        is_default: model.is_default,
        options,
    }
}

async fn fetch_claude_models(_provider_version: &str) -> Vec<ProviderModel> {
    Vec::new()
}

fn codex_models_cache_path() -> Option<PathBuf> {
    let home = env::var_os("CODEX_HOME")
        .or_else(|| env::var_os("HOME"))
        .map(PathBuf::from)?;

    Some(home.join("models_cache.json"))
}

fn stage_models_cache_path() -> Option<PathBuf> {
    env::var_os("HOME").map(|home| PathBuf::from(home).join(STAGE_MODELS_CACHE_FILE))
}

async fn load_stage_cache(
    provider_id: ProviderId,
    provider_version: &str,
) -> Option<Vec<ProviderModel>> {
    let path = stage_models_cache_path()?;
    let contents = fs::read_to_string(path).await.ok()?;
    let cache = serde_json::from_str::<StageModelsCacheFile>(&contents).ok()?;
    let entry = cache.providers.get(&provider_route_key(provider_id))?;
    if entry.provider_version != provider_version {
        return None;
    }

    Some(entry.models.clone())
}

async fn store_stage_cache(
    provider_id: ProviderId,
    provider_version: &str,
    models: &[ProviderModel],
) {
    let Some(path) = stage_models_cache_path() else {
        return;
    };

    if let Some(parent) = path.parent() {
        let _ = fs::create_dir_all(parent).await;
    }

    let mut cache = fs::read_to_string(&path)
        .await
        .ok()
        .and_then(|contents| serde_json::from_str::<StageModelsCacheFile>(&contents).ok())
        .unwrap_or(StageModelsCacheFile {
            providers: HashMap::new(),
        });

    cache.providers.insert(
        provider_route_key(provider_id),
        StageProviderModelsCache {
            provider_version: provider_version.to_string(),
            fetched_at: now_millis(),
            models: models.to_vec(),
        },
    );

    if let Ok(serialized) = serde_json::to_string_pretty(&cache) {
        let _ = fs::write(path, serialized).await;
    }
}

pub async fn invalidate_stage_models_cache(provider_id: ProviderId) {
    let Some(path) = stage_models_cache_path() else {
        return;
    };

    let Ok(contents) = fs::read_to_string(&path).await else {
        return;
    };

    let Ok(mut cache) = serde_json::from_str::<StageModelsCacheFile>(&contents) else {
        return;
    };

    cache.providers.remove(&provider_route_key(provider_id));

    if let Ok(serialized) = serde_json::to_string_pretty(&cache) {
        let _ = fs::write(path, serialized).await;
    }
}

fn provider_route_key(provider_id: ProviderId) -> String {
    match provider_id {
        ProviderId::Claude => "claude".to_string(),
        ProviderId::Codex => "codex".to_string(),
    }
}

fn map_codex_effort_id(effort: &str) -> String {
    match effort {
        "xhigh" => "extra-high".to_string(),
        other => other.to_string(),
    }
}

fn humanize_effort(effort: &str) -> String {
    match effort {
        "low" => "Low",
        "medium" => "Medium",
        "high" => "High",
        "xhigh" => "Extra High",
        other => other,
    }
    .to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_codex_models_cache_entry() {
        let json = r#"{
            "client_version": "0.135.0",
            "models": [{
                "slug": "gpt-5.5",
                "display_name": "GPT-5.5",
                "visibility": "list",
                "default_reasoning_level": "medium",
                "supported_reasoning_levels": [{ "effort": "high", "description": "Deep" }],
                "additional_speed_tiers": ["fast"]
            }]
        }"#;

        let cache: CodexModelsCacheFile = serde_json::from_str(json).unwrap();
        let model = codex_cached_model_to_provider_model(
            cache.models.into_iter().next().unwrap(),
            ProviderModelSource::Provider,
        );

        assert_eq!(model.id, "gpt-5.5");
        assert_eq!(model.label, "GPT-5.5");
        assert_eq!(model.options.len(), 2);
    }

    #[test]
    fn stage_cache_path_is_under_home() {
        let path = stage_models_cache_path();
        assert!(path.is_some());
        assert!(path.unwrap().ends_with(STAGE_MODELS_CACHE_FILE));
    }
}
