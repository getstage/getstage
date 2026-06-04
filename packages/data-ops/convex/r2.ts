import { R2 } from "@convex-dev/r2";
import { v } from "convex/values";
import type { DataModel } from "./_generated/dataModel";
import { components } from "./_generated/api";
import { internalMutation, mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { requireAuthUser } from "./_helpers";
import { getUploadValidationError, type UploadPurpose } from "../src/shared/uploadRules";

export const r2 = new R2(components.r2);
const STALE_PENDING_UPLOAD_MS = 24 * 60 * 60 * 1000;

const uploadPurposeValidator = v.union(
  v.literal("task-attachment"),
  v.literal("csv-upload"),
  v.literal("profile-avatar"),
  v.literal("client-avatar"),
  v.literal("project-marker"),
  v.literal("portal-logo"),
  v.literal("generated-design"),
  v.literal("project-asset"),
  v.literal("research-refero"),
  v.literal("research-brief"),
  v.literal("moodboard-upload"),
  v.literal("moodboard-refero"),
  v.literal("moodboard-figma"),
  v.literal("moodboard-url"),
);

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
    case "image/gif":
      return "gif";
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
    case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
      return "xlsx";
    case "application/vnd.ms-powerpoint":
      return "ppt";
    case "application/vnd.openxmlformats-officedocument.presentationml.presentation":
      return "pptx";
    case "font/ttf":
    case "application/font-sfnt":
      return "ttf";
    case "font/otf":
      return "otf";
    case "font/woff":
      return "woff";
    case "font/woff2":
      return "woff2";
    case "application/vnd.figma":
      return "fig";
    default: {
      const match = fileName.toLowerCase().match(/\.([a-z0-9]+)$/);
      return match?.[1] ?? "bin";
    }
  }
}

function buildObjectKey(
  userId: string,
  purpose: UploadPurpose,
  fileName: string,
  mimeType: string,
  scopeId?: string,
) {
  const extension = getExtensionFromMimeType(mimeType, fileName);
  const uuid = crypto.randomUUID();
  const projectId = scopeId?.trim() || "unknown-project";

  function moodboardKey(source: "uploads" | "refero" | "figma" | "urls") {
    return `moodboard/projects/${projectId}/users/${userId}/${source}/${uuid}.${extension}`;
  }

  switch (purpose) {
    case "task-attachment":
      return `users/${userId}/task-attachments/${uuid}.${extension}`;
    case "csv-upload":
      return `users/${userId}/imports/${uuid}.${extension}`;
    case "profile-avatar":
      return `users/${userId}/profile/avatar-${uuid}.${extension}`;
    case "client-avatar":
      return `users/${userId}/clients/avatar-${uuid}.${extension}`;
    case "project-marker":
      return `users/${userId}/projects/marker-${uuid}.${extension}`;
    case "portal-logo":
      return `users/${userId}/portal/logo-${uuid}.${extension}`;
    case "generated-design":
      return `users/${userId}/generated-designs/${uuid}.${extension}`;
    case "project-asset":
      return `users/${userId}/project-assets/${uuid}.${extension}`;
    case "research-refero": {
      return `users/${userId}/research/${projectId}/refero/${uuid}.${extension}`;
    }
    case "research-brief": {
      return `users/${userId}/research/${projectId}/briefs/${uuid}.${extension}`;
    }
    case "moodboard-upload":
      return moodboardKey("uploads");
    case "moodboard-refero":
      return moodboardKey("refero");
    case "moodboard-figma":
      return moodboardKey("figma");
    case "moodboard-url":
      return moodboardKey("urls");
  }
}

function isR2Key(value: string) {
  return !/^https?:\/\//i.test(value) && !value.startsWith("data:");
}

function getUploadUrlString(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  if (value && typeof value === "object") {
    const candidate =
      (value as { url?: unknown }).url ?? (value as { uploadUrl?: unknown }).uploadUrl;
    if (typeof candidate === "string") {
      return candidate;
    }
  }

  throw new Error("Could not generate an upload URL.");
}

