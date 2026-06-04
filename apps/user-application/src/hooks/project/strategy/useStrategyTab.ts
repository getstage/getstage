import { useCallback, useEffect, useState } from "react";
import { useMutation } from "convex/react";
import type { ProviderId } from "@stage/data-ops/contracts";
import type { Id } from "@stage/data-ops/convex/data-model";
import {
  parseStoredStrategyGenerateInput,
  type ValidatedStrategyGenerateInput,
} from "@/lib/project/strategyGenerateInput";
import { api } from "@/lib/convexApi";
import { STRATEGY_RUN_FAILED_USER_MESSAGE } from "@/lib/engine/formatRunError";
import type { Project } from "@/models/project/project";
import { useProjectAiProvider } from "@/hooks/project/useProjectAiProvider";
import { useResearchArtifact } from "../research/useResearchArtifact";
import { useStrategyArtifact } from "./useStrategyArtifact";
import { useStrategyRun } from "./useStrategyRun";

const STRATEGY_INPUT_STORAGE_PREFIX = "stage:strategy-generate-input:";

function loadStoredStrategyInput(projectId: string): ValidatedStrategyGenerateInput | null {
  try {
    const raw = sessionStorage.getItem(`${STRATEGY_INPUT_STORAGE_PREFIX}${projectId}`);
    if (!raw) {
      return null;
    }

    return parseStoredStrategyGenerateInput(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

function saveStoredStrategyInput(projectId: string, input: ValidatedStrategyGenerateInput) {
  sessionStorage.setItem(`${STRATEGY_INPUT_STORAGE_PREFIX}${projectId}`, JSON.stringify(input));
}

export function useStrategyTab(project: Pick<Project, "id" | "name">) {
  const projectId = project.id;
  const researchArtifact = useResearchArtifact(projectId);
  const strategyArtifact = useStrategyArtifact(projectId);
  const strategyRun = useStrategyRun(projectId);
  const { resolvedProviderId } = useProjectAiProvider(projectId);
  const upsertStrategyGenerateInput = useMutation(api.projectAi.upsertStrategyGenerateInput);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastInput, setLastInput] = useState<ValidatedStrategyGenerateInput | null>(() =>
    loadStoredStrategyInput(projectId),
  );

  useEffect(() => {
    setLastInput(loadStoredStrategyInput(projectId));
    setSaveError(null);
  }, [projectId]);

  const hasResearch = researchArtifact.hasArtifact && researchArtifact.data !== null;

  const startStrategy = useCallback(
    async (input?: ValidatedStrategyGenerateInput, providerId?: ProviderId) => {
      if (strategyRun.isRunning || strategyRun.isStarting) {
        return;
      }

      if (!hasResearch) {
        throw new Error("Run Research before generating Strategy.");
      }

      const resolvedInput = input ?? lastInput ?? { focusAreas: [] };

      setLastInput(resolvedInput);
      saveStoredStrategyInput(projectId, resolvedInput);
      setSaveError(null);

      try {
        await upsertStrategyGenerateInput({
          projectId: projectId as Id<"projects">,
          focusAreas: resolvedInput.focusAreas,
          additionalNotes: resolvedInput.additionalNotes || undefined,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not save strategy input.";
        console.error(`[stage-engine] convex strategy input save failed: ${message}`);
        setSaveError(STRATEGY_RUN_FAILED_USER_MESSAGE);
        throw error;
      }

      const runProviderId = providerId ?? resolvedProviderId;

      if (!runProviderId) {
        throw new Error("Connect Claude or Codex in Settings before generating Strategy.");
      }

      await strategyRun.startStrategy(runProviderId);
    },
    [
      hasResearch,
      lastInput,
      projectId,
      resolvedProviderId,
      strategyRun,
      upsertStrategyGenerateInput,
    ],
  );

  return {
    data: strategyArtifact.data,
    isLoading: researchArtifact.isLoading || strategyArtifact.isLoading,
    hasArtifact: strategyArtifact.data !== null,
    parseError: strategyArtifact.parseError,
    usingMockData: false,
    hasResearch,
    researchError: researchArtifact.parseError ? "Saved research could not be parsed." : null,
    lastInput,
    startStrategy,
    cancelStrategy: strategyRun.cancelStrategy,
    isRunning: strategyRun.isRunning,
    isStarting: strategyRun.isStarting,
    error: saveError ?? strategyRun.error,
  };
}
