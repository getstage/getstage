import { useMemo, useState, type ReactNode } from "react";
import {
  useAction as useConvexAction,
  useConvexAuth,
  useMutation as useConvexMutation,
  useQuery as useConvexQuery,
} from "convex/react";
import { useProviderStatus } from "@/hooks/engine/useProviderStatus";
import { useProviderPreferences } from "@/hooks/engine/useProviderPreferences";
import { api } from "@/lib/convex";
import {
  googleSheetsIntegrationToRow,
  nativeIntegrationToRow,
  providerToIntegrationRow,
} from "@/lib/settings/providerIntegrationRows";
import { openExternalLink } from "@/lib/settings/openExternalLink";
import type { IntegrationRowModel } from "@/types/settings/integrations";
import { SettingsIcon } from "./SettingsIcons";

export function IntegrationsPage() {
  const { isAuthenticated } = useConvexAuth();
  const providers = useProviderStatus();
  const providerPreferences = useProviderPreferences();
  const [busyIntegrationId, setBusyIntegrationId] = useState<string | null>(null);

  const nativeConnectionStatus = useConvexQuery(
    api.integrations.contentPlatforms.getNativeConnectionStatus,
    isAuthenticated ? {} : "skip",
  );
  const sheetConnectionStatus = useConvexQuery(
    api.integrations.googleSheets.getSheetConnectionStatus,
    isAuthenticated ? {} : "skip",
  );

  const startOAuthConnect = useConvexAction(
    api.integrations.contentPlatforms.startOAuthConnect,
  );
  const disconnectNativeConnection = useConvexMutation(
    api.integrations.contentPlatforms.disconnectConnection,
  );
  const connectSheet = useConvexMutation(api.integrations.googleSheets.connectSheet);
  const disconnectSheet = useConvexMutation(api.integrations.googleSheets.disconnectSheet);

  const providerRows = useMemo(
    () =>
      (providers.data?.providers ?? []).map((provider) =>
        providerToIntegrationRow(
          provider,
          providerPreferences.isProviderEnabled(provider.id),
        ),
      ),
    [providerPreferences, providers.data?.providers],
  );
  const nativeIntegrationRows = useMemo(
    () => [
      nativeIntegrationToRow("figma", nativeConnectionStatus?.figma ?? null),
      nativeIntegrationToRow("notion", nativeConnectionStatus?.notion ?? null),
      googleSheetsIntegrationToRow(sheetConnectionStatus?.googleSheet ?? null),
    ],
    [
      nativeConnectionStatus?.figma,
      nativeConnectionStatus?.notion,
      sheetConnectionStatus?.googleSheet,
    ],
  );

  const integrationRows = [...providerRows, ...nativeIntegrationRows];
  const connectedIntegrations = integrationRows.filter((integration) => integration.connected);
  const availableIntegrations = integrationRows.filter((integration) => !integration.connected);
  const isRefreshing = providers.isFetching;

  async function handleIntegrationAction(integration: IntegrationRowModel) {
    try {
      setBusyIntegrationId(integration.id);

      if (integration.providerId) {
        if (integration.connected) {
          providerPreferences.setProviderEnabled(integration.providerId, false);
          return;
        }

        providerPreferences.setProviderEnabled(integration.providerId, true);
        return;
      }

      if (integration.nativeIntegrationId === "figma" || integration.nativeIntegrationId === "notion") {
        if (integration.connected) {
          await disconnectNativeConnection({ provider: integration.nativeIntegrationId });
          return;
        }

        const result = await startOAuthConnect({ provider: integration.nativeIntegrationId });
        await openExternalLink(result.url);
        return;
      }

      if (integration.nativeIntegrationId === "google-sheets") {
        if (integration.connected) {
          await disconnectSheet({ sourceType: "google_sheet" });
          return;
        }

        const sheetUrl = window.prompt("Paste your Google Sheets URL");
        if (!sheetUrl) return;
        await connectSheet({ sheetUrl });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Integration action failed.";
      window.alert(message);
    } finally {
      setBusyIntegrationId(null);
    }
  }

  return (
    <div className="relative flex min-h-full flex-1 justify-center overflow-x-hidden bg-white px-[clamp(16px,7vw,100px)] py-[clamp(20px,4vw,44px)]">
      <div className="flex w-full max-w-[674px] flex-col gap-[24px]">
        <header className="flex flex-col gap-[16px] sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-[20px] font-semibold leading-[1.2] text-[#0A0A0A]">
              Integrations
            </h1>
            <p className="mt-[8px] text-[13px] font-medium leading-[1.2] text-[#737373]">
              Manage all your integrations and tool connections here
            </p>
          </div>
          <button
            type="button"
            disabled={isRefreshing}
            onClick={() => void providers.refetch()}
            className="inline-flex h-[32px] items-center justify-center rounded-[6px] bg-[#F5F5F5] px-[12px] text-[12px] font-medium leading-none text-[#171717] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-colors enabled:hover:bg-[#ECECEC] disabled:cursor-wait disabled:text-[#737373]"
          >
            {isRefreshing ? "Checking..." : "Refresh"}
          </button>
        </header>

        <div className="flex flex-col gap-[12px]">
          <IntegrationGroup title="Connected">
            <div className="flex flex-col gap-[16px] rounded-[8px] bg-white p-[clamp(14px,3vw,20px)] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
              {connectedIntegrations.length > 0 ? (
                connectedIntegrations.map((integration) => (
                  <IntegrationListRow
                    key={integration.id}
                    integration={integration}
                    actionLabel={getIntegrationActionLabel(integration)}
                    busy={busyIntegrationId === integration.id}
                    onAction={() => void handleIntegrationAction(integration)}
                  />
                ))
              ) : (
                <p className="text-[12px] leading-none text-[#737373]">
                  No connected integrations yet
                </p>
              )}
            </div>
          </IntegrationGroup>

          <IntegrationGroup title="Available Tools">
            <div className="flex flex-col gap-[16px] rounded-[8px] bg-white p-[clamp(14px,3vw,20px)] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
              {availableIntegrations.length > 0 ? (
                availableIntegrations.map((integration) => (
                  <IntegrationListRow
                    key={integration.id}
                    integration={integration}
                    actionLabel={getIntegrationActionLabel(integration)}
                    busy={isRefreshing || busyIntegrationId === integration.id}
                    onAction={() => void handleIntegrationAction(integration)}
                  />
                ))
              ) : (
                <p className="text-[12px] leading-none text-[#737373]">
                  No unavailable integrations
                </p>
              )}
            </div>
          </IntegrationGroup>
        </div>
      </div>
    </div>
  );
}

function getIntegrationActionLabel(integration: IntegrationRowModel) {
  if (integration.providerId) return integration.connected ? "Disconnect" : "Connect";
  return integration.connected ? "Disconnect" : "Connect";
}

function IntegrationGroup({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[12px] bg-[#F5F5F5] p-[4px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
      <h2 className="px-[12px] pb-[12px] pt-[8px] text-[13px] font-medium leading-[1.5] text-[#0A0A0A]">
        {title}
      </h2>
      {children}
    </section>
  );
}

function IntegrationListRow({
  integration,
  actionLabel,
  busy = false,
  onAction,
}: {
  integration: IntegrationRowModel;
  actionLabel: string;
  busy?: boolean;
  onAction: () => void;
}) {
  return (
    <div className="flex w-full items-start justify-between gap-[12px] rounded-[6px] bg-white text-left">
      <span className="flex min-w-0 items-start gap-[10px]">
        <span className="flex h-[18px] w-[16px] shrink-0 items-center justify-center pt-[1px]">
          <SettingsIcon
            name={integration.icon}
            className="h-[16px] w-[16px]"
          />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[13px] font-medium leading-[1.2] text-[#171717]">
            {integration.name}
          </span>
          <span className="mt-[2px] block text-[12px] font-normal leading-[1.35] text-[#525252]">
            {integration.description}
          </span>
          {integration.detail ? (
            <span className="mt-[4px] block truncate text-[11px] font-normal leading-[1.35] text-[#737373]">
              {integration.detail}
            </span>
          ) : null}
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-[10px]">
        <button
          type="button"
          disabled={busy}
          onClick={onAction}
          className="h-[28px] rounded-[6px] bg-[#F5F5F5] px-[10px] text-[12px] font-medium leading-none text-[#171717] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-colors enabled:hover:bg-[#ECECEC] disabled:cursor-wait disabled:text-[#737373]"
        >
          {busy ? "Working..." : actionLabel}
        </button>
        <IntegrationToggle
          active={integration.connected}
          disabled={busy}
          onToggle={onAction}
          label={getToggleLabel(integration)}
        />
      </span>
    </div>
  );
}

function getToggleLabel(integration: IntegrationRowModel) {
  const action = integration.connected ? "Disconnect" : "Connect";
  return `${action} ${integration.name}`;
}

function IntegrationToggle({
  active,
  disabled,
  label,
  onToggle,
}: {
  active: boolean;
  disabled: boolean;
  label: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      onClick={onToggle}
      className={`mt-[1px] flex h-[16px] w-[30px] shrink-0 items-center rounded-full p-[2px] transition-colors disabled:cursor-wait ${
        active ? "justify-end bg-[#DBD9FC]" : "justify-start bg-[#E5E5E5]"
      }`}
    >
      <span
        className={`h-[12px] w-[12px] rounded-full ${
          active ? "bg-[#221E6C]" : "bg-[#737373]"
        }`}
      />
    </button>
  );
}
