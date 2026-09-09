import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ProviderId, RunEvent } from "@stage/data-ops/contracts";
import type { Id } from "@stage/data-ops/convex/data-model";
import { convexQuery } from "@convex-dev/react-query";
import { useMutation as useConvexMutation } from "convex/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/convexApi";
import { useDesktopAuth } from "@/lib/auth";
import { engineQueryKeys } from "@/hooks/engine/queryKeys";
import { useProviderPreferences } from "@/hooks/engine/useProviderPreferences";
import { useProviderRun } from "@/hooks/engine/useProviderRun";
import { useProviderStatus } from "@/hooks/engine/useProviderStatus";
import { useChatDefaults } from "@/hooks/engine/useChatDefaults";
import {
  formatRunFailedEvent,
  formatStoredRunErrorMessage,
  toRunFailureUserMessage,
  WIREFRAMES_RUN_FAILED_USER_MESSAGE,
} from "@/lib/engine/formatRunError";
import { buildRunModelOptions } from "@/lib/engine/runModelOptions";
import {
  assertProviderPreflightReady,
  getProviderPreflightError,
} from "@/lib/engine/providerPreflight";
import { resolveRunModelId } from "@/lib/engine/resolveRunModelId";
import { useProviderRequired } from "@/components/app/ProviderRequiredDialog";

const WIREFRAMES_PROMPT =
  "Generate Stage wireframes from the current project context.";

const WIREFRAMES_EVENT_STALL_MS = 20_000;
const WIREFRAMES_RUN_MAX_MS = 20 * 60 * 1000;

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

export function useWireframesRun(projectId: string) {
  const { isAuthenticated } = useDesktopAuth();
  const queryClient = useQueryClient();
  const providerRun = useProviderRun({ projectId, mode: "wireframes" });
  const providerPreferences = useProviderPreferences();
  const providers = useProviderStatus();
  const providerRequired = useProviderRequired();
  const chatDefaults = useChatDefaults();
  const cancelPersistedRun = useConvexMutation(api.projectAi.cancelRun);
  const [error, setError] = useState<string | null>(null);
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
      (wireframesRuns ?? []).find((run) => run.status === "running") ?? null,
    [wireframesRuns],
  );
  const isRunsLoading = runsQueryEnabled && wireframesRunsPending;

  const isRunning = useMemo(
    () =>
      providerRun.startRun.isPending ||
      providerRun.isRunActive ||
      persistedRunningRun !== null,
    [
      persistedRunningRun,
      providerRun.isRunActive,
      providerRun.startRun.isPending,
    ],
  );

  const terminalEvent = useMemo(
    () => latestTerminalRunEvent(activeRunEvents),
    [activeRunEvents],
  );

  const stopActiveRun = useCallback(async () => {
    await Promise.allSettled([
      providerRun.activeRunId
        ? providerRun.cancelRun.mutateAsync(providerRun.activeRunId)
        : Promise.resolve(),
      persistedRunningRun
        ? cancelPersistedRun({
            runId: persistedRunningRun.id,
            projectId: projectId as Id<"projects">,
          })
        : Promise.resolve(),
    ]);
    providerRun.resetActiveRun();
  }, [
    cancelPersistedRun,
    persistedRunningRun,
    projectId,
    providerRun.activeRunId,
    providerRun.cancelRun,
    providerRun.resetActiveRun,
  ]);

  const failRun = useCallback(
    (logMessage: string) => {
      console.error(logMessage);
      setError(WIREFRAMES_RUN_FAILED_USER_MESSAGE);
      void stopActiveRun();
    },
    [stopActiveRun],
  );

  useEffect(() => {
    if (!terminalEvent) return;

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
    if (!runId || hasTerminalEvent) return;

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
  }, [activeRunId, failRun, hasTerminalEvent, persistedRunningRun, queryClient]);

  const startWireframes = useCallback(
    async (
      providerId: ProviderId,
      source?: string,
      brandKitKeys: string[] = [],
      prompt: string = WIREFRAMES_PROMPT,
    ) => {
      if (providerRun.startRun.isPending || providerRun.isRunActive) return;

      const lockKey = source ? `${projectId}:${source}` : projectId;
      const inFlight = wireframesRunLocks.get(lockKey);
      if (inFlight) {
        await inFlight;
        return;
      }

      const runPromise = (async () => {
        setError(null);
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

        // Clear the previous run's cached id/events before starting the next one.
        providerRun.resetActiveRun();

        if (persistedRunningRun && !providerRun.isRunActive) {
          await cancelPersistedRun({
            runId: persistedRunningRun.id,
            projectId: projectId as Id<"projects">,
          });
        }

        const start = () =>
          providerRun.startRun.mutateAsync({
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

        try {
          await start();
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          if (!/already in progress/i.test(message)) {
            throw error;
          }
          if (persistedRunningRun) {
            await cancelPersistedRun({
              runId: persistedRunningRun.id,
              projectId: projectId as Id<"projects">,
            });
          }
          await start();
        }
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
      cancelPersistedRun,
      persistedRunningRun,
      projectId,
      providerPreferences,
      providerRequired,
      providerRun.isRunActive,
      providerRun.resetActiveRun,
      providerRun.startRun,
      providers.snapshot,
    ],
  );

  return {
    startWireframes,
    cancelWireframes: stopActiveRun,
    isStarting: providerRun.startRun.isPending,
    isRunning,
    isRunsLoading,
    error:
      error ??
      (providerRun.startRun.error
        ? formatStoredRunErrorMessage(
            providerRun.startRun.error instanceof Error
              ? providerRun.startRun.error.message
              : String(providerRun.startRun.error),
            WIREFRAMES_RUN_FAILED_USER_MESSAGE,
          )
        : null),
  };
}
