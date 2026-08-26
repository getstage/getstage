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
        library_ids: &["magic-ui", "aceternity-ui", "react-bits"],
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

/// The style guide this run designs against, shaped for the renderer's `theme` input.
///
/// The renderer maps it onto the CSS variables every vendored library reads, so `Button`
/// and `Card` come out in the project's brand instead of the grayscale defaults. Returns
/// `None` when there is no style guide to apply — the renderer then keeps its defaults.
pub fn brand_theme(
    moodboard_artifact_json: Option<&str>,
    style_direction_id: Option<&str>,
) -> Option<JsonValue> {
    let artifact: JsonValue = serde_json::from_str(moodboard_artifact_json?).ok()?;
    let guides = artifact.get("styleGuides")?.as_array()?;
    // A run pinned to a direction must theme from that direction's guide, not whichever
    // one happens to be first.
    let guide = style_direction_id
        .and_then(|id| {
            guides.iter().find(|guide| {
                guide.get("directionId").and_then(JsonValue::as_str) == Some(id)
                    || guide.get("id").and_then(JsonValue::as_str) == Some(id)
            })
        })
        .or_else(|| guides.first())?;

    let palettes: Vec<JsonValue> = guide
        .get("colorPalettes")
        .and_then(JsonValue::as_array)
        .map(|entries| {
            entries
                .iter()
                .filter_map(|entry| {
                    let hex = entry.get("hex").and_then(JsonValue::as_str)?;
                    Some(json!({
                        "label": entry.get("label").and_then(JsonValue::as_str).unwrap_or(""),
                        "hex": hex,
                        "colors": entry.get("colors").cloned().unwrap_or_else(|| json!([])),
                    }))
                })
                .collect()
        })
        .unwrap_or_default();

    let font_family = guide
        .get("typography")
        .and_then(|typography| typography.get("fontFamily"))
        .and_then(JsonValue::as_str)
        .unwrap_or("");

    if palettes.is_empty() && font_family.is_empty() {
        return None;
    }
    Some(json!({ "fontFamily": font_family, "palettes": palettes }))
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
    /// Self-contained runnable HTML doc (React + motion) for the live preview.
    #[serde(default, rename = "liveHtml")]
    live_html: Option<String>,
    #[serde(default)]
    error: Option<String>,
    /// True when the renderer fixed double-escaped quotes itself instead of failing —
    /// logged so we can see how often the model makes that mechanical mistake.
    #[serde(default)]
    repaired: bool,
}

#[derive(Debug, Deserialize)]
struct RenderPayload {
    screens: Vec<RenderScreenOut>,
    /// The batch's compiled stylesheet. Emitted once because it is identical for
    /// every screen — embedding it per screen is what pushed artifacts past the
    /// Convex 1 MiB document limit. Optional for renderer versions that still
    /// inline it.
    #[serde(default)]
    css: Option<String>,
}

