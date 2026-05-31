import {
  EXPORT_OPTIONS,
  createSeedDocuments,
  createSeedWireframeAssets,
} from "@/mock/project/assets";

export {
  EXPORT_OPTIONS,
  createSeedDocuments,
  createSeedExportOptions,
  createSeedWireframeAssets,
} from "@/mock/project/assets";

export function getProjectAssetSizeError(file: File) {
  const lower = file.name.toLowerCase();
  const maxBytes = /\.(ttf|otf|woff|woff2)$/.test(lower)
    ? 10 * 1024 * 1024
    : /\.(jpg|jpeg|png|webp|svg|gif)$/.test(lower)
      ? 15 * 1024 * 1024
      : /\.(fig|sketch|zip)$/.test(lower)
        ? 50 * 1024 * 1024
        : 25 * 1024 * 1024;

  return file.size > maxBytes ? `This file is too large. Max size is ${formatBytes(maxBytes)}.` : null;
}

export function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))}KB`;
  return `${Math.round((bytes / (1024 * 1024)) * 10) / 10}MB`;
}

export function formatUploadDate(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(timestamp));
}

/** @deprecated Use createSeedWireframeAssets from assetsTabFixtures or useAssetsTab().tabData.wireframeAssets */
export function buildAssetCards(assets: import("@/models/project/project").ProjectAsset[]) {
  const seed = createSeedWireframeAssets();
  return seed.map((fallback, index) => ({
    ...fallback,
    ...(assets[index] ? { title: assets[index].title, type: assets[index].type } : {}),
  }));
}

/** @deprecated Use createSeedDocuments from assetsTabFixtures or useAssetsTab().tabData.documents */
export const DEFAULT_DOCUMENTS = createSeedDocuments();
