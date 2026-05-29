import { ArrowRight, Check } from "@phosphor-icons/react";
import { useState } from "react";
import {
  FigmaOnboardingFrame,
  FigmaSection,
  FigmaStepHeader,
} from "@/components/onboarding/OnboardingFigmaPrimitives";
import { cn } from "@/lib/utils";
import type { ClaudeConnectionSummary } from "@/types/settings";

const ONBOARDING_ICON_SRC = {
  copy: "/logos/copy.svg",
};

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

function IntegrationSetupState({
  provider,
  apiKey,
  onGenerateKey,
  onActivate,
}: {
  provider: "codex" | "claude";
  apiKey: string;
  onGenerateKey: () => void;
  onActivate: () => void;
}) {
  const isClaude = provider === "claude";
  const providerLabel = isClaude ? "Claude" : "Codex";
  const maskedKey = "*******************";
  const displayKey = apiKey || maskedKey;
  const setupText = `# ${providerLabel} Configuration

API_KEY=${apiKey || "[Your API key here]"}

You are an expert product engineer working on a modern SaaS application.

- Write clean, production-ready code
- Maintain consistent structure and naming
- Optimize for readability and scalability
- Avoid breaking existing functionality

UI Guidelines:
- Use modern, minimal design patterns
- Ensure spacing, hierarchy, and responsiveness

Always return complete, usable code.`;

  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedSetup, setCopiedSetup] = useState(false);

  function handleCopy(text: string, type: "key" | "setup") {
    void navigator.clipboard.writeText(text);
    if (type === "key") {
      setCopiedKey(true);
      window.setTimeout(() => setCopiedKey(false), 2000);
    } else {
      setCopiedSetup(true);
      window.setTimeout(() => setCopiedSetup(false), 2000);
    }
  }

  return (
    <FigmaOnboardingFrame>
      <FigmaStepHeader
        step="claude"
        title={`Set up ${providerLabel}`}
        subtitle={
          isClaude
            ? "Connect Claude to power conversations, reasoning, and content generation in your workspace."
            : "Give Stage access to generate, update, and manage your code seamlessly."
        }
        showProgress={false}
      />
      <div className="mt-6 space-y-3">
        <div className="rounded-[12px] bg-[#F5F5F5] p-1 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
          <div className="rounded-[8px] bg-white p-3 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <img
                  src={isClaude ? INTEGRATION_ICON_SRC.claude : INTEGRATION_ICON_SRC.codex}
                  alt=""
                  className="h-4 w-4 object-contain"
                />
                <span className="text-[13px] font-medium text-[#171717]">{providerLabel}</span>
              </div>
              <span className="flex h-4 w-[30px] items-center justify-end rounded-full bg-[#DBD9FC] p-0.5">
                <span className="h-3 w-3 rounded-full bg-[#221E6C]" />
              </span>
            </div>
          </div>

          <div className="mt-1 rounded-[8px] bg-white p-3 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
            <p className="text-[13px] font-medium text-[#171717]">API Key</p>
            <div className="mt-2 flex h-[31px] items-center justify-between gap-3 rounded-[6px] bg-[#F5F5F5] py-1 pl-3 pr-1 text-[12px] font-medium text-[#525252] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
              <span className="min-w-0 truncate">{displayKey}</span>
              {apiKey ? (
                <button
                  type="button"
                  onClick={() => handleCopy(apiKey, "key")}
                  className={cn(
                    "grid h-[18px] w-[18px] shrink-0 cursor-pointer place-items-center rounded-[4px] transition-colors",
                    copiedKey ? "bg-green-50" : "hover:bg-white",
                  )}
                  aria-label={`Copy ${providerLabel} API key`}
                >
                  {copiedKey ? (
                    <Check size={12} weight="bold" className="text-green-600" />
                  ) : (
                    <img src={ONBOARDING_ICON_SRC.copy} alt="" className="h-[18px] w-[18px]" />
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onGenerateKey}
                  className="h-[23px] shrink-0 cursor-pointer rounded-[6px] border border-[#525252] bg-gradient-to-b from-[#404040] to-[#0A0A0A] px-2.5 text-[12px] font-medium text-[#FAFAFA] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]"
                >
                  Generate Key
                </button>
              )}
            </div>
          </div>

          <div className="mt-1 rounded-[8px] bg-white p-3 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
            <p className="text-[13px] font-medium text-[#171717]">Auto-generated Setup</p>
            <div className="mt-2 flex h-[308px] items-start gap-3 overflow-y-auto rounded-[6px] bg-[#F5F5F5] py-2.5 pl-3 pr-1 shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
              <pre className="min-w-0 flex-1 whitespace-pre-wrap text-[12px] leading-[1.5] font-medium text-[#525252]">
                {setupText}
              </pre>
              {apiKey ? (
                <button
                  type="button"
                  onClick={() => handleCopy(setupText, "setup")}
                  className={cn(
                    "sticky top-0 grid h-[18px] w-[18px] shrink-0 cursor-pointer place-items-center rounded-[4px] transition-colors",
                    copiedSetup ? "bg-green-50" : "hover:bg-white",
                  )}
                  aria-label={`Copy ${providerLabel} setup`}
                >
                  {copiedSetup ? (
                    <Check size={12} weight="bold" className="text-green-600" />
                  ) : (
                    <img src={ONBOARDING_ICON_SRC.copy} alt="" className="h-[18px] w-[18px]" />
                  )}
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onActivate}
          disabled={!apiKey}
          className="inline-flex h-9 w-full cursor-pointer items-center justify-center gap-2 rounded-[6px] border border-[rgba(158,153,248,0.75)] bg-gradient-to-b from-[#7B76DF] to-[#463FBA] px-5 text-[13px] font-medium text-white opacity-50 shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:hover:opacity-50 enabled:opacity-100 focus:outline-none"
        >
          Activate {providerLabel}
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
  const [codexKey, setCodexKey] = useState("");
  const [claudeKey, setClaudeKey] = useState("");
  const [connectedTools, setConnectedTools] = useState({
    codex: false,
    figma: false,
    notion: false,
  });
  const codexConnected = connectedTools.codex;
  const figmaConnected = connectedTools.figma;
  const notionConnected = connectedTools.notion;
  const claudeConnected =
    Boolean(claudeKey) ||
    (claudeConnection?.status === "connected" && claudeConnection.stageApiVerified);

  function generateKey(kind: "codex" | "claude") {
    const nextKey = kind === "codex" ? "sk_live_x7f3k92hdk28s9dk3h" : "sk_live_x7f3k92hdk28s9dk3h";
    if (kind === "codex") {
      setCodexKey(nextKey);
      return;
    }
    setClaudeKey(nextKey);
  }

  function showConnecting(tool: "figma" | "notion") {
    setView(tool === "figma" ? "connecting-figma" : "connecting-notion");
    window.setTimeout(() => {
      setConnectedTools((current) => ({ ...current, [tool]: true }));
      setView("list");
    }, 900);
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
      <IntegrationSetupState
        provider="codex"
        apiKey={codexKey}
        onGenerateKey={() => generateKey("codex")}
        onActivate={() => {
          setConnectedTools((current) => ({ ...current, codex: true }));
          setView("list");
        }}
      />
    );
  }

  if (view === "claude") {
    return (
      <IntegrationSetupState
        provider="claude"
        apiKey={claudeKey}
        onGenerateKey={() => generateKey("claude")}
        onActivate={() => setView("list")}
      />
    );
  }

  return (
    <FigmaOnboardingFrame>
      <FigmaStepHeader
        step="claude"
        title="Configure your integration"
        subtitle="Connect your tools to sync files, tasks, and updates"
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
              onAction={() => showConnecting("figma")}
            />
            <IntegrationRow
              iconSrc={INTEGRATION_ICON_SRC.notion}
              label="Notion"
              connected={notionConnected}
              actionLabel="Connect Notion"
              onAction={() => showConnecting("notion")}
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
