import type { ProjectAsset } from "@/models/project/project";

export type AssetView = "wireframes" | "documents" | "uploaded";

export type UploadedAssetRow = {
  id: string;
  title: string;
  date: string;
  status: "uploading" | "uploaded" | "failed";
  error?: string;
};

export type WireframeAssetCard = ProjectAsset & {
  date: string;
  source: string;
  priority: string;
};

export type ExportOption = "code" | "paper" | "figma";

export type ExportOptionConfig = {
  id: ExportOption;
  label: string;
  actionLabel: string;
  iconSrc: string;
  connected: boolean;
  connectLabel?: string;
};

export type AssetCategory = {
  id: AssetView;
  label: string;
  count: number;
  iconSrc: string;
};

export type DocumentAssetRow = {
  id: string;
  title: string;
  description: string;
  status: string;
  statusClass: string;
  date: string;
};

export type AssetsTabStats = {
  wireframeCount: number;
  documentCount: number;
  uploadedCount: number;
};

export type AssetsTabData = {
  wireframeAssets: WireframeAssetCard[];
  documents: DocumentAssetRow[];
  exportOptions: ExportOptionConfig[];
  categories: AssetCategory[];
  stats: AssetsTabStats;
};
