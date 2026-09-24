use std::collections::HashMap;
use std::env;
use std::path::{Component, Path, PathBuf};
use std::sync::{LazyLock, Mutex};
use std::time::SystemTime;

use serde::{Deserialize, Serialize};
use tokio::fs;

use crate::models::providers::{
    ProviderId, ProviderModel, ProviderModelSource, ProviderOptionChoice, ProviderOptionDescriptor,
};
use crate::providers::catalog::ProviderRuntimeSpec;
use crate::providers::maintenance::resolve_binary_path;

const STAGE_MODELS_CACHE_FILE: &str = ".stage/provider-models-cache.json";
const CODEX_MODELS_CACHE_FILE: &str = "models_cache.json";
const MAX_CODEX_MODELS_CACHE_BYTES: u64 = 1_048_576;
const MAX_CODEX_MODELS: usize = 64;
const MAX_CLAUDE_BINARY_BYTES: u64 = 400 * 1024 * 1024;
const MAX_CLAUDE_MODELS: usize = 64;
const CLAUDE_ID_NEEDLE: &[u8] = b"\"claude-";

struct ClaudeBinaryModelsCache {
    path: PathBuf,
    modified: Option<SystemTime>,
    len: u64,
    models: Vec<ProviderModel>,
}

static CLAUDE_MODELS_CACHE: LazyLock<Mutex<Option<ClaudeBinaryModelsCache>>> =
    LazyLock::new(|| Mutex::new(None));

#[derive(Debug, Deserialize, Serialize)]
struct StageModelsCacheFile {
    providers: HashMap<String, serde_json::Value>,
}

#[derive(Debug, Deserialize)]
struct CodexModelsCacheFile {
    models: Vec<CodexCachedModel>,
}

#[derive(Debug, Deserialize)]
struct CodexCachedModel {
    slug: String,
    display_name: String,
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
    _provider_version: Option<&str>,
    _force_refresh: bool,
) -> Vec<ProviderModel> {
    fetch_provider_models(spec).await
}

async fn fetch_provider_models(spec: ProviderRuntimeSpec) -> Vec<ProviderModel> {
    match spec.id {
        ProviderId::Codex => fetch_codex_models().await,
        ProviderId::Claude => fetch_claude_models(spec.binary).await,
    }
}

async fn fetch_claude_models(binary: &str) -> Vec<ProviderModel> {
    let Some(resolved) = resolve_binary_path(binary).await else {
        return Vec::new();
    };
    let path = PathBuf::from(resolved);
    if has_parent_dir(&path) {
        return Vec::new();
    }

    let Ok(metadata) = fs::metadata(&path).await else {
        return Vec::new();
    };
    if !metadata.is_file() || metadata.len() == 0 || metadata.len() > MAX_CLAUDE_BINARY_BYTES {
        return Vec::new();
    }

    let modified = metadata.modified().ok();
    if let Ok(cache) = CLAUDE_MODELS_CACHE.lock()
        && let Some(entry) = cache.as_ref()
        && entry.path == path
        && entry.modified == modified
        && entry.len == metadata.len()
    {
        return entry.models.clone();
    }

    let Ok(bytes) = fs::read(&path).await else {
        return Vec::new();
    };
    let models = parse_claude_models_from_binary(&bytes);
    if let Ok(mut cache) = CLAUDE_MODELS_CACHE.lock() {
        *cache = Some(ClaudeBinaryModelsCache {
            path,
            modified,
            len: metadata.len(),
            models: models.clone(),
        });
    }
    models
}

fn parse_claude_models_from_binary(bytes: &[u8]) -> Vec<ProviderModel> {
    let mut ids = extract_quoted_claude_model_ids(bytes);
    ids.sort_by(|left, right| {
        claude_family_rank(left)
            .cmp(&claude_family_rank(right))
            .then_with(|| claude_version_nums(right).cmp(&claude_version_nums(left)))
            .then_with(|| left.cmp(right))
    });
    ids.truncate(MAX_CLAUDE_MODELS);

    let default_id = ids
        .iter()
        .find(|id| claude_family(id) == Some("opus"))
        .cloned();

    ids.into_iter()
        .map(|id| {
            let is_default = default_id.as_deref() == Some(id.as_str());
            claude_provider_model(&id, is_default)
        })
        .collect()
}

