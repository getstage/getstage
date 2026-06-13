import { ArrowRight, Check } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { useAction as useConvexAction, useConvexAuth, useQuery as useConvexQuery } from "convex/react";
import {
  FigmaOnboardingFrame,
  FigmaSection,
  FigmaStepHeader,
} from "@/components/onboarding/OnboardingFigmaPrimitives";
import { useProviderRefresh, useProviderStatus } from "@/hooks/engine/useProviderStatus";
import { useProviderPreferences } from "@/hooks/engine/useProviderPreferences";
import { cn } from "@/lib/utils";
import { api } from "@/lib/convex";
import { openExternalLink } from "@/lib/settings/openExternalLink";
import {
  getProviderCliSetupSteps,
  isProviderCliReady,
  providerCliSetupHeadline,
  providerCliSetupIssue,
  providerLabel,
} from "@/lib/settings/providerCliSetup";
import { PROVIDER_CLI_RESTART_BANNER } from "@/lib/settings/providerCliHints";
import type { ClaudeConnectionSummary } from "@/types/settings";
import type { ProviderId } from "@stage/data-ops/contracts";

const INTEGRATION_ICON_SRC = {
  claude: "/logos/integrations/claude.svg",
  codex: "/logos/integrations/codex.svg",
  figma: "/logos/integrations/figma.svg",
  notion: "/logos/integrations/notion.svg",
};

function ConnectedBadge() {
  return (
    <span className="inline-flex h-8 items-center gap-1.5 rounded-[6px] bg-[#F0FDF4] px-3 text-[12px] font-medium text-[#00A63E]">
      <Check size={16} weight="bold" />
      Connected
    </span>
  );
}

