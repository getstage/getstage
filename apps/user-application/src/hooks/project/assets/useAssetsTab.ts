import { useMemo } from "react";
import { ASSET_CATEGORY_ICONS, EXPORT_OPTIONS } from "@/mock/project/assets";
import type { Project } from "@/models/project/project";
import { useAssetsArtifact } from "./useAssetsArtifact";
import type { AssetsTabData } from "@/types/project/assetsTab";
import { useWireframesArtifact } from "../wireframes/useWireframesArtifact";

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
  const wireframesArtifact = useWireframesArtifact(projectId);

  const backendData = assetsArtifact.data;
  const emptyTabData = useMemo(() => createEmptyAssetsTabData(uploadedCount), [uploadedCount]);

  const tabData = useMemo<AssetsTabData>(() => {
    const base = backendData?.tabData ?? emptyTabData;
    const artifactRecord = wireframesArtifact.data;
    const wireframeAssets =
      artifactRecord?.artifact.generatedScreens.map((screen) => ({
        id: screen.id,
        artifactId: artifactRecord.id,
        screenId: screen.id,
        title: `${screen.title} Wireframe`,
        type: artifactRecord.artifact.wireframeKind,
        date: screen.generatedAtLabel,
        source: "AI Generated",
        priority: screen.priority,
        figmaUrl: screen.figmaUrl,
        html: screen.html,
        css: artifactRecord.resolvedCss ?? undefined,
        sections: screen.sections,
      })) ?? [];

    return {
      ...base,
      wireframeAssets,
      stats: {
        ...base.stats,
        wireframeCount: wireframeAssets.length,
        uploadedCount,
      },
      categories: base.categories.map((category) =>
        category.id === "wireframes"
          ? { ...category, count: wireframeAssets.length }
          : category.id === "uploaded"
            ? { ...category, count: uploadedCount }
            : category,
      ),
    };
  }, [backendData?.tabData, emptyTabData, uploadedCount, wireframesArtifact.data]);
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
