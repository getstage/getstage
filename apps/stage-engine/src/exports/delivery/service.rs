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
        let artboard_id = self
            .paper
            .write_wireframe(
                &format!("{} Wireframe", screen.title),
                1440,
                1000,
                &compile_paper_html(&screen),
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
    format!(
        "<!doctype html>\n<html lang=\"en\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>{}</title><style>{}</style></head><body>{}</body></html>\n",
        escape(&screen.title),
        CSS,
        compile_body(screen)
    )
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

fn compile_paper_html(screen: &GeneratedScreen) -> String {
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

const CSS: &str = "*{box-sizing:border-box}body{margin:0;background:#f5f5f5;color:#171717;font-family:Inter,system-ui,sans-serif}main{max-width:1440px;margin:0 auto;padding:40px}header,section{margin-bottom:24px}h1,h2,p{margin:0}header p{color:#737373;font-size:12px;text-transform:uppercase;letter-spacing:.12em}header h1{margin-top:8px;font-size:32px}.blocks{display:grid;gap:8px;margin-top:12px}.block{min-height:140px;padding:24px;border:1px solid #d4d4d4;border-radius:8px;background:#fff;display:flex;align-items:center;justify-content:space-between}.block.primary{min-height:240px}.block.tertiary{min-height:80px}.block span{color:#737373;font-size:11px;text-transform:uppercase}";

#[cfg(test)]
mod tests {
    use super::slug;

    #[test]
    fn slug_should_create_safe_directory_name() {
        assert_eq!(slug("Home / Landing"), "home-landing-wireframe");
    }
}
