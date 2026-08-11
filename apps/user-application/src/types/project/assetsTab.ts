import type { ProjectAsset } from "@/models/project/project";
import type { WireframeRenderableSection } from "@/types/project/wireframesTab";

export type AssetView = "wireframes" | "documents" | "uploaded";

export type UploadedAssetRow = {
  id: string;
  title: string;
  date: string;
  status: "uploading" | "uploaded" | "failed";
  error?: string;
  /** Public preview/open URL for persisted assets (null until known). */
  url?: string | null;
  mimeType?: string;
};

export type WireframeAssetCard = ProjectAsset & {
  artifactId: string;
  screenId: string;
  date: string;
  source: string;
  priority: string;
  figmaUrl?: string;
  html?: string;
  // Shared run stylesheet (R2-offloaded runs). Figma/Paper export captures the
  // fragment offscreen and needs the CSS inline — the sandboxed capture cannot
  // fetch the URL itself.
  css?: string;
  sections: WireframeRenderableSection[];
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
