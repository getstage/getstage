import type { SaveFeedback } from "@/hooks/useFeedback";

type FeedbackTextProps = {
  feedback: SaveFeedback;
  fallback?: string;
};

export function FeedbackText({ feedback, fallback }: FeedbackTextProps) {
  if (feedback.kind === "saved") {
    return <span className="card-footer-text success">Saved successfully</span>;
  }

  if (feedback.kind === "error") {
    return (
      <span className="card-footer-text" style={{ color: "var(--color-destructive, #E07070)" }}>
        {feedback.message}
      </span>
    );
  }

  if (fallback) {
    return <span className="card-footer-text">{fallback}</span>;
  }

  return <span className="card-footer-text" />;
}
