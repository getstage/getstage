import type { ProjectAsset } from "@/models/project/project";
import type { DocumentAssetRow, ExportOptionConfig, WireframeAssetCard } from "@/types/project/assetsTab";

const ASSET_CARD_COUNT = 6;

export const EXPORT_OPTIONS: ExportOptionConfig[] = [
  { id: "code", label: "Export In Code", actionLabel: "Export In Code", iconSrc: "/logos/code.svg", connected: true },
  { id: "paper", label: "Export In Paper", actionLabel: "Export In Paper", iconSrc: "/logos/paper.svg", connected: false, connectLabel: "Connect Paper" },
  { id: "figma", label: "Export in Figma", actionLabel: "Export in Figma", iconSrc: "/logos/integrations/figma.svg", connected: true },
];

export const DEFAULT_DOCUMENTS: DocumentAssetRow[] = [
  {
    id: "research-complete",
    title: "Brand Research Report",
    description: "Company overview, 4 competitors, market insights",
    status: "Complete",
    statusClass: "bg-[#F0FDF4] text-[#022C22]",
    date: "April 2",
  },
  {
    id: "research-shared",
    title: "Brand Research Report",
    description: "Company overview, 4 competitors, market insights",
    status: "Shared",
    statusClass: "bg-[rgba(0,125,252,0.15)] text-[#007DFC]",
    date: "April 2",
  },
];

export function buildAssetCards(assets: ProjectAsset[]): WireframeAssetCard[] {
  const defaults: ProjectAsset[] = Array.from({ length: ASSET_CARD_COUNT }, (_, index) => ({
    id: `wireframe-${index + 1}`,
    title: "Homepage Wireframe",
    type: "Wireframe",
  }));

  return defaults.map((fallback, index) => ({
    ...fallback,
    ...(assets[index] ? { title: assets[index].title, type: assets[index].type } : {}),
    date: "6th April, 2025",
    source: "AI Generated",
    priority: "P0",
  }));
}

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
