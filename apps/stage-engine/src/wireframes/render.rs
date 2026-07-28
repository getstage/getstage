use std::path::{Path, PathBuf};
use std::process::Stdio;
use std::time::Duration;

use serde::Deserialize;
use serde_json::{Value as JsonValue, json};
use tokio::process::Command;

const RENDER_TIMEOUT: Duration = Duration::from_secs(90);
const BASE_LIBRARY_IDS: [&str; 4] = ["shadcn-ui", "kokonut-ui", "origin-ui", "mantine"];
const SECTION_LIBRARY_IDS: [&str; 2] = ["magic-ui", "aceternity-ui"];

#[derive(Clone, Debug)]
pub struct RendererLibraries {
    pub base: String,
    pub sections: Option<String>,
}

pub fn resolve_renderer_libraries(component_pack_ids: &[String]) -> RendererLibraries {
    let base = component_pack_ids
        .iter()
        .find(|id| BASE_LIBRARY_IDS.contains(&id.as_str()))
        .cloned()
        .unwrap_or_else(|| "shadcn-ui".to_string());
    let sections = component_pack_ids
        .iter()
        .find(|id| SECTION_LIBRARY_IDS.contains(&id.as_str()))
        .cloned();
    RendererLibraries { base, sections }
}

/// Opt out with `STAGE_WIREFRAMES_REACT_RENDER=0`.
pub fn react_render_enabled() -> bool {
    match std::env::var("STAGE_WIREFRAMES_REACT_RENDER").as_deref() {
        Ok("0") | Ok("false") | Ok("FALSE") | Ok("off") => false,
        Ok("1") | Ok("true") | Ok("TRUE") => true,
        _ => {
            let root = renderer_root();
            root.join("package.json").exists() && root.join("node_modules").exists()
        }
    }
}

fn renderer_root() -> PathBuf {
    std::env::var_os("STAGE_WIREFRAME_RENDERER_ROOT")
        .map(PathBuf::from)
        .unwrap_or_else(|| {
            Path::new(env!("CARGO_MANIFEST_DIR"))
                .join("../..")
                .join("packages/wireframe-renderer")
        })
}

#[derive(Debug, Deserialize)]
struct RenderScreenOut {
    id: String,
    html: String,
    #[serde(default)]
    error: Option<String>,
}

#[derive(Debug, Deserialize)]
struct RenderPayload {
    screens: Vec<RenderScreenOut>,
}

#[derive(Debug, Clone)]
pub struct RenderFailure {
    pub id: String,
    pub tsx: String,
    pub error: String,
}

/// Renders screens carrying TSX. A failed screen keeps its existing HTML fallback.
pub async fn apply_react_render(
    artifact: &mut JsonValue,
    libraries: &RendererLibraries,
) -> anyhow::Result<Vec<RenderFailure>> {
    let Some(screens) = artifact
        .get_mut("generatedScreens")
        .and_then(JsonValue::as_array_mut)
    else {
        return Ok(Vec::new());
    };

    let mut batch = Vec::new();
    let mut tsx_by_id = std::collections::HashMap::new();
    for screen in screens.iter() {
        let id = screen.get("id").and_then(JsonValue::as_str).unwrap_or("");
        let Some(tsx) = screen.get("tsx").and_then(JsonValue::as_str) else {
            continue;
        };
        if id.is_empty() || tsx.trim().is_empty() {
            continue;
        }
        tsx_by_id.insert(id.to_string(), tsx.to_string());
        batch.push(json!({ "id": id, "tsx": tsx }));
    }
    if batch.is_empty() {
        return Ok(Vec::new());
    }

    let rendered = match render_batch(libraries, &batch).await {
        Ok(payload) => payload,
        Err(error) => {
            tracing::warn!(%error, "wireframe react renderer unavailable; keeping html fallback");
            return Ok(tsx_by_id
                .into_iter()
                .map(|(id, tsx)| RenderFailure {
                    id,
                    tsx,
                    error: error.to_string(),
                })
                .collect());
        }
    };

    let mut failures = Vec::new();
    for out in rendered.screens {
        if let Some(error) = out.error {
            tracing::warn!(screen_id = %out.id, %error, "wireframe react render failed");
            if let Some(tsx) = tsx_by_id.get(&out.id) {
                failures.push(RenderFailure {
                    id: out.id,
                    tsx: tsx.clone(),
                    error,
                });
            }
            continue;
        }
        if out.html.trim().is_empty() {
            continue;
        }
        if let Some(screen) = screens
            .iter_mut()
            .find(|screen| screen.get("id").and_then(JsonValue::as_str) == Some(out.id.as_str()))
            && let Some(object) = screen.as_object_mut()
        {
            object.insert("html".to_string(), json!(out.html));
        }
    }
    Ok(failures)
}

async fn render_batch(
    libraries: &RendererLibraries,
    screens: &[JsonValue],
) -> anyhow::Result<RenderPayload> {
    let root = renderer_root();
    let tsx_cli = root.join("node_modules/tsx/dist/cli.mjs");
    let renderer_cli = root.join("src/cli.ts");
    if !tsx_cli.exists() || !renderer_cli.exists() {
        anyhow::bail!(
            "wireframe renderer runtime is incomplete at {}",
            root.display()
        );
    }

    let input = json!({
        "version": 1,
        "baseLibraryId": libraries.base,
        "sectionsLibraryId": libraries.sections,
        "screens": screens,
    });
    let node_binary =
        std::env::var_os("STAGE_WIREFRAME_NODE_BINARY").unwrap_or_else(|| "node".into());
    let mut child = Command::new(node_binary)
        .arg(&tsx_cli)
        .args(["--tsconfig"])
        .arg(root.join("tsconfig.json"))
        .arg(&renderer_cli)
        .current_dir(&root)
        .env("ELECTRON_RUN_AS_NODE", "1")
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .kill_on_drop(true)
        .spawn()?;

    if let Some(mut stdin) = child.stdin.take() {
        use tokio::io::AsyncWriteExt;
        stdin.write_all(input.to_string().as_bytes()).await?;
        stdin.shutdown().await?;
    }

    let output = tokio::time::timeout(RENDER_TIMEOUT, child.wait_with_output())
        .await
        .map_err(|_| anyhow::anyhow!("wireframe renderer timed out after 90 seconds"))??;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        anyhow::bail!("renderer exited {}: {stderr}", output.status);
    }

    Ok(serde_json::from_slice(&output.stdout)?)
}

pub fn repair_prompt_for_failures(
    failures: &[RenderFailure],
    libraries: &RendererLibraries,
) -> String {
    let sections = libraries.sections.as_deref().unwrap_or("none");
    let mut body = format!(
        "Repair ONLY these wireframe screens. Return generatedScreens[] with the same ids, fixed \"tsx\", and a minimal \"html\" fallback.\n\
         Selected Base library: {}. Selected Sections library: {sections}.\n\
         Import Base components only from \"@stage/base\" and optional Sections components only from \"@stage/sections\". Do not import Node APIs or browser globals.\n\n",
        libraries.base
    );
    for failure in failures {
        body.push_str(&format!(
            "Screen `{}` failed to render:\n{}\n\nPrevious TSX:\n```tsx\n{}\n```\n\n",
            failure.id, failure.error, failure.tsx
        ));
    }
    body
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn resolves_base_and_sections_independently() {
        let ids = vec!["magic-ui".to_string(), "kokonut-ui".to_string()];
        let libraries = resolve_renderer_libraries(&ids);
        assert_eq!(libraries.base, "kokonut-ui");
        assert_eq!(libraries.sections.as_deref(), Some("magic-ui"));
    }
}
