use crate::helpers::provider_json::is_complete_json_object;

use super::heuristics::looks_like_json_artifact_line;

const STDERR_DIAG_MAX_LINES: usize = 5;
const STDERR_DIAG_MAX_CHARS: usize = 240;

pub(super) fn append_output(final_text: &mut String, text: &str) {
    if !final_text.is_empty() {
        final_text.push('\n');
    }
    final_text.push_str(text);
}

pub(super) fn truncate_line(line: &str, max_chars: usize) -> String {
    if line.chars().count() <= max_chars {
        return line.to_string();
    }

    line.chars().take(max_chars).collect::<String>() + "…"
}

pub(super) fn stderr_diag_max_chars() -> usize {
    STDERR_DIAG_MAX_CHARS
}

#[derive(Debug, Default)]
pub(super) struct StderrDiagnostics {
    lines: Vec<String>,
}

impl StderrDiagnostics {
    pub(super) fn record(&mut self, line: &str) {
        let trimmed = truncate_line(line.trim(), STDERR_DIAG_MAX_CHARS);
        if trimmed.is_empty() {
            return;
        }

        if self.lines.last().is_some_and(|last| last == &trimmed) {
            return;
        }

        if self.lines.len() >= STDERR_DIAG_MAX_LINES {
            self.lines.remove(0);
        }

        self.lines.push(trimmed);
    }

    pub(super) fn summary(&self) -> Option<String> {
        if self.lines.is_empty() {
            return None;
        }

        Some(self.lines.join(" | "))
    }
}

#[derive(Debug, Default)]
pub(super) struct StderrArtifactCapture {
    pending: Option<String>,
}

impl StderrArtifactCapture {
    pub(super) fn ingest(
        &mut self,
        line: &str,
        final_text: &mut String,
        capture_multiline: bool,
        expected_kind: Option<&str>,
    ) {
        if looks_like_json_artifact_line(line, expected_kind) {
            self.pending = None;
            append_output(final_text, line.trim());
            return;
        }

        if !capture_multiline {
            return;
        }

        let trimmed = line.trim();
        if self.pending.is_some() || trimmed.starts_with('{') {
            let buffer = self.pending.get_or_insert_with(String::new);
            if !buffer.is_empty() {
                buffer.push('\n');
            }
            buffer.push_str(line);

            if is_complete_json_object(buffer)
                && buffer.contains("\"artifactKind\"")
                && expected_kind.is_some_and(|kind| buffer.contains(kind))
            {
                let completed = self.pending.take().expect("pending stderr json buffer");
                append_output(final_text, completed.trim());
            }
        }
    }

    pub(super) fn flush(&mut self, final_text: &mut String, capture_multiline: bool, expected_kind: Option<&str>) {
        if !capture_multiline {
            return;
        }

        let Some(pending) = self.pending.take() else {
            return;
        };

        let trimmed = pending.trim();
        if is_complete_json_object(trimmed)
            && trimmed.contains("\"artifactKind\"")
            && expected_kind.is_some_and(|kind| trimmed.contains(kind))
        {
            append_output(final_text, trimmed);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn stderr_capture_accepts_single_line_artifact() {
        let mut capture = StderrArtifactCapture::default();
        let mut final_text = String::new();
        let line = r#"{"apiVersion":"v1","artifactKind":"strategyArtifact","sections":[{"id":"direction","kind":"plain","body":["Go"]}]}"#;

        capture.ingest(line, &mut final_text, true, Some("strategyArtifact"));

        assert!(final_text.contains("strategyArtifact"));
    }

    #[test]
    fn stderr_capture_reassembles_pretty_printed_artifact() {
        let mut capture = StderrArtifactCapture::default();
        let mut final_text = String::new();
        let lines = [
            "{",
            r#"  "apiVersion": "v1","#,
            r#"  "artifactKind": "strategyArtifact","#,
            r#"  "sections": [{"id":"direction","kind":"plain","body":["Go"]}]"#,
            "}",
        ];

        for line in lines {
            capture.ingest(line, &mut final_text, true, Some("strategyArtifact"));
        }

        assert!(final_text.contains("strategyArtifact"));
        assert!(final_text.contains("direction"));
    }

    #[test]
    fn stderr_capture_skips_mismatched_artifact_kind() {
        let mut capture = StderrArtifactCapture::default();
        let mut final_text = String::new();
        let line = r#"{"apiVersion":"v1","artifactKind":"strategyArtifact","sections":[]}"#;

        // During a styleguide run (expected_kind = None), echoed strategy JSON must NOT be captured.
        capture.ingest(line, &mut final_text, true, None);

        assert!(final_text.is_empty());
    }

    #[test]
    fn stderr_capture_skips_multiline_capture_for_chat_mode() {
        let mut capture = StderrArtifactCapture::default();
        let mut final_text = String::new();

        capture.ingest("{", &mut final_text, false, Some("strategyArtifact"));
        capture.ingest(
            r#"  "artifactKind": "strategyArtifact""#,
            &mut final_text,
            false,
            Some("strategyArtifact"),
        );

        assert!(final_text.is_empty());
    }

    #[test]
    fn stderr_diag_keeps_recent_actionable_lines() {
        let mut diag = StderrDiagnostics::default();
        diag.record("Failed to authenticate. API Error: 401");
        assert_eq!(
            diag.summary(),
            Some("Failed to authenticate. API Error: 401".to_string())
        );
    }
}
