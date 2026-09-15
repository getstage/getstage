use std::collections::HashMap;
use std::sync::{LazyLock, Mutex};
use std::time::{Duration, Instant};

use serde::Deserialize;

use crate::models::errors::EngineErrorCode;
use crate::models::providers::ProviderId;
use crate::providers::catalog::ProviderRuntimeSpec;
use crate::providers::command::{parse_version, run_command};

const SENSE_TIMEOUT: Duration = Duration::from_secs(6);
const WHICH_TIMEOUT: Duration = Duration::from_secs(2);
const SENSE_CACHE_TTL: Duration = Duration::from_secs(10 * 60);

struct SenseCacheEntry {
    installed_version: String,
    update_available: Option<bool>,
    checked_at: Instant,
}

static SENSE_CACHE: LazyLock<Mutex<HashMap<ProviderId, SenseCacheEntry>>> =
    LazyLock::new(|| Mutex::new(HashMap::new()));

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum InstallSource {
    Native,
    Homebrew,
    Npm,
    Unknown,
}

#[derive(Clone, Debug)]
pub struct UpdateCommand {
    pub program: String,
    pub args: Vec<String>,
}

#[derive(Debug, Deserialize)]
struct NpmLatestPayload {
    version: String,
}

#[derive(Debug, Deserialize)]
struct HomebrewCaskPayload {
    version: String,
}

/// Resolve where the CLI binary lives, then whether a newer release exists.
///
/// Inspired by Synara's install-source maintenance:
/// - Homebrew → brew cask API for latest + `brew upgrade --cask …`
/// - Native / npm / unknown → npm registry as the **version feed** (same semver
///   product releases), update via `claude update` / `codex update` or npm -g
///
/// Results are cached briefly so status polls do not hit `which` + HTTP every time.
pub async fn sense_update_available(
    spec: ProviderRuntimeSpec,
    installed_version: Option<&str>,
    force: bool,
) -> Option<bool> {
    let installed = installed_version?;

    if !force
        && let Ok(cache) = SENSE_CACHE.lock()
        && let Some(entry) = cache.get(&spec.id)
        && entry.installed_version == installed
        && entry.checked_at.elapsed() < SENSE_CACHE_TTL
    {
        return entry.update_available;
    }

    let update_available = sense_update_available_uncached(spec, installed).await;

    if let Ok(mut cache) = SENSE_CACHE.lock() {
        cache.insert(
            spec.id,
            SenseCacheEntry {
                installed_version: installed.to_string(),
                update_available,
                checked_at: Instant::now(),
            },
        );
    }

    update_available
}

async fn sense_update_available_uncached(
    spec: ProviderRuntimeSpec,
    installed: &str,
) -> Option<bool> {
    let path = resolve_binary_path(spec.binary).await?;
    let source = detect_install_source(spec.id, &path);
    let latest = fetch_latest_version(spec, source).await?;
    Some(is_newer_version(&latest, installed))
}

pub fn invalidate_sense_cache(provider_id: ProviderId) {
    if let Ok(mut cache) = SENSE_CACHE.lock() {
        cache.remove(&provider_id);
    }
}

pub async fn resolve_update_command(spec: ProviderRuntimeSpec) -> UpdateCommand {
    let path = resolve_binary_path(spec.binary).await;
    let source = path
        .as_deref()
        .map(|path| detect_install_source(spec.id, path))
        .unwrap_or(InstallSource::Unknown);
    update_command_for(spec, source)
}

fn update_command_for(spec: ProviderRuntimeSpec, source: InstallSource) -> UpdateCommand {
    match (spec.id, source) {
        (ProviderId::Claude, InstallSource::Homebrew) => UpdateCommand {
            program: "brew".to_string(),
            args: vec![
                "upgrade".to_string(),
                "--cask".to_string(),
                "claude-code".to_string(),
            ],
        },
        (ProviderId::Codex, InstallSource::Homebrew) => UpdateCommand {
            program: "brew".to_string(),
            args: vec![
                "upgrade".to_string(),
                "--cask".to_string(),
                "codex".to_string(),
            ],
        },
        (ProviderId::Claude, InstallSource::Npm) => UpdateCommand {
            program: "npm".to_string(),
            args: vec![
                "install".to_string(),
                "-g".to_string(),
                "@anthropic-ai/claude-code@latest".to_string(),
            ],
        },
        (ProviderId::Codex, InstallSource::Npm) => UpdateCommand {
            program: "npm".to_string(),
            args: vec![
                "install".to_string(),
                "-g".to_string(),
                "@openai/codex@latest".to_string(),
            ],
        },
        // Native + unknown: CLI self-update (matches Synara for Claude native).
        _ => UpdateCommand {
            program: spec.binary.to_string(),
            args: spec
                .update_args
                .iter()
                .map(|arg| (*arg).to_string())
                .collect(),
        },
    }
}

