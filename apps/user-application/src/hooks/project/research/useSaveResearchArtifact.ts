import { useCallback } from "react";
import { useMutation } from "convex/react";
import type { ResearchArtifact } from "@stage/data-ops/contracts";
import type { Id } from "@stage/data-ops/convex/data-model";
import { researchArtifactSchema } from "@stage/data-ops/contracts";
import { api } from "@/lib/convexApi";

export function useSaveResearchArtifact(projectId: string) {
  const updateResearchArtifact = useMutation(api.projectAi.updateResearchArtifact);

  return useCallback(
    async (artifactId: string, artifact: ResearchArtifact) => {
      const parsed = researchArtifactSchema.parse(artifact);
      const summary = parsed.summary.join(" ").trim();

      await updateResearchArtifact({
        projectId: projectId as Id<"projects">,
        artifactId: artifactId as Id<"projectAiArtifacts">,
        contentJson: JSON.stringify(parsed),
        summary: summary || undefined,
      });
    },
    [projectId, updateResearchArtifact],
  );
}
