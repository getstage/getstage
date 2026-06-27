use crate::models::runs::RunMode;

pub(super) fn expected_artifact_kind(mode: RunMode) -> Option<&'static str> {
    match mode {
        RunMode::Research => Some("researchArtifact"),
        RunMode::Strategy => Some("strategyArtifact"),
        RunMode::Flows => Some("flowsArtifact"),
        RunMode::Wireframes => Some("wireframesArtifact"),
        RunMode::Styleguide
        | RunMode::Moodboard
        | RunMode::Chat
        | RunMode::Generation
        | RunMode::Voice
        | RunMode::Critique => None,
    }
}

pub(super) fn looks_like_json_artifact_line(text: &str, expected_kind: Option<&str>) -> bool {
    let trimmed = text.trim();
    if !trimmed.starts_with('{') || !trimmed.ends_with('}') || !trimmed.contains("\"artifactKind\"") {
        return false;
    }
    match expected_kind {
        Some(kind) => trimmed.contains(kind),
        None => false,
    }
}

/// Looser check used for stderr warning suppression — matches any line that looks
/// like a JSON artifact regardless of kind (echoed input context should be suppressed too).
fn looks_like_any_json_artifact_line(text: &str) -> bool {
    let trimmed = text.trim();
    trimmed.starts_with('{') && trimmed.ends_with('}') && trimmed.contains("\"artifactKind\"")
}

pub(super) fn extract_provider_exit_payload(detail: &str) -> Option<String> {
    let marker = "process exited with status ";
    let rest = detail.strip_prefix(marker)?;
    let payload = rest.rsplit_once(": ").map(|(_, payload)| payload.trim())?;
    if payload.is_empty()
        || payload.starts_with("exit status")
        || payload.chars().all(|ch| ch.is_ascii_digit())
    {
        None
    } else {
        Some(payload.to_string())
    }
}

pub(super) fn looks_like_provider_session_limit(text: &str) -> bool {
    let lower = text.to_lowercase();
    lower.contains("session limit")
        || lower.contains("rate limit")
        || lower.contains("usage limit")
        || lower.contains("resets ")
}

pub(super) fn looks_like_provider_auth_failure(text: &str) -> bool {
    if looks_like_provider_session_limit(text) {
        return false;
    }

    let lower = text.to_lowercase();
    lower.contains("not authenticated")
        || lower.contains("invalid authentication")
        || lower.contains("failed to authenticate")
        || lower.contains("401")
        || lower.contains("auth login")
        || lower.contains("sign in")
        || lower.contains("auth status")
        || lower.contains("not logged in")
}

pub(super) fn needs_stderr_artifact_capture(mode: RunMode) -> bool {
    matches!(
        mode,
        RunMode::Research
            | RunMode::Strategy
            | RunMode::Flows
            | RunMode::Wireframes
            | RunMode::Styleguide
            | RunMode::Generation
    )
}

/// Provider CLIs stream prompts, session headers, and tool traces on stderr. Parse when
/// needed, but do not surface as provider_warning in the desktop terminal.
pub(super) fn should_suppress_stderr_warning(text: &str) -> bool {
    let trimmed = text.trim();
    if trimmed.is_empty() {
        return true;
    }

    if looks_like_any_json_artifact_line(text) {
        return true;
    }

    if matches_session_header(trimmed) {
        return true;
    }

    if matches_runtime_metadata(trimmed) {
        return true;
    }

    if matches_artifact_payload(trimmed) {
        return true;
    }

    if matches_prompt_scaffold(trimmed) {
        return true;
    }

    if matches_strategy_template(trimmed) {
        return true;
    }

    if looks_like_json_fragment(trimmed) {
        return true;
    }

    matches_codex_narration(trimmed)
}

fn matches_session_header(trimmed: &str) -> bool {
    trimmed == "codex"
        || trimmed == "user"
        || trimmed == "exec"
        || trimmed == "--------"
        || trimmed.starts_with("tokens used")
        || trimmed.starts_with("Reading prompt from stdin")
        || trimmed.starts_with("OpenAI Codex")
}

fn matches_runtime_metadata(trimmed: &str) -> bool {
    trimmed.starts_with("workdir:")
        || trimmed.starts_with("model:")
        || trimmed.starts_with("provider:")
        || trimmed.starts_with("approval:")
        || trimmed.starts_with("sandbox:")
        || trimmed.starts_with("reasoning effort:")
        || trimmed.starts_with("reasoning summaries:")
        || trimmed.starts_with("session id:")
        || trimmed.starts_with("/bin/")
        || trimmed.starts_with("sed:")
        || trimmed.starts_with("rg:")
        || trimmed.starts_with(" exited ")
        || trimmed.starts_with(" succeeded in")
        || trimmed.starts_with(" in /Users/")
}

fn matches_artifact_payload(trimmed: &str) -> bool {
    trimmed.contains("\"artifactKind\"")
        || trimmed.contains("researchArtifact")
        || trimmed.contains("strategyArtifact")
        || trimmed.contains("ui-patterns-")
        || trimmed.contains("recognizedPatterns")
        || trimmed.contains("sourceReferenceId")
        || trimmed.contains("imageUrl")
}

