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
  toRunFailureUserMessage,
} from "@/lib/engine/formatRunError";
import { toUserFacingErrorMessage } from "@/lib/errors";
import { buildRunModelOptions } from "@/lib/engine/runModelOptions";
import { assertProviderPreflightReady } from "@/lib/engine/providerPreflight";
import { resolveRunModelId } from "@/lib/engine/resolveRunModelId";

const RESEARCH_PROMPT = "Generate project research from the current Stage project context.";

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

  useEffect(() => {
    const failedEvent = activeRunEvents.find((event) => event.type === "run_failed");
    if (!failedEvent || failedEvent.type !== "run_failed") {
      return;
    }

    console.error(formatRunFailedEvent(failedEvent));
    setRunEnded(true);
    setError(toRunFailureUserMessage(failedEvent, RESEARCH_RUN_FAILED_USER_MESSAGE));
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

      assertProviderPreflightReady({
        providerId,
        snapshot: providers.snapshot,
        isEnabled: providerPreferences.isProviderEnabled(providerId),
        context: "run",
      });

      await providerRun.startRun.mutateAsync({
        providerId,
        modelId: resolveRunModelId(providerId, chatDefaults.defaults.modelId),
        prompt: RESEARCH_PROMPT,
        mode: "research",
        context: { projectId },
        attachments: [],
        modelOptions: buildRunModelOptions(chatDefaults.defaults),
      });
    },
    [
      chatDefaults.defaults.modelId,
      chatDefaults.defaults.reasoningEffort,
      chatDefaults.defaults.responseSpeed,
      projectId,
      providerPreferences,
      providerRun.startRun,
      providers.snapshot,
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
      (providerRun.startRun.error
        ? toUserFacingErrorMessage(providerRun.startRun.error, RESEARCH_RUN_FAILED_USER_MESSAGE)
        : null),
  };
}