fn extract_quoted_claude_model_ids(bytes: &[u8]) -> Vec<String> {
    let mut ids = Vec::new();
    let mut search_from = 0;
    while let Some(relative) = find_subsequence(&bytes[search_from..], CLAUDE_ID_NEEDLE) {
        let start = search_from + relative + 1;
        let rest = &bytes[start..];
        let Some(end) = rest.iter().position(|&byte| byte == b'"') else {
            break;
        };
        if end <= 64
            && let Ok(id) = std::str::from_utf8(&rest[..end])
            && is_selectable_claude_model_id(id)
        {
            ids.push(id.to_string());
        }
        search_from = start + end.saturating_add(1);
        if search_from >= bytes.len() {
            break;
        }
    }
    ids.sort();
    ids.dedup();
    ids
}

fn find_subsequence(haystack: &[u8], needle: &[u8]) -> Option<usize> {
    haystack
        .windows(needle.len())
        .position(|window| window == needle)
}

fn is_selectable_claude_model_id(id: &str) -> bool {
    if !is_safe_provider_model_id(id) || !id.starts_with("claude-") || id.contains("mythos") {
        return false;
    }
    if !id.bytes().any(|byte| byte.is_ascii_digit()) {
        return false;
    }
    if id.split('-').any(|part| {
        part.len() == 8 && part.bytes().all(|byte| byte.is_ascii_digit())
            || (part.len() <= 3
                && part.starts_with('v')
                && part[1..].bytes().all(|byte| byte.is_ascii_digit()))
    }) {
        return false;
    }
    claude_family(id).is_some() && claude_version_at_least(id, &[4, 5])
}

fn claude_version_at_least(id: &str, floor: &[u32]) -> bool {
    let nums = claude_version_nums(id);
    let len = nums.len().max(floor.len());
    for index in 0..len {
        let value = nums.get(index).copied().unwrap_or(0);
        let minimum = floor.get(index).copied().unwrap_or(0);
        if value != minimum {
            return value > minimum;
        }
    }
    true
}

fn claude_family(id: &str) -> Option<&'static str> {
    let rest = id.strip_prefix("claude-")?;
    if rest.starts_with("opus-") {
        Some("opus")
    } else if rest.starts_with("sonnet-") {
        Some("sonnet")
    } else if rest.starts_with("haiku-") {
        Some("haiku")
    } else if rest.starts_with("fable-") {
        Some("fable")
    } else if rest.starts_with("3-") {
        match rest.rsplit('-').next() {
            Some("opus") => Some("opus"),
            Some("sonnet") => Some("sonnet"),
            Some("haiku") => Some("haiku"),
            _ => None,
        }
    } else {
        None
    }
}

fn claude_family_rank(id: &str) -> u8 {
    match claude_family(id) {
        Some("opus") => 0,
        Some("fable") => 1,
        Some("sonnet") => 2,
        Some("haiku") => 3,
        _ => 4,
    }
}

fn claude_version_nums(id: &str) -> Vec<u32> {
    id.split('-').filter_map(|part| part.parse().ok()).collect()
}

fn humanize_claude_model_id(id: &str) -> String {
    let rest = id.strip_prefix("claude-").unwrap_or(id);
    let parts: Vec<&str> = rest.split('-').collect();
    if parts.len() >= 3 && parts[0].bytes().all(|byte| byte.is_ascii_digit()) {
        let family = parts[parts.len() - 1];
        let version = parts[..parts.len() - 1].join(".");
        return format!("Claude {} {version}", title_case(family));
    }
    match parts.split_first() {
        Some((family, version)) if !version.is_empty() => {
            format!("Claude {} {}", title_case(family), version.join("."))
        }
        Some((family, _)) => format!("Claude {}", title_case(family)),
        None => id.to_string(),
    }
}

fn title_case(value: &str) -> String {
    let mut chars = value.chars();
    match chars.next() {
        Some(first) => first.to_uppercase().collect::<String>() + chars.as_str(),
        None => String::new(),
    }
}

