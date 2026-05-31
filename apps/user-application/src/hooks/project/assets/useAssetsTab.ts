import { useEffect, useMemo, useState } from "react";
import {
  createSeedAssetCategories,
  getSeedAssetsTabData,
  loadMockAssetsArtifactRecord,
} from "@/mock/project/assets";
import type { AssetsArtifactRecord } from "@/types/project/assetsArtifactRecord";
import type { Project } from "@/models/project/project";
import { useAssetsArtifact } from "./useAssetsArtifact";

export function useAssetsTab(
  project: Pick<Project, "id" | "name">,
  uploadedCount = 0,
) {
  const projectId = project.id;
  const assetsArtifact = useAssetsArtifact(projectId);
  const [mockRecord, setMockRecord] = useState<AssetsArtifactRecord | null>(() =>
    loadMockAssetsArtifactRecord(projectId),
  );

  useEffect(() => {
    setMockRecord(loadMockAssetsArtifactRecord(projectId));
  }, [projectId]);

  const backendData = assetsArtifact.data;
  const data = backendData ?? mockRecord;
  const seedTabData = useMemo(() => getSeedAssetsTabData(), []);

  const tabData = data?.tabData ?? seedTabData;
  const categories = useMemo(
    () =>
      tabData.categories.map((category) =>
        category.id === "uploaded" ? { ...category, count: uploadedCount } : category,
      ),
    [tabData.categories, uploadedCount],
  );

  return {
    data,
    tabData,
    categories,
    isLoading: assetsArtifact.isLoading,
    hasArtifact: data !== null,
    parseError: assetsArtifact.parseError,
    usingMockData: backendData === null && mockRecord !== null,
  };
}
