import { v } from "convex/values";
import { internal } from "../../../../_generated/api";
import type { Id } from "../../../../_generated/dataModel";
import type { ActionCtx, MutationCtx, QueryCtx } from "../../../../_generated/server";
import { now } from "../../../../helpers/time";
import {
  buildSheetCsvUrl,
  buildSheetFetchErrorMessage,
  looksLikeHtmlDocument,
  parseImportedEntriesFromCsv,
  parseSheetUrl,
} from "../../../../helpers/integrations/sheets/parse";
import { resolveAssetUrl } from "../../../../r2";
import {
  financeEntryValidator,
  type ImportClient,
  type ImportedEntry,
  type ImportProject,
  type SheetConnectionRecord,
  type SheetSourceType,
  type ViewerContext,
} from "../../../../models/integrations/googleSheets";

export const getProjectsForImportArgs = {
  userId: v.id("users"),
};

export async function getProjectsForImportHandler(ctx: QueryCtx, args: { userId: Id<"users"> }) {
  const projects = await ctx.db
    .query("projects")
    .withIndex("by_user", (q) => q.eq("userId", args.userId))
    .collect();

  return projects.map((project) => ({
    id: project._id,
    name: project.name,
  }));
}

export const getClientsForImportArgs = {
  userId: v.id("users"),
};

export async function getClientsForImportHandler(ctx: QueryCtx, args: { userId: Id<"users"> }) {
  const clients = await ctx.db
    .query("clients")
    .withIndex("by_user", (q) => q.eq("userId", args.userId))
    .collect();

  return clients.map((client) => ({
    name: client.name,
  }));
}

export const applyImportedEntriesArgs = {
  userId: v.id("users"),
  sheetConnectionId: v.id("sheetConnections"),
  source: v.union(v.literal("google_sheet"), v.literal("csv_upload")),
  entries: v.array(financeEntryValidator),
};

export async function applyImportedEntriesHandler(
  ctx: MutationCtx,
  args: {
    userId: Id<"users">;
    sheetConnectionId: Id<"sheetConnections">;
    source: SheetSourceType;
    entries: ImportedEntry[];
  },
) {
  const timestamp = now();
  let importedCount = 0;
  let updatedCount = 0;

  for (const entry of args.entries) {
    const existing = await ctx.db
      .query("financeEntries")
      .withIndex("by_user_source_record", (q) =>
        q.eq("userId", args.userId).eq("source", args.source).eq("sourceRecordId", entry.sourceRecordId),
      )
      .unique();

    const patch = {
      userId: args.userId,
      source: args.source,
      paymentConnectionId: undefined,
      sheetConnectionId: args.sheetConnectionId,
      sourceRecordId: entry.sourceRecordId,
      entryType: entry.entryType,
      direction: entry.direction,
      status: entry.status,
      counterpartyName: entry.counterpartyName,
      amountCents: entry.amountCents,
      currency: entry.currency,
      occurredAt: entry.occurredAt,
      dueAt: entry.dueAt,
      paidAt: entry.paidAt,
      projectId: entry.projectId,
      notes: entry.notes,
      rawLabel: entry.rawLabel,
      updatedAt: timestamp,
    };

    if (existing) {
      await ctx.db.patch(existing._id, patch);
      updatedCount += 1;
    } else {
      await ctx.db.insert("financeEntries", {
        ...patch,
        createdAt: timestamp,
      });
      importedCount += 1;
    }
  }

  await ctx.db.insert("sheetImportRuns", {
    userId: args.userId,
    sheetConnectionId: args.sheetConnectionId,
    status: "success",
    startedAt: timestamp,
    finishedAt: timestamp,
    importedCount,
    updatedCount,
    skippedCount: 0,
  });

  await ctx.db.patch(args.sheetConnectionId, {
    status: "active",
    lastImportedAt: timestamp,
    lastImportStatus: "success",
    lastImportError: undefined,
    updatedAt: timestamp,
  });

  return {
    importedCount,
    updatedCount,
    skippedCount: 0,
  };
}

