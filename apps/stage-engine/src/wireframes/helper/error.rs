use crate::models::errors::{EngineError, EngineErrorCode};
use crate::models::providers::ProviderId;

#[derive(Debug, thiserror::Error)]
pub(crate) enum WorkflowError {
    #[error("{0}")]
    InvalidRequest(String),

    #[error("wireframe generation failed: {0}")]
    GenerationFailed(String),

    #[error("wireframe workflow failed: {0}")]
    Internal(String),

    #[error(transparent)]
    Convex(#[from] anyhow::Error),

    #[error(transparent)]
    Provider(#[from] crate::providers::process::ProviderProcessError),

    #[error(transparent)]
    Serde(#[from] serde_json::Error),
}

impl WorkflowError {
    pub(crate) fn to_engine_error(&self, provider_id: ProviderId) -> EngineError {
        // Provider failures already carry a short user-facing message (usage limit,
        // auth, model). Keep that instead of wrapping everything in a generic
        // "could not finish the wireframes run" that hides the real cause in detail.
        if let WorkflowError::Provider(error) = self {
            return error.to_engine_error(provider_id);
        }

        let code = match self {
            WorkflowError::InvalidRequest(_) => EngineErrorCode::InvalidRequest,
            WorkflowError::Provider(_) => unreachable!("handled above"),
            WorkflowError::GenerationFailed(_)
            | WorkflowError::Internal(_)
            | WorkflowError::Convex(_)
            | WorkflowError::Serde(_) => EngineErrorCode::InternalError,
        };

        EngineError {
            code,
            message: user_message(self),
            provider_id: Some(provider_id),
            retryable: !matches!(self, WorkflowError::InvalidRequest(_)),
            detail: Some(self.to_string()),
        }
    }
}

fn user_message(error: &WorkflowError) -> String {
    match error {
        WorkflowError::InvalidRequest(message) => message.clone(),
        WorkflowError::GenerationFailed(_) => {
            "Stage couldn't complete these wireframes. Your existing screens are unchanged. Please try again.".to_string()
        }
        WorkflowError::Internal(_) => {
            "Stage couldn't finish this wireframes run. Your existing screens are unchanged. Please try again.".to_string()
        }
        WorkflowError::Provider(_) => {
            "The selected AI provider could not finish the wireframes run.".to_string()
        }
        WorkflowError::Convex(_) => {
            "Stage wireframes data could not be loaded or saved.".to_string()
        }
        WorkflowError::Serde(_) => {
            "The AI response did not match the Wireframes artifact format.".to_string()
        }
    }
}
