use std::fs;
use std::path::{Component, Path, PathBuf};
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use anyhow::{Context, bail};
use serde::Serialize;
use sha2::{Digest, Sha256};
use uuid::Uuid;

const WORKSPACE_SCHEMA_VERSION: &str = "1";
const WORKSPACE_TTL: Duration = Duration::from_secs(24 * 60 * 60);
const MAX_CONTEXT_FILES: usize = 256;
const MAX_CONTEXT_FILE_BYTES: usize = 10 * 1024 * 1024;
const MAX_CONTEXT_TOTAL_BYTES: usize = 64 * 1024 * 1024;

#[derive(Clone, Copy, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum ContextAccessPolicy {
    Required,
    OnDemand,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderContextFile {
    pub path: String,
    pub role: String,
    pub bytes: usize,
    pub sha256: String,
    pub provenance: &'static str,
    pub sensitivity: &'static str,
    pub policy: ContextAccessPolicy,
    pub calls: Vec<String>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ProviderWorkspaceManifest<'a> {
    schema_version: &'static str,
    run_id: &'a str,
    files: &'a [ProviderContextFile],
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ProviderCallManifest<'a> {
    schema_version: &'static str,
    call_id: &'a str,
    required_files: &'a [String],
    on_demand_files: &'a [String],
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct WorkspaceMarker<'a> {
    schema_version: &'static str,
    run_id: &'a str,
    engine_instance_id: &'a str,
    owner_pid: u32,
    state: &'a str,
    created_at: u64,
    expires_at: u64,
}

#[derive(Clone, Debug)]
pub struct ProviderCallFiles {
    pub required_paths: Vec<String>,
    pub on_demand_paths: Vec<String>,
}

#[derive(Debug)]
pub struct ProviderWorkspace {
    run_id: String,
    engine_instance_id: String,
    created_at: u64,
    root: PathBuf,
    files: Vec<ProviderContextFile>,
    total_bytes: usize,
}

impl ProviderWorkspace {
    pub fn create(run_id: &str) -> anyhow::Result<Self> {
        let parent = workspace_parent();
        fs::create_dir_all(&parent)
            .with_context(|| format!("create provider workspace root {}", parent.display()))?;
        set_owner_only_directory(&parent)?;
        prune_expired_workspaces(&parent);

        let nonce = Uuid::new_v4();
        let root = parent.join(format!("{}-{nonce}.building", sanitize_segment(run_id)));
        fs::create_dir(&root)
            .with_context(|| format!("create provider workspace {}", root.display()))?;
        set_owner_only_directory(&root)?;

        let workspace = Self {
            run_id: run_id.to_string(),
            engine_instance_id: Uuid::new_v4().to_string(),
            created_at: unix_millis(),
            root,
            files: Vec::new(),
            total_bytes: 0,
        };
        workspace.write_marker("building")?;
        Ok(workspace)
    }

    pub fn root(&self) -> &Path {
        &self.root
    }

    pub fn write_text(
        &mut self,
        relative_path: &str,
        role: &str,
        policy: ContextAccessPolicy,
        calls: &[&str],
        content: &str,
    ) -> anyhow::Result<()> {
        self.write_bytes(relative_path, role, policy, calls, content.as_bytes())
    }

