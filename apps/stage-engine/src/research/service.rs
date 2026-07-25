use thiserror::Error;

use crate::models::refero::{ReferoContext, ReferoReference};
use crate::models::research::ResearchInput;
use crate::refero::service::{ReferoService, ReferoServiceError};

use super::context::{
    build_refero_category_search_requests, build_refero_competitor_search_requests,
    build_refero_flow_search_request,
};
#[derive(Clone, Debug)]
pub struct ResearchEvidenceBundle {
    pub refero_context: ReferoContext,
    pub competitor_evidence: Vec<(String, Vec<ReferoReference>)>,
}

#[derive(Clone, Debug)]
pub struct ResearchService {
    refero: ReferoService,
}

impl ResearchService {
    pub fn new(refero: ReferoService) -> Self {
        Self { refero }
    }

    pub async fn build_evidence_bundle(
        &self,
        input: ResearchInput,
    ) -> Result<ResearchEvidenceBundle, ResearchServiceError> {
        let category_requests = build_refero_category_search_requests(&input);
        let flow_request = build_refero_flow_search_request(&input);
        let competitor_requests = build_refero_competitor_search_requests(&input);

        // Category+flow context and competitor evidence used to run serially; they are
        // independent Refero searches and should overlap on the wall clock.
        let (refero_context, competitor_evidence) = tokio::try_join!(
            self.refero
                .research_context_for_categories(&category_requests, &flow_request),
            self.refero.competitor_screen_evidence(&competitor_requests),
        )?;

        Ok(ResearchEvidenceBundle {
            refero_context,
            competitor_evidence,
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
