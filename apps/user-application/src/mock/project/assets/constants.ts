export const MOCK_ASSETS_PROJECT_ID = "mock-stellar-site";

export const MOCK_ASSETS_GENERATED_AT = Date.parse("2025-04-07T12:00:00.000Z");

export const ASSET_CATEGORY_ICONS = {
  wireframes: "/logos/dashboard/wireframes.svg",
  documents: "/logos/dashboard/documents.svg",
  uploaded: "/logos/dashboard/upload-from-device.svg",
} as const;

export const EXPORT_OPTIONS = [
  {
    id: "code" as const,
    label: "Export In Code",
    actionLabel: "Export In Code",
    iconSrc: "/logos/code.svg",
    connected: true,
  },
  {
    id: "paper" as const,
    label: "Export In Paper",
    actionLabel: "Export In Paper",
    iconSrc: "/logos/paper.svg",
    connected: false,
    connectLabel: "Connect Paper",
  },
  {
    id: "figma" as const,
    label: "Export in Figma",
    actionLabel: "Export in Figma",
    iconSrc: "/logos/integrations/figma.svg",
    connected: true,
  },
];

export const DOCUMENT_STATUS_LABELS = {
  complete: "Complete",
  shared: "Shared",
} as const;

export const DOCUMENT_STATUS_CLASSES = {
  complete: "bg-[#F0FDF4] text-[#022C22]",
  shared: "bg-[rgba(0,125,252,0.15)] text-[#007DFC]",
} as const;

export const UPLOAD_STATUS_LABELS = {
  uploading: "Uploading",
  uploaded: "Uploaded",
  failed: "Failed",
} as const;

export const UPLOAD_STATUS_CLASSES = {
  uploading: "bg-[rgba(0,125,252,0.15)] text-[#007DFC]",
  uploaded: "bg-[rgba(163,163,163,0.25)] text-[#525252]",
  failed: "bg-[#FEE2E2] text-[#991B1B]",
} as const;

export const WIREFRAME_ASSET_SOURCE = "AI Generated";

export const WIREFRAME_ASSET_TYPE = "Wireframe";
