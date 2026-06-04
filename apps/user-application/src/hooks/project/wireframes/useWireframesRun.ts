import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ProviderId, RunEvent } from "@stage/data-ops/contracts";
import { useQueryClient } from "@tanstack/react-query";
import { engineQueryKeys } from "@/hooks/engine/queryKeys";
import { useProviderPreferences } from "@/hooks/engine/useProviderPreferences";
import { useProviderRun } from "@/hooks/engine/useProviderRun";
import { useProviderStatus } from "@/hooks/engine/useProviderStatus";
import { useChatDefaults } from "@/hooks/engine/useChatDefaults";
import { formatRunFailedEvent } from "@/lib/engine/formatRunError";
import { buildRunModelOptions } from "@/lib/engine/runModelOptions";

const WIREFRAMES_PROMPT =
  "Generate Stage wireframes from the current project context.";
const WIREFRAMES_RUN_FAILED_USER_MESSAGE =
  "Wireframes generation failed. Check that Stage Engine is running and the selected provider is configured.";

const DEFAULT_WIREFRAMES_MODELS: Record<ProviderId, string> = {
  claude: "claude-sonnet-4-6",
  codex: "codex-default",
};

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
  const queryClient = useQueryClient();
  const providerRun = useProviderRun({ projectId, mode: "wireframes" });
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
      setError(WIREFRAMES_RUN_FAILED_USER_MESSAGE);
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
          "[stage-engine] wireframes run stalled: no events received (Electron main process likely out of date - restart pnpm dev)",
        );
      }
    }, WIREFRAMES_EVENT_STALL_MS);

    const maxTimer = window.setTimeout(() => {
      failRun("[stage-engine] wireframes run watchdog: exceeded maximum duration");
    }, WIREFRAMES_RUN_MAX_MS);

    return () => {
      window.clearTimeout(stallTimer);
      window.clearTimeout(maxTimer);
    };
  }, [activeRunId, failRun, hasTerminalEvent, queryClient, runEnded]);

  const startWireframes = useCallback(
    async (providerId: ProviderId, source?: string) => {
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

        if (!providerPreferences.isProviderEnabled(providerId)) {
          throw new Error(
            `Connect ${providerId === "claude" ? "Claude" : "Codex"} in Settings -> Integrations before running Wireframes.`,
          );
        }

        const provider = providers.data?.providers.find((entry) => entry.id === providerId);
        if (!provider || provider.status !== "ready") {
          throw new Error(
            provider?.setupHint ??
              `${providerId === "claude" ? "Claude" : "Codex"} is not set up yet. Open Settings -> Integrations and try again.`,
          );
        }

        await providerRun.startRun.mutateAsync({
          providerId,
          modelId: DEFAULT_WIREFRAMES_MODELS[providerId],
          prompt: WIREFRAMES_PROMPT,
          mode: "wireframes",
          context: source ? { projectId, source } : { projectId },
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
      providerRun.startRun,
      providers.data?.providers,
    ],
  );

  const cancelWireframes = useCallback(async () => {
    if (!providerRun.activeRunId) return;
    await providerRun.cancelRun.mutateAsync(providerRun.activeRunId);
  }, [providerRun.activeRunId, providerRun.cancelRun]);

  return {
    startWireframes,
    cancelWireframes,
    isStarting: providerRun.startRun.isPending,
    isRunning,
    activeRunId: providerRun.activeRunId,
    runEvents: activeRunEvents,
    terminalEvent,
    error:
      error ??
      (providerRun.startRun.error instanceof Error
        ? WIREFRAMES_RUN_FAILED_USER_MESSAGE
        : null),
  };
}
