import { useCallback } from "react";
import { useMutation } from "convex/react";
import type { MoodboardArtifact } from "@stage/data-ops/contracts";
import type { Id } from "@stage/data-ops/convex/data-model";
import { api } from "@/lib/convexApi";

/**
 * Persist the moodboard board structure (references + directions + uploaded
 * files) as a single `moodboardArtifact`. Upserts in place — see
 * `saveMoodboardArtifact` on the Convex side.
 */
export function useSaveMoodboardArtifact(projectId: string) {
  const saveMoodboardArtifact = useMutation(api.projectAi.saveMoodboardArtifact);

  return useCallback(
    async (artifact: MoodboardArtifact) => {
      const result = await saveMoodboardArtifact({
        projectId: projectId as Id<"projects">,
        title: artifact.title,
        contentJson: JSON.stringify(artifact),
      });

      return result;
    },
    [projectId, saveMoodboardArtifact],
  );
}