/// What a render pass produced: the screens that failed (for the repair prompt) and
/// the run's shared stylesheet (for the R2 offload). `Default` covers every early
/// return where no screen rendered.
#[derive(Debug, Default)]
pub struct ReactRenderOutcome {
    pub failures: Vec<RenderFailure>,
    pub css: Option<String>,
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
    theme: Option<&JsonValue>,
) -> anyhow::Result<ReactRenderOutcome> {
    let Some(screens) = artifact
        .get_mut("generatedScreens")
        .and_then(JsonValue::as_array_mut)
    else {
        return Ok(ReactRenderOutcome::default());
    };

    // Fallback is the truth until a screen is proven to have rendered.
    for screen in screens.iter_mut() {
        set_render_mode(screen, RENDER_MODE_FALLBACK);
    }

    let mut batch = Vec::new();
    let mut failures = Vec::new();
    let mut tsx_by_id = std::collections::HashMap::new();
    for screen in screens.iter() {
        let id = screen.get("id").and_then(JsonValue::as_str).unwrap_or("");
        if id.is_empty() {
            continue;
        }
        let tsx = screen.get("tsx").and_then(JsonValue::as_str).unwrap_or("");
        if tsx.trim().is_empty() {
            failures.push(RenderFailure {
                id: id.to_string(),
                tsx: String::new(),
                error: "Screen has no non-empty TSX implementation.".to_string(),
            });
            continue;
        }
        tsx_by_id.insert(id.to_string(), tsx.to_string());
        batch.push(json!({ "id": id, "tsx": tsx }));
    }
    if batch.is_empty() {
        return Ok(ReactRenderOutcome {
            failures,
            css: None,
        });
    }

    let rendered = match render_batch(libraries, theme, &batch).await {
        Ok(payload) => payload,
        Err(error) => {
            tracing::warn!(%error, "wireframe react renderer unavailable; keeping html fallback");
            return Ok(ReactRenderOutcome {
                failures: tsx_by_id
                    .into_iter()
                    .map(|(id, tsx)| RenderFailure {
                        id,
                        tsx,
                        error: error.to_string(),
                    })
                    .collect(),
                css: None,
            });
        }
    };

    let mut pending = tsx_by_id
        .keys()
        .cloned()
        .collect::<std::collections::HashSet<_>>();
    for out in rendered.screens {
        pending.remove(&out.id);
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
            if let Some(tsx) = tsx_by_id.get(&out.id) {
                failures.push(RenderFailure {
                    id: out.id,
                    tsx: tsx.clone(),
                    error: "Renderer returned empty static HTML.".to_string(),
                });
            }
            continue;
        }
        if out.repaired {
            tracing::info!(screen_id = %out.id, "renderer self-repaired double-escaped quotes; no model repair pass needed");
        }
        if let Some(screen) = screens
            .iter_mut()
            .find(|screen| screen.get("id").and_then(JsonValue::as_str) == Some(out.id.as_str()))
            && let Some(object) = screen.as_object_mut()
        {
            object.insert("html".to_string(), json!(out.html));
            if let Some(live) = out.live_html.filter(|l| !l.trim().is_empty()) {
                object.insert("liveHtml".to_string(), json!(live));
            }
            object.insert("renderMode".to_string(), json!(RENDER_MODE_REACT));
        }
    }
    for id in pending {
        if let Some(tsx) = tsx_by_id.get(&id) {
            failures.push(RenderFailure {
                id,
                tsx: tsx.clone(),
                error: "Renderer returned no result for this screen.".to_string(),
            });
        }
    }
    Ok(ReactRenderOutcome {
        failures,
        css: rendered.css,
    })
}

async fn render_batch(
    libraries: &RendererLibraries,
    theme: Option<&JsonValue>,
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

    let mut input = json!({
        "version": 1,
        "libraries": libraries.as_json(),
        "screens": screens,
    });
    if let Some(theme) = theme
        && let Some(object) = input.as_object_mut()
    {
        object.insert("theme".to_string(), theme.clone());
    }
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
    body.push_str("Do not import any other component library, Node API, or browser global.\n");
    // The model already saw the library manifest at generation time and still produced an
    // invalid call — restate the hard contract so the repair cannot repeat it.
    body.push_str("Every component call must pass all required props exactly as listed in the manifest, and every lucide-react import must be a real exported icon name.\n");
    body.push_str("Never position copy with absolute/fixed or negative margins — stack text with flex/grid only.\n\n");
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

    #[tokio::test]
    async fn missing_tsx_is_an_explicit_render_failure() {
        let libraries = RendererLibraries::resolve(&[]);
        let mut artifact = json!({
            "generatedScreens": [{ "id": "dashboard", "html": "<main>Fallback</main>" }]
        });

        let outcome = apply_react_render(&mut artifact, &libraries, None)
            .await
            .unwrap();

        assert_eq!(outcome.failures.len(), 1);
        assert_eq!(outcome.failures[0].id, "dashboard");
        assert!(outcome.failures[0].error.contains("no non-empty TSX"));
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