fn matches_prompt_scaffold(trimmed: &str) -> bool {
    trimmed.starts_with("You are generating the Stage ")
        || trimmed.starts_with("Return a single valid JSON")
        || trimmed.starts_with("Do not return markdown.")
        || trimmed.starts_with("Do not invent source references")
        || trimmed.starts_with("Project:")
        || trimmed.starts_with("- Project ")
        || trimmed.starts_with("Project brief:")
        || trimmed.starts_with("Target users:")
        || trimmed.starts_with("Additional notes:")
        || trimmed.starts_with("Allowed competitive sites")
        || trimmed.starts_with("Competitive analysis rules")
        || trimmed.starts_with("Refero category searches")
        || trimmed.starts_with("Refero flow references")
        || trimmed.starts_with("Required artifact sections:")
        || trimmed.starts_with("Do NOT include uiPatterns")
        || trimmed.starts_with("Not provided.")
        || trimmed.starts_with("Goal:")
        || trimmed.starts_with("Focus on ")
        || trimmed.starts_with("Deliver ")
}

fn matches_strategy_template(trimmed: &str) -> bool {
    trimmed.starts_with("Requirements:")
        || trimmed.starts_with("- Use exactly these seven sections")
        || trimmed.starts_with("- `apiVersion`")
        || trimmed.starts_with("- `artifactKind`")
        || trimmed.starts_with("- Make the strategy specific")
        || trimmed.starts_with("- Set every section to")
        || trimmed.starts_with("- For Content Strategy")
        || trimmed.starts_with("- For Competitive Positioning")
        || trimmed.starts_with("- For Key Pages")
        || trimmed.starts_with("- For `table` sections")
        || trimmed.starts_with("The JSON must use:")
        || trimmed.starts_with("  1. Design Direction")
        || trimmed.starts_with("  2. Design Principles")
        || trimmed.starts_with("  3. Target Audience")
        || trimmed.starts_with("  4. Content Strategy")
        || trimmed.starts_with("  5. Competitive Positioning")
        || trimmed.starts_with("  6. Key Pages")
        || trimmed.starts_with("  7. Accessibility")
}

fn looks_like_json_fragment(trimmed: &str) -> bool {
    (trimmed.starts_with('"') && trimmed.contains("\":"))
        || trimmed == "{"
        || trimmed == "}"
        || trimmed == "],"
        || trimmed.starts_with("},")
        || trimmed.starts_with("{")
        || trimmed.starts_with("[")
}

fn matches_codex_narration(trimmed: &str) -> bool {
    trimmed.starts_with("I'm ")
        || trimmed.starts_with("I’ve ")
        || trimmed.starts_with("I found ")
        || trimmed.starts_with("import ")
        || trimmed.starts_with("export ")
        || trimmed.starts_with("const ")
        || trimmed.starts_with("function ")
        || trimmed.starts_with("type ")
        || trimmed.starts_with("return ")
        || trimmed.starts_with("  ")
        || trimmed.contains("/Users/")
        || trimmed.contains("/stage_mvp/")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn needs_stderr_artifact_capture_is_true_for_strategy_runs() {
        assert!(needs_stderr_artifact_capture(RunMode::Strategy));
        assert!(!needs_stderr_artifact_capture(RunMode::Chat));
    }

    #[test]
    fn session_limit_is_not_treated_as_auth_failure() {
        assert!(looks_like_provider_session_limit(
            "You've hit your session limit · resets 6:50pm (Europe/Amsterdam)"
        ));
        assert!(!looks_like_provider_auth_failure(
            "You've hit your session limit · resets 6:50pm (Europe/Amsterdam)"
        ));
    }

    #[test]
    fn looks_like_json_artifact_line_matches_expected_kind() {
        let line = r#"{"apiVersion":"v1","artifactKind":"strategyArtifact","sections":[]}"#;
        assert!(looks_like_json_artifact_line(line, Some("strategyArtifact")));
        assert!(!looks_like_json_artifact_line(line, Some("researchArtifact")));
    }

    #[test]
    fn looks_like_json_artifact_line_rejects_any_kind_when_none_expected() {
        let line = r#"{"apiVersion":"v1","artifactKind":"strategyArtifact","sections":[]}"#;
        assert!(!looks_like_json_artifact_line(line, None));
    }

    #[test]
    fn expected_artifact_kind_maps_modes_to_their_output_kind() {
        assert_eq!(expected_artifact_kind(RunMode::Strategy), Some("strategyArtifact"));
        assert_eq!(expected_artifact_kind(RunMode::Research), Some("researchArtifact"));
        assert_eq!(expected_artifact_kind(RunMode::Styleguide), None);
        assert_eq!(expected_artifact_kind(RunMode::Moodboard), None);
    }

    #[test]
    fn should_suppress_codex_session_noise() {
        assert!(should_suppress_stderr_warning("OpenAI Codex v0.139.0"));
        assert!(should_suppress_stderr_warning("workdir: /Users/me"));
        assert!(should_suppress_stderr_warning(
            "Reading prompt from stdin..."
        ));
        assert!(should_suppress_stderr_warning("exec"));
    }
}
