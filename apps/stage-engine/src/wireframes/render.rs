use std::path::{Path, PathBuf};
use std::process::Stdio;
use std::time::Duration;

use serde::Deserialize;
use serde_json::{Value as JsonValue, json};
use tokio::process::Command;

const RENDER_TIMEOUT: Duration = Duration::from_secs(90);
const DEFAULT_BASE_LIBRARY: &str = "shadcn-ui";

/// How a screen's final HTML was produced. Persisted per screen because the React path
/// falls back silently: without this, a run that produced nothing but hand-written model
/// HTML looks identical to a fully rendered one outside the engine logs.
pub const RENDER_MODE_REACT: &str = "react";
pub const RENDER_MODE_FALLBACK: &str = "html-fallback";

/// A virtual module the generated TSX may import, the libraries that can satisfy it, and
/// the manifest section describing them.
pub struct LibrarySlot {
    pub module: &'static str,
    pub label: &'static str,
    pub manifest_key: &'static str,
    pub library_ids: &'static [&'static str],
}

/// Base first: it is the only required slot, and `RendererLibraries` relies on that order.
pub const LIBRARY_SLOTS: [LibrarySlot; 3] = [
    LibrarySlot {
        module: "@stage/base",
        label: "Base",
        manifest_key: "base",
        library_ids: &["shadcn-ui", "kokonut-ui", "origin-ui", "mantine"],
    },
    LibrarySlot {
        module: "@stage/sections",
        label: "Sections",
        manifest_key: "sections",
        library_ids: &["magic-ui", "aceternity-ui"],
    },
    LibrarySlot {
        module: "@stage/charts",
        label: "Data visuals",
        manifest_key: "charts",
        library_ids: &["bklit-ui"],
    },
];

/// The libraries bound for one run. Base is stored as a plain `String` so it always
/// resolves by construction, and the optional slots hold only what the run actually
/// selected — there is no "unselected" value for callers to special-case.
#[derive(Clone, Debug)]
pub struct RendererLibraries {
    base: String,
    optional: Vec<(&'static str, String)>,
}

impl RendererLibraries {
    pub fn resolve(component_pack_ids: &[String]) -> Self {
        let selected = |slot: &LibrarySlot| {
            component_pack_ids
                .iter()
                .find(|id| slot.library_ids.contains(&id.as_str()))
                .cloned()
        };
        let (base_slot, optional_slots) = LIBRARY_SLOTS
            .split_first()
            .expect("LIBRARY_SLOTS always contains the base slot");

        Self {
            base: selected(base_slot).unwrap_or_else(|| DEFAULT_BASE_LIBRARY.to_string()),
            optional: optional_slots
                .iter()
                .filter_map(|slot| selected(slot).map(|id| (slot.module, id)))
                .collect(),
        }
    }

    /// Every bound slot, base first, paired with the library that satisfies it.
    pub fn selected(&self) -> impl Iterator<Item = (&'static LibrarySlot, &str)> {
        LIBRARY_SLOTS.iter().filter_map(|slot| {
            if slot.module == LIBRARY_SLOTS[0].module {
                return Some((slot, self.base.as_str()));
            }
            self.optional
                .iter()
                .find(|(module, _)| *module == slot.module)
                .map(|(_, id)| (slot, id.as_str()))
        })
    }

    fn as_json(&self) -> JsonValue {
        JsonValue::Object(
            self.selected()
                .map(|(slot, id)| (slot.module.to_string(), json!(id)))
                .collect(),
        )
    }
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

fn set_render_mode(screen: &mut JsonValue, mode: &str) {
    if let Some(object) = screen.as_object_mut() {
        object.insert("renderMode".to_string(), json!(mode));
    }
}

/// Renders screens carrying TSX. A failed screen keeps its existing HTML fallback, and
/// every screen is stamped with the mode that produced its final HTML.
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

    // Fallback is the truth until a screen is proven to have rendered.
    for screen in screens.iter_mut() {
        set_render_mode(screen, RENDER_MODE_FALLBACK);
    }

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
            object.insert("renderMode".to_string(), json!(RENDER_MODE_REACT));
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
        "libraries": libraries.as_json(),
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

    // The CLI exits non-zero when every screen failed, but it still writes a valid
    // payload whose per-screen `error` fields say why. Parsing before checking the exit
    // status keeps those reasons; checking first collapsed them all into "exited 1" with
    // an empty stderr, which is exactly the case worth debugging.
    match serde_json::from_slice::<RenderPayload>(&output.stdout) {
        Ok(payload) => Ok(payload),
        Err(parse_error) => {
            let stderr = String::from_utf8_lossy(&output.stderr);
            if stderr.trim().is_empty() {
                anyhow::bail!(
                    "renderer exited {} and its output could not be read: {parse_error}",
                    output.status
                );
            }
            anyhow::bail!("renderer exited {}: {stderr}", output.status);
        }
    }
}

pub fn repair_prompt_for_failures(
    failures: &[RenderFailure],
    libraries: &RendererLibraries,
) -> String {
    let mut body = String::from(
        "Repair ONLY these wireframe screens. Return generatedScreens[] with the same ids, fixed \"tsx\", and a minimal \"html\" fallback.\n",
    );
    for (slot, id) in libraries.selected() {
        body.push_str(&format!(
            "Selected {} library: {id} — import it only from \"{}\".\n",
            slot.label, slot.module
        ));
    }
    body.push_str(
        "Do not import any other component library, Node API, or browser global.\n\n",
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
    fn resolves_each_slot_independently() {
        let ids = vec![
            "magic-ui".to_string(),
            "kokonut-ui".to_string(),
            "bklit-ui".to_string(),
        ];
        let libraries = RendererLibraries::resolve(&ids);
        assert_eq!(
            libraries.as_json(),
            json!({
                "@stage/base": "kokonut-ui",
                "@stage/sections": "magic-ui",
                "@stage/charts": "bklit-ui",
            })
        );
    }

    #[test]
    fn unselected_optional_slots_are_absent_and_base_defaults() {
        let libraries = RendererLibraries::resolve(&[]);
        assert_eq!(
            libraries.as_json(),
            json!({ "@stage/base": DEFAULT_BASE_LIBRARY })
        );
    }
}
