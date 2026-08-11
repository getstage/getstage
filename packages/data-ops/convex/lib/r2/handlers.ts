import { v } from "convex/values";
import type { DataModel } from "../../_generated/dataModel";
import { internalMutation, mutation, query } from "../../_generated/server";
import { requireProjectAccess } from "../../helpers/access/projectAccess";
import { requireAuthUser } from "../../helpers/auth/requireAuthUser";
import { buildPublicAssetUrl, keyBelongsToUser } from "../../helpers/r2/keys";
import { now } from "../../helpers/time";
import {
  attachTrackedR2Asset,
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
  v.literal("wireframe-brand-kit"),
  v.literal("wireframe-screen"),
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

export const listProjectAssets = query({
  args: {
    projectId: v.id("projects"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireProjectAccess(ctx, args.projectId);
    const prefix = `project-assets/projects/${args.projectId}/users/${user._id}/files/`;
    const limit = args.limit ?? 100;
    const uploads = await ctx.db
      .query("uploadedAssets")
      .withIndex("by_user_createdAt", (q) => q.eq("userId", user._id))
      .collect();

    return uploads
      .filter((upload) => upload.purpose === "project-asset" && upload.key.startsWith(prefix))
      .slice(-limit)
      .reverse()
      .map((upload) => ({
        id: upload.key,
        title: upload.fileName,
        createdAt: upload.createdAt,
        url: buildPublicAssetUrl(upload.key),
        mimeType: upload.mimeType,
      }));
  },
});

export const deleteProjectAsset = mutation({
  args: {
    projectId: v.id("projects"),
    key: v.string(),
  },
  handler: async (ctx, args) => {
    const { user } = await requireProjectAccess(ctx, args.projectId);
    const prefix = `project-assets/projects/${args.projectId}/users/${user._id}/files/`;
    if (!args.key.startsWith(prefix)) {
      throw new Error("This asset does not belong to the project.");
    }
    // Best-effort R2 delete + tracked-record removal (reuses the shared helper).
    await deleteOldR2Asset(ctx, args.key);
    return { ok: true as const };
  },
});

// Restores the brand kit on return to the Wireframes tab: the upload is tracked in
// `uploadedAssets`, so reading it back means a closed/reopened tab still shows the file
// instead of losing it to local state. (The hourly prune cron still collects truly
// abandoned uploads after 24h.)
export const listWireframeBrandKit = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const { user } = await requireProjectAccess(ctx, args.projectId);
    const prefix = `wireframes/projects/${args.projectId}/users/${user._id}/brand-kit/`;
    const uploads = await ctx.db
      .query("uploadedAssets")
      .withIndex("by_user_createdAt", (q) => q.eq("userId", user._id))
      .collect();

    return uploads
      .filter((upload) => upload.purpose === "wireframe-brand-kit" && upload.key.startsWith(prefix))
      .reverse()
      .map((upload) => ({
        key: upload.key,
        name: upload.fileName,
        sizeBytes: upload.fileSize,
        createdAt: upload.createdAt,
      }));
  },
});

// Brand kit files are transient (consumed by a Hi-Fi wireframes run, never attached to an
// artifact), so the hourly prune cron eventually collects them. This lets the UI delete one
// immediately when the user removes it, instead of leaving it pending for up to 24h.
export const deleteWireframeBrandKit = mutation({
  args: {
    projectId: v.id("projects"),
    key: v.string(),
  },
  handler: async (ctx, args) => {
    const { user } = await requireProjectAccess(ctx, args.projectId);
    const prefix = `wireframes/projects/${args.projectId}/users/${user._id}/brand-kit/`;
    if (!args.key.startsWith(prefix)) {
      throw new Error("This brand kit file does not belong to the project.");
    }
    await deleteOldR2Asset(ctx, args.key);
    return { ok: true as const };
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

    const referencedByUser = new Map<string, Set<string>>();
    let deletedCount = 0;
    let attachedCount = 0;

    for (const upload of staleUploads) {
      const userId = String(upload.userId);
      let referencedKeys = referencedByUser.get(userId);
      if (!referencedKeys) {
        referencedKeys = await collectReferencedKeysForUser(ctx, userId);
        referencedByUser.set(userId, referencedKeys);
      }

      // Still used by an artifact/profile/etc, but never detached from uploadedAssets.
      // Attach (drop tracking row) instead of deleting the live R2 object.
      if (referencedKeys.has(upload.key)) {
        await attachTrackedR2Asset(ctx, { key: upload.key });
        attachedCount += 1;
        continue;
      }

      await deleteOldR2Asset(ctx, upload.key);
      deletedCount += 1;
    }

    return {
      deletedCount,
      attachedCount,
      scannedCount: staleUploads.length,
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
