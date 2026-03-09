import { v } from "convex/values";
import { action, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { requireAuthUser } from "./_helpers";

function now() {
  return Date.now();
}

function buildSourceRecordId(parts: Array<string | number>) {
  return parts.map((part) => String(part).trim()).join("|");
}

const GOOGLE_SHEETS_GUIDE_HINT = "Please check the Google Sheets guide and use the Transactions tab template.";

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "_");
}

function normalizeImportHeader(value: string) {
  const normalized = normalizeHeader(value);

  switch (normalized) {
    case "counterparty":
      return "client";
    default:
      return normalized;
  }
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        value += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(value);
      value = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }
      row.push(value);
      rows.push(row);
      row = [];
      value = "";
      continue;
    }

    value += char;
  }

  if (value.length > 0 || row.length > 0) {
    row.push(value);
    rows.push(row);
  }

  return rows.filter((candidate) => candidate.some((cell) => cell.trim().length > 0));
}

function looksLikeHtmlDocument(text: string) {
  const trimmed = text.trim().toLowerCase();
  return trimmed.startsWith("<!doctype html") || trimmed.startsWith("<html");
}

function parseSheetUrl(sheetUrl: string) {
  const trimmed = sheetUrl.trim();
  if (!trimmed) {
    throw new Error("Google Sheets URL is required.");
  }

  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!match) {
    throw new Error("Use a valid Google Sheets URL.");
  }

  const url = new URL(trimmed);
  const gidFromSearch = url.searchParams.get("gid");
  const gidFromHash = new URLSearchParams(url.hash.replace(/^#/, "")).get("gid");

  return {
    sheetId: match[1],
    gid: gidFromSearch ?? gidFromHash ?? "0",
    sheetUrl: trimmed,
  };
}

function buildSheetCsvUrl(sheetId: string, gid: string) {
  return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
}

function buildSheetFetchErrorMessage(status: number) {
  switch (status) {
    case 401:
    case 403:
      return "Google blocked CSV export for this sheet. It may be viewable but not exportable. Enable viewer download/copy or publish it to the web, then retry.";
    case 404:
      return "Google could not find that sheet tab for export. Check the sheet URL and tab, then retry.";
    default:
      return `Google Sheets CSV export failed with HTTP ${status}. If the sheet is already public, publish it to the web or use CSV upload instead.`;
  }
}

function parseAmountToCents(rawValue: string) {
  const stripped = rawValue.replace(/[^\d,.-]/g, "");
  if (!stripped) {
    throw new Error("Amount is required.");
  }

  let normalized = stripped;
  const lastDot = normalized.lastIndexOf(".");
  const lastComma = normalized.lastIndexOf(",");

  if (lastDot !== -1 && lastComma !== -1) {
    if (lastComma > lastDot) {
      normalized = normalized.replace(/\./g, "").replace(",", ".");
    } else {
      normalized = normalized.replace(/,/g, "");
    }
  } else if (lastComma !== -1) {
    normalized = normalized.replace(",", ".");
  }

  const parsed = Number.parseFloat(normalized);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid amount: ${rawValue}`);
  }

  return Math.round(parsed * 100);
}

function parseDateToTimestamp(rawValue: string) {
  const parsed = Date.parse(rawValue);
  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid date: ${rawValue}. ${GOOGLE_SHEETS_GUIDE_HINT}`);
  }
  return parsed;
}

function normalizeEntryType(value: string) {
  const normalized = value.trim().toLowerCase();
  switch (normalized) {
    case "invoice":
      return "invoice" as const;
    case "expense":
    case "salary":
    case "tax":
      return "expense" as const;
    case "loan":
    case "other":
      return "adjustment" as const;
    case "payment":
    case "refund":
    case "adjustment":
      return normalized as "payment" | "refund" | "adjustment";
    default:
      throw new Error(`Unsupported type: ${value}. ${GOOGLE_SHEETS_GUIDE_HINT}`);
  }
}

