import { useCallback } from "react";
import { useMutation } from "convex/react";
import type { Id } from "@stage/data-ops/convex/data-model";
import type { ValidatedResearchConfigureInput } from "@/lib/project/researchConfigureInput";
import { api } from "@/lib/convexApi";

export function useSaveResearchContext(projectId: string) {
  const upsertContext = useMutation(api.projectAi.upsertContext);

  return useCallback(
    async (input: ValidatedResearchConfigureInput) => {
      await upsertContext({
        projectId: projectId as Id<"projects">,
        industry: input.industry,
        clientWebsite: input.website,
        competitorUrls: input.competitorUrls,
        referenceUrls: [],
        brief: input.projectBrief,
        notes: input.additionalNotes,
      });
    },
    [projectId, upsertContext],
  );
}
