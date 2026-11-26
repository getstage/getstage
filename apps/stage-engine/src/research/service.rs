use thiserror::Error;

use crate::models::refero::ReferoContext;
use crate::models::research::ResearchInput;
use crate::refero::service::{ReferoService, ReferoServiceError};

use super::context::{
    build_refero_category_search_requests, build_refero_competitor_search_requests,
    build_refero_flow_search_request,
};
use super::prompt::build_research_prompt;

#[derive(Clone, Debug)]
pub struct ResearchPromptBundle {
    pub input: ResearchInput,
    pub refero_context: ReferoContext,
    pub prompt: String,
}

#[derive(Clone, Debug)]
pub struct ResearchService {
    refero: ReferoService,
}

impl ResearchService {
    pub fn new(refero: ReferoService) -> Self {
        Self { refero }
    }

    pub async fn build_prompt_bundle(
        &self,
        input: ResearchInput,
    ) -> Result<ResearchPromptBundle, ResearchServiceError> {
        let category_requests = build_refero_category_search_requests(&input);
        let flow_request = build_refero_flow_search_request(&input);
        let competitor_requests = build_refero_competitor_search_requests(&input);
        // Without a usable Mobbin account (not connected, signed out, out of credits) Research still
        // runs, only without UI pattern references and screen evidence.
        let screens = async {
            let context = self
                .refero
                .research_context_for_categories(&category_requests, &flow_request)
                .await?;
            let evidence = self
                .refero
                .competitor_screen_evidence(&competitor_requests)
                .await?;
            Ok::<_, crate::refero::service::ReferoServiceError>((context, evidence))
        };
        let (refero_context, competitor_evidence) = match screens.await {
            Ok(found) => found,
            Err(error) if error.is_unavailable() => {
                tracing::warn!(%error, "Mobbin can't be used for this account; Research runs without UI pattern references");
                (empty_context(), Vec::new())
            }
            Err(error) => return Err(error.into()),
        };
        let prompt = build_research_prompt(&input, &refero_context, &competitor_evidence);

        Ok(ResearchPromptBundle {
            input,
            refero_context,
            prompt,
        })
    }

    pub fn refero(&self) -> &ReferoService {
        &self.refero
    }
}

#[derive(Debug, Error)]
pub enum ResearchServiceError {
    #[error("Refero context failed: {0}")]
    Refero(#[from] ReferoServiceError),
}

fn empty_context() -> crate::models::refero::ReferoContext {
    crate::models::refero::ReferoContext {
        query: String::new(),
        references: Vec::new(),
        category_searches: Vec::new(),
        fetched_at: crate::helpers::time::now_millis(),
    }
}
