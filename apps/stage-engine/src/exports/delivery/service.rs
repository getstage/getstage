use anyhow::{Context, bail};

use crate::exports::figma::models::{GeneratedScreen, WireframesArtifact};
use crate::exports::figma::repository::FigmaExportRepository;

use super::models::{
    CodeExportFile, CodeExportResponse, PaperConnectionStatusResponse, PaperExportResponse,
    WireframeDeliveryRequest,
};
use super::paper::PaperClient;

#[derive(Clone, Debug)]
pub struct DeliveryExportService {
    repository: FigmaExportRepository,
    paper: PaperClient,
}

impl DeliveryExportService {
    pub fn new(repository: FigmaExportRepository, paper: PaperClient) -> Self {
        Self { repository, paper }
    }

    pub async fn create_code_export(
        &self,
        token: &str,
        request: WireframeDeliveryRequest,
    ) -> anyhow::Result<CodeExportResponse> {
        let screen = self.load_screen(token, &request).await?;
        let html = compile_html(&screen);
        Ok(CodeExportResponse {
            api_version: "v1",
            suggested_directory_name: slug(&screen.title),
            files: vec![
                CodeExportFile {
                    relative_path: "index.html".to_string(),
                    content: html,
                },
                CodeExportFile {
                    relative_path: "README.md".to_string(),
                    content: format!(
                        "# {}\n\nGenerated from a Stage wireframe. Open `index.html` in a browser.\n",
                        screen.title
                    ),
                },
            ],
        })
    }

    pub async fn create_paper_export(
        &self,
        token: &str,
        request: WireframeDeliveryRequest,
    ) -> anyhow::Result<PaperExportResponse> {
        let screen = self.load_screen(token, &request).await?;
        let width = request.hifi_preview_width.unwrap_or(1440).max(1);
        let height = request.hifi_preview_height.unwrap_or(1000).max(1000);
        let artboard_id = self
            .paper
            .write_wireframe(
                &format!("{} Wireframe", screen.title),
                width,
                height,
                &compile_paper_html(
                    &screen,
                    request.hifi_preview_data_url.as_deref(),
                    width,
                    height,
                ),
            )
            .await?;
        Ok(PaperExportResponse {
            api_version: "v1",
            status: "completed",
            artboard_id,
            message: "Wireframe exported to the open Paper file.".to_string(),
        })
    }

    pub async fn paper_connection_status(&self) -> PaperConnectionStatusResponse {
        let status = self.paper.connection_status().await;
        PaperConnectionStatusResponse {
            api_version: "v1",
            ready: status.ready,
            status: if status.ready { "ready" } else { "not-ready" },
            message: status.message,
            file_name: status.file_name,
            page_name: status.page_name,
        }
    }

    async fn load_screen(
        &self,
        token: &str,
        request: &WireframeDeliveryRequest,
    ) -> anyhow::Result<GeneratedScreen> {
        let record = self
            .repository
            .fetch_latest_wireframes_artifact(token, &request.project_id)
            .await?;
        if record.id != request.artifact_id {
            bail!("Selected wireframes artifact is no longer the latest artifact.");
        }
        let content = record
            .content_json
            .context("wireframes artifact has no content")?;
        let artifact: WireframesArtifact =
            serde_json::from_str(&content).context("wireframes artifact content is invalid")?;
        artifact
            .generated_screens
            .into_iter()
            .find(|screen| screen.id == request.screen_id)
            .context("selected wireframe screen was not found")
    }
}

fn compile_html(screen: &GeneratedScreen) -> String {
    // Hi-Fi screens carry a finished, self-contained HTML fragment with its own
    // <style>; the code export is simply that design wrapped in a document with a
    // minimal reset (matching the in-app preview) so the file renders identically.
    // Lo-Fi screens compile their gray-block outline from `sections`/`blocks`.
    let (css, body) = match hifi_fragment(screen) {
        Some(fragment) => (RESET_CSS, fragment.to_string()),
        None => (CSS, compile_body(screen)),
    };
    format!(
        "<!doctype html>\n<html lang=\"en\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>{}</title><style>{}</style></head><body>{}</body></html>\n",
        escape(&screen.title),
        css,
        body
    )
}

