import type { FunctionReference } from "convex/server";
import type { useMutation } from "convex/react";
import { getUploadValidationError, type UploadPurpose } from "@stage/data-ops/shared/upload-rules";
import { readFileAsDataUrl } from "@/lib/utils";

export const TASK_ATTACHMENT_ACCEPT = ".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx,.txt";
export const PROJECT_ASSET_ACCEPT = ".jpg,.jpeg,.png,.webp,.svg,.gif,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.ttf,.otf,.woff,.woff2,.fig,.sketch,.zip";
export const CSV_ACCEPT = ".csv,text/csv";
export const AVATAR_ACCEPT = ".jpg,.jpeg,.png,.webp";
export const PROJECT_MARKER_ACCEPT = ".jpg,.jpeg,.png,.webp";
export const PORTAL_LOGO_ACCEPT = ".jpg,.jpeg,.png,.webp,.svg";
export const MOODBOARD_IMAGE_ACCEPT = ".jpg,.jpeg,.png,.webp,.gif,image/jpeg,image/png,image/webp,image/gif";

type MutationFn = ReturnType<typeof useMutation<FunctionReference<"mutation">>>;

type UploadResult = {
  uploadUrl: string;
  key: string;
};

export type PreparedUpload = {
  file: File;
  previewUrl: string;
};

function extensionToMimeType(fileName: string) {
  const lowerFileName = fileName.toLowerCase();
  if (lowerFileName.endsWith(".jpg") || lowerFileName.endsWith(".jpeg")) return "image/jpeg";
  if (lowerFileName.endsWith(".png")) return "image/png";
  if (lowerFileName.endsWith(".webp")) return "image/webp";
  if (lowerFileName.endsWith(".svg")) return "image/svg+xml";
  if (lowerFileName.endsWith(".gif")) return "image/gif";
  if (lowerFileName.endsWith(".pdf")) return "application/pdf";
  if (lowerFileName.endsWith(".doc")) return "application/msword";
  if (lowerFileName.endsWith(".docx")) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  if (lowerFileName.endsWith(".txt")) return "text/plain";
  if (lowerFileName.endsWith(".csv")) return "text/csv";
  if (lowerFileName.endsWith(".xls")) return "application/vnd.ms-excel";
  if (lowerFileName.endsWith(".xlsx")) {
    return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  }
  if (lowerFileName.endsWith(".ppt")) return "application/vnd.ms-powerpoint";
  if (lowerFileName.endsWith(".pptx")) {
    return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
  }
  if (lowerFileName.endsWith(".ttf")) return "font/ttf";
  if (lowerFileName.endsWith(".otf")) return "font/otf";
  if (lowerFileName.endsWith(".woff")) return "font/woff";
  if (lowerFileName.endsWith(".woff2")) return "font/woff2";
  if (lowerFileName.endsWith(".fig")) return "application/vnd.figma";
  return "application/octet-stream";
}

export function getNormalizedMimeType(file: File) {
  return file.type || extensionToMimeType(file.name);
}

async function putUploadBody(uploadUrl: string, mimeType: string, file: File) {
  if (typeof window !== "undefined" && window.stageDesktop?.storage?.putR2Upload) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    await window.stageDesktop.storage.putR2Upload({ uploadUrl, mimeType, bytes });
    return;
  }

  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": mimeType,
    },
    body: file,
  });

  if (!response.ok) {
    throw new Error("Could not upload this file.");
  }
}

export function validateUploadFile(purpose: UploadPurpose, file: File) {
  return getUploadValidationError(purpose, {
    fileName: file.name,
    fileSize: file.size,
    mimeType: getNormalizedMimeType(file),
  });
}

export async function uploadFileToR2(args: {
  generateUploadUrl: MutationFn;
  syncMetadata: MutationFn;
  purpose: UploadPurpose;
  file: File;
  scopeId?: string;
}) {
  const mimeType = getNormalizedMimeType(args.file);
  const validationError = validateUploadFile(args.purpose, args.file);
  if (validationError) {
    throw new Error(validationError);
  }

  const { uploadUrl, key } = (await args.generateUploadUrl({
    purpose: args.purpose,
    fileName: args.file.name,
    fileSize: args.file.size,
    mimeType,
    scopeId: args.scopeId,
  })) as UploadResult;

  await putUploadBody(uploadUrl, mimeType, args.file);

  await args.syncMetadata({ key });
  return key;
}

function replaceExtension(fileName: string, extension: string) {
  const base = fileName.replace(/\.[^.]+$/, "");
  return `${base}.${extension}`;
}

function loadImage(dataUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not read this image."));
    image.src = dataUrl;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, type, quality);
  });
}

async function convertRasterImageToWebP(file: File) {
  const dataUrl = await readFileAsDataUrl(file);
  const image = await loadImage(dataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Could not prepare this image.");
  }

  context.drawImage(image, 0, 0);
  const blob = await canvasToBlob(canvas, "image/webp", 0.84);
  if (!blob) {
    throw new Error("Could not convert this image.");
  }

  return new File([blob], replaceExtension(file.name, "webp"), {
    type: "image/webp",
  });
}

export async function prepareAvatarUpload(file: File): Promise<PreparedUpload> {
  const converted = await convertRasterImageToWebP(file);
  const validationError = validateUploadFile("profile-avatar", converted);
  if (validationError) {
    throw new Error(validationError);
  }

  return {
    file: converted,
    previewUrl: await readFileAsDataUrl(converted),
  };
}

export async function prepareClientAvatarUpload(file: File): Promise<PreparedUpload> {
  const converted = await convertRasterImageToWebP(file);
  const validationError = validateUploadFile("client-avatar", converted);
  if (validationError) {
    throw new Error(validationError);
  }

  return {
    file: converted,
    previewUrl: await readFileAsDataUrl(converted),
  };
}

export async function prepareProjectMarkerUpload(file: File): Promise<PreparedUpload> {
  const converted = await convertRasterImageToWebP(file);
  const validationError = validateUploadFile("project-marker", converted);
  if (validationError) {
    throw new Error(validationError);
  }

  return {
    file: converted,
    previewUrl: await readFileAsDataUrl(converted),
  };
}

export async function preparePortalLogoUpload(file: File): Promise<PreparedUpload> {
  const normalizedMimeType = getNormalizedMimeType(file);
  const preparedFile =
    normalizedMimeType === "image/svg+xml" ? file : await convertRasterImageToWebP(file);
  const validationError = validateUploadFile("portal-logo", preparedFile);
  if (validationError) {
    throw new Error(validationError);
  }

  return {
    file: preparedFile,
    previewUrl: await readFileAsDataUrl(preparedFile),
  };
}
