import { useCallback, useState } from "react";
import type { StrategyInput } from "@stage/data-ops/contracts";
import {
  buildStrategyInput,
  parseStoredStrategyGenerateInput,
  type ValidatedStrategyGenerateInput,
} from "@/lib/project/strategyGenerateInput";
import type { Project } from "@/models/project/project";
import { useResearchArtifact } from "../research/useResearchArtifact";
import { useStrategyArtifact } from "./useStrategyArtifact";

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
  const [lastInput, setLastInput] = useState<ValidatedStrategyGenerateInput | null>(() =>
    loadStoredStrategyInput(projectId),
  );

  const backendData = strategyArtifact.data;
  const data = backendData;
  const hasResearch = researchArtifact.hasArtifact && researchArtifact.data !== null;

  const startStrategy = useCallback(
    async (input?: ValidatedStrategyGenerateInput) => {
      if (!hasResearch) {
        throw new Error("Run Research before generating Strategy.");
      }

      const resolvedInput = input ?? lastInput ?? { focusAreas: [] };
      const researchArtifactId = researchArtifact.data?.id ?? null;
      const strategyInput: StrategyInput = buildStrategyInput(
        project,
        resolvedInput,
        researchArtifactId,
      );

      setLastInput(resolvedInput);
      saveStoredStrategyInput(projectId, resolvedInput);

      throw new Error("Strategy engine is not connected yet.");
    },
    [
      hasResearch,
      lastInput,
      project,
      projectId,
      researchArtifact.data?.id,
    ],
  );

  return {
    data,
    isLoading: researchArtifact.isLoading || strategyArtifact.isLoading,
    hasArtifact: data !== null,
    parseError: strategyArtifact.parseError,
    usingMockData: false,
    hasResearch,
    researchError: researchArtifact.parseError ? "Saved research could not be parsed." : null,
    lastInput,
    startStrategy,
    isRunning: false,
    isStarting: false,
    error: null,
  };
}
