use crate::models::runs::{RunModelOptionSelection, RunModelOptionValue};

pub fn apply_claude_run_options(args: &mut Vec<String>, options: &[RunModelOptionSelection]) {
    if let Some(effort) = resolve_claude_effort(options) {
        args.push("--effort".to_string());
        args.push(effort);
    }
}

pub fn resolve_codex_model_id(
    base_model_id: &str,
    options: &[RunModelOptionSelection],
) -> Option<String> {
    if response_speed(options) == Some("fast") {
        return Some("gpt-5.5-instant".to_string());
    }

    match base_model_id {
        "codex-default" => None,
        other => Some(other.to_string()),
    }
}

fn response_speed(options: &[RunModelOptionSelection]) -> Option<&str> {
    option_string(options, "response_speed")
}

fn resolve_claude_effort(options: &[RunModelOptionSelection]) -> Option<String> {
    if response_speed(options) == Some("fast") {
        return Some("low".to_string());
    }

    option_string(options, "reasoning_effort").map(map_claude_effort)
}

fn option_string<'a>(options: &'a [RunModelOptionSelection], id: &str) -> Option<&'a str> {
    options.iter().find_map(|option| {
        if option.id != id {
            return None;
        }

        match &option.value {
            RunModelOptionValue::String(value) => Some(value.as_str()),
            RunModelOptionValue::Boolean(_) => None,
        }
    })
}

fn map_claude_effort(value: &str) -> String {
    match value {
        "low" => "low",
        "medium" => "medium",
        "high" => "high",
        "extra-high" => "xhigh",
        other => other,
    }
    .to_string()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::runs::RunModelOptionValue;

    #[test]
    fn fast_mode_maps_to_low_claude_effort() {
        let options = vec![RunModelOptionSelection {
            id: "response_speed".to_string(),
            value: RunModelOptionValue::String("fast".to_string()),
        }];

        assert_eq!(resolve_claude_effort(&options).as_deref(), Some("low"));
    }

    #[test]
    fn fast_mode_maps_to_codex_instant_model() {
        let options = vec![RunModelOptionSelection {
            id: "response_speed".to_string(),
            value: RunModelOptionValue::String("fast".to_string()),
        }];

        assert_eq!(
            resolve_codex_model_id("codex-default", &options).as_deref(),
            Some("gpt-5.5-instant")
        );
    }
}
