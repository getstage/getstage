import type { ProviderStatusRecord } from "@stage/data-ops/contracts";
import type { PaperConnectionStatusResponse } from "@stage/data-ops/contracts";
import type { DesktopOAuthProvider } from "@shared/models/desktop";
import type { IntegrationRowModel } from "@/types/settings/integrations";
import { PROVIDER_CLI_MISSING_ROW_NOTE } from "@/lib/settings/providerCliHints";

export function providerToIntegrationRow(
  provider: ProviderStatusRecord,
  enabled: boolean,
): IntegrationRowModel {
  const ready = provider.installed && provider.authenticated && provider.status === "ready";
  const connected = enabled && ready;

  return {
    id: provider.id,
    providerId: provider.id,
    name: provider.label,
    description: providerDescription(provider),
    icon: provider.id === "claude" ? "claude" : "code",
    connected,
    detail: providerStatusDetail(provider, enabled),
    helpNote: providerCliHelpNote(provider),
    status: provider.status,
  };
}

function providerCliHelpNote(provider: ProviderStatusRecord) {
  if (provider.kind !== "cli" || provider.installed) {
    return undefined;
  }

  return PROVIDER_CLI_MISSING_ROW_NOTE;
}

type NativeConnectionSummary = {
  status: string;
  displayName: string | null;
  workspaceName: string | null;
  accountEmail: string | null;
  accountName: string | null;
  lastError: string | null;
} | null;

type GoogleSheetConnectionSummary = {
  status: string;
  sheetTitle: string | null;
  sheetUrl: string | null;
  lastImportStatus: string | null;
  lastImportError: string | null;
} | null;

const NATIVE_INTEGRATIONS: Record<DesktopOAuthProvider, { label: string; description: string; icon: string }> = {
  mobbin: { label: "Mobbin", description: "Your Mobbin account: real app and web screens for Research UI patterns and moodboards", icon: "mobbin" },
  details: { label: "Details", description: "Your Details account: real website sections for website Research", icon: "document" },
  figma: { label: "Figma", description: "Native design export and handoff", icon: "figma" },
  notion: { label: "Notion", description: "Native document export and review", icon: "document" },
};

export function nativeIntegrationToRow(
  id: DesktopOAuthProvider,
  connection: NativeConnectionSummary,
): IntegrationRowModel {
  const { label, description, icon } = NATIVE_INTEGRATIONS[id];
  return {
    id,
    nativeIntegrationId: id,
    name: label,
    description,
    icon,
    connected: connection?.status === "active",
    detail: nativeConnectionDetail(connection, label),
    status: connection?.status ?? "disconnected",
  };
}

export function googleSheetsIntegrationToRow(
  connection: GoogleSheetConnectionSummary,
): IntegrationRowModel {
  const connected = connection?.status === "active";

  return {
    id: "google-sheets",
    nativeIntegrationId: "google-sheets",
    name: "Google Sheets",
    description: "Import project and onboarding data",
    icon: "sheet",
    connected,
    detail: googleSheetsConnectionDetail(connection),
    status: connection?.status ?? "disconnected",
  };
}

export function paperIntegrationToRow(
  connection: PaperConnectionStatusResponse | null,
  checking: boolean,
): IntegrationRowModel {
  const connected = connection?.ready === true;

  return {
    id: "paper",
    nativeIntegrationId: "paper",
    name: "Paper",
    description: "Local design canvas export",
    icon: "paper",
    connected,
    detail: checking
      ? "Checking local Paper Desktop MCP..."
      : connection?.message ?? "Open Paper Desktop with a target file",
    status: checking ? "checking" : (connection?.status ?? "not-ready"),
  };
}

function providerDescription(provider: ProviderStatusRecord) {
  if (!provider.installed) return provider.setupHint ?? "Provider CLI is not installed";
  if (!provider.authenticated) return provider.setupHint ?? "Provider is not authenticated";
  return "Research, strategy, and generation";
}

function providerStatusDetail(provider: ProviderStatusRecord, enabled: boolean) {
  const ready = provider.installed && provider.authenticated && provider.status === "ready";
  if (ready && !enabled) {
    const parts = [
      provider.version ? `v${provider.version}` : null,
      provider.accountEmail ? `Detected as ${provider.accountEmail}` : "Detected locally",
      "Not connected to Stage",
    ].filter(Boolean);

    return parts.join(" · ");
  }

  if (!provider.installed || !provider.authenticated) {
    return [
      provider.version ? `v${provider.version}` : null,
      provider.accountEmail ? `Authenticated as ${provider.accountEmail}` : null,
    ]
      .filter(Boolean)
      .join(" · ");
  }

  const parts = [
    provider.version ? `v${provider.version}` : null,
    provider.authLabel ? provider.authLabel : null,
    provider.accountEmail ? `Authenticated as ${provider.accountEmail}` : null,
    provider.status !== "ready" ? provider.status.replaceAll("-", " ") : null,
  ].filter(Boolean);

  return parts.join(" · ");
}

function nativeConnectionDetail(
  connection: NativeConnectionSummary,
  fallbackLabel: string,
) {
  if (!connection) return "Not connected";
  if (connection.lastError) return connection.lastError;

  const identity =
    connection.workspaceName ??
    connection.displayName ??
    connection.accountEmail ??
    connection.accountName ??
    fallbackLabel;

  return connection.status === "active"
    ? `Connected as ${identity}`
    : connection.status.replaceAll("_", " ");
}

function googleSheetsConnectionDetail(connection: GoogleSheetConnectionSummary) {
  if (!connection) return "Not connected";
  if (connection.lastImportError) return connection.lastImportError;

  const label = connection.sheetTitle ?? connection.sheetUrl ?? "Google Sheet";
  return connection.status === "active"
    ? `Connected to ${label}`
    : connection.status.replaceAll("_", " ");
}
