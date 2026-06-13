import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ProviderId, RunEvent } from "@stage/data-ops/contracts";
import { useQueryClient } from "@tanstack/react-query";
import { engineQueryKeys } from "@/hooks/engine/queryKeys";
import { useProviderRun } from "@/hooks/engine/useProviderRun";
import { useProviderPreferences } from "@/hooks/engine/useProviderPreferences";
import { useProviderStatus } from "@/hooks/engine/useProviderStatus";
import { useChatDefaults } from "@/hooks/engine/useChatDefaults";
import { formatRunFailedEvent, STRATEGY_RUN_FAILED_USER_MESSAGE, toRunFailureUserMessage } from "@/lib/engine/formatRunError";
import { buildRunModelOptions } from "@/lib/engine/runModelOptions";
import { resolveRunModelId } from "@/lib/engine/resolveRunModelId";

const STRATEGY_PROMPT = "Generate project strategy from the current Stage research artifact.";

const STRATEGY_EVENT_STALL_MS = 20_000;
const STRATEGY_RUN_MAX_MS = 20 * 60 * 1000;

const strategyRunLocks = new Map<string, Promise<void>>();

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

export function useStrategyRun(projectId: string) {
  const queryClient = useQueryClient();
  const providerRun = useProviderRun({ projectId, mode: "strategy" });
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

  const terminalEvent = useMemo(
    () => latestTerminalRunEvent(activeRunEvents),
    [activeRunEvents],
  );

  const failRun = useCallback(
    (logMessage: string) => {
      console.error(logMessage);
      setRunEnded(true);
      setError(STRATEGY_RUN_FAILED_USER_MESSAGE);
      providerRun.resetActiveRun();
    },
    [providerRun],
  );

  useEffect(() => {
    if (!terminalEvent) {
      return;
    }

    setRunEnded(true);

    if (terminalEvent.type === "run_completed") {
      setError(null);
      return;
    }

    if (terminalEvent.type === "run_failed") {
      console.error(formatRunFailedEvent(terminalEvent));
      setError(toRunFailureUserMessage(terminalEvent, STRATEGY_RUN_FAILED_USER_MESSAGE));
    }
  }, [terminalEvent]);

  useEffect(() => {
    if (hasTerminalEvent && !runEnded) {
      setRunEnded(true);
    }
  }, [hasTerminalEvent, runEnded]);

  useEffect(() => {
    if (!activeRunId || runEnded || hasTerminalEvent) {
      return;
    }

    runStartedAtRef.current = Date.now();

    const stallTimer = window.setTimeout(() => {
      const events =
        queryClient.getQueryData<RunEvent[]>(engineQueryKeys.runEvents(activeRunId)) ?? [];

      if (hasTerminalRunEvent(events)) {
        return;
      }

      if (events.length === 0) {
        failRun(
          "[stage-engine] strategy run stalled: no events received (Electron main process likely out of date — restart pnpm dev)",
        );
      }
    }, STRATEGY_EVENT_STALL_MS);

    const maxTimer = window.setTimeout(() => {
      failRun("[stage-engine] strategy run watchdog: exceeded maximum duration");
    }, STRATEGY_RUN_MAX_MS);

    return () => {
      window.clearTimeout(stallTimer);
      window.clearTimeout(maxTimer);
    };
  }, [activeRunId, failRun, hasTerminalEvent, queryClient, runEnded]);

  const startStrategy = useCallback(
    async (providerId: ProviderId) => {
      if (isRunning || providerRun.startRun.isPending) {
        return;
      }

      const inFlight = strategyRunLocks.get(projectId);
      if (inFlight) {
        await inFlight;
        return;
      }

      const runPromise = (async () => {
        setError(null);
        setRunEnded(false);
        runStartedAtRef.current = null;

        if (!providerPreferences.isProviderEnabled(providerId)) {
          throw new Error(
            `Connect ${providerId === "claude" ? "Claude" : "Codex"} in Settings → Integrations before running Strategy.`,
          );
        }

        const provider = providers.data?.providers.find((entry) => entry.id === providerId);
        if (!provider || provider.status !== "ready") {
          throw new Error(
            provider?.setupHint ??
              `${providerId === "claude" ? "Claude" : "Codex"} is not set up yet. Open Settings → Integrations and try again.`,
          );
        }

        await providerRun.startRun.mutateAsync({
          providerId,
          modelId: resolveRunModelId(providerId, chatDefaults.defaults.modelId),
          prompt: STRATEGY_PROMPT,
          mode: "strategy",
          context: { projectId },
          attachments: [],
          modelOptions: buildRunModelOptions(chatDefaults.defaults),
        });
      })();

      strategyRunLocks.set(projectId, runPromise);

      try {
        await runPromise;
      } finally {
        if (strategyRunLocks.get(projectId) === runPromise) {
          strategyRunLocks.delete(projectId);
        }
      }
    },
    [
      isRunning,
      projectId,
      providerPreferences,
      chatDefaults.defaults,
      providerRun.startRun,
      providers.data?.providers,
    ],
  );

  const cancelStrategy = useCallback(async () => {
    if (!providerRun.activeRunId) {
      return;
    }

    await providerRun.cancelRun.mutateAsync(providerRun.activeRunId);
  }, [providerRun.activeRunId, providerRun.cancelRun]);

  return {
    startStrategy,
    cancelStrategy,
    isStarting: providerRun.startRun.isPending,
    isRunning,
    activeRunId: providerRun.activeRunId,
    runEvents: activeRunEvents,
    error:
      error ??
      (providerRun.startRun.error instanceof Error ? STRATEGY_RUN_FAILED_USER_MESSAGE : null),
  };
}