fn claude_provider_model(id: &str, is_default: bool) -> ProviderModel {
    ProviderModel {
        id: id.to_string(),
        label: humanize_claude_model_id(id),
        source: ProviderModelSource::Provider,
        is_default: is_default.then_some(true),
        options: vec![ProviderOptionDescriptor::Select {
            id: "reasoning_effort".to_string(),
            label: "Reasoning effort".to_string(),
            description: None,
            options: vec![
                ProviderOptionChoice {
                    id: "low".to_string(),
                    label: "Low".to_string(),
                    description: None,
                    is_default: None,
                },
                ProviderOptionChoice {
                    id: "medium".to_string(),
                    label: "Medium".to_string(),
                    description: None,
                    is_default: Some(true),
                },
                ProviderOptionChoice {
                    id: "high".to_string(),
                    label: "High".to_string(),
                    description: None,
                    is_default: None,
                },
                ProviderOptionChoice {
                    id: "extra-high".to_string(),
                    label: "Extra High".to_string(),
                    description: None,
                    is_default: None,
                },
            ],
            current_value: Some("medium".to_string()),
        }],
    }
}

async fn fetch_codex_models() -> Vec<ProviderModel> {
    let Some(path) = codex_models_cache_path() else {
        return Vec::new();
    };

    let Ok(metadata) = fs::metadata(&path).await else {
        return Vec::new();
    };
    if !metadata.is_file() || metadata.len() == 0 || metadata.len() > MAX_CODEX_MODELS_CACHE_BYTES {
        return Vec::new();
    }

    let Ok(contents) = fs::read_to_string(&path).await else {
        return Vec::new();
    };

    parse_codex_models_cache(&contents)
}