    pub fn write_bytes(
        &mut self,
        relative_path: &str,
        role: &str,
        policy: ContextAccessPolicy,
        calls: &[&str],
        content: &[u8],
    ) -> anyhow::Result<()> {
        validate_relative_path(relative_path)?;
        if self.files.len() >= MAX_CONTEXT_FILES {
            bail!("provider workspace exceeds {MAX_CONTEXT_FILES} context files");
        }
        if content.len() > MAX_CONTEXT_FILE_BYTES {
            bail!("provider context file {relative_path} exceeds the 10 MiB limit");
        }
        let next_total = self.total_bytes.saturating_add(content.len());
        if next_total > MAX_CONTEXT_TOTAL_BYTES {
            bail!("provider workspace exceeds the 64 MiB context limit");
        }
        if self.files.iter().any(|file| file.path == relative_path) {
            bail!("provider context file already exists: {relative_path}");
        }

        let path = self.root.join(relative_path);
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)
                .with_context(|| format!("create context directory {}", parent.display()))?;
            set_owner_only_directory(parent)?;
        }
        atomic_write(&path, content)?;
        set_owner_only_file(&path)?;

        self.files.push(ProviderContextFile {
            path: relative_path.to_string(),
            role: role.to_string(),
            bytes: content.len(),
            sha256: format!("{:x}", Sha256::digest(content)),
            provenance: context_provenance(relative_path),
            sensitivity: context_sensitivity(relative_path),
            policy,
            calls: calls.iter().map(|call| (*call).to_string()).collect(),
        });
        self.total_bytes = next_total;
        self.flush_manifest()?;
        Ok(())
    }

    pub fn seal(&mut self) -> anyhow::Result<()> {
        self.flush_manifest()?;
        self.write_marker("ready")?;
        let ready = self.root.with_extension("ready");
        fs::rename(&self.root, &ready).with_context(|| {
            format!(
                "seal provider workspace {} as {}",
                self.root.display(),
                ready.display()
            )
        })?;
        self.root = ready;
        self.write_marker("in-use")?;
        Ok(())
    }

    pub fn touch_lease(&self) -> anyhow::Result<()> {
        self.write_marker("in-use")
    }

    pub fn write_call_manifest(
        &mut self,
        call_id: &str,
        required_files: &[String],
        on_demand_files: &[String],
    ) -> anyhow::Result<ProviderCallFiles> {
        let on_demand_files = on_demand_files
            .iter()
            .filter(|path| required_files.contains(path) == false)
            .cloned()
            .collect::<Vec<_>>();
        for path in required_files.iter().chain(&on_demand_files) {
            if !self.files.iter().any(|file| &file.path == path) {
                bail!("call {call_id} references an unknown context file: {path}");
            }
        }

        let manifest_relative = format!("calls/{}.json", sanitize_segment(call_id));
        let body = serde_json::to_vec_pretty(&ProviderCallManifest {
            schema_version: WORKSPACE_SCHEMA_VERSION,
            call_id,
            required_files,
            on_demand_files: &on_demand_files,
        })?;
        self.write_bytes(
            &manifest_relative,
            "provider call manifest",
            ContextAccessPolicy::Required,
            &[call_id],
            &body,
        )?;
        self.touch_lease()?;

        let manifest_path = self.absolute_path(&manifest_relative);
        let required_paths = std::iter::once(manifest_path.clone())
            .chain(required_files.iter().map(|path| self.absolute_path(path)))
            .collect();
        let on_demand_paths = on_demand_files
            .iter()
            .map(|path| self.absolute_path(path))
            .collect();
        Ok(ProviderCallFiles {
            required_paths,
            on_demand_paths,
        })
    }

    pub fn verify_integrity(&self) -> anyhow::Result<()> {
        for entry in &self.files {
            let path = self.root.join(&entry.path);
            let metadata = fs::symlink_metadata(&path)
                .with_context(|| format!("could not inspect provider context {}", entry.path))?;
            anyhow::ensure!(
                metadata.file_type().is_file(),
                "provider context path is not a regular file: {}",
                entry.path
            );
            anyhow::ensure!(
                metadata.len() == entry.bytes as u64,
                "provider context size changed: {}",
                entry.path
            );
            let bytes = fs::read(&path)
                .with_context(|| format!("could not verify provider context {}", entry.path))?;
            let hash = format!("{:x}", Sha256::digest(&bytes));
            anyhow::ensure!(
                hash == entry.sha256,
                "provider context hash changed: {}",
                entry.path
            );
        }
        Ok(())
    }

    pub fn manifest_json(&self) -> serde_json::Value {
        serde_json::json!({
            "schemaVersion": WORKSPACE_SCHEMA_VERSION,
            "runId": self.run_id,
            "root": self.root,
            "files": self.files,
        })
    }

    fn absolute_path(&self, relative_path: &str) -> String {
        self.root.join(relative_path).to_string_lossy().into_owned()
    }

    fn flush_manifest(&self) -> anyhow::Result<()> {
        let body = serde_json::to_vec_pretty(&ProviderWorkspaceManifest {
            schema_version: WORKSPACE_SCHEMA_VERSION,
            run_id: &self.run_id,
            files: &self.files,
        })?;
        atomic_write(&self.root.join("context-manifest.json"), &body)
    }

    fn write_marker(&self, state: &str) -> anyhow::Result<()> {
        let body = serde_json::to_vec_pretty(&WorkspaceMarker {
            schema_version: WORKSPACE_SCHEMA_VERSION,
            run_id: &self.run_id,
            engine_instance_id: &self.engine_instance_id,
            owner_pid: std::process::id(),
            state,
            created_at: self.created_at,
            expires_at: unix_millis() + WORKSPACE_TTL.as_millis() as u64,
        })?;
        atomic_write(&self.root.join(".stage-workspace.json"), &body)
    }
}