pub fn detect_install_source(provider_id: ProviderId, command_path: &str) -> InstallSource {
    let normalized = command_path.replace('\\', "/");

    match provider_id {
        ProviderId::Claude
            if normalized.ends_with("/.local/bin/claude")
                || normalized.contains("/.local/share/claude/") =>
        {
            return InstallSource::Native;
        }
        ProviderId::Codex if normalized.contains("/.codex/") => {
            return InstallSource::Native;
        }
        _ => {}
    }

    if normalized.contains("/Cellar/")
        || normalized.contains("/Caskroom/")
        || normalized.contains("/homebrew/")
        || normalized.contains("/linuxbrew/")
    {
        return InstallSource::Homebrew;
    }

    if normalized.contains("/node_modules/")
        || normalized.contains("/.npm/")
        || normalized.contains("/nvm/")
        || normalized.contains("/.nvm/")
    {
        return InstallSource::Npm;
    }

    InstallSource::Unknown
}

async fn resolve_binary_path(binary: &str) -> Option<String> {
    let result = run_command(
        "which",
        &[binary],
        WHICH_TIMEOUT,
        EngineErrorCode::VersionTimeout,
    )
    .await
    .ok()?;
    if result.code != Some(0) {
        return None;
    }
    let path = result.stdout.lines().next()?.trim();
    if path.is_empty() {
        return None;
    }
    Some(path.to_string())
}

async fn fetch_latest_version(spec: ProviderRuntimeSpec, source: InstallSource) -> Option<String> {
    match source {
        InstallSource::Homebrew => fetch_homebrew_cask_version(homebrew_cask_name(spec.id)?).await,
        // Synara uses npm as the public version feed for native Claude too.
        InstallSource::Native | InstallSource::Npm | InstallSource::Unknown => {
            fetch_npm_latest_version(npm_package_name(spec.id)).await
        }
    }
}

fn npm_package_name(provider_id: ProviderId) -> &'static str {
    match provider_id {
        ProviderId::Claude => "@anthropic-ai/claude-code",
        ProviderId::Codex => "@openai/codex",
    }
}

fn homebrew_cask_name(provider_id: ProviderId) -> Option<&'static str> {
    match provider_id {
        ProviderId::Claude => Some("claude-code"),
        ProviderId::Codex => Some("codex"),
    }
}

async fn fetch_npm_latest_version(package: &str) -> Option<String> {
    let encoded = package.replace('/', "%2F");
    let url = format!("https://registry.npmjs.org/{encoded}/latest");
    fetch_json_version(&url, |body: NpmLatestPayload| body.version).await
}

async fn fetch_homebrew_cask_version(cask: &str) -> Option<String> {
    let url = format!("https://formulae.brew.sh/api/cask/{cask}.json");
    fetch_json_version(&url, |body: HomebrewCaskPayload| body.version).await
}

async fn fetch_json_version<T, F>(url: &str, extract: F) -> Option<String>
where
    T: for<'de> Deserialize<'de>,
    F: FnOnce(T) -> String,
{
    let client = reqwest::Client::builder()
        .timeout(SENSE_TIMEOUT)
        .user_agent("stage-engine/provider-maintenance")
        .build()
        .ok()?;
    let response = client.get(url).send().await.ok()?;
    if !response.status().is_success() {
        return None;
    }
    let payload = response.json::<T>().await.ok()?;
    let version = extract(payload);
    let version = parse_version(&version).unwrap_or(version);
    let version = version.trim();
    if version.is_empty() {
        return None;
    }
    Some(version.to_string())
}

pub fn is_newer_version(candidate: &str, current: &str) -> bool {
    match (version_parts(candidate), version_parts(current)) {
        (Some(candidate_parts), Some(current_parts)) => candidate_parts > current_parts,
        _ => false,
    }
}

fn version_parts(raw: &str) -> Option<[u64; 3]> {
    let numeric = raw
        .trim()
        .split(|character: char| !(character.is_ascii_digit() || character == '.'))
        .next()
        .unwrap_or("")
        .trim_matches('.');

    let mut segments = numeric.split('.').filter(|segment| !segment.is_empty());
    let major = segments.next()?.parse().ok()?;
    let minor = segments.next().unwrap_or("0").parse().ok()?;
    let patch = segments.next().unwrap_or("0").parse().ok()?;
    Some([major, minor, patch])
}

#[cfg(test)]
mod tests {
    use super::{InstallSource, ProviderId, detect_install_source, is_newer_version};

    #[test]
    fn detects_claude_native_path() {
        assert_eq!(
            detect_install_source(ProviderId::Claude, "/Users/x/.local/bin/claude"),
            InstallSource::Native
        );
    }

    #[test]
    fn detects_codex_native_path() {
        assert_eq!(
            detect_install_source(
                ProviderId::Codex,
                "/Users/x/.codex/packages/standalone/current/bin/codex"
            ),
            InstallSource::Native
        );
    }

    #[test]
    fn detects_homebrew_path() {
        assert_eq!(
            detect_install_source(
                ProviderId::Claude,
                "/opt/homebrew/Caskroom/claude-code/2.1.0/claude"
            ),
            InstallSource::Homebrew
        );
    }

    #[test]
    fn compares_versions() {
        assert!(is_newer_version("2.1.208", "2.1.207"));
        assert!(!is_newer_version("2.1.207", "2.1.207"));
        assert!(is_newer_version("2.2", "2.1"));
        assert!(is_newer_version("3", "2.9.9"));
        assert!(!is_newer_version("2.1", "2.1.0"));
    }
}
