import { useCallback, useState } from "react";
import type { ProviderId } from "@stage/data-ops/contracts";
import type { ValidatedResearchConfigureInput } from "@/lib/project/researchConfigureInput";
import type { Project } from "@/models/project/project";
import { useResearchArtifact } from "./useResearchArtifact";
import { useResearchRun } from "./useResearchRun";
import { useSaveResearchContext } from "./useSaveResearchContext";
import { RESEARCH_RUN_FAILED_USER_MESSAGE } from "@/lib/engine/formatRunError";

export function useResearchTab(project: Pick<Project, "id" | "name" | "clientName">) {
  const projectId = project.id;
  const researchArtifact = useResearchArtifact(projectId);
  const researchRun = useResearchRun(projectId);
  const saveResearchContext = useSaveResearchContext(projectId);
  const [saveError, setSaveError] = useState<string | null>(null);

  const startResearch = useCallback(
    async (input?: ValidatedResearchConfigureInput, providerId?: ProviderId) => {
      if (!input || !providerId) {
        throw new Error("Configure Research before running.");
      }

      setSaveError(null);

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
    [researchRun, saveResearchContext],
  );

  const error = saveError ?? researchRun.error;

  return {
    data: researchArtifact.data,
    isLoading: researchArtifact.isLoading,
    hasArtifact: researchArtifact.data !== null,
    parseError: researchArtifact.parseError,
    usingMockData: false,
    startResearch,
    cancelResearch: researchRun.cancelResearch,
    isRunning: researchRun.isRunning,
    isStarting: researchRun.isStarting,
    error,
  };
}