function ConnectButton({ children, onClick }: { children: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-8 cursor-pointer rounded-[6px] bg-[#F5F5F5] px-3 text-[12px] font-medium text-[#525252] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] transition-colors hover:bg-[#EFEFEF]"
    >
      {children}
    </button>
  );
}

function IntegrationRow({
  iconSrc,
  label,
  connected = false,
  actionLabel,
  onAction,
}: {
  iconSrc: string;
  label: string;
  connected?: boolean;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <li className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2">
        <img src={iconSrc} alt="" className="h-4 w-4 shrink-0 object-contain" />
        <span className="truncate text-[13px] font-medium text-[#171717]">{label}</span>
      </div>
      {connected ? <ConnectedBadge /> : actionLabel ? <ConnectButton onClick={onAction}>{actionLabel}</ConnectButton> : null}
    </li>
  );
}

function IntegrationConnectingState({ tool }: { tool: "figma" | "notion" }) {
  const label = tool === "figma" ? "Figma" : "Notion";
  const iconSrc = tool === "figma" ? INTEGRATION_ICON_SRC.figma : INTEGRATION_ICON_SRC.notion;

  return (
    <FigmaOnboardingFrame className="py-[22px]">
      <div className="flex w-full flex-col items-center justify-center py-[22px] text-center">
        <div className="flex flex-col items-center gap-3">
          <img
            src={iconSrc}
            alt=""
            className={cn(tool === "figma" ? "h-7 w-[19px]" : "h-6 w-[23px]", "object-contain")}
          />
          <h3 className="text-[21px] leading-[1.2] font-semibold text-[#0A0A0A]">
            Connecting {label}
          </h3>
        </div>
        <p className="mt-2 text-[13px] leading-[1.5] font-medium text-[#525252]">
          You&apos;ll be redirected to {label} to securely authorize access.
        </p>
      </div>
    </FigmaOnboardingFrame>
  );
}

function ProviderCliOnboardingSetup({
  providerId,
  onBack,
  onConnected,
}: {
  providerId: ProviderId;
  onBack: () => void;
  onConnected: () => void;
}) {
  const providers = useProviderStatus();
  const providerRefresh = useProviderRefresh();
  const providerPreferences = useProviderPreferences();
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);
  const provider = providers.data?.providers.find((entry) => entry.id === providerId);
  const issue = providerCliSetupIssue(provider);
  const ready = isProviderCliReady(provider);
  const steps = getProviderCliSetupSteps(providerId);

  async function copyCommand(command: string) {
    await navigator.clipboard.writeText(command);
    setCopiedCommand(command);
    window.setTimeout(() => setCopiedCommand(null), 2000);
  }

  return (
    <FigmaOnboardingFrame>
      <FigmaStepHeader
        step="claude"
        title={`Set up ${providerLabel(providerId)}`}
        subtitle={providerCliSetupHeadline(providerId, issue)}
        showProgress={false}
      />
      <div className="mt-6 space-y-3">
        <ol className="space-y-3">
          {steps.map((step, index) => (
            <li
              key={step.title}
              className="rounded-[10px] border border-[#EFEFEF] bg-[#FAFAFA] px-3 py-3"
            >
              <p className="text-[13px] font-semibold text-[#171717]">
                {index + 1}. {step.title}
              </p>
              {step.command ? (
                <div className="mt-2 flex items-center justify-between gap-2 rounded-[6px] bg-[#171717] px-3 py-2">
                  <code className="min-w-0 truncate font-mono text-[11px] text-[#FAFAFA]">
                    {step.command}
                  </code>
                  <button
                    type="button"
                    onClick={() => void copyCommand(step.command!)}
                    className="shrink-0 rounded-[5px] bg-[#404040] px-2 py-1 text-[11px] font-medium text-white"
                  >
                    {copiedCommand === step.command ? "Copied" : "Copy"}
                  </button>
                </div>
              ) : null}
              <p className="mt-2 text-[12px] leading-[1.45] text-[#525252]">{step.detail}</p>
            </li>
          ))}
        </ol>

        <p className="rounded-[8px] border border-[#F5E6B8] bg-[#FFFBEB] px-3 py-2 text-[12px] leading-[1.45] text-[#7A5B00]">
          {PROVIDER_CLI_RESTART_BANNER}
        </p>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex h-9 flex-1 items-center justify-center rounded-[6px] bg-[#F5F5F5] px-4 text-[13px] font-medium text-[#525252]"
          >
            Back
          </button>
          <button
            type="button"
            disabled={providers.isFetching || providerRefresh.isPending}
            onClick={() => void providerRefresh.mutateAsync()}
            className="inline-flex h-9 flex-1 items-center justify-center rounded-[6px] bg-[#F5F5F5] px-4 text-[13px] font-medium text-[#171717] disabled:opacity-60"
          >
            {providers.isFetching || providerRefresh.isPending ? "Checking..." : "Refresh"}
          </button>
        </div>

        <button
          type="button"
          disabled={!ready}
          onClick={() => {
            providerPreferences.setProviderEnabled(providerId, true);
            onConnected();
          }}
          className="inline-flex h-9 w-full cursor-pointer items-center justify-center gap-2 rounded-[6px] border border-[rgba(158,153,248,0.75)] bg-gradient-to-b from-[#7B76DF] to-[#463FBA] px-5 text-[13px] font-medium text-white shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Connect {providerLabel(providerId)}
          <ArrowRight size={16} weight="bold" />
        </button>
      </div>
    </FigmaOnboardingFrame>
  );
}

export function FigmaIntegrationConfig({
  claudeConnection,
  onActivate,
}: {
  claudeConnection: ClaudeConnectionSummary;
  onActivate: () => void;
}) {
  const [view, setView] = useState<"list" | "codex" | "claude" | "connecting-figma" | "connecting-notion">("list");
  const { isAuthenticated } = useConvexAuth();
  const providers = useProviderStatus();
  const providerPreferences = useProviderPreferences();
  const nativeConnectionStatus = useConvexQuery(
    api.integrations.contentPlatforms.getNativeConnectionStatus,
    isAuthenticated ? {} : "skip",
  );
  const startOAuthConnect = useConvexAction(
    api.integrations.contentPlatforms.startOAuthConnect,
  );

  const claudeProvider = providers.data?.providers.find((entry) => entry.id === "claude");
  const codexProvider = providers.data?.providers.find((entry) => entry.id === "codex");
  const codexConnected =
    providerPreferences.isProviderEnabled("codex") && isProviderCliReady(codexProvider);
  const claudeConnected =
    (providerPreferences.isProviderEnabled("claude") && isProviderCliReady(claudeProvider)) ||
    (claudeConnection?.status === "connected" && claudeConnection.stageApiVerified);
  const figmaConnected = nativeConnectionStatus?.figma?.status === "active";
  const notionConnected = nativeConnectionStatus?.notion?.status === "active";

  useEffect(() => {
    if (!window.stageDesktop?.integrations?.onOAuthCompleted) return;
    return window.stageDesktop.integrations.onOAuthCompleted((result) => {
      if (!result.ok) {
        window.alert(result.error);
        setView("list");
        return;
      }
      if (result.status === "connected") {
        setView("list");
        return;
      }
      window.alert(`Could not connect ${result.provider}.`);
      setView("list");
    });
  }, []);

  async function showConnecting(tool: "figma" | "notion") {
    setView(tool === "figma" ? "connecting-figma" : "connecting-notion");
    try {
      const returnUrl = await window.stageDesktop.integrations.getOAuthReturnUrl(tool);
      const result = await startOAuthConnect({ provider: tool, returnUrl });
      await openExternalLink(result.url);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : `Could not connect ${tool}.`);
      setView("list");
    }
  }

  if (view === "connecting-figma" || view === "connecting-notion") {
    return (
      <IntegrationConnectingState
        tool={view === "connecting-figma" ? "figma" : "notion"}
      />
    );
  }

  if (view === "codex") {
    return (
      <ProviderCliOnboardingSetup
        providerId="codex"
        onBack={() => setView("list")}
        onConnected={() => setView("list")}
      />
    );
  }

  if (view === "claude") {
    return (
      <ProviderCliOnboardingSetup
        providerId="claude"
        onBack={() => setView("list")}
        onConnected={() => setView("list")}
      />
    );
  }

  return (
    <FigmaOnboardingFrame>
      <FigmaStepHeader
        step="claude"
        title="Configure your integration"
        subtitle="Connect Claude or Codex via Terminal, then Figma and Notion with OAuth."
        showProgress={false}
      />
      <div className="mt-6 space-y-3">
        <FigmaSection label="Select one model">
          <ul className="space-y-4">
            <IntegrationRow
              iconSrc={INTEGRATION_ICON_SRC.codex}
              label="Codex"
              connected={codexConnected}
              actionLabel="Connect Codex"
              onAction={() => setView("codex")}
            />
            <IntegrationRow
              iconSrc={INTEGRATION_ICON_SRC.claude}
              label="Claude"
              connected={claudeConnected}
              actionLabel="Connect Claude"
              onAction={() => setView("claude")}
            />
          </ul>
        </FigmaSection>
        <FigmaSection label="Select tools you want to integrate">
          <ul className="space-y-4">
            <IntegrationRow
              iconSrc={INTEGRATION_ICON_SRC.figma}
              label="Figma"
              connected={figmaConnected}
              actionLabel="Connect Figma"
              onAction={() => void showConnecting("figma")}
            />
            <IntegrationRow
              iconSrc={INTEGRATION_ICON_SRC.notion}
              label="Notion"
              connected={notionConnected}
              actionLabel="Connect Notion"
              onAction={() => void showConnecting("notion")}
            />
          </ul>
        </FigmaSection>
        <button
          type="button"
          onClick={onActivate}
          className="inline-flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-[6px] border border-[rgba(158,153,248,0.75)] bg-gradient-to-b from-[#7B76DF] to-[#463FBA] px-5 text-[13px] font-medium text-white shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] transition-opacity hover:opacity-95 focus:outline-none"
        >
          Get Started
          <ArrowRight size={16} weight="bold" />
        </button>
      </div>
    </FigmaOnboardingFrame>
  );
}
