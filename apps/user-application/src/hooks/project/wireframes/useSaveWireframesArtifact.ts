import { useCallback } from "react";
import { useMutation } from "convex/react";
import type { Id } from "@stage/data-ops/convex/data-model";
import { api } from "@/lib/convexApi";
import { withConfigureScreens } from "@/lib/project/mapWireframesArtifactToTabData";
import type { ScreenItem } from "@/types/project/wireframesTab";
import type { WireframesArtifactRecord } from "@/types/project/wireframesArtifactRecord";

/**
 * Persists the screen list the user curates in Configure. Only the list is
 * written: generated screens belong to the engine, so an edit here never
 * pretends a screen has been generated.
 */
export function useSaveWireframesArtifact(projectId: string) {
  const updateWireframesArtifact = useMutation(api.projectAi.updateWireframesArtifact);

  const saveConfigureScreens = useCallback(
    async (record: WireframesArtifactRecord, screens: ScreenItem[]) => {
      const artifact = withConfigureScreens(record.artifact, screens);
      const selectedCount = artifact.configureScreens.filter((screen) => screen.selected).length;

      await updateWireframesArtifact({
        projectId: projectId as Id<"projects">,
        artifactId: record.id as Id<"projectAiArtifacts">,
        contentJson: JSON.stringify(artifact),
        summary: `${artifact.configureScreens.length} screens · ${selectedCount} selected · ${artifact.generatedScreens.length} generated`,
      });

      return artifact;
    },
    [projectId, updateWireframesArtifact],
  );

  return {
    saveConfigureScreens,
  };
}
