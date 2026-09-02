//! Per-run wireframes debug dump — what the model saw, what it wrote, what we rendered.
//!
//! Enabled when `STAGE_WIREFRAMES_DEBUG_DUMP=1` (or unset in a debug build). Set to `0`
//! to silence. Writes under `/tmp/stage-wireframes/<run_id>/` and logs the path so the
//! Electron terminal points at the files without dumping 200k-char prompts inline.

use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Arc;

use serde_json::json;

/// One dump session for a single wireframes run. Cheap to clone (`Arc` of the dir).
#[derive(Clone, Debug)]
pub struct WireframesDebugDump {
    inner: Option<Arc<DumpInner>>,
}

#[derive(Debug)]
struct DumpInner {
    dir: PathBuf,
    run_id: String,
}

impl WireframesDebugDump {
    /// Opens a dump directory when enabled. Always logs whether dump is on/off.
    pub fn open(run_id: &str) -> Self {
        if !dump_enabled() {
            tracing::info!(
                run_id = %run_id,
                "wireframes debug dump OFF (set STAGE_WIREFRAMES_DEBUG_DUMP=1 to enable)"
            );
            return Self { inner: None };
        }

        let root = dump_root();
        if let Err(error) = fs::create_dir_all(&root) {
            tracing::warn!(path = %root.display(), %error, "could not create wireframes debug root");
            return Self { inner: None };
        }
        prune_expired_debug_dumps(&root);
        let dir = root.join(run_id);
        match fs::create_dir_all(&dir) {
            Ok(()) => {
                tracing::info!(
                    run_id = %run_id,
                    path = %dir.display(),
                    "wireframes debug dump ON — writing run artifacts here"
                );
                Self {
                    inner: Some(Arc::new(DumpInner {
                        dir,
                        run_id: run_id.to_string(),
                    })),
                }
            }
            Err(error) => {
                tracing::warn!(
                    run_id = %run_id,
                    %error,
                    "wireframes debug dump enabled but could not create directory"
                );
                Self { inner: None }
            }
        }
    }

    pub fn dir(&self) -> Option<&Path> {
        self.inner.as_ref().map(|inner| inner.dir.as_path())
    }

    pub fn write_text(&self, file_name: &str, body: &str) {
        let Some(inner) = &self.inner else {
            return;
        };
        let path = inner.dir.join(file_name);
        match fs::write(&path, body) {
            Ok(()) => tracing::info!(
                run_id = %inner.run_id,
                file = %file_name,
                bytes = body.len(),
                "wireframes debug wrote"
            ),
            Err(error) => tracing::warn!(
                run_id = %inner.run_id,
                file = %file_name,
                %error,
                "wireframes debug write failed"
            ),
        }
    }

    pub fn write_json(&self, file_name: &str, value: &serde_json::Value) {
        match serde_json::to_string_pretty(value) {
            Ok(body) => self.write_text(file_name, &body),
            Err(error) => {
                tracing::warn!(%error, file = %file_name, "wireframes debug json encode failed")
            }
        }
    }

    /// Meta for the run: packs, skills, kind, screen ids — the "what did we ask for".
    pub fn write_meta(&self, meta: serde_json::Value) {
        self.write_json("00-meta.json", &meta);
    }

    pub fn write_prompt(&self, screen_id: &str, prompt: &str) {
        let safe = sanitize_id(screen_id);
        self.write_text(&format!("01-prompt-{safe}.md"), prompt);
        tracing::info!(
            screen_id = %screen_id,
            prompt_chars = prompt.chars().count(),
            imports_hint = "see catalog-candidates.json and catalog source paths for RAG evidence",
            "wireframes debug prompt saved"
        );
    }

    pub fn write_provider_raw(&self, screen_id: &str, raw: &str) {
        let safe = sanitize_id(screen_id);
        self.write_text(&format!("02-provider-raw-{safe}.txt"), raw);
    }

