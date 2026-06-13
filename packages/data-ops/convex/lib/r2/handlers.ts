import { v } from "convex/values";
import type { DataModel } from "../../_generated/dataModel";
import { internalMutation, mutation, query } from "../../_generated/server";
import { requireAuthUser } from "../../helpers/auth/requireAuthUser";
import { keyBelongsToUser } from "../../helpers/r2/keys";
import { now } from "../../helpers/time";
import {
  collectReferencedKeysForUser,
  createTrackedUpload,
  deleteOldR2Asset,
  hasLegacyUploadFields,
  r2,
} from "./domain";

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
    const cutoff = now() - STALE_PENDING_UPLOAD_MS;
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
        if (!keyBelongsToUser(item.key, userId) || referencedKeys.has(item.key)) {
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