function normalizeDirection(value: string) {
  const normalized = value.trim().toLowerCase();
  if (normalized === "in" || normalized === "incoming") {
    return "incoming";
  }
  if (normalized === "out" || normalized === "outgoing") {
    return "outgoing";
  }
  throw new Error(`Unsupported direction: ${value}. ${GOOGLE_SHEETS_GUIDE_HINT}`);
}

function normalizeStatus(value: string) {
  const normalized = value.trim().toLowerCase();
  switch (normalized) {
    case "draft":
      return "draft" as const;
    case "open":
    case "pending":
      return "pending" as const;
    case "paid":
    case "succeeded":
    case "complete":
      return "paid" as const;
    case "overdue":
    case "past_due":
      return "overdue" as const;
    case "cancelled":
    case "canceled":
    case "failed":
      return "failed" as const;
    default:
      throw new Error(`Unsupported status: ${value}. ${GOOGLE_SHEETS_GUIDE_HINT}`);
  }
}

const financeEntryValidator = v.object({
  sourceRecordId: v.string(),
  entryType: v.union(
    v.literal("invoice"),
    v.literal("payment"),
    v.literal("expense"),
    v.literal("refund"),
    v.literal("adjustment"),
  ),
  direction: v.union(v.literal("incoming"), v.literal("outgoing")),
  status: v.union(
    v.literal("draft"),
    v.literal("pending"),
    v.literal("paid"),
    v.literal("overdue"),
    v.literal("failed"),
  ),
  counterpartyName: v.string(),
  amountCents: v.number(),
  currency: v.string(),
  occurredAt: v.number(),
  dueAt: v.optional(v.number()),
  paidAt: v.optional(v.number()),
  projectId: v.optional(v.id("projects")),
  notes: v.optional(v.string()),
  rawLabel: v.optional(v.string()),
});

type SheetSourceType = "google_sheet" | "csv_upload";

type ViewerContext = {
  userId: Id<"users">;
};

type SheetConnectionRecord = {
  _id: Id<"sheetConnections">;
  sourceType: SheetSourceType;
  sheetId?: string;
  sheetUrl?: string;
  storageId?: Id<"_storage">;
};

type ImportProject = {
  id: Id<"projects">;
  name: string;
};

type ImportClient = {
  name: string;
};

type ImportedEntry = {
  sourceRecordId: string;
  entryType: "invoice" | "payment" | "expense" | "refund" | "adjustment";
  direction: "incoming" | "outgoing";
  status: "draft" | "pending" | "paid" | "overdue" | "failed";
  counterpartyName: string;
  amountCents: number;
  currency: string;
  occurredAt: number;
  dueAt?: number;
  paidAt?: number;
  projectId?: Id<"projects">;
  notes?: string;
  rawLabel?: string;
};

export const getSheetConnectionStatus = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuthUser(ctx);
    const connections = await ctx.db
      .query("sheetConnections")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const googleSheet =
      connections.find((connection) => connection.sourceType === "google_sheet") ?? null;
    const csvUpload =
      connections.find((connection) => connection.sourceType === "csv_upload") ?? null;

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
  },
});

export const getConnectionForImport = internalQuery({
  args: {
    userId: v.id("users"),
    sourceType: v.optional(v.union(v.literal("google_sheet"), v.literal("csv_upload"))),
  },
  handler: async (ctx, args) => {
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
  },
});

export const getProjectsForImport = internalQuery({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    return projects.map((project) => ({
      id: project._id,
      name: project.name,
    }));
  },
});

export const getClientsForImport = internalQuery({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const clients = await ctx.db
      .query("clients")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    return clients.map((client) => ({
      name: client.name,
    }));
  },
});

