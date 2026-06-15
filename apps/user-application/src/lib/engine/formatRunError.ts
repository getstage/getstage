import type { EngineError, ProviderId, RunEvent } from "@stage/data-ops/contracts";

/** Shown in the Research UI when a run fails. Technical detail goes to the dev terminal only. */
export const RESEARCH_RUN_FAILED_USER_MESSAGE =
  "Something went wrong while running Research. Please try again.";

/** Shown in the Strategy UI when a run fails. Technical detail goes to the dev terminal only. */
export const STRATEGY_RUN_FAILED_USER_MESSAGE =
  "Something went wrong while running Strategy. Please try again.";

/** Shown in Stage chat when a provider run fails for a non-auth reason. */
export const CHAT_RUN_FAILED_USER_MESSAGE =
  "Something went wrong while running chat. Please try again.";

function providerLoginCommand(providerId: ProviderId | null | undefined) {
  return providerId === "claude" ? "claude auth login" : "codex login";
}

function providerLabel(providerId: ProviderId | null | undefined) {
  return providerId === "claude" ? "Claude" : "Codex";
}

function looksLikeProviderSessionLimit(error: EngineError) {
  const combined = [error.message, error.detail].filter(Boolean).join(" ");
  return /session limit|rate limit|usage limit|resets \d/i.test(combined);
}

function looksLikeProviderAuthFailure(error: EngineError) {
  if (looksLikeProviderSessionLimit(error)) {
    return false;
  }

  const combined = [error.message, error.detail].filter(Boolean).join(" ");
  return /auth|login|not authenticated|sign in|401|failed to authenticate|not logged in/i.test(
    combined,
  );
}

function isProviderSetupError(error: EngineError) {
  return (
    error.code === "missing_binary" ||
    error.code === "run_spawn_failed" ||
    error.code === "provider_process_failed" ||
    error.code === "not_authenticated" ||
    (error.code === "readiness_failed" && looksLikeProviderAuthFailure(error))
  );
}

export function toEngineErrorUserMessage(
  error: EngineError,
  fallback = CHAT_RUN_FAILED_USER_MESSAGE,
): string {
  const label = providerLabel(error.providerId);
  const loginCmd = providerLoginCommand(error.providerId);

  if (looksLikeProviderSessionLimit(error)) {
    const payload =
      error.detail?.match(/session limit[^]*$/i)?.[0]?.trim() ??
      error.detail?.split(": ").at(-1)?.trim();
    return payload
      ? `${label} session limit reached. Wait until the limit resets, then try again. (${payload})`
      : `${label} session limit reached. Wait until the limit resets, then try again.`;
  }

  if (error.code === "not_authenticated" || looksLikeProviderAuthFailure(error)) {
    return `${label} is not logged in. Run \`${loginCmd}\` in Terminal, then open Settings → Integrations and refresh.`;
  }

  if (isProviderSetupError(error) && error.message.trim()) {
    return error.message;
  }

  if (error.code === "readiness_failed" && error.message.trim()) {
    return error.message;
  }

  return fallback;
}

export function toRunFailureUserMessage(
  event: Extract<RunEvent, { type: "run_failed" }>,
  fallback = CHAT_RUN_FAILED_USER_MESSAGE,
) {
  return toEngineErrorUserMessage(event.error, fallback);
}

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
