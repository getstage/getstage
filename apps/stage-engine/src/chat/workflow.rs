use tokio::sync::watch;

use crate::convex_store::chat_repository::ChatRepository;
use crate::models::errors::{EngineError, EngineErrorCode};
use crate::models::runs::{RunEvent, StartRunRequest};
use crate::providers::adapter::{ProviderRunContext, run_provider};
use crate::runs::RunEventSink;

use super::prompt::build_grounded_chat_prompt;

#[derive(Clone, Debug)]
pub struct ChatWorkflow {
    repository: ChatRepository,
}

impl ChatWorkflow {
    pub fn new(repository: ChatRepository) -> Self {
        Self { repository }
    }

    pub async fn run(
        &self,
        api_version: &'static str,
        run_id: String,
        mut request: StartRunRequest,
        auth_token: Option<String>,
        events: RunEventSink,
        cancel: watch::Receiver<bool>,
    ) {
        let result = self
            .prepare_request(&mut request, auth_token.as_deref())
            .await;
        if let Err(error) = result {
            tracing::error!(run_id = %run_id, %error, "failed to prepare grounded chat run");
            events.send(RunEvent::RunFailed {
                api_version,
                run_id,
                provider_id: request.provider_id,
                created_at: crate::helpers::time::now_millis(),
                error: EngineError {
                    code: EngineErrorCode::InvalidRequest,
                    message: "Stage could not load the selected project's context.".to_string(),
                    provider_id: Some(request.provider_id),
                    retryable: true,
                    detail: Some(error.to_string()),
                },
            });
            return;
        }

        run_provider(
            ProviderRunContext {
                api_version,
                run_id,
                request,
            },
            events,
            cancel,
        )
        .await;
    }

    async fn prepare_request(
        &self,
        request: &mut StartRunRequest,
        auth_token: Option<&str>,
    ) -> anyhow::Result<()> {
        if let Some(project_id) = request.context.project_id.as_deref() {
            let token = auth_token.ok_or_else(|| anyhow::anyhow!("missing desktop auth token"))?;
            let context = self
                .repository
                .fetch_project_context(token, project_id)
                .await?;
            request.prompt = build_grounded_chat_prompt(&request.prompt, &context)?;
        }

        let image_paths = request
            .attachments
            .iter()
            .filter_map(|attachment| attachment.local_path.as_deref())
            .collect::<Vec<_>>();
        if !image_paths.is_empty() {
            request.prompt.push_str(
                "\n\nThe user explicitly attached the following current-work images. Inspect them visually and ground the critique in both the selected Stage project and the visible layout:\n",
            );
            for image_path in image_paths {
                request.prompt.push_str("- ");
                request.prompt.push_str(image_path);
                request.prompt.push('\n');
            }
        }
        Ok(())
    }
}