function hasLegacyUploadFields(upload: {
  status?: string;
  source?: string;
  entityType?: string;
  entityId?: string;
  attachedAt?: number;
  updatedAt?: number;
}) {
  return (
    upload.status !== undefined ||
    upload.source !== undefined ||
    upload.entityType !== undefined ||
    upload.entityId !== undefined ||
    upload.attachedAt !== undefined ||
    upload.updatedAt !== undefined
  );
}

async function deleteTrackedUploadRecord(ctx: MutationCtx, key: string) {
  const trackedAssets = await ctx.db
    .query("uploadedAssets")
    .withIndex("by_key", (q) => q.eq("key", key))
    .collect();

  await Promise.all(trackedAssets.map((asset) => ctx.db.delete(asset._id)));
}

async function collectReferencedKeysForUser(ctx: QueryCtx, userId: string) {
  const referencedKeys = new Set<string>();
  const userPrefix = `users/${userId}/`;
  const userRecord = await ctx.db.normalizeId("users", userId);

  if (userRecord) {
    const user = await ctx.db.get(userRecord);
    if (user?.avatarUrl && isR2Key(user.avatarUrl)) {
      referencedKeys.add(user.avatarUrl);
    }
    if (user?.defaultPortalLogoUrl && isR2Key(user.defaultPortalLogoUrl)) {
      referencedKeys.add(user.defaultPortalLogoUrl);
    }
  }

  const projects =
    userRecord
      ? await ctx.db
          .query("projects")
          .withIndex("by_user", (q) => q.eq("userId", userRecord))
          .collect()
      : [];

  for (const project of projects) {
    const maybeKeys = [
      project.clientAvatarUrl,
      project.projectImageUrl,
      project.startMarkerImageUrl,
      project.endMarkerImageUrl,
    ];

    for (const key of maybeKeys) {
      if (key && isR2Key(key)) {
        referencedKeys.add(key);
      }
    }
  }

  const clients =
    userRecord
      ? await ctx.db
          .query("clients")
          .withIndex("by_user", (q) => q.eq("userId", userRecord))
          .collect()
      : [];

  for (const client of clients) {
    if (client.avatarUrl && isR2Key(client.avatarUrl)) {
      referencedKeys.add(client.avatarUrl);
    }
  }

  const sheetConnections =
    userRecord
      ? await ctx.db
          .query("sheetConnections")
          .withIndex("by_user", (q) => q.eq("userId", userRecord))
          .collect()
      : [];

  for (const connection of sheetConnections) {
    if (connection.r2ObjectKey && isR2Key(connection.r2ObjectKey)) {
      referencedKeys.add(connection.r2ObjectKey);
    }
  }

  const attachments = await ctx.db.query("attachments").collect();
  for (const attachment of attachments) {
    if (attachment.r2ObjectKey?.startsWith(userPrefix)) {
      referencedKeys.add(attachment.r2ObjectKey);
    }
  }

  const generatedDesigns = await ctx.db.query("projectGeneratedDesigns").collect();
  for (const generatedDesign of generatedDesigns) {
    if (generatedDesign.r2ObjectKey.startsWith(userPrefix)) {
      referencedKeys.add(generatedDesign.r2ObjectKey);
    }
  }

  const portalConfigs = await ctx.db.query("portalConfigs").collect();
  for (const config of portalConfigs) {
    if (config.logoUrl?.startsWith(userPrefix)) {
      referencedKeys.add(config.logoUrl);
    }
  }

  return referencedKeys;
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

  await deleteTrackedUploadRecord(ctx, oldValue);
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

export async function attachTrackedR2Asset(
  ctx: MutationCtx,
  args: {
    key: string | null | undefined;
  },
) {
  if (!args.key || !isR2Key(args.key)) {
    return;
  }
  await deleteTrackedUploadRecord(ctx, args.key);
}

async function createTrackedUpload(
  ctx: MutationCtx,
  args: {
    userId: DataModel["users"]["document"]["_id"];
    purpose: UploadPurpose;
    fileName: string;
    fileSize: number;
    mimeType: string;
    scopeId?: string;
  },
) {
  const validationError = getUploadValidationError(args.purpose, {
    fileName: args.fileName,
    fileSize: args.fileSize,
    mimeType: args.mimeType,
  });

  if (validationError) {
    throw new Error(validationError);
  }

  const key = buildObjectKey(
    String(args.userId),
    args.purpose,
    args.fileName,
    args.mimeType,
    args.scopeId,
  );
  const timestamp = Date.now();
  await ctx.db.insert("uploadedAssets", {
    userId: args.userId,
    key,
    purpose: args.purpose,
    fileName: args.fileName,
    fileSize: args.fileSize,
    mimeType: args.mimeType,
    createdAt: timestamp,
  });

  return {
    key,
    uploadUrl: getUploadUrlString(await r2.generateUploadUrl(key)),
  };
}

export const generateUploadUrl = mutation({
  args: {
    purpose: uploadPurposeValidator,
    fileName: v.string(),
    fileSize: v.number(),
    mimeType: v.string(),
    scopeId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);
    const trackedUpload = await createTrackedUpload(ctx, {
      userId: user._id,
      purpose: args.purpose,
      fileName: args.fileName,
      fileSize: args.fileSize,
      mimeType: args.mimeType,
      scopeId: args.scopeId,
    });

    return {
      key: trackedUpload.key,
      uploadUrl: trackedUpload.uploadUrl,
    };
  },
});