    /// Pulls `tsx` out of a provider screen object (or dumps a note if missing).
    pub fn write_tsx_from_screen(&self, screen: &serde_json::Value) {
        let id = screen
            .get("id")
            .and_then(serde_json::Value::as_str)
            .unwrap_or("unknown");
        let safe = sanitize_id(id);
        if let Some(tsx) = screen.get("tsx").and_then(serde_json::Value::as_str) {
            self.write_text(&format!("03-tsx-{safe}.tsx"), tsx);
            log_tsx_summary(id, tsx);
        } else {
            self.write_text(
                &format!("03-tsx-{safe}.MISSING.txt"),
                "No tsx field on this screen — model fell back to html-only or parse dropped it.\n",
            );
            tracing::warn!(screen_id = %id, "wireframes debug: screen has no tsx");
        }
    }

    /// After React render, before R2 offload strips `html` / `liveHtml`.
    pub fn write_render_outputs(&self, artifact: &serde_json::Value) {
        let Some(screens) = artifact
            .get("generatedScreens")
            .and_then(serde_json::Value::as_array)
        else {
            return;
        };

        let mut summary = Vec::new();
        for screen in screens {
            let id = screen
                .get("id")
                .and_then(serde_json::Value::as_str)
                .unwrap_or("unknown");
            let safe = sanitize_id(id);
            let render_mode = screen
                .get("renderMode")
                .and_then(serde_json::Value::as_str)
                .unwrap_or("?");
            let html = screen
                .get("html")
                .and_then(serde_json::Value::as_str)
                .unwrap_or("");
            let live = screen
                .get("liveHtml")
                .and_then(serde_json::Value::as_str)
                .unwrap_or("");
            let tsx = screen
                .get("tsx")
                .and_then(serde_json::Value::as_str)
                .unwrap_or("");

            if !html.is_empty() {
                self.write_text(&format!("04-static-{safe}.html"), html);
            }
            if !live.is_empty() {
                self.write_text(&format!("05-live-{safe}.html"), live);
            }

            let has_process_stub = live.contains("var process");
            let live_starts_ok = live.contains("<div id=\"root\">") && live.contains("<script>");
            summary.push(json!({
                "id": id,
                "renderMode": render_mode,
                "tsxChars": tsx.chars().count(),
                "staticHtmlChars": html.chars().count(),
                "liveHtmlChars": live.chars().count(),
                "liveHasProcessStub": has_process_stub,
                "liveLooksBundled": live_starts_ok,
                "tsxImportLines": import_lines(tsx),
            }));

            tracing::info!(
                screen_id = %id,
                render_mode,
                tsx_chars = tsx.chars().count(),
                static_html_chars = html.chars().count(),
                live_html_chars = live.chars().count(),
                live_has_process_stub = has_process_stub,
                tsx_imports = ?import_lines(tsx),
                "wireframes debug render output summary"
            );
        }
        self.write_json("06-render-summary.json", &json!({ "screens": summary }));
    }

    /// After R2 offload: keys only (no giant bodies).
    pub fn write_artifact_keys(&self, artifact: &serde_json::Value) {
        let Some(screens) = artifact
            .get("generatedScreens")
            .and_then(serde_json::Value::as_array)
        else {
            return;
        };
        let slim: Vec<serde_json::Value> = screens
            .iter()
            .map(|screen| {
                json!({
                    "id": screen.get("id"),
                    "title": screen.get("title"),
                    "renderMode": screen.get("renderMode"),
                    "hasTsx": screen.get("tsx").and_then(serde_json::Value::as_str).is_some_and(|s| !s.trim().is_empty()),
                    "hasInlineHtml": screen.get("html").and_then(serde_json::Value::as_str).is_some_and(|s| !s.trim().is_empty()),
                    "htmlUrl": screen.get("htmlUrl"),
                    "liveUrl": screen.get("liveUrl"),
                    "tsxImportLines": screen
                        .get("tsx")
                        .and_then(serde_json::Value::as_str)
                        .map(import_lines)
                        .unwrap_or_default(),
                })
            })
            .collect();
        self.write_json(
            "07-artifact-after-offload.json",
            &json!({
                "cssUrl": artifact.get("cssUrl"),
                "generatedScreens": slim,
            }),
        );
        tracing::info!(
            screens = slim.len(),
            path = ?self.dir().map(|p| p.join("07-artifact-after-offload.json")),
            "wireframes debug artifact keys saved — open this file to see liveUrl/htmlUrl per screen"
        );
    }

