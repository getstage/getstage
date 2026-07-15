import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ProviderId, RunEvent } from "@stage/data-ops/contracts";
import type { Id } from "@stage/data-ops/convex/data-model";
import { convexQuery } from "@convex-dev/react-query";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/convexApi";
import { useDesktopAuth } from "@/lib/auth";
import { engineQueryKeys } from "@/hooks/engine/queryKeys";
import { useProviderPreferences } from "@/hooks/engine/useProviderPreferences";
import { useProviderRun } from "@/hooks/engine/useProviderRun";
import { useProviderStatus } from "@/hooks/engine/useProviderStatus";
import { useChatDefaults } from "@/hooks/engine/useChatDefaults";
import { formatRunFailedEvent, toRunFailureUserMessage } from "@/lib/engine/formatRunError";
import { toUserFacingErrorMessage } from "@/lib/errors";
import { buildRunModelOptions } from "@/lib/engine/runModelOptions";
import {
  assertProviderPreflightReady,
  getProviderPreflightError,
} from "@/lib/engine/providerPreflight";
import { resolveRunModelId } from "@/lib/engine/resolveRunModelId";
import { useProviderRequired } from "@/components/app/ProviderRequiredDialog";

const WIREFRAMES_PROMPT =
  "Generate Stage wireframes from the current project context.";
const WIREFRAMES_RUN_FAILED_USER_MESSAGE =
  "Wireframes generation failed. Check that Stage Engine is running and the selected provider is configured.";

const WIREFRAMES_EVENT_STALL_MS = 20_000;
const WIREFRAMES_RUN_MAX_MS = 20 * 60 * 1000;
const WIREFRAMES_REGENERATE_PROMPT_PREFIX = "Regenerate wireframe screens:";

const wireframesRunLocks = new Map<string, Promise<void>>();

function hasTerminalRunEvent(events: RunEvent[]) {
  return events.some(
    (event) =>
      event.type === "run_completed" ||
      event.type === "run_failed" ||
      event.type === "run_cancelled",
  );
}

function latestTerminalRunEvent(events: RunEvent[]) {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index];
    if (
      event.type === "run_completed" ||
      event.type === "run_failed" ||
      event.type === "run_cancelled"
    ) {
      return event;
    }
  }

  return null;
}

function isFreshRunningRun(startedAt: number) {
  return Date.now() - startedAt < WIREFRAMES_RUN_MAX_MS;
}

export function isWireframesRegeneratePrompt(prompt: string | null | undefined) {
  return prompt?.startsWith(WIREFRAMES_REGENERATE_PROMPT_PREFIX) ?? false;
}

export function screenIdsFromRegeneratePrompt(prompt: string | null | undefined) {
  if (!isWireframesRegeneratePrompt(prompt) || !prompt) {
    return null;
  }

  const ids = prompt
    .slice(WIREFRAMES_REGENERATE_PROMPT_PREFIX.length)
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  return ids.length > 0 ? ids : null;
}

