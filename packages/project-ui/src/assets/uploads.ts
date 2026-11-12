import type { UploadedAssetRow } from "./types";

export function formatUploadDate(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(timestamp));
}

/** Rows for the files saved in the project (`r2.listProjectAssets`). */
export function uploadedRows(assets: { id: string; title: string; createdAt: number; url: string | null; mimeType: string }[]): UploadedAssetRow[] {
  return assets.map((asset) => ({
    id: asset.id,
    title: asset.title,
    date: formatUploadDate(asset.createdAt),
    status: "uploaded",
    url: asset.url,
    mimeType: asset.mimeType,
  }));
}
