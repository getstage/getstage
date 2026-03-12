import { toUserFacingErrorMessage } from "@/lib/errors";

export function showFriendlyFeedback(
  showFeedback: (feedback: { kind: "error"; message: string }) => void,
  error: unknown,
  fallback: string,
) {
  showFeedback({
    kind: "error",
    message: toUserFacingErrorMessage(error, fallback),
  });
}
