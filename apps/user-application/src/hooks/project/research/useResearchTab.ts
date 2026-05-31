import { useCallback, useEffect, useState } from "react";
import type { ResearchInput } from "@stage/data-ops/contracts";
import {
  buildResearchInput,
  parseStoredResearchConfigureInput,
  type ValidatedResearchConfigureInput,
} from "@/lib/project/researchConfigureInput";
import {
  delay,
  getMockResearchArtifactRecord,
  loadMockResearchArtifactRecord,
  MOCK_RESEARCH_RUN_DELAY_MS,
  saveMockResearchArtifactRecord,
  USE_MOCK_RESEARCH_DATA,
} from "@/mock/project/research";
import type { Project } from "@/models/project/project";
import type { ResearchArtifactRecord } from "@/types/project/researchArtifactRecord";
import { useResearchArtifact } from "./useResearchArtifact";
import { useResearchRun } from "./useResearchRun";

const RESEARCH_INPUT_STORAGE_PREFIX = "stage:research-configure-input:";

function loadStoredResearchInput(projectId: string): ValidatedResearchConfigureInput | null {
  try {
    const raw = sessionStorage.getItem(`${RESEARCH_INPUT_STORAGE_PREFIX}${projectId}`);
    if (!raw) {
      return null;
    }

    return parseStoredResearchConfigureInput(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

function saveStoredResearchInput(projectId: string, input: ValidatedResearchConfigureInput) {
  sessionStorage.setItem(`${RESEARCH_INPUT_STORAGE_PREFIX}${projectId}`, JSON.stringify(input));
}

export function useResearchTab(project: Pick<Project, "id" | "name" | "clientName">) {
  const projectId = project.id;
  const researchArtifact = useResearchArtifact(projectId);
  const researchRun = useResearchRun(projectId);
  const [mockRecord, setMockRecord] = useState<ResearchArtifactRecord | null>(() =>
    loadMockResearchArtifactRecord(projectId),
  );
  const [lastInput, setLastInput] = useState<ValidatedResearchConfigureInput | null>(() =>
    loadStoredResearchInput(projectId),
  );
  const [isMockRunning, setIsMockRunning] = useState(false);
  const [mockError, setMockError] = useState<string | null>(null);

  useEffect(() => {
    setMockRecord(loadMockResearchArtifactRecord(projectId));
    setLastInput(loadStoredResearchInput(projectId));
    setMockError(null);
    setIsMockRunning(false);
  }, [projectId]);

  const backendData = researchArtifact.data;
  const data = backendData ?? mockRecord;
  const usingMockData = backendData === null && mockRecord !== null;

  const startMockResearch = useCallback(async () => {
    setMockError(null);
    setIsMockRunning(true);

    try {
      await delay(MOCK_RESEARCH_RUN_DELAY_MS);
      const record = getMockResearchArtifactRecord(projectId);
      setMockRecord(record);
      saveMockResearchArtifactRecord(projectId, record);
    } catch (error) {
      setMockError(error instanceof Error ? error.message : "Could not finish mock Research.");
    } finally {
      setIsMockRunning(false);
    }
  }, [projectId]);

  const startResearch = useCallback(
    async (input?: ValidatedResearchConfigureInput) => {
      const resolvedInput = input ?? lastInput;
      let researchInput: ResearchInput | undefined;

      if (resolvedInput) {
        researchInput = buildResearchInput(project, resolvedInput);
        setLastInput(resolvedInput);
        saveStoredResearchInput(projectId, resolvedInput);
      }

      if (USE_MOCK_RESEARCH_DATA && !backendData) {
        if (!researchInput) {
          throw new Error("Configure Research before running.");
        }

        await startMockResearch();
        return researchInput;
      }

      if (!researchInput) {
        await researchRun.startResearch();
        return undefined;
      }

      await researchRun.startResearch();
      return researchInput;
    },
    [backendData, lastInput, project, projectId, researchRun, startMockResearch],
  );

  const isRunning = backendData ? researchRun.isRunning : isMockRunning || researchRun.isRunning;
  const isStarting = backendData ? researchRun.isStarting : isMockRunning || researchRun.isStarting;
  const error = mockError ?? researchRun.error;

  return {
    data,
    isLoading: researchArtifact.isLoading,
    hasArtifact: data !== null,
    parseError: researchArtifact.parseError,
    usingMockData,
    lastInput,
    startResearch,
    cancelResearch: researchRun.cancelResearch,
    isRunning,
    isStarting,
    error,
  };
}
