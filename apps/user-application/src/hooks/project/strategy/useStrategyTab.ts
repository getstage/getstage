import { useCallback, useEffect, useState } from "react";
import type { StrategyInput } from "@stage/data-ops/contracts";
import {
  buildStrategyInput,
  parseStoredStrategyGenerateInput,
  type ValidatedStrategyGenerateInput,
} from "@/lib/project/strategyGenerateInput";
import {
  delay,
  getMockStrategyArtifactRecord,
  loadMockStrategyArtifactRecord,
  MOCK_STRATEGY_RUN_DELAY_MS,
  saveMockStrategyArtifactRecord,
  USE_MOCK_STRATEGY_DATA,
} from "@/mock/project/strategy";
import type { Project } from "@/models/project/project";
import type { StrategyArtifactRecord } from "@/types/project/strategyArtifactRecord";
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
  const [mockRecord, setMockRecord] = useState<StrategyArtifactRecord | null>(() =>
    loadMockStrategyArtifactRecord(projectId),
  );
  const [lastInput, setLastInput] = useState<ValidatedStrategyGenerateInput | null>(() =>
    loadStoredStrategyInput(projectId),
  );
  const [isMockRunning, setIsMockRunning] = useState(false);
  const [mockError, setMockError] = useState<string | null>(null);

  useEffect(() => {
    setMockRecord(loadMockStrategyArtifactRecord(projectId));
    setLastInput(loadStoredStrategyInput(projectId));
    setMockError(null);
    setIsMockRunning(false);
  }, [projectId]);

  const backendData = strategyArtifact.data;
  const data = backendData ?? mockRecord;
  const usingMockData = backendData === null && mockRecord !== null;
  const hasResearch = researchArtifact.hasArtifact && researchArtifact.data !== null;

  const startMockStrategy = useCallback(
    async (researchArtifactId?: string | null) => {
      setMockError(null);
      setIsMockRunning(true);

      try {
        await delay(MOCK_STRATEGY_RUN_DELAY_MS);
        const record = getMockStrategyArtifactRecord(projectId, researchArtifactId);
        setMockRecord(record);
        saveMockStrategyArtifactRecord(projectId, record);
      } catch (error) {
        setMockError(error instanceof Error ? error.message : "Could not finish mock Strategy.");
      } finally {
        setIsMockRunning(false);
      }
    },
    [projectId],
  );

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

      if (USE_MOCK_STRATEGY_DATA && !backendData) {
        await startMockStrategy(researchArtifactId);
        return strategyInput;
      }

      throw new Error("Strategy engine is not connected yet.");
    },
    [
      backendData,
      hasResearch,
      lastInput,
      project,
      projectId,
      researchArtifact.data?.id,
      startMockStrategy,
    ],
  );

  const isRunning = isMockRunning;
  const isStarting = isMockRunning;

  return {
    data,
    isLoading: researchArtifact.isLoading || strategyArtifact.isLoading,
    hasArtifact: data !== null,
    parseError: strategyArtifact.parseError,
    usingMockData,
    hasResearch,
    researchError: researchArtifact.parseError ? "Saved research could not be parsed." : null,
    lastInput,
    startStrategy,
    isRunning,
    isStarting,
    error: mockError,
  };
}
