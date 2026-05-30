import type { ProviderStatusRecord } from "@stage/data-ops/contracts";
import type { IntegrationRowModel } from "../types/integrations";

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
    status: provider.status,
  };
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

export function nativeIntegrationToRow(
  id: "figma" | "notion",
  connection: NativeConnectionSummary,
): IntegrationRowModel {
  const connected = connection?.status === "active";
  const label = id === "figma" ? "Figma" : "Notion";

  return {
    id,
    nativeIntegrationId: id,
    name: label,
    description:
      id === "figma"
        ? "Native design export and handoff"
        : "Native document export and review",
    icon: id === "figma" ? "figma" : "document",
    connected,
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

function providerDescription(provider: ProviderStatusRecord) {
  if (!provider.installed) return provider.setupHint ?? "Provider CLI is not installed";
  if (!provider.authenticated) return provider.setupHint ?? "Provider is not authenticated";
  return provider.authLabel ?? "Research, strategy, and generation";
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

  const parts = [
    provider.version ? `v${provider.version}` : null,
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
