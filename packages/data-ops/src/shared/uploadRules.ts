export type UploadPurpose =
  | "task-attachment"
  | "csv-upload"
  | "profile-avatar"
  | "client-avatar"
  | "project-marker"
  | "portal-logo"
  | "generated-design"
  | "project-asset"
  | "research-refero"
  | "research-brief"
  | "moodboard-upload"
  | "moodboard-refero"
  | "moodboard-figma"
  | "moodboard-url"
  | "wireframe-brand-kit";

type UploadRule = {
  allowedMimeTypes: string[];
  allowedExtensions: string[];
  maxBytes: number;
};

export const UPLOAD_RULES: Record<UploadPurpose, UploadRule> = {
  "task-attachment": {
    allowedMimeTypes: [
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ],
    allowedExtensions: [".jpg", ".jpeg", ".png", ".webp", ".pdf", ".doc", ".docx", ".txt"],
    maxBytes: 15 * 1024 * 1024,
  },
  "csv-upload": {
    allowedMimeTypes: ["text/csv", "application/csv", "application/vnd.ms-excel"],
    allowedExtensions: [".csv"],
    maxBytes: 5 * 1024 * 1024,
  },
  "profile-avatar": {
    allowedMimeTypes: ["image/webp"],
    allowedExtensions: [".webp"],
    maxBytes: 2 * 1024 * 1024,
  },
  "client-avatar": {
    allowedMimeTypes: ["image/webp"],
    allowedExtensions: [".webp"],
    maxBytes: 2 * 1024 * 1024,
  },
  "project-marker": {
    allowedMimeTypes: ["image/webp"],
    allowedExtensions: [".webp"],
    maxBytes: 2 * 1024 * 1024,
  },
  "portal-logo": {
    allowedMimeTypes: ["image/webp", "image/svg+xml"],
    allowedExtensions: [".webp", ".svg"],
    maxBytes: 2 * 1024 * 1024,
  },
  "generated-design": {
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    allowedExtensions: [".jpg", ".jpeg", ".png", ".webp"],
    maxBytes: 10 * 1024 * 1024,
  },
  "research-refero": {
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    allowedExtensions: [".jpg", ".jpeg", ".png", ".webp"],
    maxBytes: 10 * 1024 * 1024,
  },
  "moodboard-upload": {
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
    allowedExtensions: [".jpg", ".jpeg", ".png", ".webp", ".gif"],
    maxBytes: 10 * 1024 * 1024,
  },
  "moodboard-refero": {
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    allowedExtensions: [".jpg", ".jpeg", ".png", ".webp"],
    maxBytes: 10 * 1024 * 1024,
  },
  "moodboard-figma": {
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    allowedExtensions: [".jpg", ".jpeg", ".png", ".webp"],
    maxBytes: 10 * 1024 * 1024,
  },
  "moodboard-url": {
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
    allowedExtensions: [".jpg", ".jpeg", ".png", ".webp", ".gif"],
    maxBytes: 10 * 1024 * 1024,
  },
  "research-brief": {
    allowedMimeTypes: [
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ],
    allowedExtensions: [".jpg", ".jpeg", ".png", ".webp", ".pdf", ".doc", ".docx", ".txt"],
    maxBytes: 5 * 1024 * 1024,
  },
  "wireframe-brand-kit": {
    // Brand kit for a Hi-Fi run: logo/one-pager/fonts. Capped small on purpose so people
    // compress before importing — big files upload slowly and the model only needs the gist.
    allowedMimeTypes: [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "image/svg+xml",
      "application/pdf",
      "font/ttf",
      "font/otf",
      "font/woff",
      "font/woff2",
      "application/font-sfnt",
      "application/octet-stream",
    ],
    allowedExtensions: [
      ".jpg",
      ".jpeg",
      ".png",
      ".webp",
      ".gif",
      ".svg",
      ".pdf",
      ".ttf",
      ".otf",
      ".woff",
      ".woff2",
    ],
    maxBytes: 10 * 1024 * 1024,
  },
  "project-asset": {
    allowedMimeTypes: [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/svg+xml",
      "image/gif",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "text/plain",
      "text/csv",
      "font/ttf",
      "font/otf",
      "font/woff",
      "font/woff2",
      "application/font-sfnt",
      "application/vnd.figma",
      "application/octet-stream",
    ],
    allowedExtensions: [
      ".jpg",
      ".jpeg",
      ".png",
      ".webp",
      ".svg",
      ".gif",
      ".pdf",
      ".doc",
      ".docx",
      ".xls",
      ".xlsx",
      ".ppt",
      ".pptx",
      ".txt",
      ".csv",
      ".ttf",
      ".otf",
      ".woff",
      ".woff2",
      ".fig",
      ".sketch",
      ".zip",
    ],
    maxBytes: 50 * 1024 * 1024,
  },
};

export function isUploadPurpose(value: string): value is UploadPurpose {
  return value in UPLOAD_RULES;
}

export function isUploadMimeAllowed(purpose: UploadPurpose, mimeType: string) {
  return UPLOAD_RULES[purpose].allowedMimeTypes.includes(mimeType.toLowerCase());
}

export function isUploadExtensionAllowed(purpose: UploadPurpose, fileName: string) {
  const lowerFileName = fileName.toLowerCase();
  return UPLOAD_RULES[purpose].allowedExtensions.some((extension) => lowerFileName.endsWith(extension));
}

export function getUploadMaxBytes(purpose: UploadPurpose) {
  return UPLOAD_RULES[purpose].maxBytes;
}

export function getUploadValidationError(
  purpose: UploadPurpose,
  args: {
    fileName: string;
    mimeType: string;
    fileSize: number;
  },
) {
  if (!isUploadExtensionAllowed(purpose, args.fileName)) {
    return "This file type is not supported.";
  }

  const normalizedMimeType = args.mimeType.trim().toLowerCase();
  if (
    normalizedMimeType &&
    normalizedMimeType !== "application/octet-stream" &&
    !isUploadMimeAllowed(purpose, normalizedMimeType)
  ) {
    return "This file type is not supported.";
  }

  if (args.fileSize > getUploadMaxBytes(purpose)) {
    return `This file is too large. Max size is ${formatUploadSize(getUploadMaxBytes(purpose))}.`;
  }

  return null;
}

export function formatUploadSize(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${Math.round((bytes / (1024 * 1024)) * 10) / 10} MB`;
}

export function isPublicUploadPurpose(purpose: UploadPurpose) {
  return purpose !== "csv-upload";
}
