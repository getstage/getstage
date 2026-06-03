import { useCallback } from "react";
import { useMutation } from "convex/react";
import { strategyArtifactSchema, type StrategyArtifact } from "@stage/data-ops/contracts";
import type { Id } from "@stage/data-ops/convex/data-model";
import { api } from "@/lib/convexApi";
import { summarizeStrategyArtifact } from "@/lib/project/applyStrategyTabEdits";

export function useSaveStrategyArtifact(projectId: string) {
  const updateStrategyArtifact = useMutation(api.projectAi.updateStrategyArtifact);

  return useCallback(
    async (artifactId: string, artifact: StrategyArtifact) => {
      const parsed = strategyArtifactSchema.parse(artifact);

      await updateStrategyArtifact({
        projectId: projectId as Id<"projects">,
        artifactId: artifactId as Id<"projectAiArtifacts">,
        contentJson: JSON.stringify(parsed),
        summary: summarizeStrategyArtifact(parsed),
      });
    },
    [projectId, updateStrategyArtifact],
  );
}
