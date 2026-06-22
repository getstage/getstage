import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "convex/react";
import type { ProviderId } from "@stage/data-ops/contracts";
import type { Id } from "@stage/data-ops/convex/data-model";
import { api } from "@/lib/convexApi";
import { useDesktopAuth } from "@/lib/auth";
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
const RESEARCH_RUN_MAX_MS = 45 * 60 * 1000;

export function useResearchRun(projectId: string) {
  const { isAuthenticated } = useDesktopAuth();
  const providerRun = useProviderRun({ projectId, mode: "research" });
  const providerPreferences = useProviderPreferences();
  const providers = useProviderStatus();
  const chatDefaults = useChatDefaults();
  const [error, setError] = useState<string | null>(null);
  const [runEnded, setRunEnded] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [lastRunDurationSeconds, setLastRunDurationSeconds] = useState<number | null>(null);
  const runStartedAtRef = useRef<number | null>(null);

  const activeRunId = providerRun.activeRunId;
  const activeRunEvents = providerRun.activeRunEvents;
  const hasTerminalEvent = providerRun.hasTerminalEvent;
  const resetActiveRun = providerRun.resetActiveRun;

  // The in-memory active run is lost when the Research tab unmounts (navigating away).
  // Convex is the durable truth: a research run sits at status "running" until the engine
  // marks it completed/failed, so reading it keeps the generating state honest on return.
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

  const isRunning = useMemo(
    () =>
      !runEnded &&
      (providerRun.startRun.isPending ||
        providerRun.isRunActive ||
        persistedRunningRun !== null),
    [
      providerRun.isRunActive,
      providerRun.startRun.isPending,
      persistedRunningRun,
      runEnded,
    ],
  );

  // After a remount the local start timestamp is gone; seed it from the persisted run so
  // the elapsed timer resumes from the real start instead of restarting at zero.
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
    const failedEvent = activeRunEvents.find((event) => event.type === "run_failed");
    if (!failedEvent || failedEvent.type !== "run_failed") {
      return;
    }

    console.error(formatRunFailedEvent(failedEvent));
    setRunEnded(true);
    setError(toRunFailureUserMessage(failedEvent, RESEARCH_RUN_FAILED_USER_MESSAGE));
  }, [activeRunEvents]);

  useEffect(() => {
    if (hasTerminalEvent && !runEnded) {
      setRunEnded(true);
    }
  }, [hasTerminalEvent, runEnded]);

  useEffect(() => {
    if (!isRunning || runEnded || hasTerminalEvent) {
      return;
    }

    const maxTimer = window.setTimeout(() => {
      console.error("[stage-engine] research run watchdog: exceeded maximum duration");
      setRunEnded(true);
      setError(RESEARCH_RUN_FAILED_USER_MESSAGE);
      resetActiveRun();
    }, RESEARCH_RUN_MAX_MS);

    return () => {
      window.clearTimeout(maxTimer);
    };
  }, [hasTerminalEvent, isRunning, resetActiveRun, runEnded]);

  const startResearch = useCallback(
    async (providerId: ProviderId) => {
      setError(null);
      setRunEnded(false);
      runStartedAtRef.current = Date.now();
      setElapsedSeconds(0);

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
