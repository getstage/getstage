import { useMemo, type ReactNode } from "react";
import { useProviderStatus, useProviderUpdate } from "@/hooks/engine/useProviderStatus";
import { providerToIntegrationRow } from "../helpers/providerIntegrationRows";
import type { IntegrationRowModel } from "../types/integrations";
import { SettingsIcon } from "./SettingsIcons";

export function IntegrationsPage() {
  const providers = useProviderStatus();
  const providerUpdate = useProviderUpdate();
  const providerRows = useMemo(
    () => (providers.data?.providers ?? []).map(providerToIntegrationRow),
    [providers.data?.providers],
  );
  const connectedIntegrations = providerRows.filter((integration) => integration.connected);
  const availableIntegrations = providerRows.filter((integration) => !integration.connected);
  const isRefreshing = providers.isFetching && !providerUpdate.isPending;

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
                    actionLabel="Update"
                    busy={
                      providerUpdate.isPending &&
                      providerUpdate.variables === integration.providerId
                    }
                    onAction={() => providerUpdate.mutate(integration.providerId)}
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
                    actionLabel="Refresh"
                    busy={isRefreshing}
                    onAction={() => void providers.refetch()}
                  />
                ))
              ) : (
                <p className="text-[12px] leading-none text-[#737373]">
                  No unavailable providers
                </p>
              )}
            </div>
          </IntegrationGroup>
        </div>
      </div>
    </div>
  );
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
        <IntegrationToggle active={integration.connected} />
      </span>
    </div>
  );
}

function IntegrationToggle({ active }: { active: boolean }) {
  return (
    <span
      className={`mt-[1px] flex h-[16px] w-[30px] shrink-0 items-center rounded-full p-[2px] ${
        active ? "justify-end bg-[#DBD9FC]" : "justify-start bg-[#E5E5E5]"
      }`}
    >
      <span
        className={`h-[12px] w-[12px] rounded-full ${
          active ? "bg-[#221E6C]" : "bg-[#737373]"
        }`}
      />
    </span>
  );
}
