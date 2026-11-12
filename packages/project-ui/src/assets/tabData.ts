import { hasLofiBlocks } from "../wireframes/mapWireframesArtifact";
import type { WireframesArtifact } from "@stage/data-ops/contracts";
import { ASSET_CATEGORY_ICONS, EXPORT_OPTIONS } from "./constants";
import type { AssetsTabData } from "./types";

export function createEmptyAssetsTabData(uploadedCount: number): AssetsTabData {
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

/**
 * The Assets tab: the saved delivery documents plus one card per Lo-Fi wireframe screen,
 * with category counts. Shared by Stage for Mac and the web app.
 */
export function buildAssetsTabData(args: {
  saved: AssetsTabData | null;
  wireframes: { id: string; artifact: WireframesArtifact } | null;
  uploadedCount: number;
}): AssetsTabData {
  const { uploadedCount } = args;
  const base = args.saved ?? createEmptyAssetsTabData(uploadedCount);
  const artifactRecord = args.wireframes;
  const artifact = artifactRecord?.artifact;
  const wireframeAssets =
    artifact?.generatedScreens.flatMap((screen) => {
      if (!artifactRecord) {
        return [];
      }
      if (artifact.wireframeKind !== "lofi" || !hasLofiBlocks(screen)) {
        return [];
      }
      return [{
        id: screen.id,
        artifactId: artifactRecord.id,
        screenId: screen.id,
        title: `${screen.title} Wireframe`,
        type: "lofi",
        date: screen.generatedAtLabel,
        source: "AI Generated",
        priority: screen.priority,
        figmaUrl: screen.figmaUrl,
        sections: screen.sections,
      }];
    }) ?? [];

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
}