export const generateUploadUrlForApi = internalMutation({
  args: {
    userId: v.id("users"),
    purpose: uploadPurposeValidator,
    fileName: v.string(),
    fileSize: v.number(),
    mimeType: v.string(),
    scopeId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return createTrackedUpload(ctx, {
      userId: args.userId,
      purpose: args.purpose,
      fileName: args.fileName,
      fileSize: args.fileSize,
      mimeType: args.mimeType,
      scopeId: args.scopeId,
    });
  },
});

export const pruneStalePendingUploads = internalMutation({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const cutoff = Date.now() - STALE_PENDING_UPLOAD_MS;
    const staleUploads = await ctx.db
      .query("uploadedAssets")
      .withIndex("by_createdAt", (q) => q.lt("createdAt", cutoff))
      .take(args.limit ?? 50);

    for (const upload of staleUploads) {
      await deleteOldR2Asset(ctx, upload.key);
    }

    return {
      deletedCount: staleUploads.length,
    };
  },
});

export const normalizeLegacyUploadedAssets = internalMutation({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const uploads = await ctx.db
      .query("uploadedAssets")
      .withIndex("by_createdAt")
      .take(args.limit ?? 100);

    let normalizedCount = 0;
    let deletedAttachedCount = 0;

    for (const upload of uploads) {
      if (!hasLegacyUploadFields(upload)) {
        continue;
      }

      await ctx.db.delete(upload._id);

      if (upload.status === "attached") {
        deletedAttachedCount += 1;
        continue;
      }

      await ctx.db.insert("uploadedAssets", {
        userId: upload.userId,
        key: upload.key,
        purpose: upload.purpose,
        fileName: upload.fileName,
        fileSize: upload.fileSize,
        mimeType: upload.mimeType,
        createdAt: upload.createdAt,
      });
      normalizedCount += 1;
    }

    return {
      scannedCount: uploads.length,
      normalizedCount,
      deletedAttachedCount,
    };
  },
});

export const listPotentialOrphanedUploads = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuthUser(ctx);
    const userId = String(user._id);
    const userPrefix = `users/${userId}/`;
    const referencedKeys = await collectReferencedKeysForUser(ctx, userId);
    const orphanedObjects: Array<{
      key: string;
      url: string;
      contentType?: string;
      size?: number;
      lastModified: string;
    }> = [];

    let cursor: string | null = null;
    do {
      const metadata = await r2.listMetadata(ctx, 200, cursor);
      for (const item of metadata.page) {
        if (!item.key.startsWith(userPrefix) || referencedKeys.has(item.key)) {
          continue;
        }

        orphanedObjects.push({
          key: item.key,
          url: item.url,
          contentType: item.contentType,
          size: item.size,
          lastModified: item.lastModified,
        });
      }

      cursor = metadata.isDone ? null : metadata.continueCursor;
    } while (cursor);

    return orphanedObjects.sort((a, b) => b.lastModified.localeCompare(a.lastModified));
  },
});
