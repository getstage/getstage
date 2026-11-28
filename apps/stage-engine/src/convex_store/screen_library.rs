use anyhow::Context;
use convex::{ConvexClient, Value};
use serde::Deserialize;

use super::value::{args, function_result_to_json};
use crate::refero::service::ScreenLibrary;

#[derive(Debug, Deserialize)]
struct ScreenLibraryAnswer {
    screens: Option<ScreenLibrary>,
}

/// Which of the user's screen libraries (Mobbin or Refero) Research and the moodboard use for this project:
/// Stage's backend decides (the user's pick when both are connected, Refero during the shared grace period).
/// None when the user has neither.
pub async fn fetch_screen_library(
    deployment_url: &str,
    token: &str,
    project_id: &str,
) -> anyhow::Result<Option<ScreenLibrary>> {
    let mut client = ConvexClient::new(deployment_url)
        .await
        .with_context(|| format!("failed to connect to Convex at {deployment_url}"))?;
    client.set_auth(Some(token.to_string())).await;
    let mut request = args();
    request.insert("projectId".to_string(), Value::from(project_id.to_string()));
    let result = client
        .query("projectAi:getScreenLibrary", request)
        .await
        .context("failed to ask Stage which screen library to use")?;
    let answer: ScreenLibraryAnswer = serde_json::from_value(function_result_to_json(result)?)
        .context("Stage's screen library answer did not match the expected shape")?;
    Ok(answer.screens)
}