    pub fn write_readme(&self) {
        self.write_text(
            "README.md",
            r#"# Wireframes debug dump

Files in this folder are one Hi-Fi (or Lo-Fi) run, in order:

| File | What |
|------|------|
| `00-meta.json` | packs, skills, kind, screen ids |
| `01-prompt-<screen>.md` | exact prompt sent to the model |
| `02-provider-raw-<screen>.txt` | raw model output |
| `03-tsx-<screen>.tsx` | self-contained TSX adapted from retrieved component source |
| `04-static-<screen>.html` | `renderToStaticMarkup` (thumbnail / Figma) |
| `05-live-<screen>.html` | esbuild IIFE bundle (app live preview) |
| `06-render-summary.json` | sizes + whether `var process` stub is present |
| `07-artifact-after-offload.json` | R2 keys (`htmlUrl` / `liveUrl`) after upload |

How to read a bad preview:
1. Open `03-tsx-*.tsx` — which components did the model import?
2. Open `06-render-summary.json` — `renderMode` should be `react`, `liveHasProcessStub` true.
3. Open `05-live-*.html` — should start with `var process = { env: … }` then an IIFE.
4. Open `07-artifact-after-offload.json` — `liveUrl` must be set for the dialog live path.
"#,
        );
    }
}

fn dump_enabled() -> bool {
    match std::env::var("STAGE_WIREFRAMES_DEBUG_DUMP") {
        Ok(value) => {
            let value = value.trim();
            !(value.is_empty()
                || value == "0"
                || value.eq_ignore_ascii_case("false")
                || value.eq_ignore_ascii_case("off"))
        }
        // Debug cargo builds dump by default so local Electron `cargo run` always
        // leaves a trail without requiring an extra env flag.
        Err(_) => cfg!(debug_assertions),
    }
}

fn dump_root() -> PathBuf {
    std::env::var_os("STAGE_WIREFRAMES_DEBUG_DIR")
        .map(PathBuf::from)
        .unwrap_or_else(|| std::env::temp_dir().join("stage-wireframes"))
}

fn prune_expired_debug_dumps(root: &Path) {
    let retention_hours = std::env::var("STAGE_WIREFRAMES_DEBUG_RETENTION_HOURS")
        .ok()
        .and_then(|value| value.parse::<u64>().ok())
        .unwrap_or(7 * 24);
    let retention = std::time::Duration::from_secs(retention_hours.saturating_mul(60 * 60));
    let Ok(entries) = fs::read_dir(root) else {
        return;
    };
    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }
        let expired = entry
            .metadata()
            .and_then(|metadata| metadata.modified())
            .ok()
            .and_then(|modified| modified.elapsed().ok())
            .is_some_and(|age| age >= retention);
        if expired && let Err(error) = fs::remove_dir_all(&path) {
            tracing::warn!(path = %path.display(), %error, "could not prune expired wireframes debug dump");
        }
    }
}

fn sanitize_id(id: &str) -> String {
    id.chars()
        .map(|c| {
            if c.is_ascii_alphanumeric() || c == '-' || c == '_' {
                c
            } else {
                '_'
            }
        })
        .collect()
}

fn import_lines(tsx: &str) -> Vec<String> {
    tsx.lines()
        .map(str::trim)
        .filter(|line| line.starts_with("import "))
        .map(str::to_string)
        .take(40)
        .collect()
}

fn log_tsx_summary(screen_id: &str, tsx: &str) {
    let imports = import_lines(tsx);
    let uses_motion = imports.iter().any(|line| line.contains("motion"));
    let uses_legacy_stage_import = imports.iter().any(|line| line.contains("@stage/"));
    tracing::info!(
        screen_id = %screen_id,
        tsx_chars = tsx.chars().count(),
        uses_motion,
        uses_legacy_stage_import,
        import_count = imports.len(),
        imports = ?imports,
        "wireframes debug model TSX summary"
    );
}
