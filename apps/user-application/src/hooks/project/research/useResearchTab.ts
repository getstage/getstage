import { useCallback, useState } from "react";
import { useMutation } from "@tanstack/react-query";
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
  const { saveResearchContext, setBriefFile, markBriefForRemoval } =
    useSaveResearchContext(projectId);
  const [saveError, setSaveError] = useState<string | null>(null);

  // One mutation for "save context (uploads brief files) + start the run", so
  // isPending covers the whole wait and the tab never shows a stale screen.
  const start = useMutation({
    mutationFn: async ({
      input,
      providerId,
    }: {
      input?: ValidatedResearchConfigureInput;
      providerId?: ProviderId;
    }) => {
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
  });
  const startResearch = useCallback(
    (input?: ValidatedResearchConfigureInput, providerId?: ProviderId) =>
      start.mutateAsync({ input, providerId }),
    [start],
  );

  return {
    data: researchArtifact.data,
    isLoading: researchArtifact.isLoading,
    hasArtifact: researchArtifact.data !== null,
    parseError: researchArtifact.parseError,
    parseErrorMessage: researchArtifact.parseErrorMessage,
    usingMockData: false,
    startResearch,
    cancelResearch: researchRun.cancelResearch,
    isRunning: researchRun.isRunning,
    isStarting: start.isPending || researchRun.isStarting,
    elapsedSeconds: researchRun.elapsedSeconds,
    lastRunDurationSeconds: researchRun.lastRunDurationSeconds,
    error: saveError ?? researchRun.error,
    setBriefFile,
    markBriefForRemoval,
  };
}