export const upsertSheetConnection = internalMutation({
  args: {
    userId: v.id("users"),
    sourceType: v.union(v.literal("google_sheet"), v.literal("csv_upload")),
    status: v.union(
      v.literal("pending"),
      v.literal("active"),
      v.literal("error"),
      v.literal("disconnected"),
    ),
    sheetId: v.optional(v.string()),
    sheetUrl: v.optional(v.string()),
    storageId: v.optional(v.id("_storage")),
    fileName: v.optional(v.string()),
    templateVersion: v.optional(v.string()),
    lastImportError: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const timestamp = now();
    const existing = await ctx.db
      .query("sheetConnections")
      .withIndex("by_user_source_type", (q) =>
        q.eq("userId", args.userId).eq("sourceType", args.sourceType),
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: args.status,
        sheetId: args.sheetId,
        sheetUrl: args.sheetUrl,
        storageId: args.storageId,
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
      fileName: args.fileName,
      templateVersion: args.templateVersion,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  },
});

export const applyImportedEntries = internalMutation({
  args: {
    userId: v.id("users"),
    sheetConnectionId: v.id("sheetConnections"),
    source: v.union(v.literal("google_sheet"), v.literal("csv_upload")),
    entries: v.array(financeEntryValidator),
  },
  handler: async (ctx, args) => {
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
  },
});

export const markImportError = internalMutation({
  args: {
    userId: v.id("users"),
    sheetConnectionId: v.id("sheetConnections"),
    errorSummary: v.string(),
  },
  handler: async (ctx, args) => {
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
  },
});

export const connectSheet = mutation({
  args: {
    sheetUrl: v.string(),
    templateVersion: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);
    const parsed = parseSheetUrl(args.sheetUrl);
    const connectionId = await ctx.db
      .query("sheetConnections")
      .withIndex("by_user_source_type", (q) =>
        q.eq("userId", user._id).eq("sourceType", "google_sheet"),
      )
      .first();

    const timestamp = now();
    if (connectionId) {
      await ctx.db.patch(connectionId._id, {
        sourceType: "google_sheet",
        status: "active",
        sheetId: parsed.sheetId,
        sheetUrl: parsed.sheetUrl,
        templateVersion: args.templateVersion,
        lastImportError: undefined,
        updatedAt: timestamp,
      });
      return connectionId._id;
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
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAuthUser(ctx);
    return ctx.storage.generateUploadUrl();
  },
});

export const uploadCsv = mutation({
  args: {
    storageId: v.id("_storage"),
    fileName: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);
    const timestamp = now();
    const existing = await ctx.db
      .query("sheetConnections")
      .withIndex("by_user_source_type", (q) =>
        q.eq("userId", user._id).eq("sourceType", "csv_upload"),
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: "active",
        storageId: args.storageId,
        fileName: args.fileName,
        lastImportError: undefined,
        updatedAt: timestamp,
      });
      return existing._id;
    }

    return ctx.db.insert("sheetConnections", {
      userId: user._id,
      sourceType: "csv_upload",
      status: "active",
      storageId: args.storageId,
      fileName: args.fileName,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  },
});

export const disconnectSheet = mutation({
  args: {
    sourceType: v.optional(v.union(v.literal("google_sheet"), v.literal("csv_upload"))),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);
    const sourceType = args.sourceType ?? "google_sheet";
    const connection = await ctx.db
      .query("sheetConnections")
      .withIndex("by_user_source_type", (q) =>
        q.eq("userId", user._id).eq("sourceType", sourceType),
      )
      .first();

    if (!connection) {
      return null;
    }

    await ctx.db.patch(connection._id, {
      status: "disconnected",
      updatedAt: now(),
    });

    return {
      disconnected: true,
    };
  },
});

