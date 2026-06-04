import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ProviderId, RunEvent } from "@stage/data-ops/contracts";
import { useQuery } from "convex/react";
import { useQueryClient } from "@tanstack/react-query";
import type { Id } from "@stage/data-ops/convex/data-model";
import { useDesktopAuth } from "@/lib/auth";
import { api } from "@/lib/convexApi";
import { engineQueryKeys } from "@/hooks/engine/queryKeys";
import { useProviderRun } from "@/hooks/engine/useProviderRun";
import { useProviderPreferences } from "@/hooks/engine/useProviderPreferences";
import { useProviderStatus } from "@/hooks/engine/useProviderStatus";
import { useChatDefaults } from "@/hooks/engine/useChatDefaults";
import {
  RESEARCH_RUN_FAILED_USER_MESSAGE,
  formatRunFailedEvent,
} from "@/lib/engine/formatRunError";
import { buildRunModelOptions } from "@/lib/engine/runModelOptions";

const RESEARCH_PROMPT = "Generate project research from the current Stage project context.";

const DEFAULT_RESEARCH_MODELS: Record<ProviderId, string> = {
  claude: "claude-sonnet-4-6",
  codex: "codex-default",
};

/** If IPC stream dies immediately, unblock the UI within ~20s. */
const RESEARCH_EVENT_STALL_MS = 20_000;
const RESEARCH_RUN_MAX_MS = 20 * 60 * 1000;

function hasTerminalRunEvent(events: RunEvent[]) {
  return events.some(
    (event) =>
      event.type === "run_completed" ||
      event.type === "run_failed" ||
      event.type === "run_cancelled",
  );
}

export function useResearchRun(projectId: string) {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useDesktopAuth();
  const providerRun = useProviderRun({ projectId, mode: "research" });
  const providerPreferences = useProviderPreferences();
  const providers = useProviderStatus();
  const chatDefaults = useChatDefaults();
  const [error, setError] = useState<string | null>(null);
  const [runEnded, setRunEnded] = useState(false);
  const runStartedAtRef = useRef<number | null>(null);

  const runs = useQuery(
    api.projectAi.listRuns,
    isAuthenticated && projectId
      ? { projectId: projectId as Id<"projects">, module: "research" }
      : "skip",
  );

  const convexResearchRunning = useMemo(
    () => runs?.some((run) => run.status === "running") ?? false,
    [runs],
  );

  const activeRunId = providerRun.activeRunId;
  const activeRunEvents = providerRun.activeRunEvents;
  const hasTerminalEvent = providerRun.hasTerminalEvent;

  const isRunning = useMemo(
    () =>
      !runEnded &&
      (providerRun.isRunActive || convexResearchRunning),
    [convexResearchRunning, providerRun.isRunActive, runEnded],
  );

  const runError = useMemo(() => {
    const failedEvent = activeRunEvents.find((event) => event.type === "run_failed");
    return failedEvent?.type === "run_failed" ? formatRunFailedEvent(failedEvent) : null;
  }, [activeRunEvents]);

  const failRun = useCallback(
    (logMessage: string) => {
      console.error(logMessage);
      setRunEnded(true);
      setError(RESEARCH_RUN_FAILED_USER_MESSAGE);
      providerRun.resetActiveRun();
    },
    [providerRun],
  );

  useEffect(() => {
    if (runError) {
      console.error(runError);
      setRunEnded(true);
      setError(RESEARCH_RUN_FAILED_USER_MESSAGE);
    }
  }, [runError]);

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
          "[stage-engine] research run stalled: no events received (Electron main process likely out of date — restart pnpm dev)",
        );
      }
    }, RESEARCH_EVENT_STALL_MS);

    const maxTimer = window.setTimeout(() => {
      failRun("[stage-engine] research run watchdog: exceeded maximum duration");
    }, RESEARCH_RUN_MAX_MS);

    return () => {
      window.clearTimeout(stallTimer);
      window.clearTimeout(maxTimer);
    };
  }, [activeRunId, failRun, hasTerminalEvent, queryClient, runEnded]);

  const startResearch = useCallback(
    async (providerId: ProviderId) => {
      setError(null);
      setRunEnded(false);
      runStartedAtRef.current = null;

      if (!providerPreferences.isProviderEnabled(providerId)) {
        const userMessage = `Connect ${providerId === "claude" ? "Claude" : "Codex"} in Settings → Integrations before running Research.`;
        console.error(`[stage-engine] preflight failed: ${userMessage}`);
        throw new Error(userMessage);
      }

      const provider = providers.data?.providers.find((entry) => entry.id === providerId);
      if (!provider || provider.status !== "ready") {
        const userMessage =
          provider?.setupHint ??
          `${providerId === "claude" ? "Claude" : "Codex"} is not set up yet. Open Settings → Integrations and try again.`;
        console.error(
          `[stage-engine] preflight failed provider=${providerId} status=${provider?.status ?? "missing"} message=${provider?.message ?? "none"} detail=${userMessage}`,
        );
        throw new Error(userMessage);
      }

      await providerRun.startRun.mutateAsync({
        providerId,
        modelId: DEFAULT_RESEARCH_MODELS[providerId],
        prompt: RESEARCH_PROMPT,
        mode: "research",
        context: { projectId },
        attachments: [],
        modelOptions: buildRunModelOptions(chatDefaults.defaults),
      });
    },
    [
      chatDefaults.defaults,
      projectId,
      providerPreferences,
      providerRun.startRun,
      providers.data?.providers,
    ],
  );

  const cancelResearch = useCallback(async () => {
    if (!providerRun.activeRunId) {
      return;
    }

    await providerRun.cancelRun.mutateAsync(providerRun.activeRunId);
  }, [providerRun.activeRunId, providerRun.cancelRun]);

  return {
    startResearch,
    cancelResearch,
    isStarting: providerRun.startRun.isPending,
    isRunning,
    activeRunId: providerRun.activeRunId,
    runEvents: activeRunEvents,
    error:
      error ??
      (providerRun.startRun.error instanceof Error ? RESEARCH_RUN_FAILED_USER_MESSAGE : null),
  };
}
