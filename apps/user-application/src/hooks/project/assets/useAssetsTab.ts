import { useMemo } from "react";
import type { Project } from "@/models/project/project";
import { useAssetsArtifact } from "./useAssetsArtifact";
import { buildAssetsTabData } from "@stage/project-ui/assets/tabData";
import { useWireframesArtifact } from "../wireframes/useWireframesArtifact";

export function useAssetsTab(
  project: Pick<Project, "id" | "name">,
  uploadedCount = 0,
) {
  const projectId = project.id;
  const assetsArtifact = useAssetsArtifact(projectId);
  const wireframesArtifact = useWireframesArtifact(projectId);

  const backendData = assetsArtifact.data;

  const tabData = useMemo(
    () => buildAssetsTabData({ saved: backendData?.tabData ?? null, wireframes: wireframesArtifact.data, uploadedCount }),
    [backendData?.tabData, uploadedCount, wireframesArtifact.data],
  );
  const categories = useMemo(
    () =>
      tabData.categories.map((category) =>
        category.id === "uploaded" ? { ...category, count: uploadedCount } : category,
      ),
    [tabData.categories, uploadedCount],
  );

  return {
    data: backendData,
    tabData,
    categories,
    isLoading: assetsArtifact.isLoading || wireframesArtifact.isLoading,
    hasArtifact: backendData !== null || wireframesArtifact.data !== null,
    parseError: assetsArtifact.parseError || wireframesArtifact.parseError,
    usingMockData: false,
  };
}
