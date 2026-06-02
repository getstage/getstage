import { useMemo } from "react";
import { ASSET_CATEGORY_ICONS, EXPORT_OPTIONS } from "@/mock/project/assets";
import type { Project } from "@/models/project/project";
import { useAssetsArtifact } from "./useAssetsArtifact";
import type { AssetsTabData } from "@/types/project/assetsTab";

function createEmptyAssetsTabData(uploadedCount: number): AssetsTabData {
  return {
    wireframeAssets: [],
    documents: [],
    exportOptions: EXPORT_OPTIONS,
    categories: [
      { id: "documents", label: "Documents", count: 0, iconSrc: ASSET_CATEGORY_ICONS.documents },
      { id: "wireframes", label: "Wireframes", count: 0, iconSrc: ASSET_CATEGORY_ICONS.wireframes },
      { id: "uploaded", label: "Uploaded", count: uploadedCount, iconSrc: ASSET_CATEGORY_ICONS.uploaded },
    ],
    stats: {
      wireframeCount: 0,
      documentCount: 0,
      uploadedCount,
    },
  };
}

export function useAssetsTab(
  project: Pick<Project, "id" | "name">,
  uploadedCount = 0,
) {
  const projectId = project.id;
  const assetsArtifact = useAssetsArtifact(projectId);

  const backendData = assetsArtifact.data;
  const data = backendData;
  const emptyTabData = useMemo(() => createEmptyAssetsTabData(uploadedCount), [uploadedCount]);

  const tabData = data?.tabData ?? emptyTabData;
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
    usingMockData: false,
  };
}
