import type { EngineError, RunEvent } from "@stage/data-ops/contracts";

/** Shown in the Research UI when a run fails. Technical detail goes to the dev terminal only. */
export const RESEARCH_RUN_FAILED_USER_MESSAGE =
  "Something went wrong while running Research. Please try again.";

/** Shown in the Strategy UI when a run fails. Technical detail goes to the dev terminal only. */
export const STRATEGY_RUN_FAILED_USER_MESSAGE =
  "Something went wrong while running Strategy. Please try again.";

export function formatEngineError(error: EngineError): string {
  const parts = [`code=${error.code}`, `message=${error.message}`];
  if (error.detail) {
    parts.push(`detail=${error.detail}`);
  }
  if (error.providerId) {
    parts.push(`provider=${error.providerId}`);
  }
  return parts.join(" ");
}

export function formatRunFailedEvent(
  event: Extract<RunEvent, { type: "run_failed" }>,
): string {
  return `[stage-engine] run failed runId=${event.runId} ${formatEngineError(event.error)}`;
}
