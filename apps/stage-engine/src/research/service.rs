use thiserror::Error;

use crate::models::refero::ReferoContext;
use crate::models::research::ResearchInput;
use crate::refero::service::{ReferoService, ReferoServiceError};

use super::context::build_refero_search_request;
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
        let refero_request = build_refero_search_request(&input);
        let refero_context = self.refero.research_context(&refero_request).await?;
        let prompt = build_research_prompt(&input, &refero_context);

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
