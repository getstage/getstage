import { v } from "convex/values";
import type { Id } from "../../_generated/dataModel";

export const GOOGLE_SHEETS_GUIDE_HINT =
  "Please check the Google Sheets guide and use the Transactions tab template.";

export type SheetSourceType = "google_sheet" | "csv_upload";

export type ViewerContext = {
  userId: Id<"users">;
};

export type SheetConnectionRecord = {
  _id: Id<"sheetConnections">;
  sourceType: SheetSourceType;
  sheetId?: string;
  sheetUrl?: string;
  storageId?: Id<"_storage">;
  r2ObjectKey?: string;
};

export type ImportProject = {
  id: Id<"projects">;
  name: string;
};

export type ImportClient = {
  name: string;
};

export type FinanceEntryType =
  | "invoice"
  | "payment"
  | "expense"
  | "refund"
  | "adjustment";
export type FinanceDirection = "incoming" | "outgoing";
export type FinanceStatus = "draft" | "pending" | "paid" | "overdue" | "failed";

export type ImportedEntry = {
  sourceRecordId: string;
  entryType: FinanceEntryType;
  direction: FinanceDirection;
  status: FinanceStatus;
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

export const financeEntryValidator = v.object({
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

const sheetConnectionSummaryValidator = v.union(
  v.object({
    id: v.id("sheetConnections"),
    status: v.string(),
    sheetUrl: v.union(v.string(), v.null()),
    sheetTitle: v.union(v.string(), v.null()),
    lastImportedAt: v.union(v.number(), v.null()),
    lastImportStatus: v.union(v.string(), v.null()),
    lastImportError: v.union(v.string(), v.null()),
  }),
  v.null(),
);

const csvConnectionSummaryValidator = v.union(
  v.object({
    id: v.id("sheetConnections"),
    status: v.string(),
    fileName: v.union(v.string(), v.null()),
    lastImportedAt: v.union(v.number(), v.null()),
    lastImportStatus: v.union(v.string(), v.null()),
    lastImportError: v.union(v.string(), v.null()),
  }),
  v.null(),
);

export const getSheetConnectionStatusReturns = v.object({
  googleSheet: sheetConnectionSummaryValidator,
  csvUpload: csvConnectionSummaryValidator,
});
