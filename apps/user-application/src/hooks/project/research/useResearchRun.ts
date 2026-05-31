import { useCallback, useEffect, useMemo, useState } from "react";
import type { ProviderId } from "@stage/data-ops/contracts";
import { useProviderRun } from "@/hooks/engine/useProviderRun";
import { useProviderPreferences } from "@/hooks/engine/useProviderPreferences";

const RESEARCH_PROMPT = "Generate project research from the current Stage project context.";

const DEFAULT_RESEARCH_MODELS: Record<ProviderId, string> = {
  claude: "claude-sonnet-4-6",
  codex: "codex-default",
};

function resolveResearchProvider(isProviderEnabled: (providerId: ProviderId) => boolean): ProviderId | null {
  if (isProviderEnabled("claude")) {
    return "claude";
  }

  if (isProviderEnabled("codex")) {
    return "codex";
  }

  return null;
}

export function useResearchRun(projectId: string) {
  const providerRun = useProviderRun();
  const providerPreferences = useProviderPreferences();
  const [error, setError] = useState<string | null>(null);

  const activeRunEvents = providerRun.activeRunEvents;
  const isRunning = useMemo(
    () =>
      providerRun.activeRunId !== null &&
      !activeRunEvents.some(
        (event) =>
          event.type === "run_completed" ||
          event.type === "run_failed" ||
          event.type === "run_cancelled",
      ),
    [activeRunEvents, providerRun.activeRunId],
  );

  const runError = useMemo(() => {
    const failedEvent = activeRunEvents.find((event) => event.type === "run_failed");
    return failedEvent?.type === "run_failed" ? failedEvent.error.message : null;
  }, [activeRunEvents]);

  useEffect(() => {
    if (runError) {
      setError(runError);
    }
  }, [runError]);

  const startResearch = useCallback(async () => {
    setError(null);

    const providerId = resolveResearchProvider(providerPreferences.isProviderEnabled);
    if (!providerId) {
      throw new Error("Connect Claude or Codex in Integrations before running Research.");
    }

    await providerRun.startRun.mutateAsync({
      providerId,
      modelId: DEFAULT_RESEARCH_MODELS[providerId],
      prompt: RESEARCH_PROMPT,
      mode: "research",
      context: { projectId },
      attachments: [],
      modelOptions: [],
    });
  }, [projectId, providerPreferences, providerRun.startRun]);

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
    error: error ?? (providerRun.startRun.error instanceof Error ? providerRun.startRun.error.message : null),
  };
}