export const runSheetImport = action({
  args: {
    sourceType: v.optional(v.union(v.literal("google_sheet"), v.literal("csv_upload"))),
  },
  handler: async (ctx, args): Promise<{
    importedCount: number;
    updatedCount: number;
    skippedCount: number;
  }> => {
    const viewer = (await ctx.runQuery(internal.onboarding.getViewerContext, {})) as ViewerContext;
    const connection = (await ctx.runQuery(internal.googleSheets.getConnectionForImport, {
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
      } else {
        if (!connection.storageId) {
          throw new Error("CSV upload is missing.");
        }

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

      const rows = parseCsv(csvText);
      if (rows.length < 2) {
        throw new Error("The file must contain a header row and at least one data row.");
      }

      const headerRow = rows[0];
      if (!headerRow) {
        throw new Error("The file must contain a header row.");
      }

      const headers = headerRow.map(normalizeImportHeader);
      const requiredHeaders = [
        "date",
        "type",
        "direction",
        "client",
        "amount",
        "currency",
        "status",
      ];

      for (const requiredHeader of requiredHeaders) {
        if (!headers.includes(requiredHeader)) {
          const foundHeaders = headers.filter(Boolean).join(", ") || "none";
          throw new Error(
            `Stage could not find the required column '${requiredHeader}'. Open the Transactions tab template and check the guide. Found columns: ${foundHeaders}.`,
          );
        }
      }

      const clients = (await ctx.runQuery(internal.googleSheets.getClientsForImport, {
        userId: viewer.userId,
      })) as ImportClient[];
      const clientSet = new Set(clients.map((client: ImportClient) => client.name.trim().toLowerCase()));
      const projects = (await ctx.runQuery(internal.googleSheets.getProjectsForImport, {
        userId: viewer.userId,
      })) as ImportProject[];
      const projectMap = new Map<string, Id<"projects">>(
        projects.map((project: ImportProject) => [project.name.trim().toLowerCase(), project.id]),
      );

      const entries: ImportedEntry[] = rows.slice(1).map((row, index): ImportedEntry => {
        const record = Object.fromEntries(
          headers.map((header, headerIndex) => [header, row[headerIndex]?.trim() ?? ""]),
        ) as Record<string, string>;

        const amountValue = record.amount ?? "";
        const dateValue = record.date ?? "";
        const typeValue = record.type ?? "";
        const directionValue = record.direction ?? "";
        const clientValue = record.client ?? "";
        const statusValue = record.status ?? "";
        const currencyValue = record.currency ?? "";
        const externalReferenceValue = record.external_reference ?? "";
        const categoryValue = record.category ?? "";
        const notesValue = record.notes ?? "";
        const projectNameValue = record.project_name ?? "";
        const dueAtValue = record.due_at ?? "";
        const paidAtValue = record.paid_at ?? "";

        const amountCents = parseAmountToCents(amountValue);
        const occurredAt = parseDateToTimestamp(dateValue);
        const entryType = normalizeEntryType(typeValue);
        const direction = normalizeDirection(directionValue);
        const status = normalizeStatus(statusValue);
        const clientKey = clientValue.trim().toLowerCase();
        const projectKey = projectNameValue.trim().toLowerCase();

        if (!clientKey) {
          throw new Error(`Client is required. ${GOOGLE_SHEETS_GUIDE_HINT}`);
        }

        if (!clientSet.has(clientKey)) {
          throw new Error(
            `Client '${clientValue}' was not found in Stage yet. Create the client first, then retry. ${GOOGLE_SHEETS_GUIDE_HINT}`,
          );
        }

        if (projectKey && !projectMap.has(projectKey)) {
          throw new Error(
            `Project '${projectNameValue}' was not found in Stage yet. Create the project first, then retry. ${GOOGLE_SHEETS_GUIDE_HINT}`,
          );
        }

        return {
          sourceRecordId: externalReferenceValue ||
            buildSourceRecordId([
              dateValue,
              typeValue,
              directionValue,
              clientValue,
              amountCents,
              index,
            ]),
          entryType,
          direction,
          status,
          counterpartyName: clientValue,
          amountCents,
          currency: (currencyValue || "USD").toUpperCase(),
          occurredAt,
          dueAt: dueAtValue ? parseDateToTimestamp(dueAtValue) : undefined,
          paidAt: paidAtValue ? parseDateToTimestamp(paidAtValue) : undefined,
          projectId: projectKey ? projectMap.get(projectKey) : undefined,
          notes: [categoryValue, notesValue].filter(Boolean).join(" - ") || undefined,
          rawLabel: typeValue || undefined,
        };
      });

      return ctx.runMutation(internal.googleSheets.applyImportedEntries, {
        userId: viewer.userId,
        sheetConnectionId: connection._id,
        source: connection.sourceType,
        entries,
      });
    } catch (error) {
      await ctx.runMutation(internal.googleSheets.markImportError, {
        userId: viewer.userId,
        sheetConnectionId: connection._id,
        errorSummary: error instanceof Error ? error.message : "Import failed.",
      });
      throw error;
    }
  },
});