export function useWireframesRun(projectId: string) {
  const { isAuthenticated } = useDesktopAuth();
  const queryClient = useQueryClient();
  const providerRun = useProviderRun({ projectId, mode: "wireframes" });
  const providerPreferences = useProviderPreferences();
  const providers = useProviderStatus();
  const providerRequired = useProviderRequired();
  const chatDefaults = useChatDefaults();
  const [error, setError] = useState<string | null>(null);
  const [runEnded, setRunEnded] = useState(false);
  const runStartedAtRef = useRef<number | null>(null);

  const activeRunId = providerRun.activeRunId;
  const activeRunEvents = providerRun.activeRunEvents;
  const hasTerminalEvent = hasTerminalRunEvent(activeRunEvents);

  // In-memory run state is lost on reload/tab remount. Convex keeps wireframes runs at
  // module "generate" with status "running" until the engine completes or fails them.
  const runsQueryEnabled = isAuthenticated && Boolean(projectId);
  const { data: wireframesRuns, isPending: wireframesRunsPending } = useQuery(
    convexQuery(
      api.projectAi.listRuns,
      runsQueryEnabled
        ? { projectId: projectId as Id<"projects">, module: "generate" }
        : "skip",
    ),
  );
  const persistedRunningRun = useMemo(
    () =>
      (wireframesRuns ?? []).find(
        (run) => run.status === "running" && isFreshRunningRun(run.startedAt),
      ) ?? null,
    [wireframesRuns],
  );
  const isRunsLoading = runsQueryEnabled && wireframesRunsPending;

  const isRunning = useMemo(
    () =>
      !runEnded &&
      (providerRun.startRun.isPending ||
        providerRun.isRunActive ||
        persistedRunningRun !== null),
    [
      persistedRunningRun,
      providerRun.isRunActive,
      providerRun.startRun.isPending,
      runEnded,
    ],
  );

  const isRegenerateRun = useMemo(() => {
    if (providerRun.activeRunSource?.includes("screens:")) {
      return true;
    }

    return isWireframesRegeneratePrompt(persistedRunningRun?.inputSummary);
  }, [persistedRunningRun?.inputSummary, providerRun.activeRunSource]);

  const terminalEvent = useMemo(
    () => latestTerminalRunEvent(activeRunEvents),
    [activeRunEvents],
  );

  const failRun = useCallback(
    (logMessage: string) => {
      console.error(logMessage);
      setRunEnded(true);
      setError(WIREFRAMES_RUN_FAILED_USER_MESSAGE);
      providerRun.resetActiveRun();
    },
    [providerRun],
  );

  useEffect(() => {
    if (!terminalEvent) return;

    setRunEnded(true);

    if (terminalEvent.type === "run_completed") {
      setError(null);
      return;
    }

    if (terminalEvent.type === "run_failed") {
      console.error(formatRunFailedEvent(terminalEvent));
      setError(toRunFailureUserMessage(terminalEvent, WIREFRAMES_RUN_FAILED_USER_MESSAGE));
    }
  }, [terminalEvent]);

  useEffect(() => {
    if (hasTerminalEvent && !runEnded) {
      setRunEnded(true);
    }
  }, [hasTerminalEvent, runEnded]);

  useEffect(() => {
    if (persistedRunningRun && runStartedAtRef.current === null) {
      runStartedAtRef.current = persistedRunningRun.startedAt;
    }
  }, [persistedRunningRun]);

  // Watchdog timers cover both an in-memory run (activeRunId) and a run recovered
  // from Convex after reload (persistedRunningRun). For recovered runs we have no
  // live event stream, so only the max-duration watchdog applies — if the engine
  // crashed mid-run without updating Convex, this fails the UI instead of leaving
  // "Generating…" stuck for ~20 minutes.
  useEffect(() => {
    const runId = activeRunId ?? persistedRunningRun?.id ?? null;
    if (!runId || runEnded || hasTerminalEvent) return;

    if (runStartedAtRef.current === null) {
      runStartedAtRef.current = persistedRunningRun?.startedAt ?? Date.now();
    }

    const remaining = WIREFRAMES_RUN_MAX_MS - (Date.now() - runStartedAtRef.current);

    // Stall watchdog only makes sense for an in-memory run with an event stream.
    const stallTimer = activeRunId
      ? window.setTimeout(() => {
          const events =
            queryClient.getQueryData<RunEvent[]>(engineQueryKeys.runEvents(activeRunId)) ?? [];

          if (hasTerminalRunEvent(events)) return;

          if (events.length === 0) {
            failRun(
              "[stage-engine] wireframes run stalled: no events received (Electron main process likely out of date - restart pnpm dev)",
            );
          }
        }, WIREFRAMES_EVENT_STALL_MS)
      : null;

    const maxTimer =
      remaining > 0
        ? window.setTimeout(() => {
            failRun("[stage-engine] wireframes run watchdog: exceeded maximum duration");
          }, remaining)
        : null;

    if (remaining <= 0) {
      failRun("[stage-engine] wireframes run watchdog: exceeded maximum duration");
    }

    return () => {
      if (stallTimer) window.clearTimeout(stallTimer);
      if (maxTimer) window.clearTimeout(maxTimer);
    };
  }, [activeRunId, failRun, hasTerminalEvent, persistedRunningRun, queryClient, runEnded]);

  const cancelWireframes = useCallback(async () => {
    const runId = providerRun.activeRunId ?? persistedRunningRun?.id ?? null;
    if (!runId) return;
    await providerRun.cancelRun.mutateAsync(runId);
  }, [persistedRunningRun?.id, providerRun.activeRunId, providerRun.cancelRun]);

  const startWireframes = useCallback(
    async (
      providerId: ProviderId,
      source?: string,
      brandKitKeys: string[] = [],
      prompt: string = WIREFRAMES_PROMPT,
    ) => {
      if (isRunning || providerRun.startRun.isPending) return;

      const lockKey = source ? `${projectId}:${source}` : projectId;
      const inFlight = wireframesRunLocks.get(lockKey);
      if (inFlight) {
        await inFlight;
        return;
      }

      const runPromise = (async () => {
        setError(null);
        setRunEnded(false);
        runStartedAtRef.current = null;

        const preflightArgs = {
          providerId,
          snapshot: providers.snapshot,
          isEnabled: providerPreferences.isProviderEnabled(providerId),
          context: "run" as const,
        };
        const blockedMessage = getProviderPreflightError(preflightArgs);
        if (blockedMessage) providerRequired.show(blockedMessage);
        assertProviderPreflightReady(preflightArgs);

        // startRun.data (and its cached activeRunId) keeps showing the PREVIOUS
        // run's id/events until this new mutation resolves. Without clearing it,
        // the previous run's terminal event trips the watchdog below and snaps
        // runEnded back to true before any event for this run has arrived.
        providerRun.resetActiveRun();

        await providerRun.startRun.mutateAsync({
          providerId,
          modelId: resolveRunModelId(providerId, chatDefaults.defaults.modelId),
          prompt,
          mode: "wireframes",
          context: {
            projectId,
            ...(source ? { source } : {}),
            ...(brandKitKeys.length > 0 ? { brandKitKeys } : {}),
          },
          attachments: [],
          modelOptions: buildRunModelOptions(chatDefaults.defaults),
        });
      })();

      wireframesRunLocks.set(lockKey, runPromise);

      try {
        await runPromise;
      } finally {
        if (wireframesRunLocks.get(lockKey) === runPromise) {
          wireframesRunLocks.delete(lockKey);
        }
      }
    },
    [
      chatDefaults.defaults,
      isRunning,
      projectId,
      providerPreferences,
      providerRequired,
      providerRun.startRun,
      providers.snapshot,
    ],
  );

  return {
    startWireframes,
    cancelWireframes,
    isStarting: providerRun.startRun.isPending,
    isRunning,
    isRunsLoading,
    isRegenerateRun,
    persistedRunningRun,
    activeRunId: providerRun.activeRunId,
    activeRunSource: providerRun.activeRunSource,
    runEvents: activeRunEvents,
    terminalEvent,
    error:
      error ??
      (providerRun.startRun.error
        ? toUserFacingErrorMessage(providerRun.startRun.error, WIREFRAMES_RUN_FAILED_USER_MESSAGE)
        : null),
  };
}