export const markImportErrorArgs = {
  userId: v.id("users"),
  sheetConnectionId: v.id("sheetConnections"),
  errorSummary: v.string(),
};

export async function markImportErrorHandler(
  ctx: MutationCtx,
  args: {
    userId: Id<"users">;
    sheetConnectionId: Id<"sheetConnections">;
    errorSummary: string;
  },
) {
  const timestamp = now();

  await ctx.db.insert("sheetImportRuns", {
    userId: args.userId,
    sheetConnectionId: args.sheetConnectionId,
    status: "error",
    startedAt: timestamp,
    finishedAt: timestamp,
    importedCount: 0,
    updatedCount: 0,
    skippedCount: 0,
    errorSummary: args.errorSummary,
  });

  await ctx.db.patch(args.sheetConnectionId, {
    status: "error",
    lastImportStatus: "error",
    lastImportError: args.errorSummary,
    updatedAt: timestamp,
  });
}

export const runSheetImportArgs = {
  sourceType: v.optional(v.union(v.literal("google_sheet"), v.literal("csv_upload"))),
};

export async function runSheetImportHandler(
  ctx: ActionCtx,
  args: { sourceType?: SheetSourceType },
): Promise<{
  importedCount: number;
  updatedCount: number;
  skippedCount: number;
}> {
  const viewer = (await ctx.runQuery(internal.onboarding.getViewerContext, {})) as ViewerContext;
  const connection = (await ctx.runQuery(internal.integrations.googleSheets.getConnectionForImport, {
    userId: viewer.userId,
    sourceType: args.sourceType,
  })) as SheetConnectionRecord | null;

  if (!connection) {
    throw new Error("Connect a Google Sheet or upload a CSV before importing.");
  }

  try {
    let csvText = "";

    if (connection.sourceType === "google_sheet") {
      if (!connection.sheetId || !connection.sheetUrl) {
        throw new Error("Google Sheets connection is incomplete.");
      }

      const { gid } = parseSheetUrl(connection.sheetUrl);
      const response = await fetch(buildSheetCsvUrl(connection.sheetId, gid));
      if (!response.ok) {
        throw new Error(buildSheetFetchErrorMessage(response.status));
      }
      csvText = await response.text();
    } else if (connection.r2ObjectKey) {
      const response = await fetch((await resolveAssetUrl(connection.r2ObjectKey)) ?? connection.r2ObjectKey);
      if (!response.ok) {
        throw new Error("Uploaded CSV file could not be fetched.");
      }
      csvText = await response.text();
    } else if (!connection.storageId) {
      throw new Error("CSV upload is missing.");
    } else {
      const blob = await ctx.storage.get(connection.storageId);
      if (!blob) {
        throw new Error("Uploaded CSV file could not be found.");
      }
      csvText = await blob.text();
    }

    if (looksLikeHtmlDocument(csvText)) {
      throw new Error(
        "Google returned a web page instead of sheet data. Open the Transactions tab, copy that exact URL, and retry. If it still fails, publish the sheet to the web or use CSV upload.",
      );
    }

    const clients = (await ctx.runQuery(internal.integrations.googleSheets.getClientsForImport, {
      userId: viewer.userId,
    })) as ImportClient[];
    const projects = (await ctx.runQuery(internal.integrations.googleSheets.getProjectsForImport, {
      userId: viewer.userId,
    })) as ImportProject[];
    const entries = parseImportedEntriesFromCsv(csvText, clients, projects);

    return ctx.runMutation(internal.integrations.googleSheets.applyImportedEntries, {
      userId: viewer.userId,
      sheetConnectionId: connection._id,
      source: connection.sourceType,
      entries,
    });
  } catch (error) {
    await ctx.runMutation(internal.integrations.googleSheets.markImportError, {
      userId: viewer.userId,
      sheetConnectionId: connection._id,
      errorSummary: error instanceof Error ? error.message : "Import failed.",
    });
    throw error;
  }
}
