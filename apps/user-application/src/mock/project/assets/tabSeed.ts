import type {
  DocumentAssetRow,
  ExportOptionConfig,
  WireframeAssetCard,
} from "@/types/project/assetsTab";
import { mockAssetsArtifact } from "./assetsArtifact";
import {
  mapDocumentAssetToRow,
  mapExportOptionToConfig,
  mapWireframeAssetToCard,
} from "@/lib/project/mapAssetsArtifactToTabData";

export function createSeedWireframeAssets(): WireframeAssetCard[] {
  return mockAssetsArtifact.wireframes.map(mapWireframeAssetToCard);
}

export function createSeedDocuments(): DocumentAssetRow[] {
  return mockAssetsArtifact.documents.map(mapDocumentAssetToRow);
}

export function createSeedExportOptions(): ExportOptionConfig[] {
  return mockAssetsArtifact.exportOptions.map(mapExportOptionToConfig);
}

export function createSeedAssetCategories(uploadedCount = 0) {
  return mockAssetsArtifact.categories.map((category) => ({
    id: category.id,
    label: category.label,
    iconSrc: category.iconSrc,
    count:
      category.id === "wireframes"
        ? mockAssetsArtifact.stats.wireframeCount
        : category.id === "documents"
          ? mockAssetsArtifact.stats.documentCount
          : uploadedCount,
  }));
}
