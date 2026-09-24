use crate::models::runs::{RunModelOptionSelection, RunModelOptionValue};

pub fn apply_claude_run_options(args: &mut Vec<String>, options: &[RunModelOptionSelection]) {
    if let Some(effort) = resolve_claude_effort(options) {
        args.push("--effort".to_string());
        args.push(effort);
    }
}

pub fn apply_codex_run_options(args: &mut Vec<String>, options: &[RunModelOptionSelection]) {
    if let Some(effort) = resolve_codex_effort(options) {
        args.push("-c".to_string());
        args.push(format!("model_reasoning_effort=\"{effort}\""));
    }

    if let Some(verbosity) = resolve_codex_verbosity(options) {
        args.push("-c".to_string());
        args.push(format!("model_verbosity=\"{verbosity}\""));
    }
}

pub fn resolve_codex_model_id(
    base_model_id: &str,
    options: &[RunModelOptionSelection],
) -> Option<String> {
    let _ = response_speed(options);

    match base_model_id {
        "codex-default" => None,
        other if crate::providers::models::is_safe_provider_model_id(other) => {
            Some(other.to_string())
        }
        _ => None,
    }
}

pub fn resolve_codex_effort(options: &[RunModelOptionSelection]) -> Option<String> {
    if response_speed(options) == Some("fast") {
        return Some("low".to_string());
    }

    option_string(options, "reasoning_effort").map(map_known_effort)
}

fn resolve_codex_verbosity(options: &[RunModelOptionSelection]) -> Option<&'static str> {
    if response_speed(options) == Some("fast") {
        return Some("low");
    }

    match option_string(options, "reasoning_effort") {
        Some("low") => Some("low"),
        Some("high") | Some("extra-high") => Some("medium"),
        _ => None,
    }
}

fn response_speed(options: &[RunModelOptionSelection]) -> Option<&str> {
    option_string(options, "response_speed")
}

fn resolve_claude_effort(options: &[RunModelOptionSelection]) -> Option<String> {
    if response_speed(options) == Some("fast") {
        return Some("low".to_string());
    }

    option_string(options, "reasoning_effort").map(map_known_effort)
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

fn map_known_effort(value: &str) -> String {
    match value {
        "low" | "medium" | "high" => value.to_string(),
        "extra-high" => "xhigh".to_string(),
        _ => "medium".to_string(),
    }
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
    fn fast_mode_keeps_codex_default_model() {
        let options = vec![RunModelOptionSelection {
            id: "response_speed".to_string(),
            value: RunModelOptionValue::String("fast".to_string()),
        }];

        assert_eq!(resolve_codex_model_id("codex-default", &options), None);
        assert_eq!(
            resolve_codex_model_id("gpt-5.5", &options).as_deref(),
            Some("gpt-5.5")
        );
        assert_eq!(
            resolve_codex_model_id("gpt-6-astra", &options).as_deref(),
            Some("gpt-6-astra")
        );
        assert_eq!(resolve_codex_model_id("../evil", &options), None);
    }

    #[test]
    fn fast_mode_maps_to_low_codex_effort_and_verbosity() {
        let options = vec![RunModelOptionSelection {
            id: "response_speed".to_string(),
            value: RunModelOptionValue::String("fast".to_string()),
        }];

        assert_eq!(resolve_codex_effort(&options).as_deref(), Some("low"));
        assert_eq!(resolve_codex_verbosity(&options), Some("low"));

        let mut args = Vec::new();
        apply_codex_run_options(&mut args, &options);
        assert!(
            args.windows(2)
                .any(|pair| pair[0] == "-c" && pair[1] == "model_reasoning_effort=\"low\"")
        );
        assert!(
            args.windows(2)
                .any(|pair| pair[0] == "-c" && pair[1] == "model_verbosity=\"low\"")
        );
    }

    #[test]
    fn explicit_codex_effort_maps_extra_high_to_xhigh() {
        let options = vec![RunModelOptionSelection {
            id: "reasoning_effort".to_string(),
            value: RunModelOptionValue::String("extra-high".to_string()),
        }];

        assert_eq!(resolve_codex_effort(&options).as_deref(), Some("xhigh"));
    }
}
