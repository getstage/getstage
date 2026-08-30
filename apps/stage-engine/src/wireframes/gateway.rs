use std::collections::{BTreeSet, HashMap};
use std::path::PathBuf;
use std::time::Duration;

use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::convex_store::catalog_repository::CatalogSourceBundle;
use crate::models::providers::ProviderId;
use crate::runs::RunEventSink;
use crate::wireframes::debug_dump::WireframesDebugDump;
use crate::wireframes::helper::error::WorkflowError;
use crate::wireframes::helper::events::{tool_completed, tool_started};
use crate::wireframes::helper::workspace::{ParallelScreenRuns, write_screen_checkpoint};

const DEFAULT_GATEWAY_URL: &str = "http://127.0.0.1:48231";
const HEALTH_TIMEOUT: Duration = Duration::from_secs(2);
const GENERATE_TIMEOUT: Duration = Duration::from_secs(600);
/// One Nebius completion stays a batch, but full-catalog RAG for every
/// selected screen overflows the ~1M token window. Five is under that
/// ceiling on the heaviest library mix we have measured.
pub(crate) const MAX_GATEWAY_SCREENS_PER_REQUEST: usize = 5;

#[derive(Clone, Debug)]
pub struct GatewayScreenJob {
    pub screen_id: String,
    pub title: String,
    pub intent: String,
    pub libraries: Vec<String>,
    pub bundles: Vec<CatalogSourceBundle>,
    pub validation_failures: Vec<String>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GatewaySkill {
    pub id: String,
    pub guidance: String,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GatewayDesignContext {
    pub project_name: String,
    pub project_type: String,
    pub viewport_guidance: String,
    pub brand_source: String,
    pub style_direction_id: Option<String>,
    pub strategy_artifact: String,
    pub research_artifact: Option<String>,
    pub moodboard_artifact: Option<String>,
    pub flows_artifact: Option<String>,
    pub selected_skills: Vec<GatewaySkill>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct GenerateWireframeRequest {
    run_id: Uuid,
    selected_libraries: Vec<String>,
    design_context: GatewayDesignContext,
    screens: Vec<ScreenRequest>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ScreenRequest {
    screen_id: String,
    attempt: &'static str,
    brief: ScreenBrief,
    components: Vec<ComponentBundle>,
    validation_failures: Vec<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ScreenBrief {
    title: String,
    intent: String,
    viewport: Viewport,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct Viewport {
    width: u16,
    height: u16,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ComponentBundle {
    component_id: String,
    library: String,
    source_revision: String,
    files: Vec<SourceFile>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct SourceFile {
    path: String,
    content: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct GenerateWireframeResponse {
    screens: Vec<GeneratedScreen>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct GeneratedScreen {
    id: String,
    tsx: String,
    #[serde(default)]
    dependencies: Vec<String>,
}

pub fn gateway_base_url() -> String {
    std::env::var("WIREFRAME_AI_GATEWAY_URL")
        .ok()
        .map(|value| value.trim().trim_end_matches('/').to_string())
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| DEFAULT_GATEWAY_URL.to_string())
}

pub async fn gateway_health() -> Result<(), String> {
    let url = format!("{}/v1/health", gateway_base_url());
    let response = reqwest::Client::builder()
        .timeout(HEALTH_TIMEOUT)
        .build()
        .map_err(|error| format!("Could not reach the Nebius gateway: {error}"))?
        .get(url)
        .send()
        .await
        .map_err(|_| {
            format!(
                "Nebius gateway is not running at {}. Start apps/wireframe-ai-gateway, then retry.",
                gateway_base_url()
            )
        })?;
    if response.status().is_success() {
        Ok(())
    } else {
        Err(format!(
            "Nebius gateway at {} is not ready (HTTP {}).",
            gateway_base_url(),
            response.status()
        ))
    }
}

#[allow(clippy::too_many_arguments)]
pub async fn run_screens_via_gateway(
    api_version: &'static str,
    run_id: &str,
    provider_id: ProviderId,
    auth_token: &str,
    design_context: &GatewayDesignContext,
    jobs: &[GatewayScreenJob],
    configure: Vec<serde_json::Value>,
    checkpoint_directory: Option<PathBuf>,
    sink: &RunEventSink,
    cancel_rx: &tokio::sync::watch::Receiver<bool>,
    dump: WireframesDebugDump,
) -> Result<Option<ParallelScreenRuns>, WorkflowError> {
    if *cancel_rx.borrow() {
        return Ok(None);
    }

    let gateway_run_id = parse_run_uuid(run_id);
    let mut screens = Vec::with_capacity(jobs.len());
    let mut last_error = None;
    for (chunk_index, chunk) in jobs.chunks(MAX_GATEWAY_SCREENS_PER_REQUEST).enumerate() {
        if *cancel_rx.borrow() {
            break;
        }
        for job in chunk {
            tool_started(
                api_version,
                run_id,
                provider_id,
                sink,
                &job.screen_id,
                &format!("Design {}", job.screen_id),
            );
        }
        tracing::info!(
            run_id,
            chunk_index,
            chunk_size = chunk.len(),
            screen_ids = ?chunk.iter().map(|job| job.screen_id.as_str()).collect::<Vec<_>>(),
            "Nebius gateway generating screen chunk"
        );
        let result = generate_chunk_with_missing_retry(
            auth_token,
            gateway_run_id,
            design_context,
            chunk,
            jobs,
            &configure,
            run_id,
        )
        .await;
        for job in chunk {
            tool_completed(api_version, run_id, provider_id, sink, &job.screen_id);
        }
        let chunk_screens = match result {
            Ok(screens) => screens,
            Err(error) => {
                tracing::warn!(
                    run_id,
                    chunk_index,
                    error = %error,
                    "Nebius screen chunk failed; continuing with the remaining chunks"
                );
                last_error = Some(error);
                continue;
            }
        };
        for screen in &chunk_screens {
            dump.write_tsx_from_screen(screen);
            if let (Some(directory), Some(screen_id)) = (
                checkpoint_directory.as_deref(),
                screen.get("id").and_then(serde_json::Value::as_str),
            ) {
                write_screen_checkpoint(directory, screen_id, screen).await?;
            }
        }
        extend_screens(&mut screens, chunk_screens);
    }
    if screens.is_empty() {
        if *cancel_rx.borrow() {
            return Ok(None);
        }
        return Err(last_error.unwrap_or_else(|| {
            WorkflowError::GenerationFailed("Nebius returned no requested screens".to_string())
        }));
    }
    let screen_order = jobs
        .iter()
        .enumerate()
        .map(|(index, job)| (job.screen_id.as_str(), index))
        .collect::<HashMap<_, _>>();
    screens.sort_by_key(|screen| {
        screen
            .get("id")
            .and_then(serde_json::Value::as_str)
            .and_then(|id| screen_order.get(id))
            .copied()
            .unwrap_or(usize::MAX)
    });

    Ok(Some(ParallelScreenRuns {
        screens,
        configure,
        cancelled: *cancel_rx.borrow(),
    }))
}

pub fn screen_from_gateway(
    job: &GatewayScreenJob,
    tsx: &str,
    screen_id: &str,
) -> serde_json::Value {
    let tsx = normalize_gateway_tsx(tsx);
    let catalog_ids = job
        .bundles
        .iter()
        .map(|bundle| bundle.component_id.clone())
        .collect::<Vec<_>>();
    serde_json::json!({
        "id": screen_id,
        "title": job.title,
        "tsx": tsx,
        "html": "<main style=\"display:block\"><div>Generated screen</div></main>",
        "catalogComponentIds": catalog_ids,
        "sections": [],
    })
}

fn normalize_gateway_tsx(tsx: &str) -> String {
    let mut normalized = tsx
        .lines()
        .filter(|line| {
            let trimmed = line.trim_start();
            !line.contains("react-dom/client") && !trimmed.starts_with("createRoot(")
        })
        .collect::<Vec<_>>()
        .join("\n")
        .replace("\"framer-motion\"", "\"motion/react\"")
        .replace("'framer-motion'", "'motion/react'");
    if !normalized.contains("export default")
        && let Some(index) = normalized.find("function App(")
    {
        normalized.insert_str(index, "export default ");
    }
    normalized
}

async fn generate_chunk_with_missing_retry(
    auth_token: &str,
    gateway_run_id: Uuid,
    design_context: &GatewayDesignContext,
    chunk_jobs: &[GatewayScreenJob],
    all_jobs: &[GatewayScreenJob],
    configure: &[serde_json::Value],
    run_id: &str,
) -> Result<Vec<serde_json::Value>, WorkflowError> {
    let mut screens = generate_screens(
        auth_token,
        gateway_run_id,
        design_context,
        chunk_jobs,
        all_jobs,
        configure,
    )
    .await?;
    let returned_ids = screens
        .iter()
        .filter_map(|screen| screen.get("id").and_then(serde_json::Value::as_str))
        .collect::<BTreeSet<_>>();
    let missing_jobs = chunk_jobs
        .iter()
        .filter(|job| !returned_ids.contains(job.screen_id.as_str()))
        .cloned()
        .collect::<Vec<_>>();
    if missing_jobs.is_empty() {
        return Ok(screens);
    }
    tracing::warn!(
        run_id,
        missing = missing_jobs.len(),
        "Nebius batch omitted screens; retrying only the missing screens once"
    );
    match generate_screens(
        auth_token,
        gateway_run_id,
        design_context,
        &missing_jobs,
        all_jobs,
        configure,
    )
    .await
    {
        Ok(retried) => extend_screens(&mut screens, retried),
        Err(error) => {
            tracing::warn!(
                run_id,
                error = %error,
                kept = screens.len(),
                "missing-screen retry failed; keeping screens that already landed"
            );
        }
    }
    Ok(screens)
}

fn extend_screens(screens: &mut Vec<serde_json::Value>, more: Vec<serde_json::Value>) {
    for screen in more {
        let Some(id) = screen
            .get("id")
            .and_then(serde_json::Value::as_str)
            .map(str::to_string)
        else {
            continue;
        };
        if let Some(existing) = screens.iter_mut().find(|existing| {
            existing.get("id").and_then(serde_json::Value::as_str) == Some(id.as_str())
        }) {
            *existing = screen;
        } else {
            screens.push(screen);
        }
    }
}

async fn generate_screens(
    auth_token: &str,
    run_id: Uuid,
    design_context: &GatewayDesignContext,
    jobs: &[GatewayScreenJob],
    all_jobs: &[GatewayScreenJob],
    configure: &[serde_json::Value],
) -> Result<Vec<serde_json::Value>, WorkflowError> {
    let request = build_request(run_id, design_context, jobs);
    let bearer = gateway_bearer_token(auth_token);
    let url = format!("{}/v1/wireframes/generate", gateway_base_url());
    let response = reqwest::Client::builder()
        .timeout(GENERATE_TIMEOUT)
        .build()
        .map_err(|error| WorkflowError::Internal(format!("gateway client failed: {error}")))?
        .post(url)
        .header("Authorization", format!("Bearer {bearer}"))
        .json(&request)
        .send()
        .await
        .map_err(|error| {
            WorkflowError::GenerationFailed(format!("Nebius gateway request failed: {error}"))
        })?;
    let status = response.status();
    let body = response.text().await.map_err(|error| {
        WorkflowError::GenerationFailed(format!(
            "Nebius gateway response could not be read: {error}"
        ))
    })?;
    if !status.is_success() {
        return Err(WorkflowError::GenerationFailed(format!(
            "Nebius gateway returned HTTP {status}: {}",
            body.chars().take(400).collect::<String>()
        )));
    }
    let parsed: GenerateWireframeResponse = serde_json::from_str(&body).map_err(|error| {
        WorkflowError::GenerationFailed(format!(
            "Nebius gateway returned an invalid screen batch: {error}"
        ))
    })?;
    let screens = screens_from_gateway_response(jobs, parsed.screens, all_jobs, configure)?;
    if screens.is_empty() {
        return Err(WorkflowError::GenerationFailed(
            "Nebius returned no requested screens".to_string(),
        ));
    }
    Ok(screens)
}

fn screens_from_gateway_response(
    chunk_jobs: &[GatewayScreenJob],
    returned: Vec<GeneratedScreen>,
    all_jobs: &[GatewayScreenJob],
    configure: &[serde_json::Value],
) -> Result<Vec<serde_json::Value>, WorkflowError> {
    let mut leftover = returned
        .into_iter()
        .map(|screen| (screen.id.clone(), screen))
        .collect::<HashMap<_, _>>();
    let mut screens = Vec::new();
    for job in chunk_jobs {
        let Some(screen) = leftover.remove(&job.screen_id) else {
            continue;
        };
        if screen.tsx.trim().is_empty() {
            continue;
        }
        let _ = screen.dependencies;
        screens.push(screen_from_gateway(job, &screen.tsx, &job.screen_id));
    }
    for (id, screen) in leftover {
        if screen.tsx.trim().is_empty() {
            continue;
        }
        if let Some(job) = all_jobs.iter().find(|job| job.screen_id == id) {
            screens.push(screen_from_gateway(job, &screen.tsx, &job.screen_id));
            continue;
        }
        if let Some(bonus) = screen_from_configured(&id, &screen.tsx, configure) {
            tracing::info!(
                screen_id = %id,
                "keeping unrequested Nebius screen that already exists in the project"
            );
            screens.push(bonus);
        }
    }
    let returned_requested = screens.iter().any(|screen| {
        chunk_jobs.iter().any(|job| {
            screen.get("id").and_then(serde_json::Value::as_str) == Some(job.screen_id.as_str())
        })
    });
    if !returned_requested {
        return Err(WorkflowError::GenerationFailed(
            "Nebius returned no requested screens".to_string(),
        ));
    }
    Ok(screens)
}

fn screen_from_configured(
    screen_id: &str,
    tsx: &str,
    configure: &[serde_json::Value],
) -> Option<serde_json::Value> {
    let entry = configure
        .iter()
        .find(|screen| screen.get("id").and_then(serde_json::Value::as_str) == Some(screen_id))?;
    let title = entry
        .get("title")
        .and_then(serde_json::Value::as_str)
        .map(str::trim)
        .filter(|title| !title.is_empty())
        .unwrap_or(screen_id);
    Some(serde_json::json!({
        "id": screen_id,
        "title": title,
        "tsx": tsx,
        "html": "<main style=\"display:block\"><div>Generated screen</div></main>",
        "catalogComponentIds": [],
        "sections": [],
    }))
}

fn build_request(
    run_id: Uuid,
    design_context: &GatewayDesignContext,
    jobs: &[GatewayScreenJob],
) -> GenerateWireframeRequest {
    let selected_libraries = jobs
        .iter()
        .flat_map(|job| job.libraries.iter().cloned())
        .collect::<BTreeSet<_>>()
        .into_iter()
        .collect();
    let screens = jobs
        .iter()
        .map(|job| ScreenRequest {
            screen_id: job.screen_id.clone(),
            attempt: if job.validation_failures.is_empty() {
                "initial"
            } else {
                "repair"
            },
            brief: ScreenBrief {
                title: job.title.clone(),
                intent: job.intent.clone(),
                viewport: Viewport {
                    width: 1440,
                    height: 900,
                },
            },
            components: job
                .bundles
                .iter()
                .map(|bundle| ComponentBundle {
                    component_id: bundle.component_id.clone(),
                    library: bundle.library.clone(),
                    source_revision: bundle.source_revision.clone(),
                    files: bundle
                        .files
                        .iter()
                        .map(|file| SourceFile {
                            path: file.path.clone(),
                            content: file.content.clone(),
                        })
                        .collect(),
                })
                .collect(),
            validation_failures: job.validation_failures.clone(),
        })
        .collect();
    GenerateWireframeRequest {
        run_id,
        selected_libraries,
        design_context: design_context.clone(),
        screens,
    }
}

fn gateway_bearer_token(desktop_token: &str) -> String {
    std::env::var("WIREFRAME_GATEWAY_SHARED_TOKEN")
        .ok()
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| desktop_token.to_string())
}

fn parse_run_uuid(run_id: &str) -> Uuid {
    Uuid::parse_str(run_id).unwrap_or_else(|_| Uuid::new_v4())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::convex_store::catalog_repository::CatalogSourceFile;

    fn context() -> GatewayDesignContext {
        GatewayDesignContext {
            project_name: "TradeAxis".to_string(),
            project_type: "web-design".to_string(),
            viewport_guidance: "Desktop".to_string(),
            brand_source: "style-guide".to_string(),
            style_direction_id: Some("direction-1".to_string()),
            strategy_artifact: "{}".to_string(),
            research_artifact: None,
            moodboard_artifact: Some("{}".to_string()),
            flows_artifact: None,
            selected_skills: Vec::new(),
        }
    }

    fn job(id: &str) -> GatewayScreenJob {
        GatewayScreenJob {
            screen_id: id.to_string(),
            title: "Home".to_string(),
            intent: "Convert visitors".to_string(),
            libraries: vec!["origin-ui".to_string()],
            bundles: vec![CatalogSourceBundle {
                component_id: "origin-ui/button".to_string(),
                library: "origin-ui".to_string(),
                name: "Button".to_string(),
                kind: "primitive".to_string(),
                runtime: "client".to_string(),
                source_revision: "v1".to_string(),
                files: vec![CatalogSourceFile {
                    path: "button.tsx".to_string(),
                    content: "export function Button() {}".to_string(),
                }],
                css: None,
                dependencies: Vec::new(),
                registry_dependencies: Vec::new(),
            }],
            validation_failures: Vec::new(),
        }
    }

    #[test]
    fn attaches_retrieved_catalog_ids_not_model_claims() {
        let job = job("home");
        let screen = screen_from_gateway(
            &job,
            "export default function Home() { return <main />; }",
            "home",
        );
        assert_eq!(screen["catalogComponentIds"][0], "origin-ui/button");
        assert_eq!(screen["id"], "home");
    }

    #[test]
    fn normalizes_standalone_app_output_to_the_renderer_contract() {
        let normalized = normalize_gateway_tsx(
            "import { createRoot } from 'react-dom/client'\n\
             import { motion } from 'framer-motion'\n\
             function App() { return <motion.main /> }\n\
             createRoot(document.getElementById('root')!).render(<App />)",
        );
        assert!(!normalized.contains("react-dom/client"));
        assert!(!normalized.contains("createRoot("));
        assert!(normalized.contains("from 'motion/react'"));
        assert!(normalized.contains("export default function App()"));
    }

    #[test]
    fn builds_one_request_with_multiple_screen_bundles_and_shared_context() {
        let request = build_request(Uuid::new_v4(), &context(), &[job("home"), job("pricing")]);
        assert_eq!(request.screens.len(), 2);
        assert_eq!(request.design_context.project_name, "TradeAxis");
        assert_eq!(
            request.screens[1].components[0].component_id,
            "origin-ui/button"
        );
    }

    #[test]
    fn splits_fifteen_screens_into_three_gateway_chunks_of_five() {
        let jobs: Vec<_> = (0..15)
            .map(|index| job(&format!("screen-{index}")))
            .collect();
        let sizes: Vec<usize> = jobs
            .chunks(MAX_GATEWAY_SCREENS_PER_REQUEST)
            .map(|chunk| chunk.len())
            .collect();
        assert_eq!(sizes, vec![5, 5, 5]);
    }

    #[test]
    fn keeps_a_remainder_chunk_when_the_run_is_not_a_multiple_of_five() {
        let jobs: Vec<_> = (0..12)
            .map(|index| job(&format!("screen-{index}")))
            .collect();
        let sizes: Vec<usize> = jobs
            .chunks(MAX_GATEWAY_SCREENS_PER_REQUEST)
            .map(|chunk| chunk.len())
            .collect();
        assert_eq!(sizes, vec![5, 5, 2]);
    }

    fn generated(id: &str, tsx: &str) -> GeneratedScreen {
        GeneratedScreen {
            id: id.to_string(),
            tsx: tsx.to_string(),
            dependencies: Vec::new(),
        }
    }

    #[test]
    fn keeps_a_configured_bonus_screen_next_to_requested_matches() {
        let chunk = [job("home"), job("pricing")];
        let configure = [serde_json::json!({
            "id": "screen-project-dashboard",
            "title": "Project dashboard"
        })];
        let screens = screens_from_gateway_response(
            &chunk,
            vec![
                generated(
                    "home",
                    "export default function Home() { return <main />; }",
                ),
                generated(
                    "screen-project-dashboard",
                    "export default function Dashboard() { return <main />; }",
                ),
            ],
            &chunk,
            &configure,
        )
        .expect("a real project screen should be kept");
        assert_eq!(screens.len(), 2);
        assert_eq!(screens[0]["id"], "home");
        assert_eq!(screens[1]["id"], "screen-project-dashboard");
        assert_eq!(screens[1]["title"], "Project dashboard");
    }

    #[test]
    fn drops_invented_screen_ids() {
        let chunk = [job("home")];
        let screens = screens_from_gateway_response(
            &chunk,
            vec![
                generated(
                    "home",
                    "export default function Home() { return <main />; }",
                ),
                generated(
                    "screen-foobar",
                    "export default function Unknown() { return <main />; }",
                ),
            ],
            &chunk,
            &[],
        )
        .expect("invented ids are dropped");
        assert_eq!(screens.len(), 1);
        assert_eq!(screens[0]["id"], "home");
    }

    #[test]
    fn rejects_when_no_requested_chunk_screen_landed() {
        let chunk = [job("home")];
        let error = screens_from_gateway_response(
            &chunk,
            vec![generated(
                "screen-project-dashboard",
                "export default function Dashboard() { return <main />; }",
            )],
            &chunk,
            &[serde_json::json!({
                "id": "screen-project-dashboard",
                "title": "Project dashboard"
            })],
        )
        .expect_err("a bonus screen is not enough without a requested id");
        assert!(
            error
                .to_string()
                .contains("Nebius returned no requested screens")
        );
    }
}
