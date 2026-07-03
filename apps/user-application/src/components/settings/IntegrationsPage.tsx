import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  useAction as useConvexAction,
  useConvexAuth,
  useMutation as useConvexMutation,
  useQuery as useConvexQuery,
} from "convex/react";
import { useProviderRefresh, useProviderStatus } from "@/hooks/engine/useProviderStatus";
import {
  getChatModelById,
  reasoningEfforts,
  responseSpeeds,
  useChatDefaults,
} from "@/hooks/engine/useChatDefaults";
import { useProviderPreferences } from "@/hooks/engine/useProviderPreferences";
import { api } from "@/lib/convex";
import {
  hasMissingProviderCli,
  PROVIDER_CLI_RESTART_BANNER,
} from "@/lib/settings/providerCliHints";
import type { ProviderId } from "@stage/data-ops/contracts";
import {
  googleSheetsIntegrationToRow,
  nativeIntegrationToRow,
  paperIntegrationToRow,
  providerToIntegrationRow,
} from "@/lib/settings/providerIntegrationRows";
import { isProviderCliReady } from "@/lib/settings/providerCliSetup";
import { openExternalLink } from "@/lib/settings/openExternalLink";
import type { IntegrationRowModel } from "@/types/settings/integrations";
import type { PaperConnectionStatusResponse } from "@stage/data-ops/contracts";
import { SetupStepsDialog } from "@/components/ui/SetupStepsDialog";
import { ProviderCliSetupDialog } from "./ProviderCliSetupDialog";
import { ProviderUpdatesBanner } from "./ProviderUpdatesBanner";
import { SettingsIcon } from "./SettingsIcons";

