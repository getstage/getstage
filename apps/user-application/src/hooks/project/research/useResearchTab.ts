import { useCallback, useState } from "react";
import type { ProviderId } from "@stage/data-ops/contracts";
import type { ValidatedResearchConfigureInput } from "@/lib/project/researchConfigureInput";
import {
  delay,
  getMockResearchArtifactRecord,
  MOCK_RESEARCH_RUN_DELAY_MS,
  saveMockResearchArtifactRecord,
  USE_MOCK_RESEARCH_DATA,
} from "@/mock/project/research";
import type { Project } from "@/models/project/project";
import type { ResearchArtifactRecord } from "@/types/project/researchArtifactRecord";
import { useResearchArtifact } from "./useResearchArtifact";
import { useResearchRun } from "./useResearchRun";
import { useSaveResearchContext } from "./useSaveResearchContext";
import { RESEARCH_RUN_FAILED_USER_MESSAGE } from "@/lib/engine/formatRunError";

export function useResearchTab(project: Pick<Project, "id" | "name" | "clientName">) {
  const projectId = project.id;
  const researchArtifact = useResearchArtifact(projectId);
  const researchRun = useResearchRun(projectId);
  const saveResearchContext = useSaveResearchContext(projectId);
  const [mockRecord, setMockRecord] = useState<ResearchArtifactRecord | null>(null);
  const [isMockRunning, setIsMockRunning] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const backendData = researchArtifact.data;
  const data = USE_MOCK_RESEARCH_DATA ? (backendData ?? mockRecord) : backendData;
  const usingMockData = USE_MOCK_RESEARCH_DATA && backendData === null && mockRecord !== null;

  const startMockResearch = useCallback(async () => {
    setIsMockRunning(true);

    try {
      await delay(MOCK_RESEARCH_RUN_DELAY_MS);
      const record = getMockResearchArtifactRecord(projectId);
      setMockRecord(record);
      saveMockResearchArtifactRecord(projectId, record);
    } finally {
      setIsMockRunning(false);
    }
  }, [projectId]);

  const startResearch = useCallback(
    async (input?: ValidatedResearchConfigureInput, providerId?: ProviderId) => {
      if (!input || !providerId) {
        throw new Error("Configure Research before running.");
      }

      setSaveError(null);

      if (USE_MOCK_RESEARCH_DATA && !backendData) {
        await startMockResearch();
        return;
      }

      try {
        await saveResearchContext(input);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not save research context.";
        console.error(`[stage-engine] convex context save failed: ${message}`);
        setSaveError(RESEARCH_RUN_FAILED_USER_MESSAGE);
        throw error;
      }

      await researchRun.startResearch(providerId);
    },
    [backendData, researchRun, saveResearchContext, startMockResearch],
  );

  const isRunning = USE_MOCK_RESEARCH_DATA && !backendData
    ? isMockRunning || researchRun.isRunning
    : researchRun.isRunning;
  const isStarting = USE_MOCK_RESEARCH_DATA && !backendData
    ? isMockRunning || researchRun.isStarting
    : researchRun.isStarting;
  const error = saveError ?? researchRun.error;

  return {
    data,
    isLoading: researchArtifact.isLoading,
    hasArtifact: data !== null,
    parseError: researchArtifact.parseError,
    usingMockData,
    startResearch,
    cancelResearch: researchRun.cancelResearch,
    isRunning,
    isStarting,
    error,
  };
}