impl Drop for ProviderWorkspace {
    fn drop(&mut self) {
        if !self.root.exists() {
            return;
        }
        let deleting = self.root.with_extension("deleting");
        let target = match fs::rename(&self.root, &deleting) {
            Ok(()) => deleting,
            Err(error) => {
                tracing::warn!(
                    path = %self.root.display(),
                    %error,
                    "could not tombstone provider workspace before cleanup"
                );
                self.root.clone()
            }
        };
        if let Err(error) = fs::remove_dir_all(&target) {
            tracing::warn!(
                path = %target.display(),
                %error,
                "provider workspace cleanup deferred to stale-workspace janitor"
            );
        }
    }
}

fn workspace_parent() -> PathBuf {
    std::env::temp_dir().join("stage-wireframes-workspaces")
}

fn prune_expired_workspaces(parent: &Path) {
    let Ok(entries) = fs::read_dir(parent) else {
        return;
    };
    let now = unix_millis();
    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }
        let marker_path = path.join(".stage-workspace.json");
        let Ok(marker) = fs::read(&marker_path) else {
            continue;
        };
        let expires_at = serde_json::from_slice::<serde_json::Value>(&marker)
            .ok()
            .and_then(|value| value.get("expiresAt").and_then(serde_json::Value::as_u64));
        if expires_at.is_some_and(|expires_at| expires_at <= now)
            && let Err(error) = fs::remove_dir_all(&path)
        {
            tracing::warn!(path = %path.display(), %error, "could not prune expired provider workspace");
        }
    }
}

fn context_provenance(path: &str) -> &'static str {
    match path.split('/').next().unwrap_or_default() {
        "contracts" | "calls" => "stage-runtime",
        "skills" => "selected-vendored-skill",
        "libraries" => "selected-vendored-library",
        "assets" => "selected-project-r2-asset",
        "design" | "screens" | "project" => "selected-project-context",
        "repairs" | "checkpoints" => "current-provider-run",
        _ => "stage-runtime",
    }
}

fn context_sensitivity(path: &str) -> &'static str {
    match path.split('/').next().unwrap_or_default() {
        "project" | "assets" | "design" | "screens" | "repairs" | "checkpoints" => {
            "project-confidential"
        }
        _ => "stage-internal",
    }
}

fn validate_relative_path(path: &str) -> anyhow::Result<()> {
    let path = Path::new(path);
    if path.as_os_str().is_empty()
        || path.is_absolute()
        || path
            .components()
            .any(|component| !matches!(component, Component::Normal(_)))
    {
        bail!("provider context path must be a normalized relative path");
    }
    Ok(())
}

fn atomic_write(path: &Path, content: &[u8]) -> anyhow::Result<()> {
    let parent = path
        .parent()
        .context("provider context file has no parent directory")?;
    let temporary = parent.join(format!(
        ".{}.{}.tmp",
        path.file_name()
            .and_then(|name| name.to_str())
            .unwrap_or("context"),
        Uuid::new_v4()
    ));
    fs::write(&temporary, content)
        .with_context(|| format!("write temporary context file {}", temporary.display()))?;
    set_owner_only_file(&temporary)?;
    fs::rename(&temporary, path).with_context(|| format!("commit context file {}", path.display()))
}

fn sanitize_segment(value: &str) -> String {
    let sanitized = value
        .chars()
        .map(|character| {
            if character.is_ascii_alphanumeric() || matches!(character, '-' | '_') {
                character
            } else {
                '_'
            }
        })
        .collect::<String>();
    if sanitized.is_empty() {
        "context".to_string()
    } else {
        sanitized
    }
}

fn unix_millis() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}

#[cfg(unix)]
fn set_owner_only_directory(path: &Path) -> anyhow::Result<()> {
    use std::os::unix::fs::PermissionsExt;
    fs::set_permissions(path, fs::Permissions::from_mode(0o700))
        .with_context(|| format!("secure provider workspace directory {}", path.display()))
}

#[cfg(not(unix))]
fn set_owner_only_directory(_path: &Path) -> anyhow::Result<()> {
    Ok(())
}

#[cfg(unix)]
fn set_owner_only_file(path: &Path) -> anyhow::Result<()> {
    use std::os::unix::fs::PermissionsExt;
    fs::set_permissions(path, fs::Permissions::from_mode(0o600))
        .with_context(|| format!("secure provider workspace file {}", path.display()))
}

#[cfg(not(unix))]
fn set_owner_only_file(_path: &Path) -> anyhow::Result<()> {
    Ok(())
}