fn parse_codex_models_cache(contents: &str) -> Vec<ProviderModel> {
    let Ok(cache) = serde_json::from_str::<CodexModelsCacheFile>(contents) else {
        return Vec::new();
    };

    cache
        .models
        .into_iter()
        .filter(|model| model.visibility.as_deref().unwrap_or("list") == "list")
        .filter_map(|model| {
            if !is_safe_provider_model_id(&model.slug) || !is_safe_model_label(&model.display_name)
            {
                return None;
            }
            Some(codex_cached_model_to_provider_model(
                model,
                ProviderModelSource::Provider,
            ))
        })
        .take(MAX_CODEX_MODELS)
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
        .filter(|level| is_known_effort(&level.effort))
        .map(|level| ProviderOptionChoice {
            id: map_codex_effort_id(&level.effort),
            label: humanize_effort(&level.effort),
            description: level.description.filter(|text| is_safe_model_label(text)),
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
                .as_deref()
                .filter(|effort| is_known_effort(effort))
                .map(map_codex_effort_id),
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

pub(crate) fn is_safe_provider_model_id(id: &str) -> bool {
    let len = id.len();
    (1..=64).contains(&len)
        && !id.contains("..")
        && id
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'.' | b'_'))
}

fn is_safe_model_label(label: &str) -> bool {
    let trimmed = label.trim();
    !trimmed.is_empty() && trimmed.len() <= 80 && !trimmed.chars().any(char::is_control)
}

fn is_known_effort(effort: &str) -> bool {
    matches!(effort, "low" | "medium" | "high" | "xhigh" | "extra-high")
}

fn codex_models_cache_path() -> Option<PathBuf> {
    let allowed_dir = if let Some(codex_home) = env::var_os("CODEX_HOME") {
        PathBuf::from(codex_home)
    } else {
        let home = env::var_os("HOME").or_else(|| env::var_os("USERPROFILE"))?;
        PathBuf::from(home).join(".codex")
    };

    pin_models_cache_file(&allowed_dir.join(CODEX_MODELS_CACHE_FILE), &allowed_dir)
}

fn pin_models_cache_file(path: &Path, allowed_dir: &Path) -> Option<PathBuf> {
    if path.file_name()?.to_str()? != CODEX_MODELS_CACHE_FILE {
        return None;
    }
    if has_parent_dir(path) || has_parent_dir(allowed_dir) {
        return None;
    }
    if path != allowed_dir.join(CODEX_MODELS_CACHE_FILE).as_path() {
        return None;
    }
    if !path.exists() {
        return Some(path.to_path_buf());
    }

    let canonical_file = path.canonicalize().ok()?;
    let canonical_dir = allowed_dir.canonicalize().ok()?;
    if canonical_file.parent()? != canonical_dir {
        return None;
    }
    if canonical_file.file_name()?.to_str()? != CODEX_MODELS_CACHE_FILE {
        return None;
    }
    Some(canonical_file)
}

fn has_parent_dir(path: &Path) -> bool {
    path.components()
        .any(|component| matches!(component, Component::ParentDir))
}

fn stage_models_cache_path() -> Option<PathBuf> {
    env::var_os("HOME")
        .or_else(|| env::var_os("USERPROFILE"))
        .map(|home| PathBuf::from(home).join(STAGE_MODELS_CACHE_FILE))
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
    use std::fs;
    use std::time::{SystemTime, UNIX_EPOCH};

    #[test]
    fn parses_codex_models_cache_entry() {
        let json = r#"{
            "client_version": "0.135.0",
            "models": [{
                "slug": "gpt-6-astra",
                "display_name": "GPT-6-Astra",
                "visibility": "list",
                "default_reasoning_level": "medium",
                "supported_reasoning_levels": [{ "effort": "high", "description": "Deep" }],
                "additional_speed_tiers": ["fast"]
            }, {
                "slug": "gpt-reserve",
                "display_name": "GPT-Reserve",
                "visibility": "hide"
            }, {
                "slug": "../evil",
                "display_name": "Evil",
                "visibility": "list"
            }]
        }"#;

        let models = parse_codex_models_cache(json);
        assert_eq!(models.len(), 1);
        assert_eq!(models[0].id, "gpt-6-astra");
        assert_eq!(models[0].label, "GPT-6-Astra");
        assert_eq!(models[0].options.len(), 2);
    }

    #[test]
    fn rejects_unsafe_model_ids() {
        assert!(!is_safe_provider_model_id("../etc/passwd"));
        assert!(!is_safe_provider_model_id("gpt 5"));
        assert!(!is_safe_provider_model_id(""));
        assert!(is_safe_provider_model_id("gpt-6-astra"));
        assert!(is_safe_provider_model_id("fable"));
    }

    #[test]
    fn pins_codex_cache_under_allowed_dir() {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("time")
            .as_nanos();
        let dir = std::env::temp_dir().join(format!("stage-codex-models-{unique}"));
        fs::create_dir_all(&dir).expect("temp dir");
        let file = dir.join(CODEX_MODELS_CACHE_FILE);
        fs::write(&file, "{}").expect("cache file");

        let pinned = pin_models_cache_file(&file, &dir).expect("pinned");
        assert_eq!(
            pinned.file_name().and_then(|name| name.to_str()),
            Some(CODEX_MODELS_CACHE_FILE)
        );

        let escaped = dir.join("..").join("models_cache.json");
        assert!(pin_models_cache_file(&escaped, &dir).is_none());

        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn stage_cache_path_is_under_home() {
        let path = stage_models_cache_path();
        assert!(path.is_some());
        assert!(path.unwrap().ends_with(STAGE_MODELS_CACHE_FILE));
    }

    #[test]
    fn parses_claude_catalog_from_local_binary_bytes() {
        let bytes = br#"var jRn=["claude-3-5-haiku","claude-3-opus","claude-fable-5","claude-fable-5-1","claude-haiku-4-5","claude-mythos-5-1","claude-opus-4","claude-opus-4-1","claude-opus-4-8","claude-opus-5","claude-sonnet-3-7","claude-sonnet-4","claude-sonnet-4-5","claude-sonnet-5","claude-opus-4-8-20250929","claude-opus-5-v1"];"#;
        let models = parse_claude_models_from_binary(bytes);
        let ids: Vec<&str> = models.iter().map(|model| model.id.as_str()).collect();

        assert_eq!(
            ids,
            vec![
                "claude-opus-5",
                "claude-opus-4-8",
                "claude-fable-5-1",
                "claude-fable-5",
                "claude-sonnet-5",
                "claude-sonnet-4-5",
                "claude-haiku-4-5",
            ]
        );
        assert_eq!(models[0].label, "Claude Opus 5");
        assert_eq!(models[1].label, "Claude Opus 4.8");
        assert_eq!(models[2].label, "Claude Fable 5.1");
        assert_eq!(models[0].is_default, Some(true));
    }
}