// Paper's write_html honors inline styles but drops a top-level <style> block,
// which our Hi-Fi fragments rely on — so an un-inlined fragment renders as a raw
// text+image stack. Inlining folds those rules onto each element so Paper's
// flex/inline-style model can rebuild the design as editable nodes. On the rare
// parse failure we send the original markup rather than failing the export.
fn inline_styles_for_paper(fragment: &str) -> String {
    css_inline::inline(fragment).unwrap_or_else(|error| {
        tracing::warn!(%error, "failed to inline CSS for Paper export; sending raw fragment");
        fragment.to_string()
    })
}

// Returns the Hi-Fi HTML fragment when the screen has a non-empty one.
fn hifi_fragment(screen: &GeneratedScreen) -> Option<&str> {
    screen
        .html
        .as_deref()
        .map(str::trim)
        .filter(|fragment| !fragment.is_empty())
}

fn compile_body(screen: &GeneratedScreen) -> String {
    let sections = screen
        .sections
        .iter()
        .map(|section| {
            let blocks = section
                .blocks
                .iter()
                .map(|block| {
                    let label = block.copy_slots.get("headline").unwrap_or(&block.intent);
                    format!(
                        "<article class=\"block {}\"><strong>{}</strong><span>{}</span></article>",
                        escape(&block.emphasis),
                        escape(label),
                        escape(&block.kind)
                    )
                })
                .collect::<String>();
            format!(
                "<section><h2>{}</h2><div class=\"blocks\">{blocks}</div></section>",
                escape(&section.title)
            )
        })
        .collect::<String>();
    format!(
        "<main><header><p>Stage wireframe</p><h1>{}</h1></header>{sections}</main>",
        escape(&screen.title)
    )
}

fn compile_paper_html(
    screen: &GeneratedScreen,
    hifi_preview_data_url: Option<&str>,
    width: u16,
    height: u16,
) -> String {
    // Prefer the real Hi-Fi markup so Paper inserts editable nodes via write_html,
    // matching the code-export path. Only fall back to a flat image when no
    // fragment is available (mirrors compile_html's hifi_fragment/Lo-Fi split).
    if let Some(fragment) = hifi_fragment(screen) {
        return inline_styles_for_paper(fragment);
    }

    if let Some(data_url) = hifi_preview_data_url.filter(|value| !value.trim().is_empty()) {
        return format!(
            "<div style=\"width:{width}px;min-height:{height}px;background:#ffffff;\"><img src=\"{}\" width=\"{width}\" height=\"{height}\" style=\"display:block;width:{width}px;height:{height}px;object-fit:contain;\" /></div>",
            escape(data_url)
        );
    }

    let sections = screen
        .sections
        .iter()
        .map(|section| {
            let blocks = section
                .blocks
                .iter()
                .map(|block| {
                    let label = block.copy_slots.get("headline").unwrap_or(&block.intent);
                    let height = match block.emphasis.as_str() {
                        "primary" => 188,
                        "tertiary" => 76,
                        _ => 116,
                    };
                    format!(
                        "<article style=\"min-height:{height}px;background:#fafafa;border:1px solid #d4d4d4;border-radius:10px;padding:18px 20px;display:flex;align-items:center;justify-content:space-between;gap:24px;\"><strong style=\"color:#171717;font-size:17px;line-height:1.35;font-weight:650;\">{}</strong><span style=\"flex:0 0 auto;color:#737373;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;\">{}</span></article>",
                        escape(label),
                        escape(&block.kind)
                    )
                })
                .collect::<String>();
            format!(
                "<section style=\"margin-top:28px;\"><h2 style=\"margin:0 0 12px;color:#262626;font-size:18px;font-weight:700;\">{}</h2><div style=\"display:grid;gap:12px;\">{blocks}</div></section>",
                escape(&section.title)
            )
        })
        .collect::<String>();

    format!(
        "<div style=\"width:1440px;min-height:1000px;background:#f5f5f5;padding:48px;color:#171717;font-family:Inter,Arial,sans-serif;\"><div style=\"min-height:904px;background:#ffffff;border:1px solid #d4d4d4;border-radius:16px;padding:40px;box-shadow:0 24px 70px rgba(15,23,42,0.10);\"><p style=\"margin:0;color:#737373;font-size:12px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;\">Stage wireframe</p><h1 style=\"margin:8px 0 0;color:#171717;font-size:34px;line-height:1.15;font-weight:750;\">{}</h1>{sections}</div></div>",
        escape(&screen.title)
    )
}

