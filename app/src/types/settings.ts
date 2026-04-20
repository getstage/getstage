export type SettingsTab = "general" | "billing" | "integrations" | "portal" | "developer" | "clients" | "account";

export type ClaudeToolAvailability = "unknown" | "claimed";

export type ClaudeConnectionSummary = {
  id: string;
  provider: "claude";
  client: "claude_code";
  mode: "skill";
  status: "pending" | "connected" | "error" | "disconnected";
  displayName: string;
  source: "onboarding" | "settings";
  stageApiVerified: boolean;
  notionInClaude: ClaudeToolAvailability;
  figmaInClaude: ClaudeToolAvailability;
  connectedAt: number | null;
  lastSeenAt: number | null;
  lastHandshakeAt: number | null;
  lastError: string | null;
} | null;

export type ClaudeToolSummary = {
  availability: ClaudeToolAvailability;
  lastExportAt: number | null;
  lastExportStatus: "requested" | "in_progress" | "completed" | "failed" | null;
  lastExportUrl: string | null;
  destinationLabel: string | null;
  lastError: string | null;
};

export type AnthropicCredentialSummary = {
  provider: "anthropic";
  label: "claude";
  keyLast4: string | null;
  modelPreference: string;
  status: "untested" | "valid" | "invalid";
  testedAt: number | null;
  hasSavedKey: boolean;
};

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

export type NativeIntegrationSummary = {
  id: string;
  provider: "notion" | "figma";
  status: "pending" | "active" | "error" | "disconnected";
  displayName: string | null;
  workspaceName: string | null;
  workspaceIcon: string | null;
  accountEmail: string | null;
  accountName: string | null;
  connectedAt: number | null;
  lastSyncedAt: number | null;
  lastError: string | null;
} | null;
