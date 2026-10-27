import posthog from "posthog-js";
import type { RunEvent } from "@stage/data-ops/contracts";

// Product analytics (PostHog EU). The key exists only in the production GitHub
// environment, so dev and testing builds never report.
const posthogKey = import.meta.env.PROD ? import.meta.env.VITE_POSTHOG_KEY?.trim() : undefined;
const enabled = Boolean(posthogKey);

if (posthogKey) {
  posthog.init(posthogKey, {
    api_host: "https://eu.i.posthog.com",
    defaults: "2025-05-24",
    // Replays hide everything typed: prompts and client data stay on the Mac.
    session_recording: { maskAllInputs: true },
  });
}

export function identifyUser(user: { id: string; email: string } | null) {
  if (!enabled) return;
  if (user) posthog.identify(user.id, { email: user.email });
  else posthog.reset();
}

export function captureEvent(name: string, properties?: Record<string, unknown>) {
  if (enabled) posthog.capture(name, properties);
}

// Run outcome events. Only run_started carries the mode, so it is remembered per run.
const runs = new Map<string, { mode: string; startedAt: number }>();

export function captureRunEvent(event: RunEvent) {
  if (!enabled) return;
  if (event.type === "run_started") {
    runs.set(event.runId, { mode: event.mode, startedAt: event.createdAt });
    captureEvent("run_started", { mode: event.mode, provider: event.providerId, model: event.modelId });
    return;
  }
  if (event.type !== "run_completed" && event.type !== "run_failed" && event.type !== "run_cancelled") return;
  const run = runs.get(event.runId);
  runs.delete(event.runId);
  captureEvent(event.type, {
    mode: run?.mode,
    provider: event.providerId,
    duration_seconds: run ? Math.round((event.createdAt - run.startedAt) / 1000) : undefined,
    ...(event.type === "run_failed" ? { error_code: event.error.code } : {}),
  });
}
