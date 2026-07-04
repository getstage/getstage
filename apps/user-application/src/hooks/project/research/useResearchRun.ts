import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation as useConvexMutation, useQuery } from "convex/react";
import { useQueryClient } from "@tanstack/react-query";
import type { ProviderId, RunEvent } from "@stage/data-ops/contracts";
import type { Id } from "@stage/data-ops/convex/data-model";
import { api } from "@/lib/convexApi";
import { useDesktopAuth } from "@/lib/auth";
import { useProviderRun } from "@/hooks/engine/useProviderRun";
import { useProviderPreferences } from "@/hooks/engine/useProviderPreferences";
import { useProviderStatus } from "@/hooks/engine/useProviderStatus";
import { useChatDefaults } from "@/hooks/engine/useChatDefaults";
import { engineQueryKeys } from "@/hooks/engine/queryKeys";
import {
  RESEARCH_RUN_FAILED_USER_MESSAGE,
  formatRunFailedEvent,
  formatStoredRunErrorMessage,
  toRunFailureUserMessage,
} from "@/lib/engine/formatRunError";
import { toUserFacingErrorMessage } from "@/lib/errors";
import { buildRunModelOptions } from "@/lib/engine/runModelOptions";
import {
  assertProviderPreflightReady,
  getProviderPreflightError,
} from "@/lib/engine/providerPreflight";
import { resolveRunModelId } from "@/lib/engine/resolveRunModelId";
import { useProviderRequired } from "@/components/app/ProviderRequiredDialog";

const RESEARCH_PROMPT = "Generate project research from the current Stage project context.";
const RESEARCH_EVENT_STALL_MS = 20_000;
const RESEARCH_ORPHAN_MS = 60_000;
const RESEARCH_RUN_MAX_MS = 45 * 60 * 1000;

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

