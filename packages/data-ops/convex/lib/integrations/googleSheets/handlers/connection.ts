import { v } from "convex/values";
import type { Id } from "../../../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../../../_generated/server";
import { requireAuthUser } from "../../../../_helpers";
import { deleteOldR2Asset, attachTrackedR2Asset } from "../../../../r2";
import { now } from "../../../../helpers/time";
import { parseSheetUrl } from "../../../../helpers/integrations/sheets/parse";
import {
  getSheetConnectionStatusReturns,
  type SheetSourceType,
} from "../../../../models/integrations/googleSheets";

export const getSheetConnectionStatusArgs = {};
export { getSheetConnectionStatusReturns };

export async function getSheetConnectionStatusHandler(ctx: QueryCtx) {
  const user = await requireAuthUser(ctx);
  const connections = await ctx.db
    .query("sheetConnections")
    .withIndex("by_user", (q) => q.eq("userId", user._id))
    .collect();

  const googleSheet =
    connections.find((connection) => connection.sourceType === "google_sheet") ?? null;
  const csvUpload = connections.find((connection) => connection.sourceType === "csv_upload") ?? null;

  return {
    googleSheet: googleSheet
      ? {
          id: googleSheet._id,
          status: googleSheet.status,
          sheetUrl: googleSheet.sheetUrl ?? null,
          sheetTitle: googleSheet.sheetTitle ?? null,
          lastImportedAt: googleSheet.lastImportedAt ?? null,
          lastImportStatus: googleSheet.lastImportStatus ?? null,
          lastImportError: googleSheet.lastImportError ?? null,
        }
      : null,
    csvUpload: csvUpload
      ? {
          id: csvUpload._id,
          status: csvUpload.status,
          fileName: csvUpload.fileName ?? null,
          lastImportedAt: csvUpload.lastImportedAt ?? null,
          lastImportStatus: csvUpload.lastImportStatus ?? null,
          lastImportError: csvUpload.lastImportError ?? null,
        }
      : null,
  };
}

export const getConnectionForImportArgs = {
  userId: v.id("users"),
  sourceType: v.optional(v.union(v.literal("google_sheet"), v.literal("csv_upload"))),
};

export async function getConnectionForImportHandler(
  ctx: QueryCtx,
  args: { userId: Id<"users">; sourceType?: SheetSourceType },
) {
  if (args.sourceType) {
    return ctx.db
      .query("sheetConnections")
      .withIndex("by_user_source_type", (q) =>
        q.eq("userId", args.userId).eq("sourceType", args.sourceType as "google_sheet" | "csv_upload"),
      )
      .first();
  }

  const connections = await ctx.db
    .query("sheetConnections")
    .withIndex("by_user", (q) => q.eq("userId", args.userId))
    .collect();

  return (
    connections.find((connection) => connection.sourceType === "google_sheet") ??
    connections.find((connection) => connection.sourceType === "csv_upload") ??
    null
  );
}

export const upsertSheetConnectionArgs = {
  userId: v.id("users"),
  sourceType: v.union(v.literal("google_sheet"), v.literal("csv_upload")),
  status: v.union(v.literal("pending"), v.literal("active"), v.literal("error"), v.literal("disconnected")),
  sheetId: v.optional(v.string()),
  sheetUrl: v.optional(v.string()),
  storageId: v.optional(v.id("_storage")),
  r2ObjectKey: v.optional(v.string()),
  fileName: v.optional(v.string()),
  templateVersion: v.optional(v.string()),
  lastImportError: v.optional(v.string()),
};

