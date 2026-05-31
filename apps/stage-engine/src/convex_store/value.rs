use std::collections::BTreeMap;

use anyhow::bail;
use convex::{FunctionResult, Value};
use serde_json::Value as JsonValue;

pub fn function_result_to_json(result: FunctionResult) -> anyhow::Result<JsonValue> {
    match result {
        FunctionResult::Value(value) => Ok(value.into()),
        FunctionResult::ErrorMessage(message) => bail!(message),
        FunctionResult::ConvexError(error) => bail!(error.message),
    }
}

pub fn args() -> BTreeMap<String, Value> {
    BTreeMap::new()
}
