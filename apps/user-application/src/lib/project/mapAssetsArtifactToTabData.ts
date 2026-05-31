import type {
  AssetsArtifact,
  DocumentAsset,
  ExportOptionDefinition,
  WireframeAsset,
} from "@stage/data-ops/contracts";
import type {
  AssetsTabData,
  DocumentAssetRow,
  ExportOptionConfig,
  WireframeAssetCard,
} from "@/types/project/assetsTab";
import {
  DOCUMENT_STATUS_CLASSES,
  DOCUMENT_STATUS_LABELS,
  UPLOAD_STATUS_CLASSES,
  UPLOAD_STATUS_LABELS,
} from "@/mock/project/assets/constants";

export function mapWireframeAssetToCard(asset: WireframeAsset): WireframeAssetCard {
  return {
    id: asset.id,
    title: asset.title,
    type: asset.type,
    date: asset.dateLabel,
    source: asset.source,
    priority: asset.priority,
  };
}

export function mapDocumentAssetToRow(document: DocumentAsset): DocumentAssetRow {
  return {
    id: document.id,
    title: document.title,
    description: document.description,
    status: DOCUMENT_STATUS_LABELS[document.status],
    statusClass: DOCUMENT_STATUS_CLASSES[document.status],
    date: document.dateLabel,
  };
}

export function mapExportOptionToConfig(option: ExportOptionDefinition): ExportOptionConfig {
  return {
    id: option.id,
    label: option.label,
    actionLabel: option.actionLabel,
    iconSrc: option.iconSrc,
    connected: option.connected,
    connectLabel: option.connectLabel,
  };
}

export function mapAssetsArtifactToTabData(artifact: AssetsArtifact): AssetsTabData {
  return {
    wireframeAssets: artifact.wireframes.map(mapWireframeAssetToCard),
    documents: artifact.documents.map(mapDocumentAssetToRow),
    exportOptions: artifact.exportOptions.map(mapExportOptionToConfig),
    categories: artifact.categories.map((category) => ({
      id: category.id,
      label: category.label,
      iconSrc: category.iconSrc,
      count:
        category.id === "wireframes"
          ? artifact.stats.wireframeCount
          : category.id === "documents"
            ? artifact.stats.documentCount
            : artifact.stats.uploadedCount,
    })),
    stats: artifact.stats,
  };
}

export { DOCUMENT_STATUS_CLASSES, DOCUMENT_STATUS_LABELS, UPLOAD_STATUS_CLASSES, UPLOAD_STATUS_LABELS };