export async function upsertSheetConnectionHandler(
  ctx: MutationCtx,
  args: {
    userId: Id<"users">;
    sourceType: SheetSourceType;
    status: "pending" | "active" | "error" | "disconnected";
    sheetId?: string;
    sheetUrl?: string;
    storageId?: Id<"_storage">;
    r2ObjectKey?: string;
    fileName?: string;
    templateVersion?: string;
    lastImportError?: string;
  },
) {
  const timestamp = now();
  const existing = await ctx.db
    .query("sheetConnections")
    .withIndex("by_user_source_type", (q) => q.eq("userId", args.userId).eq("sourceType", args.sourceType))
    .first();

  if (existing) {
    await ctx.db.patch(existing._id, {
      status: args.status,
      sheetId: args.sheetId,
      sheetUrl: args.sheetUrl,
      storageId: args.storageId,
      r2ObjectKey: args.r2ObjectKey,
      fileName: args.fileName,
      templateVersion: args.templateVersion,
      lastImportError: args.lastImportError,
      updatedAt: timestamp,
    });
    return existing._id;
  }

  return ctx.db.insert("sheetConnections", {
    userId: args.userId,
    sourceType: args.sourceType,
    status: args.status,
    sheetId: args.sheetId,
    sheetUrl: args.sheetUrl,
    storageId: args.storageId,
    r2ObjectKey: args.r2ObjectKey,
    fileName: args.fileName,
    templateVersion: args.templateVersion,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}

export const connectSheetArgs = {
  sheetUrl: v.string(),
  templateVersion: v.optional(v.string()),
};

export async function connectSheetHandler(
  ctx: MutationCtx,
  args: { sheetUrl: string; templateVersion?: string },
) {
  const user = await requireAuthUser(ctx);
  const parsed = parseSheetUrl(args.sheetUrl);
  const connection = await ctx.db
    .query("sheetConnections")
    .withIndex("by_user_source_type", (q) => q.eq("userId", user._id).eq("sourceType", "google_sheet"))
    .first();

  const timestamp = now();
  if (connection) {
    await ctx.db.patch(connection._id, {
      sourceType: "google_sheet",
      status: "active",
      sheetId: parsed.sheetId,
      sheetUrl: parsed.sheetUrl,
      templateVersion: args.templateVersion,
      lastImportError: undefined,
      updatedAt: timestamp,
    });
    return connection._id;
  }

  return ctx.db.insert("sheetConnections", {
    userId: user._id,
    sourceType: "google_sheet",
    status: "active",
    sheetId: parsed.sheetId,
    sheetUrl: parsed.sheetUrl,
    templateVersion: args.templateVersion,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}

export const generateUploadUrlArgs = {};

export async function generateUploadUrlHandler() {
  throw new Error("Use api.r2.generateUploadUrl instead.");
}

export const uploadCsvArgs = {
  r2ObjectKey: v.string(),
  fileName: v.string(),
};

export async function uploadCsvHandler(
  ctx: MutationCtx,
  args: { r2ObjectKey: string; fileName: string },
) {
  const user = await requireAuthUser(ctx);
  const timestamp = now();
  const existing = await ctx.db
    .query("sheetConnections")
    .withIndex("by_user_source_type", (q) => q.eq("userId", user._id).eq("sourceType", "csv_upload"))
    .first();

  if (existing) {
    if (existing.r2ObjectKey && existing.r2ObjectKey !== args.r2ObjectKey) {
      await deleteOldR2Asset(ctx, existing.r2ObjectKey);
    }

    await ctx.db.patch(existing._id, {
      status: "active",
      storageId: undefined,
      r2ObjectKey: args.r2ObjectKey,
      fileName: args.fileName,
      lastImportError: undefined,
      updatedAt: timestamp,
    });
    if (existing.storageId) {
      await ctx.storage.delete(existing.storageId);
    }

    await attachTrackedR2Asset(ctx, { key: args.r2ObjectKey });
    return existing._id;
  }

  const connectionId = await ctx.db.insert("sheetConnections", {
    userId: user._id,
    sourceType: "csv_upload",
    status: "active",
    r2ObjectKey: args.r2ObjectKey,
    fileName: args.fileName,
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  await attachTrackedR2Asset(ctx, { key: args.r2ObjectKey });
  return connectionId;
}

export const disconnectSheetArgs = {
  sourceType: v.optional(v.union(v.literal("google_sheet"), v.literal("csv_upload"))),
};

export async function disconnectSheetHandler(
  ctx: MutationCtx,
  args: { sourceType?: SheetSourceType },
) {
  const user = await requireAuthUser(ctx);
  const sourceType = args.sourceType ?? "google_sheet";
  const connection = await ctx.db
    .query("sheetConnections")
    .withIndex("by_user_source_type", (q) => q.eq("userId", user._id).eq("sourceType", sourceType))
    .first();

  if (!connection) {
    return null;
  }

  if (sourceType === "csv_upload" && connection.storageId) {
    await ctx.storage.delete(connection.storageId);
  }
  if (sourceType === "csv_upload" && connection.r2ObjectKey) {
    await deleteOldR2Asset(ctx, connection.r2ObjectKey);
  }

  await ctx.db.patch(connection._id, {
    status: "disconnected",
    storageId: sourceType === "csv_upload" ? undefined : connection.storageId,
    r2ObjectKey: sourceType === "csv_upload" ? undefined : connection.r2ObjectKey,
    updatedAt: now(),
  });

  return { disconnected: true };
}