export function IntegrationsPage() {
  const { isAuthenticated } = useConvexAuth();
  const providers = useProviderStatus();
  const providerRefresh = useProviderRefresh();
  const providerPreferences = useProviderPreferences();
  const chatDefaults = useChatDefaults();
  const [busyIntegrationId, setBusyIntegrationId] = useState<string | null>(null);
  const [setupDialogProviderId, setSetupDialogProviderId] = useState<ProviderId | null>(null);
  const [aiDefaultsOpen, setAiDefaultsOpen] = useState(false);
  const [figmaSetupOpen, setFigmaSetupOpen] = useState(false);
  const [paperSetupMessage, setPaperSetupMessage] = useState<string | null>(null);
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const [paperStatus, setPaperStatus] = useState<PaperConnectionStatusResponse | null>(null);
  const [paperStatusPending, setPaperStatusPending] = useState(false);
  const modelMenuRef = useRef<HTMLDivElement>(null);

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
      providers.providerList.providers.map((provider) =>
        providerToIntegrationRow(
          provider,
          providerPreferences.isProviderEnabled(provider.id),
        ),
      ),
    [providerPreferences, providers.providerList.providers],
  );
  const nativeIntegrationRows = useMemo(
    () => [
      nativeIntegrationToRow("figma", nativeConnectionStatus?.figma ?? null),
      nativeIntegrationToRow("notion", nativeConnectionStatus?.notion ?? null),
      paperIntegrationToRow(paperStatus, paperStatusPending),
      googleSheetsIntegrationToRow(sheetConnectionStatus?.googleSheet ?? null),
    ],
    [
      nativeConnectionStatus?.figma,
      nativeConnectionStatus?.notion,
      paperStatus,
      paperStatusPending,
      sheetConnectionStatus?.googleSheet,
    ],
  );

  const integrationRows = [...providerRows, ...nativeIntegrationRows];
  const connectedIntegrations = integrationRows.filter((integration) => integration.connected);
  const availableIntegrations = integrationRows.filter((integration) => !integration.connected);
  const showProviderCliRestartHint = hasMissingProviderCli(providers.providerList.providers);
  const isRefreshing = providerRefresh.isPending || paperStatusPending;
  const selectedDefaultModel = chatDefaults.selectedModel;

  async function refreshPaperStatus(showSetupOnFailure = false) {
    if (!window.stageDesktop?.engine?.getPaperStatus) return;

    setPaperStatusPending(true);
    try {
      const status = await window.stageDesktop.engine.getPaperStatus();
      setPaperStatus(status);
      if (showSetupOnFailure && !status.ready) {
        setPaperSetupMessage(status.message);
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Could not check Paper Desktop.";
      setPaperStatus({
        apiVersion: "v1",
        ready: false,
        status: "not-ready",
        message,
      });
      if (showSetupOnFailure) {
        setPaperSetupMessage(message);
      }
    } finally {
      setPaperStatusPending(false);
    }
  }

  async function refreshIntegrations() {
    await Promise.all([providerRefresh.mutateAsync(), refreshPaperStatus()]);
  }

  useEffect(() => {
    if (!modelMenuOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (event.target instanceof Node && modelMenuRef.current?.contains(event.target)) {
        return;
      }

      setModelMenuOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setModelMenuOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [modelMenuOpen]);

  useEffect(() => {
    void refreshPaperStatus();
  }, []);

  useEffect(() => {
    if (!window.stageDesktop?.integrations?.onOAuthCompleted) {
      return;
    }

    return window.stageDesktop.integrations.onOAuthCompleted((result) => {
      if (!result.ok) {
        window.alert(result.error);
        return;
      }

      if (result.status === "error") {
        window.alert(`Could not connect ${result.provider === "figma" ? "Figma" : "Notion"}.`);
        return;
      }

      if (result.provider === "figma") {
        setFigmaSetupOpen(true);
      }
    });
  }, []);

  async function handleIntegrationAction(integration: IntegrationRowModel) {
    try {
      setBusyIntegrationId(integration.id);

      if (integration.providerId) {
        if (integration.connected) {
          providerPreferences.setProviderEnabled(integration.providerId, false);
          return;
        }

        if (integration.status === "checking" || integration.status === "error") {
          await providerRefresh.mutateAsync();
          return;
        }

        const provider = providers.providerList.providers.find(
          (entry) => entry.id === integration.providerId,
        );
        if (!isProviderCliReady(provider)) {
          setSetupDialogProviderId(integration.providerId);
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

        const returnUrl = await window.stageDesktop.integrations.getOAuthReturnUrl(
          integration.nativeIntegrationId,
        );
        const result = await startOAuthConnect({
          provider: integration.nativeIntegrationId,
          returnUrl,
        });
        await openExternalLink(result.url);
        return;
      }

      if (integration.nativeIntegrationId === "paper") {
        await refreshPaperStatus(true);
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
            onClick={() => void refreshIntegrations()}
            className="inline-flex h-[32px] items-center justify-center rounded-[6px] bg-[#F5F5F5] px-[12px] text-[12px] font-medium leading-none text-[#171717] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-colors enabled:hover:bg-[#ECECEC] disabled:cursor-wait disabled:text-[#737373]"
          >
            {isRefreshing ? "Checking..." : "Refresh"}
          </button>
        </header>

        <ProviderUpdatesBanner />

        <IntegrationGroup title="AI defaults">
          <div className="rounded-[8px] bg-white shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
            <button
              type="button"
              onClick={() => setAiDefaultsOpen((open) => !open)}
              aria-expanded={aiDefaultsOpen}
              className="flex w-full items-center justify-between gap-[16px] px-[clamp(14px,3vw,20px)] py-[16px] text-left"
            >
              <span className="min-w-0">
                <span className="block text-[13px] font-medium leading-[1.2] text-[#171717]">
                  Set default AI settings
                </span>
                <span className="mt-[3px] block truncate text-[12px] font-normal leading-[1.35] text-[#525252]">
                  {selectedDefaultModel.label} · {getOptionLabel(responseSpeeds, chatDefaults.defaults.responseSpeed)} · {getOptionLabel(reasoningEfforts, chatDefaults.defaults.reasoningEffort)}
                </span>
              </span>
              <ChevronIcon open={aiDefaultsOpen} />
            </button>

            {aiDefaultsOpen ? (
              <div className="border-t border-[#EFEFEF] px-[clamp(14px,3vw,20px)] py-[16px]">
                <div className="grid gap-[14px]">
                  <CustomModelSelect
                    open={modelMenuOpen}
                    menuRef={modelMenuRef}
                    selectedModel={selectedDefaultModel}
                    availableModels={chatDefaults.availableModels}
                    onOpenChange={setModelMenuOpen}
                    onSelect={(modelId) => {
                      chatDefaults.setDefaults({ modelId });
                      setModelMenuOpen(false);
                    }}
                  />

                  <div className="grid gap-[12px] sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
                    <DefaultSegmentedControl
                      label="Mode"
                      options={responseSpeeds}
                      value={chatDefaults.defaults.responseSpeed}
                      defaultValue="default"
                      onChange={(value) => chatDefaults.setDefaults({ responseSpeed: value })}
                    />
                    <DefaultSegmentedControl
                      label="Effort"
                      options={reasoningEfforts}
                      value={chatDefaults.defaults.reasoningEffort}
                      defaultValue="medium"
                      onChange={(value) => chatDefaults.setDefaults({ reasoningEffort: value })}
                    />
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </IntegrationGroup>

        {showProviderCliRestartHint ? (
          <ProviderCliRestartBanner message={PROVIDER_CLI_RESTART_BANNER} />
        ) : null}

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
                    onHelp={
                      integration.nativeIntegrationId === "figma"
                        ? () => setFigmaSetupOpen(true)
                        : undefined
                    }
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
                    onHelp={
                      integration.nativeIntegrationId === "figma"
                        ? () => setFigmaSetupOpen(true)
                        : undefined
                    }
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

      {setupDialogProviderId ? (
        <ProviderCliSetupDialog
          providerId={setupDialogProviderId}
          provider={providers.providerList.providers.find((entry) => entry.id === setupDialogProviderId)}
          isRefreshing={isRefreshing}
          onClose={() => setSetupDialogProviderId(null)}
          onRefresh={() => void providerRefresh.mutateAsync()}
          onConnect={() => {
            providerPreferences.setProviderEnabled(setupDialogProviderId, true);
            setSetupDialogProviderId(null);
          }}
        />
      ) : null}

      <FigmaExporterSetupDialog
        open={figmaSetupOpen}
        onOpenChange={setFigmaSetupOpen}
      />

      <PaperSetupDialog
        open={paperSetupMessage !== null}
        message={paperSetupMessage}
        onOpenChange={(open) => {
          if (!open) setPaperSetupMessage(null);
        }}
      />
    </div>
  );
}

function FigmaExporterSetupDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const steps = [
    "Download the Stage Exporter plugin zip file.",
    "Extract the zip — it contains manifest.json and a dist folder. Keep them together.",
    "In Figma Desktop, open the Figma menu, then Plugins → Development → Import plugin from manifest.",
    "Select the manifest.json from the extracted folder (not from Downloads directly).",
    "When you export from Stage, run Stage Exporter in Figma and enter the pairing code.",
  ];

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[rgba(10,10,10,0.22)]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[calc(100svh-32px)] w-[calc(100vw-32px)] max-w-[640px] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[12px] bg-[#F5F5F5] p-1 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25),0_18px_55px_rgba(10,10,10,0.22)] outline-none">
          <div className="p-3">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] bg-white shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
                <img
                  src="/logos/integrations/figma.svg"
                  alt=""
                  aria-hidden="true"
                  className="h-5 w-[14px]"
                />
              </span>
              <div className="min-w-0">
                <Dialog.Title className="text-[15px] font-medium leading-[1.25] text-[#0A0A0A]">
                  Set up Stage Exporter for Figma
                </Dialog.Title>
                <Dialog.Description className="mt-1 text-[13px] font-medium leading-[1.45] text-[#525252]">
                  Install the plugin once in Figma Desktop, then use the pairing code shown during export.
                </Dialog.Description>
              </div>
            </div>
          </div>

          <div className="grid gap-4 rounded-[8px] bg-white p-3 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] sm:grid-cols-[minmax(0,0.95fr)_minmax(240px,1.05fr)]">
            <ol className="grid content-start gap-3">
              {steps.map((step, index) => (
                <li key={step} className="grid grid-cols-[24px_minmax(0,1fr)] gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#F5F5F5] text-[12px] font-semibold leading-none text-[#171717]">
                    {index + 1}
                  </span>
                  <span className="pt-[3px] text-[13px] font-medium leading-[1.45] text-[#404040]">
                    {step}
                  </span>
                </li>
              ))}
            </ol>

            <img
              src="/images/integrations/figma-integration.webp"
              alt="Figma menu showing Plugins, Development, and Import plugin from manifest"
              className="aspect-[1.36] w-full rounded-[8px] border border-[#E5E5E5] object-cover"
            />
          </div>

          <div className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
            <a
              href="/stage-exporter-0.2.7.zip"
              download="stage-exporter-0.2.7.zip"
              className="inline-flex h-[34px] items-center justify-center rounded-[6px] bg-[#171717] px-3 text-[13px] font-medium leading-none text-white shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] transition-colors hover:bg-[#2A2A2A]"
            >
              Download plugin (.zip)
            </a>
            <Dialog.Close asChild>
              <button
                type="button"
                className="inline-flex h-[34px] items-center justify-center rounded-[6px] bg-white px-3 text-[13px] font-medium leading-none text-[#525252] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] transition-colors hover:bg-[#FAFAFA]"
              >
                Done
              </button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function PaperSetupDialog({
  open,
  message,
  onOpenChange,
}: {
  open: boolean;
  message: string | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <SetupStepsDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Connect Paper Desktop first"
      description="First, please install the app and log in. Stage exports into the Paper file you have open."
      steps={[
        "Install Paper Desktop.",
        "Log in to the Paper account you want to export into.",
        "Open the target Paper file, then come back to Stage and refresh.",
      ]}
      note={message}
    />
  );
}

function ProviderCliRestartBanner({ message }: { message: string }) {
  return (
    <div
      role="status"
      className="rounded-[8px] border border-[#F5E6B8] bg-[#FFFBEB] px-[clamp(14px,3vw,20px)] py-[12px] text-[12px] font-medium leading-[1.45] text-[#7A5B00]"
    >
      {message}
    </div>
  );
}

function getIntegrationActionLabel(integration: IntegrationRowModel) {
  if (integration.providerId) {
    if (integration.connected) return "Disconnect";
    if (integration.status === "checking" || integration.status === "error") return "Refresh";
    if (integration.status !== "ready") return "Set up";
    return "Connect";
  }
  if (integration.nativeIntegrationId === "paper") return "Refresh";
  return integration.connected ? "Disconnect" : "Connect";
}

function getOptionLabel<TValue extends string>(
  options: Array<{ id: TValue; label: string }>,
  value: TValue,
) {
  return options.find((option) => option.id === value)?.label ?? value;
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <span
      className={`flex h-[20px] w-[20px] shrink-0 items-center justify-center text-[#737373] transition-transform ${
        open ? "rotate-180" : ""
      }`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 16 16" fill="none" className="h-[14px] w-[14px]">
        <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

function CustomModelSelect({
  open,
  menuRef,
  selectedModel,
  availableModels,
  onOpenChange,
  onSelect,
}: {
  open: boolean;
  menuRef: React.RefObject<HTMLDivElement | null>;
  selectedModel: ReturnType<typeof getChatModelById>;
  availableModels: ReturnType<typeof getChatModelById>[];
  onOpenChange: (open: boolean) => void;
  onSelect: (modelId: string) => void;
}) {
  const groupedModels = [
    {
      label: "Claude",
      models: availableModels.filter((model) => model.provider === "anthropic"),
    },
    {
      label: "OpenAI",
      models: availableModels.filter((model) => model.provider === "openai"),
    },
  ];

  return (
    <div className="relative min-w-0" ref={menuRef}>
      <span className="mb-[6px] block text-[11px] font-medium leading-none text-[#737373]">
        Default model
      </span>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => onOpenChange(!open)}
        className="flex h-[32px] w-full items-center justify-between gap-[10px] rounded-[6px] border border-[#E5E5E5] bg-[#F5F5F5] px-[10px] text-left text-[12px] font-medium leading-none text-[#171717] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.18)] transition-colors hover:bg-[#ECECEC]"
      >
        <span className="flex min-w-0 items-center gap-[7px]">
          <ProviderMark provider={getAiProviderMark(selectedModel.provider)} />
          <span className="truncate">{selectedModel.label}</span>
        </span>
        <ChevronIcon open={open} />
      </button>

      {open ? (
        <div className="absolute left-0 top-[calc(100%+6px)] z-50 w-full min-w-[320px] rounded-[8px] border border-[#E5E5E5] bg-white p-[5px] shadow-[0_14px_36px_rgba(10,10,10,0.13)]">
          {groupedModels.map((group) => (
            <div key={group.label} className="py-[3px]">
              <p className="px-[8px] pb-[4px] text-[11px] font-medium leading-none text-[#737373]">
                {group.label}
              </p>
              <div className="grid gap-[2px]">
                {group.models.map((model) => {
                  const selected = selectedModel.id === model.id;

                  return (
                    <button
                      key={model.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => onSelect(model.id)}
                      className={`grid min-h-[42px] grid-cols-[18px_minmax(0,1fr)] items-center gap-[8px] rounded-[6px] px-[8px] text-left transition-colors ${
                        selected ? "bg-[#F5F5F5]" : "hover:bg-[#FAFAFA]"
                      }`}
                    >
                      <span className="flex h-[18px] w-[18px] items-center justify-center text-[13px] font-semibold text-[#525252]">
                        {selected ? "✓" : ""}
                      </span>
                      <span className="flex min-w-0 items-center gap-[8px]">
                        <ProviderMark provider={getAiProviderMark(model.provider)} />
                        <span className="min-w-0">
                        <span className="flex min-w-0 items-center gap-[6px]">
                          <span className="truncate text-[12px] font-medium leading-[1.2] text-[#171717]">
                            {model.label}
                          </span>
                          {model.badge ? (
                            <span className="shrink-0 rounded-[5px] bg-[#EFEFEF] px-[5px] py-[2px] text-[10px] font-bold leading-none text-[#606060]">
                              {model.badge}
                            </span>
                          ) : null}
                        </span>
                        <span className="mt-[3px] block truncate text-[11px] font-normal leading-[1.2] text-[#737373]">
                          {model.description}
                        </span>
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function getAiProviderMark(provider: string): "openai" | "anthropic" {
  return provider === "anthropic" ? "anthropic" : "openai";
}

function ProviderMark({ provider }: { provider: "openai" | "anthropic" }) {
  return (
    <img
      className="h-[14px] w-[14px] shrink-0 object-contain"
      src={`/logos/integrations/${provider === "anthropic" ? "claude" : "openai"}.svg`}
      alt=""
      aria-hidden="true"
    />
  );
}

function DefaultSegmentedControl<TValue extends string>({
  label,
  options,
  value,
  defaultValue,
  onChange,
}: {
  label: string;
  options: Array<{ id: TValue; label: string }>;
  value: TValue;
  defaultValue: TValue;
  onChange: (value: TValue) => void;
}) {
  return (
    <fieldset className="min-w-0">
      <legend className="mb-[6px] text-[11px] font-medium leading-none text-[#737373]">
        {label}
      </legend>
      <div className="grid gap-[3px] rounded-[6px] bg-[#F5F5F5] p-[3px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.18)]" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
        {options.map((option) => {
          const selected = value === option.id;

          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(option.id)}
              className={`min-h-[26px] min-w-0 truncate rounded-[5px] px-[8px] text-[12px] font-medium leading-none transition-colors ${
                selected
                  ? "bg-white text-[#171717] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.18)]"
                  : "text-[#525252] hover:bg-[#ECECEC]"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </fieldset>
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
  onHelp,
}: {
  integration: IntegrationRowModel;
  actionLabel: string;
  busy?: boolean;
  onAction: () => void;
  onHelp?: () => void;
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
          <span className="flex items-center gap-[6px]">
            <span className="truncate text-[13px] font-medium leading-[1.2] text-[#171717]">
              {integration.name}
            </span>
            {onHelp ? (
              <button
                type="button"
                aria-label={`How to use ${integration.name}`}
                onClick={onHelp}
                className="flex h-[16px] w-[16px] shrink-0 items-center justify-center rounded-full bg-[#F5F5F5] text-[11px] font-medium leading-none text-[#737373] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-colors hover:bg-[#ECECEC] hover:text-[#171717]"
              >
                i
              </button>
            ) : null}
          </span>
          <span className="mt-[2px] block text-[12px] font-normal leading-[1.35] text-[#525252]">
            {integration.description}
          </span>
          {integration.detail ? (
            <span className="mt-[4px] block truncate text-[11px] font-normal leading-[1.35] text-[#737373]">
              {integration.detail}
            </span>
          ) : null}
          {integration.helpNote ? (
            <span className="mt-[4px] block text-[11px] font-medium leading-[1.4] text-[#9A6700]">
              {integration.helpNote}
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
