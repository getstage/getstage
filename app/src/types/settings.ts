export type SettingsTab = "general" | "billing" | "integrations" | "portal" | "developer" | "clients" | "account";

export type StripeConnectionSummary = {
  status: "pending" | "active" | "error" | "disconnected";
  displayName: string | null;
  accountEmail: string | null;
  connectedAt: number | null;
  lastSyncedAt: number | null;
  lastSyncError: string | null;
} | null;

export type GoogleSheetSummary = {
  status: "pending" | "active" | "error" | "disconnected";
  sheetUrl: string | null;
  sheetTitle: string | null;
  lastImportedAt: number | null;
  lastImportStatus: "success" | "error" | "running" | null;
  lastImportError: string | null;
} | null;

export type CsvUploadSummary = {
  status: "pending" | "active" | "error" | "disconnected";
  fileName: string | null;
  lastImportedAt: number | null;
  lastImportStatus: "success" | "error" | "running" | null;
  lastImportError: string | null;
} | null;
