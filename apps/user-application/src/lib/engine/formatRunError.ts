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

function providerLabel(providerId: ProviderId | null | undefined, message = "") {
  if (providerId === "claude") return "Claude";
  if (providerId === "codex") return "Codex";
  if (/claude/i.test(message)) return "Claude";
  if (/codex|openai/i.test(message)) return "Codex";
  return "The selected provider";
}

function combinedErrorText(error: EngineError) {
  return [error.message, error.detail].filter(Boolean).join(" ");
}

function looksLikeProviderSessionLimit(text: string) {
  return /session limit|rate limit|usage limit|hit your session limit|resets \d/i.test(text);
}

function looksLikeProviderAuthFailure(text: string) {
  if (looksLikeProviderSessionLimit(text)) {
    return false;
  }
  return /auth|login|not authenticated|sign in|401|failed to authenticate|not logged in/i.test(
    text,
  );
}

function isProviderSetupError(error: EngineError) {
  const text = combinedErrorText(error);
  return (
    error.code === "missing_binary" ||
    error.code === "run_spawn_failed" ||
    error.code === "provider_process_failed" ||
    error.code === "not_authenticated" ||
    (error.code === "readiness_failed" && looksLikeProviderAuthFailure(text))
  );
}

function friendlyModelLabel(modelId: string) {
  return modelId
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function modelErrorMessage(providerId: ProviderId | null | undefined, text: string) {
  const modelId = text.match(/selected model \(([^)]+)\)/i)?.[1];
  if (!modelId) {
    return null;
  }

  const label = providerLabel(providerId, text);
  return `${label} could not use ${friendlyModelLabel(modelId)}. Open Settings → Integrations, refresh providers, then pick another available model if this still fails.`;
}

export function toEngineErrorUserMessage(
  error: EngineError,
  fallback = CHAT_RUN_FAILED_USER_MESSAGE,
): string {
  const text = combinedErrorText(error);
  const label = providerLabel(error.providerId, text);
  const loginCmd = providerLoginCommand(error.providerId ?? (/claude/i.test(text) ? "claude" : "codex"));

  const modelMessage = modelErrorMessage(error.providerId, text);
  if (modelMessage) {
    return modelMessage;
  }

  if (looksLikeProviderSessionLimit(text)) {
    const detail =
      text.match(/You've hit your session limit[^]*$/i)?.[0]?.trim() ??
      text.match(/session limit[^]*$/i)?.[0]?.trim();
    return detail
      ? `${label} session limit reached. Wait until the limit resets, then try again. (${detail})`
      : `${label} session limit reached. Wait until the limit resets, then try again.`;
  }

  if (error.code === "not_authenticated" || looksLikeProviderAuthFailure(text)) {
    return `${label} is not logged in. Run \`${loginCmd}\` in Terminal, then open Settings → Integrations and refresh.`;
  }

  if (isProviderSetupError(error) && error.message?.trim()) {
    return error.message;
  }

  if (error.code === "readiness_failed" && error.message?.trim()) {
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
