import { R2 } from "@convex-dev/r2";
import { v } from "convex/values";
import type { DataModel } from "./_generated/dataModel";
import { components } from "./_generated/api";
import { mutation, type MutationCtx } from "./_generated/server";
import { requireAuthUser } from "./_helpers";
import { getUploadValidationError, type UploadPurpose } from "../shared/uploadRules";

export const r2 = new R2(components.r2);

export const { syncMetadata } = r2.clientApi<DataModel>({
  checkUpload: async (ctx) => {
    await requireAuthUser(ctx);
  },
});

function getExtensionFromMimeType(mimeType: string, fileName: string) {
  switch (mimeType.toLowerCase()) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/svg+xml":
      return "svg";
    case "application/pdf":
      return "pdf";
    case "application/msword":
      return "doc";
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      return "docx";
    case "text/plain":
      return "txt";
    case "text/csv":
    case "application/csv":
    case "application/vnd.ms-excel":
      return "csv";
    default: {
      const match = fileName.toLowerCase().match(/\.([a-z0-9]+)$/);
      return match?.[1] ?? "bin";
    }
  }
}

function buildObjectKey(userId: string, purpose: UploadPurpose, fileName: string, mimeType: string) {
  const extension = getExtensionFromMimeType(mimeType, fileName);
  const uuid = crypto.randomUUID();

  switch (purpose) {
    case "task-attachment":
      return `users/${userId}/task-attachments/${uuid}.${extension}`;
    case "csv-upload":
      return `users/${userId}/imports/${uuid}.${extension}`;
    case "profile-avatar":
      return `users/${userId}/profile/avatar-${uuid}.${extension}`;
    case "client-avatar":
      return `users/${userId}/clients/avatar-${uuid}.${extension}`;
    case "portal-logo":
      return `users/${userId}/portal/logo-${uuid}.${extension}`;
  }
}

function isR2Key(value: string) {
  return !/^https?:\/\//i.test(value) && !value.startsWith("data:");
}

/**
 * Delete an old R2 object if the value is an R2 key (not a URL or data URI).
 * Always call this BEFORE saving the new key to the DB to prevent ghost data.
 */
export async function deleteOldR2Asset(ctx: MutationCtx, oldValue: string | null | undefined) {
  if (!oldValue || !isR2Key(oldValue)) {
    return;
  }
  try {
    await r2.deleteObject(ctx, oldValue);
  } catch {
    // Best-effort: the old object may already be gone.
  }
}

export async function resolveAssetUrl(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  if (!isR2Key(value)) {
    return value;
  }

  return r2.getUrl(value);
}

export const generateUploadUrl = mutation({
  args: {
    purpose: v.union(
      v.literal("task-attachment"),
      v.literal("csv-upload"),
      v.literal("profile-avatar"),
      v.literal("client-avatar"),
      v.literal("portal-logo"),
    ),
    fileName: v.string(),
    fileSize: v.number(),
    mimeType: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);
    const validationError = getUploadValidationError(args.purpose, {
      fileName: args.fileName,
      fileSize: args.fileSize,
      mimeType: args.mimeType,
    });

    if (validationError) {
      throw new Error(validationError);
    }

    const key = buildObjectKey(String(user._id), args.purpose, args.fileName, args.mimeType);
    return r2.generateUploadUrl(key);
  },
});