fn escape(value: &str) -> String {
    value
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
}

fn slug(value: &str) -> String {
    let value = value
        .chars()
        .map(|character| {
            if character.is_ascii_alphanumeric() {
                character.to_ascii_lowercase()
            } else {
                '-'
            }
        })
        .collect::<String>();
    let parts = value.split('-').filter(|part| !part.is_empty());
    let slug = parts.collect::<Vec<_>>().join("-");
    if slug.is_empty() {
        "stage-wireframe".to_string()
    } else {
        format!("{slug}-wireframe")
    }
}

// Minimal reset for Hi-Fi code exports. Mirrors the in-app preview document
// (WireframeHtmlPreview.buildWireframePreviewDocument) so the exported file
// renders identically to what the user previews in Stage.
const RESET_CSS: &str = "*,*::before,*::after{box-sizing:border-box}html,body{margin:0;padding:0}body{font-family:Inter,ui-sans-serif,system-ui,-apple-system,\"Segoe UI\",Roboto,sans-serif;color:#171717;background:#ffffff}img{max-width:100%}";

const CSS: &str = "*{box-sizing:border-box}body{margin:0;background:#f5f5f5;color:#171717;font-family:Inter,system-ui,sans-serif}main{max-width:1440px;margin:0 auto;padding:40px}header,section{margin-bottom:24px}h1,h2,p{margin:0}header p{color:#737373;font-size:12px;text-transform:uppercase;letter-spacing:.12em}header h1{margin-top:8px;font-size:32px}.blocks{display:grid;gap:8px;margin-top:12px}.block{min-height:140px;padding:24px;border:1px solid #d4d4d4;border-radius:8px;background:#fff;display:flex;align-items:center;justify-content:space-between}.block.primary{min-height:240px}.block.tertiary{min-height:80px}.block span{color:#737373;font-size:11px;text-transform:uppercase}";

#[cfg(test)]
mod tests {
    use super::{GeneratedScreen, compile_html, inline_styles_for_paper, slug};

    #[test]
    fn inline_styles_for_paper_should_fold_style_block_rules_onto_elements() {
        let fragment = "<div class=\"hero\"><h1 class=\"title\">Ship faster</h1></div><style>.hero{display:flex;background:#101010}.title{color:#fff}</style>";

        let inlined = inline_styles_for_paper(fragment);

        // The class rules must ride on each element as inline styles, since Paper
        // drops the <style> block but honors inline styles.
        assert!(inlined.contains("display: flex"));
        assert!(inlined.contains("background: #101010"));
        assert!(inlined.contains("color: #fff"));
        // The now-redundant <style> block must be gone.
        assert!(!inlined.contains("<style>"));
    }

    #[test]
    fn slug_should_create_safe_directory_name() {
        assert_eq!(slug("Home / Landing"), "home-landing-wireframe");
    }

    #[test]
    fn compile_html_should_emit_the_hifi_fragment_verbatim() {
        let screen = GeneratedScreen {
            id: "home".to_string(),
            title: "Homepage".to_string(),
            sections: Vec::new(),
            html: Some("<div class=\"hero\"><h1>Ship faster</h1></div>".to_string()),
        };

        let document = compile_html(&screen);

        assert!(document.contains("<div class=\"hero\"><h1>Ship faster</h1></div>"));
        // The block-layout scaffolding must not appear for a Hi-Fi screen.
        assert!(!document.contains("Stage wireframe"));
    }
}
