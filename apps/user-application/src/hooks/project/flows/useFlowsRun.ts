import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ProviderId, RunEvent } from "@stage/data-ops/contracts";
import { useQueryClient } from "@tanstack/react-query";
import { engineQueryKeys } from "@/hooks/engine/queryKeys";
import { useProviderPreferences } from "@/hooks/engine/useProviderPreferences";
import { useProviderRun } from "@/hooks/engine/useProviderRun";
import { useProviderStatus } from "@/hooks/engine/useProviderStatus";
import { useChatDefaults } from "@/hooks/engine/useChatDefaults";
import { formatRunFailedEvent } from "@/lib/engine/formatRunError";
import { toUserFacingErrorMessage } from "@/lib/errors";
import { buildRunModelOptions } from "@/lib/engine/runModelOptions";
import { assertProviderPreflightReady } from "@/lib/engine/providerPreflight";
import { resolveRunModelId } from "@/lib/engine/resolveRunModelId";

const FLOWS_PROMPT = "Generate project flows from the current Stage project context.";
const FLOWS_RUN_FAILED_USER_MESSAGE = "Flows generation failed. Check that Stage Engine is running and the selected provider is configured.";

const FLOWS_EVENT_STALL_MS = 20_000;
const FLOWS_RUN_MAX_MS = 20 * 60 * 1000;

const flowsRunLocks = new Map<string, Promise<void>>();

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

export function useFlowsRun(projectId: string) {
  const queryClient = useQueryClient();
  const providerRun = useProviderRun({ projectId, mode: "flows" });
  const providerPreferences = useProviderPreferences();
  const providers = useProviderStatus();
  const chatDefaults = useChatDefaults();
  const [error, setError] = useState<string | null>(null);
  const [runEnded, setRunEnded] = useState(false);
  const runStartedAtRef = useRef<number | null>(null);

  const activeRunId = providerRun.activeRunId;
  const activeRunEvents = providerRun.activeRunEvents;
  const hasTerminalEvent = hasTerminalRunEvent(activeRunEvents);

  const isRunning = useMemo(
    () => !runEnded && providerRun.isRunActive,
    [providerRun.isRunActive, runEnded],
  );

  const terminalEvent = useMemo(() => latestTerminalRunEvent(activeRunEvents), [activeRunEvents]);

  const failRun = useCallback(
    (logMessage: string) => {
      console.error(logMessage);
      setRunEnded(true);
      setError(FLOWS_RUN_FAILED_USER_MESSAGE);
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
      setError(FLOWS_RUN_FAILED_USER_MESSAGE);
    }
  }, [terminalEvent]);

  useEffect(() => {
    if (hasTerminalEvent && !runEnded) {
      setRunEnded(true);
    }
  }, [hasTerminalEvent, runEnded]);

  useEffect(() => {
    if (!activeRunId || runEnded || hasTerminalEvent) return;

    runStartedAtRef.current = Date.now();

    const stallTimer = window.setTimeout(() => {
      const events =
        queryClient.getQueryData<RunEvent[]>(engineQueryKeys.runEvents(activeRunId)) ?? [];

      if (hasTerminalRunEvent(events)) return;

      if (events.length === 0) {
        failRun(
          "[stage-engine] flows run stalled: no events received (Electron main process likely out of date - restart pnpm dev)",
        );
      }
    }, FLOWS_EVENT_STALL_MS);

    const maxTimer = window.setTimeout(() => {
      failRun("[stage-engine] flows run watchdog: exceeded maximum duration");
    }, FLOWS_RUN_MAX_MS);

    return () => {
      window.clearTimeout(stallTimer);
      window.clearTimeout(maxTimer);
    };
  }, [activeRunId, failRun, hasTerminalEvent, queryClient, runEnded]);

  const startFlows = useCallback(
    async (providerId: ProviderId, source?: string) => {
      if (isRunning || providerRun.startRun.isPending) return;

      const lockKey = source ? `${projectId}:${source}` : projectId;
      const inFlight = flowsRunLocks.get(lockKey);
      if (inFlight) {
        await inFlight;
        return;
      }

      const runPromise = (async () => {
        setError(null);
        setRunEnded(false);
        runStartedAtRef.current = null;

        assertProviderPreflightReady({
          providerId,
          snapshot: providers.snapshot,
          isEnabled: providerPreferences.isProviderEnabled(providerId),
          context: "run",
        });

        await providerRun.startRun.mutateAsync({
          providerId,
          modelId: resolveRunModelId(providerId, chatDefaults.defaults.modelId),
          prompt: FLOWS_PROMPT,
          mode: "flows",
          context: source ? { projectId, source } : { projectId },
          attachments: [],
          modelOptions: buildRunModelOptions(chatDefaults.defaults),
        });
      })();

      flowsRunLocks.set(lockKey, runPromise);

      try {
        await runPromise;
      } finally {
        if (flowsRunLocks.get(lockKey) === runPromise) {
          flowsRunLocks.delete(lockKey);
        }
      }
    },
    [
      chatDefaults.defaults,
      isRunning,
      projectId,
      providerPreferences,
      providerRun.startRun,
      providers.snapshot,
    ],
  );

  const cancelFlows = useCallback(async () => {
    if (!providerRun.activeRunId) return;
    await providerRun.cancelRun.mutateAsync(providerRun.activeRunId);
  }, [providerRun.activeRunId, providerRun.cancelRun]);

  return {
    startFlows,
    cancelFlows,
    isStarting: providerRun.startRun.isPending,
    isRunning,
    activeRunId: providerRun.activeRunId,
    runEvents: activeRunEvents,
    error:
      error ??
      (providerRun.startRun.error
        ? toUserFacingErrorMessage(providerRun.startRun.error, FLOWS_RUN_FAILED_USER_MESSAGE)
        : null),
  };
}