export function useResearchRun(projectId: string) {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useDesktopAuth();
  const providerRun = useProviderRun({ projectId, mode: "research" });
  const providerPreferences = useProviderPreferences();
  const providers = useProviderStatus();
  const providerRequired = useProviderRequired();
  const chatDefaults = useChatDefaults();
  const cancelPersistedRun = useConvexMutation(api.projectAi.cancelRun);
  const [error, setError] = useState<string | null>(null);
  const [runEnded, setRunEnded] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [lastRunDurationSeconds, setLastRunDurationSeconds] = useState<number | null>(null);
  const runStartedAtRef = useRef<number | null>(null);
  const orphanHandledRef = useRef<string | null>(null);

  const activeRunId = providerRun.activeRunId;
  const activeRunEvents = providerRun.activeRunEvents;
  const hasTerminalEvent = hasTerminalRunEvent(activeRunEvents);
  const terminalEvent = useMemo(
    () => latestTerminalRunEvent(activeRunEvents),
    [activeRunEvents],
  );
  const resetActiveRun = providerRun.resetActiveRun;

  const researchRuns = useQuery(
    api.projectAi.listRuns,
    isAuthenticated && projectId
      ? { projectId: projectId as Id<"projects">, module: "research" }
      : "skip",
  );
  const persistedRunningRun = useMemo(
    () => researchRuns?.find((run) => run.status === "running") ?? null,
    [researchRuns],
  );
  const latestFailedRun = useMemo(
    () => researchRuns?.find((run) => run.status === "failed") ?? null,
    [researchRuns],
  );

  const hasLocalActiveRun =
    providerRun.startRun.isPending || providerRun.isRunActive;

  const persistedRunAgeMs = persistedRunningRun
    ? Date.now() - persistedRunningRun.startedAt
    : 0;
  const isOrphanedPersistedRun =
    persistedRunningRun !== null &&
    !hasLocalActiveRun &&
    persistedRunAgeMs > RESEARCH_ORPHAN_MS;

  const isRunning = useMemo(
    () =>
      !runEnded &&
      (hasLocalActiveRun ||
        (persistedRunningRun !== null && !isOrphanedPersistedRun)),
    [hasLocalActiveRun, isOrphanedPersistedRun, persistedRunningRun, runEnded],
  );

  const failRun = useCallback(
    (message: string, logMessage?: string) => {
      if (logMessage) {
        console.error(logMessage);
      }
      setRunEnded(true);
      setError(message);
      resetActiveRun();
    },
    [resetActiveRun],
  );

  useEffect(() => {
    if (persistedRunningRun && runStartedAtRef.current === null) {
      runStartedAtRef.current = persistedRunningRun.startedAt;
    }
  }, [persistedRunningRun]);

  useEffect(() => {
    if (!isRunning || runStartedAtRef.current === null) {
      return;
    }

    const tick = () => {
      if (runStartedAtRef.current) {
        setElapsedSeconds(Math.floor((Date.now() - runStartedAtRef.current) / 1000));
      }
    };

    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [isRunning]);

  useEffect(() => {
    if (!hasTerminalEvent || runStartedAtRef.current === null) {
      return;
    }

    const duration = Math.floor((Date.now() - runStartedAtRef.current) / 1000);
    setLastRunDurationSeconds(duration);
    setElapsedSeconds(duration);
  }, [hasTerminalEvent]);

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
      setError(toRunFailureUserMessage(terminalEvent, RESEARCH_RUN_FAILED_USER_MESSAGE));
      resetActiveRun();
    }
  }, [resetActiveRun, terminalEvent]);

  useEffect(() => {
    if (hasTerminalEvent && !runEnded) {
      setRunEnded(true);
    }
  }, [hasTerminalEvent, runEnded]);

  useEffect(() => {
    if (!latestFailedRun || runEnded || hasLocalActiveRun || persistedRunningRun) {
      return;
    }

    const failedRecently =
      latestFailedRun.completedAt !== null &&
      Date.now() - latestFailedRun.completedAt < 5 * 60 * 1000;
    if (!failedRecently) {
      return;
    }

    setRunEnded(true);
    setError(formatStoredRunErrorMessage(latestFailedRun.errorMessage));
  }, [hasLocalActiveRun, latestFailedRun, persistedRunningRun, runEnded]);

  useEffect(() => {
    if (!isOrphanedPersistedRun || !persistedRunningRun) {
      return;
    }
    if (orphanHandledRef.current === persistedRunningRun.id) {
      return;
    }
    orphanHandledRef.current = persistedRunningRun.id;

    void (async () => {
      try {
        await cancelPersistedRun({
          runId: persistedRunningRun.id,
          projectId: projectId as Id<"projects">,
        });
      } catch (cancelError) {
        console.warn("[research] failed to cancel orphaned Convex run", cancelError);
      }

      failRun(
        RESEARCH_RUN_FAILED_USER_MESSAGE,
        "[stage-engine] research run orphaned: Convex still running but engine session ended",
      );
    })();
  }, [cancelPersistedRun, failRun, isOrphanedPersistedRun, persistedRunningRun, projectId]);

  useEffect(() => {
    if (!activeRunId || runEnded || hasTerminalEvent) {
      return;
    }

    if (runStartedAtRef.current === null) {
      runStartedAtRef.current = Date.now();
    }

    const stallTimer = window.setTimeout(() => {
      const events =
        queryClient.getQueryData<RunEvent[]>(engineQueryKeys.runEvents(activeRunId)) ?? [];

      if (hasTerminalRunEvent(events)) {
        return;
      }

      if (events.length === 0) {
        failRun(
          RESEARCH_RUN_FAILED_USER_MESSAGE,
          "[stage-engine] research run stalled: no events received (restart the desktop app if this keeps happening)",
        );
      }
    }, RESEARCH_EVENT_STALL_MS);

    const maxTimer = window.setTimeout(() => {
      failRun(
        RESEARCH_RUN_FAILED_USER_MESSAGE,
        "[stage-engine] research run watchdog: exceeded maximum duration",
      );
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
      orphanHandledRef.current = null;
      runStartedAtRef.current = Date.now();
      setElapsedSeconds(0);

      const preflightArgs = {
        providerId,
        snapshot: providers.snapshot,
        isEnabled: providerPreferences.isProviderEnabled(providerId),
        context: "run" as const,
      };
      const blockedMessage = getProviderPreflightError(preflightArgs);
      if (blockedMessage) providerRequired.show(blockedMessage);
      assertProviderPreflightReady(preflightArgs);

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
      chatDefaults.defaults,
      projectId,
      providerPreferences,
      providerRequired,
      providerRun.startRun,
      providers.snapshot,
    ],
  );

  const cancelResearch = useCallback(async () => {
    if (providerRun.activeRunId) {
      await providerRun.cancelRun.mutateAsync(providerRun.activeRunId);
    }

    if (persistedRunningRun) {
      await cancelPersistedRun({
        runId: persistedRunningRun.id,
        projectId: projectId as Id<"projects">,
      });
    }

    setRunEnded(true);
    resetActiveRun();
  }, [
    cancelPersistedRun,
    persistedRunningRun,
    projectId,
    providerRun.activeRunId,
    providerRun.cancelRun,
    resetActiveRun,
  ]);

  return {
    startResearch,
    cancelResearch,
    isStarting: providerRun.startRun.isPending,
    isRunning,
    elapsedSeconds,
    lastRunDurationSeconds,
    activeRunId: providerRun.activeRunId,
    runEvents: activeRunEvents,
    error:
      error ??
      (providerRun.startRun.error
        ? toUserFacingErrorMessage(providerRun.startRun.error, RESEARCH_RUN_FAILED_USER_MESSAGE)
        : null),
  };
}
