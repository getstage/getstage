import * as Dialog from "@radix-ui/react-dialog";
import { useState } from "react";
import { ArrowRight, Check, CopySimple, X } from "@phosphor-icons/react";
import googleSheetsIcon from "@/assets/icons/google-sheets.svg";
import stripeIcon from "@/assets/icons/stripe.svg";
import { FeedbackText } from "@/components/settings/FeedbackText";
import { STAGE_API_BASE_URL } from "@/features/settings/useIntegrationsSettings";
import type { SaveFeedback } from "@/hooks/useFeedback";
import type {
  AnthropicCredentialSummary,
  ClaudeConnectionSummary,
  GoogleSheetSummary,
  NativeIntegrationSummary,
  StripeConnectionSummary,
} from "@/types/settings";

type IntegrationsTabProps = {
  active: boolean;
  isPro: boolean;
  claudeConnection: ClaudeConnectionSummary;
  notionConnection: NativeIntegrationSummary;
  figmaConnection: NativeIntegrationSummary;
  anthropicCredential: AnthropicCredentialSummary;
  claudeFeedback: SaveFeedback;
  anthropicFeedback: SaveFeedback;
  notionFeedback: SaveFeedback;
  figmaFeedback: SaveFeedback;
  isClaudeDisconnecting: boolean;
  isNotionConnecting: boolean;
  isNotionDisconnecting: boolean;
  isFigmaConnecting: boolean;
  isFigmaDisconnecting: boolean;
  anthropicApiKey: string;
  anthropicModelPreference: string;
  isAnthropicSaving: boolean;
  isAnthropicTesting: boolean;
  claudeSetupHref: string;
  claudeInstallCommand: string;
  claudeVerifyPrompt: string | null;
  onClaudeDisconnect: () => void;
  onNotionConnect: () => void;
  onNotionDisconnect: () => void;
  onFigmaConnect: () => void;
  onFigmaDisconnect: () => void;
  onAnthropicApiKeyChange: (value: string) => void;
  onAnthropicModelPreferenceChange: (value: string) => void;
  onAnthropicSave: () => void;
  onAnthropicTest: () => void;
  stripeConnection: StripeConnectionSummary;
  stripeFeedback: SaveFeedback;
  isStripeConnecting: boolean;
  isStripeSyncing: boolean;
  isStripeDisconnecting: boolean;
  onStripeConnect: () => void;
  onStripeSync: () => void;
  onStripeDisconnect: () => void;
  stripeGuideHref?: string | null;
  googleSheetsGuideHref?: string | null;
  googleSheetUrl: string;
  googleSheetConnection: GoogleSheetSummary;
  googleSheetFeedback: SaveFeedback;
  isGoogleSheetConnecting: boolean;
  isGoogleSheetImporting: boolean;
  isGoogleSheetDisconnecting: boolean;
  onGoogleSheetUrlChange: (value: string) => void;
  onGoogleSheetConnect: () => void;
  onGoogleSheetImport: () => void;
  onGoogleSheetDisconnect: () => void;
  googleSheetHelpDialogOpen: boolean;
  googleSheetHelpDialogTitle: string;
  googleSheetHelpDialogMessage: string;
  onGoogleSheetHelpDialogOpenChange: (open: boolean) => void;
  onOpenDeveloperSettings: () => void;
  onUpgradeClick: () => void;
};

type CardId = "claude" | "figma" | "notion" | "stripe" | "google-sheets";
type CardFilter = "all" | "connected" | "available";
type CardStatus = "connected" | "pending" | "error" | "none";
type DisconnectDialogType = "claude" | "figma" | "notion" | "stripe" | "google-sheets" | null;

type CardDef = {
  id: CardId;
  icon: string;
  iconBg: string;
  title: string;
  description: string;
  status: CardStatus;
  statusLabel: string;
};

export function IntegrationsTab({
  active,
  isPro,
  claudeConnection,
  notionConnection,
  figmaConnection,
  anthropicCredential,
  claudeFeedback,
  anthropicFeedback,
  notionFeedback,
  figmaFeedback,
  isClaudeDisconnecting,
  isNotionConnecting,
  isNotionDisconnecting,
  isFigmaConnecting,
  isFigmaDisconnecting,
  anthropicApiKey,
  anthropicModelPreference,
  isAnthropicSaving,
  isAnthropicTesting,
  claudeSetupHref,
  claudeInstallCommand,
  claudeVerifyPrompt,
  onClaudeDisconnect,
  onNotionConnect,
  onNotionDisconnect,
  onFigmaConnect,
  onFigmaDisconnect,
  onAnthropicApiKeyChange,
  onAnthropicModelPreferenceChange,
  onAnthropicSave,
  onAnthropicTest,
  stripeConnection,
  stripeFeedback,
  isStripeConnecting,
  isStripeSyncing,
  isStripeDisconnecting,
  onStripeConnect,
  onStripeSync,
  onStripeDisconnect,
  stripeGuideHref,
  googleSheetsGuideHref,
  googleSheetUrl,
  googleSheetConnection,
  googleSheetFeedback,
  isGoogleSheetConnecting,
  isGoogleSheetImporting,
  isGoogleSheetDisconnecting,
  onGoogleSheetUrlChange,
  onGoogleSheetConnect,
  onGoogleSheetImport,
  onGoogleSheetDisconnect,
  googleSheetHelpDialogOpen,
  googleSheetHelpDialogTitle,
  googleSheetHelpDialogMessage,
  onGoogleSheetHelpDialogOpenChange,
  onOpenDeveloperSettings,
  onUpgradeClick,
}: IntegrationsTabProps) {
  const [selectedCard, setSelectedCard] = useState<CardId | null>(null);
  const [activeFilter, setActiveFilter] = useState<CardFilter>("all");
  const [disconnectDialog, setDisconnectDialog] = useState<DisconnectDialogType>(null);
  const [copiedValue, setCopiedValue] = useState<"install" | "verify" | "full" | null>(null);

  async function handleCopy(value: string, key: "install" | "verify" | "full") {
    await navigator.clipboard.writeText(value);
    setCopiedValue(key);
    window.setTimeout(() => setCopiedValue(null), key === "full" ? 4000 : 1600);
  }

  function buildFullSetupPrompt() {
    const parts = [
      "Set up the Stage agent skill so you can operate Stage on my behalf.",
      "Stage is an AI-powered project management tool. The skill file teaches you the full API, action policy, and the research → strategy → generate → delivery workflow.",
      "",
      "## Step 1 — Install the skill",
      "",
      "Run this command to install the Stage skill into your workspace:",
      "",
      "```",
      claudeInstallCommand,
      "```",
      "",
      "This downloads the SKILL.md file which contains every endpoint, action classification, and workflow rule you need.",
      "",
      "## Step 2 — Authenticate",
      "",
      "You need a Stage API key to authenticate. Create one in Stage under Settings → Developer.",
      "Once you have the key, set it as an environment variable:",
      "",
      "```",
      "export STAGE_API_KEY=stg_your_key_here",
      "```",
      "",
      "The key uses Bearer auth: `Authorization: Bearer stg_...`",
      "",
      "The API base URL for all requests is:",
      "",
      "```",
      STAGE_API_BASE_URL,
      "```",
      "",
      `For example: \`GET ${STAGE_API_BASE_URL}/api/v1/projects\``,
    ];

    if (claudeVerifyPrompt) {
      parts.push(
        "",
        "## Step 3 — Verify the connection",
        "",
        claudeVerifyPrompt,
        "",
        "This confirms Stage can receive calls from Claude and registers your MCP capabilities (Notion, Figma).",
      );
    }

    parts.push(
      "",
      "## What you can do after setup",
      "",
      "- Read projects, phases, and tasks from Stage",
      "- Create new projects using `POST /api/v1/projects/import-plan` with structured phases and tasks",
      "- Run research, strategy, and content generation workflows",
      "- Write artifacts back to Stage and export to Notion or Figma",
      "- Toggle task completion and update project state",
      "",
      "Always create the project in Stage first before doing research or design work. Stage is the source of truth.",
    );

    return parts.join("\n");
  }

  async function handleContinueWithClaude() {
    await handleCopy(buildFullSetupPrompt(), "full");
    window.setTimeout(() => {
      window.open("https://claude.ai/new", "_blank");
    }, 1200);
  }

  function handleOpenDeveloper() {
    setSelectedCard(null);
    onOpenDeveloperSettings();
  }

  function handleUpgrade() {
    setSelectedCard(null);
    onUpgradeClick();
  }

  const claudeConnected = claudeConnection?.status === "connected" && claudeConnection.stageApiVerified;
  const figmaConnected = figmaConnection?.status === "active" || figmaConnection?.status === "pending";
  const notionConnected = notionConnection?.status === "active" || notionConnection?.status === "pending";
  const stripeConnected = stripeConnection?.status === "active" || stripeConnection?.status === "pending";
  const googleSheetConnected =
    googleSheetConnection?.status === "active" || googleSheetConnection?.status === "pending";
  const stripeStatusLabel = formatConnectionStatus(stripeConnection?.status ?? null);
  const stripeErrorMessage = formatStripeErrorMessage(stripeConnection?.lastSyncError ?? null);
  const googleSheetStatusLabel = formatConnectionStatus(googleSheetConnection?.status ?? null);
  const claudeRequiresUpgrade = !isPro && !claudeConnected;

  const disconnectCopy =
    disconnectDialog === "claude"
      ? {
          title: "Disconnect Claude?",
          description:
            "This removes Stage's verified Claude connection state. You can reconnect later from the Claude setup page.",
          confirmLabel: isClaudeDisconnecting ? "Disconnecting..." : "Disconnect",
          onConfirm: onClaudeDisconnect,
          isLoading: isClaudeDisconnecting,
        }
      : disconnectDialog === "stripe"
        ? {
            title: "Disconnect Stripe?",
            description:
              "This will stop syncing your invoices and payments from Stripe. You can reconnect later.",
            confirmLabel: isStripeDisconnecting ? "Disconnecting..." : "Disconnect",
            onConfirm: onStripeDisconnect,
            isLoading: isStripeDisconnecting,
          }
        : disconnectDialog === "figma"
          ? {
              title: "Disconnect Figma?",
              description:
                "This removes Stage's native Figma connection for this workspace. You can reconnect later.",
              confirmLabel: isFigmaDisconnecting ? "Disconnecting..." : "Disconnect",
              onConfirm: onFigmaDisconnect,
              isLoading: isFigmaDisconnecting,
            }
          : disconnectDialog === "notion"
            ? {
                title: "Disconnect Notion?",
                description:
                  "This removes Stage's native Notion connection for this workspace. You can reconnect later.",
                confirmLabel: isNotionDisconnecting ? "Disconnecting..." : "Disconnect",
                onConfirm: onNotionDisconnect,
                isLoading: isNotionDisconnecting,
              }
        : {
            title: "Disconnect Google Sheets?",
            description:
              "This will remove the connected sheet link and stop future imports until you connect it again.",
            confirmLabel: isGoogleSheetDisconnecting ? "Disconnecting..." : "Disconnect",
            onConfirm: onGoogleSheetDisconnect,
            isLoading: isGoogleSheetDisconnecting,
          };

  const cards: CardDef[] = [
    {
      id: "claude",
      icon: "/logos/integrations/claude.svg",
      iconBg: "#FFF5F0",
      title: "Claude",
      description: "Research, strategy, and generation",
      status: claudeConnected
        ? "connected"
        : claudeConnection?.status === "error"
          ? "error"
          : claudeConnection?.status === "connected" || claudeConnection?.status === "pending"
            ? "pending"
            : "none",
      statusLabel: formatClaudeStatusLabel(claudeConnection),
    },
    {
      id: "figma",
      icon: "/logos/integrations/figma.svg",
      iconBg: "#F5F0FF",
      title: "Figma",
      description: "Native design export and handoff",
      status: toNativeCardStatus(figmaConnection),
      statusLabel: formatNativeStatusLabel(figmaConnection),
    },
    {
      id: "notion",
      icon: "/logos/integrations/notion.svg",
      iconBg: "#F5F5F5",
      title: "Notion",
      description: "Native document export and review",
      status: toNativeCardStatus(notionConnection),
      statusLabel: formatNativeStatusLabel(notionConnection),
    },
    {
      id: "stripe",
      icon: stripeIcon,
      iconBg: "#F0F4FF",
      title: "Stripe",
      description: "Invoices and payments",
      status: stripeConnected
        ? "connected"
        : stripeConnection?.status === "error"
          ? "error"
          : "none",
      statusLabel: stripeStatusLabel,
    },
    {
      id: "google-sheets",
      icon: googleSheetsIcon,
      iconBg: "#F0FAF0",
      title: "Google Sheets",
      description: "Import transactions",
      status: googleSheetConnected
        ? "connected"
        : googleSheetConnection?.status === "error"
          ? "error"
          : "none",
      statusLabel: googleSheetStatusLabel,
    },
  ];

  const selectedCardData = cards.find((card) => card.id === selectedCard) ?? null;
  const filteredCards = cards.filter((card) => {
    if (activeFilter === "connected") {
      return card.status === "connected";
    }
    if (activeFilter === "available") {
      return card.status !== "connected";
    }
    return true;
  });

  return (
    <div className={`tab-content ${active ? "active" : ""}`}>
      <div className="rounded-[14px] bg-[#F5F5F5] p-[3px] shadow-[0_0.45px_1px_rgba(10,10,10,0.2)]"><div className="rounded-[11px] bg-white p-5 shadow-[0_0.45px_1px_rgba(10,10,10,0.12)] sm:p-6">
        <div className="max-w-[680px]">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-tertiary">
            Connector directory
          </div>
          <h2 className="mt-2 text-[22px] font-semibold text-text-primary">Integrations</h2>
          <p className="mt-2 text-[14px] leading-[1.65] text-text-secondary">
            Browse the connectors available in Stage and open each one in a focused dialog instead of scrolling through every setup flow inline.
          </p>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <FilterButton
            active={activeFilter === "all"}
            label="All"
            onClick={() => setActiveFilter("all")}
          />
          <FilterButton
            active={activeFilter === "connected"}
            label="Connected"
            onClick={() => setActiveFilter("connected")}
          />
          <FilterButton
            active={activeFilter === "available"}
            label="Available"
            onClick={() => setActiveFilter("available")}
          />
        </div>
      </div></div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {filteredCards.map((card) => (
          <button
            key={card.id}
            type="button"
            onClick={() => setSelectedCard(card.id)}
            className="group cursor-pointer rounded-[14px] bg-[#F5F5F5] p-[3px] text-left shadow-[0_0.45px_1px_rgba(10,10,10,0.2)] transition-all duration-150 hover:shadow-[0_2px_8px_rgba(10,10,10,0.1)]"
          >
            <div className="flex w-full items-start gap-4 rounded-[11px] bg-white px-4 py-4 shadow-[0_0.45px_1px_rgba(10,10,10,0.12)]">
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px]"
                style={{ backgroundColor: card.iconBg }}
              >
                <img src={card.icon} alt="" className="h-[22px] w-[22px] object-contain" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[15px] font-semibold text-text-primary">{card.title}</div>
                    <div className="mt-1 text-[13px] leading-[1.55] text-text-secondary">
                      {card.description}
                    </div>
                  </div>
                  <ArrowRight
                    size={16}
                    weight="bold"
                    className="mt-0.5 shrink-0 text-text-tertiary transition-transform duration-150 group-hover:translate-x-0.5"
                  />
                </div>

                <div className="mt-3">
                  <StatusPill status={card.status} label={card.statusLabel} />
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {filteredCards.length === 0 ? (
        <div className="mt-4 rounded-[14px] bg-[#F5F5F5] p-[3px] shadow-[0_0.45px_1px_rgba(10,10,10,0.15)]"><div className="rounded-[11px] bg-white px-5 py-10 text-center shadow-[0_0.45px_1px_rgba(10,10,10,0.12)]">
          <div className="text-[14px] font-medium text-text-primary">No connectors in this view</div>
          <div className="mt-1 text-[13px] text-text-secondary">
            Switch filters to browse the rest of the available integrations.
          </div>
        </div></div>
      ) : null}

      <Dialog.Root
        open={selectedCard !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedCard(null);
          }
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[2px]" />
          {selectedCardData ? (
            <ConnectorDialogShell card={selectedCardData}>
              {selectedCard === "claude" ? (
                <>
                  {claudeRequiresUpgrade ? (
                    <div className="rounded-[14px] border border-border-subtle bg-bg-subtle px-4 py-4">
                      <div className="text-[14px] font-medium text-text-primary">
                        Stage API access is part of Stage Pro
                      </div>
                      <p className="mt-2 text-[13px] leading-[1.65] text-text-secondary">
                        Upgrade before you connect Claude. API keys live in Settings → Developer and the Claude handshake depends on them.
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button type="button" className="btn-save" onClick={handleUpgrade}>
                          Upgrade to Pro
                        </button>
                        <a href="/agents/skills" className="btn-outline">
                          View skill docs
                        </a>
                      </div>
                    </div>
                  ) : (
                    <>
                      {claudeConnection?.lastError ? (
                        <p className="mb-3 text-[13px] text-destructive">{claudeConnection.lastError}</p>
                      ) : null}

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-[10px] border border-[#D97757]/18 bg-[#D97757]/[0.06] px-4 text-[13px] font-medium text-text-primary transition-all duration-150 hover:bg-[#D97757]/[0.11] active:bg-[#D97757]/[0.15]"
                          onClick={() => void handleContinueWithClaude()}
                        >
                          {copiedValue === "full" ? (
                            <>
                              <Check size={13} weight="bold" className="text-[#22C55E]" />
                              Copied — opening Claude
                            </>
                          ) : (
                            <>
                              Continue with
                              <img src="/logos/integrations/claude-full.svg" alt="Claude" className="h-[12px]" />
                              <ArrowRight size={12} weight="bold" className="text-text-tertiary" />
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-[10px] border border-[#D97757]/15 bg-[#D97757]/[0.04] px-3 text-[12px] font-medium text-[#D97757] transition-all duration-150 hover:bg-[#D97757]/[0.09]"
                          onClick={() => void handleCopy(buildFullSetupPrompt(), "full")}
                        >
                          <CopySimple size={12} weight="bold" />
                          {copiedValue === "full" ? "Copied!" : "Copy prompt"}
                        </button>
                        <button
                          type="button"
                          className="btn-outline"
                          onClick={handleOpenDeveloper}
                        >
                          API keys
                        </button>
                        <a href={claudeSetupHref} className="btn-outline">
                          Setup guide
                        </a>
                        {claudeConnection && claudeConnection.status !== "disconnected" ? (
                          <button
                            type="button"
                            className="btn-outline"
                            disabled={isClaudeDisconnecting}
                            onClick={() => setDisconnectDialog("claude")}
                          >
                            {isClaudeDisconnecting ? "Disconnecting..." : "Disconnect"}
                          </button>
                        ) : null}
                      </div>

                      {claudeConnection?.lastHandshakeAt ? (
                        <p className="mt-2 text-[11px] text-text-tertiary">
                          Last synced {formatTimestamp(claudeConnection.lastHandshakeAt)}
                        </p>
                      ) : null}
                      <FeedbackText feedback={claudeFeedback} />

                      <div className="mt-5 border-t border-border-subtle pt-5">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <div className="text-[13px] font-medium text-text-primary">Anthropic API key</div>
                            <div className="mt-0.5 text-[11px] text-text-secondary">
                              Optional. Enables Stage-managed background runs.
                            </div>
                          </div>
                          <a
                            href="https://console.anthropic.com"
                            target="_blank"
                            rel="noreferrer"
                            className="text-[12px] font-medium text-accent transition-colors hover:text-accent-hover"
                          >
                            Manage on Anthropic &rarr;
                          </a>
                        </div>

                        <div className="mt-3 flex gap-2">
                          <input
                            className="settings-input"
                            type="password"
                            value={anthropicApiKey}
                            onChange={(event) => onAnthropicApiKeyChange(event.target.value)}
                            placeholder={
                              anthropicCredential.hasSavedKey
                                ? `Saved key ending in ${anthropicCredential.keyLast4 ?? "----"}`
                                : "sk-ant-..."
                            }
                          />
                          <button
                            type="button"
                            className="btn-outline shrink-0"
                            disabled={isAnthropicTesting}
                            onClick={onAnthropicTest}
                          >
                            {isAnthropicTesting ? "Testing..." : "Test"}
                          </button>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-3 text-[12px] text-text-secondary">
                            <label className="inline-flex items-center gap-1.5">
                              <span>Model</span>
                              <select
                                className="rounded-[8px] border border-border-subtle bg-white px-2 py-1 text-[12px] text-text-primary"
                                value={anthropicModelPreference}
                                onChange={(event) => onAnthropicModelPreferenceChange(event.target.value)}
                              >
                                <option value="claude-sonnet-4-5">Claude Sonnet 4.5</option>
                                <option value="claude-opus-4-6">Claude Opus 4.6</option>
                              </select>
                            </label>
                            {anthropicCredential.hasSavedKey ? (
                              <span className="flex items-center gap-1.5">
                                <span
                                  className={`h-1.5 w-1.5 rounded-full ${
                                    anthropicCredential.status === "valid"
                                      ? "bg-[#22C55E]"
                                      : anthropicCredential.status === "invalid"
                                        ? "bg-[#E54D4D]"
                                        : "bg-[#D9D9D9]"
                                  }`}
                                />
                                {formatCredentialStatus(anthropicCredential.status)}
                              </span>
                            ) : null}
                          </div>
                          <button
                            type="button"
                            className="btn-save"
                            disabled={isAnthropicSaving}
                            onClick={onAnthropicSave}
                          >
                            {isAnthropicSaving ? "Saving..." : "Save"}
                          </button>
                        </div>
                        <FeedbackText feedback={anthropicFeedback} />
                      </div>
                    </>
                  )}
                </>
              ) : null}

              {selectedCard === "figma" ? (
                <>
                  {!isPro && !figmaConnected ? (
                    <LockedConnectorMessage onUpgradeClick={handleUpgrade} />
                  ) : (
                    <>
                      <p className="text-[13px] text-text-secondary">
                        Connect Figma directly to Stage so exports and design handoff no longer depend on Claude.
                      </p>
                      <div className="mt-4 rounded-[12px] border border-border-subtle bg-bg-subtle px-3.5 py-3 text-[12px] text-text-secondary">
                        <div>
                          Workspace:{" "}
                          <span className="text-text-primary">
                            {figmaConnection?.workspaceName || figmaConnection?.accountName || "—"}
                          </span>
                        </div>
                        <div>
                          Account:{" "}
                          <span className="text-text-primary">{figmaConnection?.accountEmail || "—"}</span>
                        </div>
                        <div>
                          Connected:{" "}
                          <span className="text-text-primary">{formatTimestamp(figmaConnection?.connectedAt)}</span>
                        </div>
                        {figmaConnection?.lastError ? <div className="text-[#E07070]">{figmaConnection.lastError}</div> : null}
                      </div>
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                        <FeedbackText
                          feedback={figmaFeedback}
                          fallback="Public OAuth app setup is required before users can connect Figma."
                        />
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            className="btn-outline"
                            disabled={isFigmaConnecting}
                            onClick={onFigmaConnect}
                          >
                            {isFigmaConnecting ? "Redirecting..." : figmaConnected ? "Reconnect" : "Connect"}
                          </button>
                          <button
                            type="button"
                            className="btn-outline"
                            disabled={!figmaConnected || isFigmaDisconnecting}
                            onClick={() => setDisconnectDialog("figma")}
                          >
                            Disconnect
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </>
              ) : null}

              {selectedCard === "notion" ? (
                <>
                  {!isPro && !notionConnected ? (
                    <LockedConnectorMessage onUpgradeClick={handleUpgrade} />
                  ) : (
                    <>
                      <p className="text-[13px] text-text-secondary">
                        Connect Notion directly to Stage so research, strategy, and generated outputs can publish natively.
                      </p>
                      <div className="mt-4 rounded-[12px] border border-border-subtle bg-bg-subtle px-3.5 py-3 text-[12px] text-text-secondary">
                        <div>
                          Workspace:{" "}
                          <span className="text-text-primary">
                            {notionConnection?.workspaceName || notionConnection?.displayName || "—"}
                          </span>
                        </div>
                        <div>
                          Account:{" "}
                          <span className="text-text-primary">{notionConnection?.accountEmail || "—"}</span>
                        </div>
                        <div>
                          Connected:{" "}
                          <span className="text-text-primary">{formatTimestamp(notionConnection?.connectedAt)}</span>
                        </div>
                        {notionConnection?.lastError ? <div className="text-[#E07070]">{notionConnection.lastError}</div> : null}
                      </div>
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                        <FeedbackText
                          feedback={notionFeedback}
                          fallback="Public OAuth app setup is required before users can connect Notion."
                        />
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            className="btn-outline"
                            disabled={isNotionConnecting}
                            onClick={onNotionConnect}
                          >
                            {isNotionConnecting ? "Redirecting..." : notionConnected ? "Reconnect" : "Connect"}
                          </button>
                          <button
                            type="button"
                            className="btn-outline"
                            disabled={!notionConnected || isNotionDisconnecting}
                            onClick={() => setDisconnectDialog("notion")}
                          >
                            Disconnect
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </>
              ) : null}

              {selectedCard === "stripe" ? (
                <>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="text-[13px] text-text-secondary">
                      Connect a client-facing Stripe account so Stage can sync invoices and payments.
                    </p>
                    {stripeGuideHref ? (
                      <a
                        href={stripeGuideHref}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[12px] font-medium text-accent transition-colors hover:text-accent-hover"
                      >
                        View guide
                      </a>
                    ) : null}
                  </div>

                  <div className="mt-4 rounded-[12px] border border-border-subtle bg-bg-subtle px-3.5 py-3 text-[12px]">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`stripe-dot ${stripeConnection?.status === "error" ? "bg-[#E54D4D]" : ""}`} />
                      <span className="text-text-primary">
                        {stripeConnection?.displayName || stripeConnection?.accountEmail || "No Stripe account connected"}
                      </span>
                      <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-text-secondary">
                        {stripeStatusLabel}
                      </span>
                    </div>
                    <div className="mt-2 space-y-0.5 text-text-secondary">
                      <div>
                        Account: <span className="text-text-primary">{stripeConnection?.accountEmail || "—"}</span>
                      </div>
                      <div>
                        Last sync: <span className="text-text-primary">{formatTimestamp(stripeConnection?.lastSyncedAt)}</span>
                      </div>
                      {stripeErrorMessage ? <div className="text-[#E07070]">{stripeErrorMessage}</div> : null}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                    <FeedbackText
                      feedback={stripeFeedback}
                      fallback="Use Connect first, then run a sync whenever you want fresh data."
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        className="btn-outline"
                        disabled={isStripeConnecting}
                        onClick={onStripeConnect}
                      >
                        {isStripeConnecting ? "Redirecting..." : stripeConnected ? "Reconnect" : "Connect"}
                      </button>
                      <button
                        type="button"
                        className="btn-outline"
                        disabled={!stripeConnected || isStripeSyncing}
                        onClick={onStripeSync}
                      >
                        {isStripeSyncing ? "Syncing..." : "Sync"}
                      </button>
                      <button
                        type="button"
                        className="btn-outline"
                        disabled={!stripeConnected || isStripeDisconnecting}
                        onClick={() => setDisconnectDialog("stripe")}
                      >
                        Disconnect
                      </button>
                    </div>
                  </div>
                </>
              ) : null}

              {selectedCard === "google-sheets" ? (
                <>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="text-[13px] text-text-secondary">
                      Paste a Google Sheets link that follows your template. Import manually whenever the sheet changes.
                    </p>
                    {googleSheetsGuideHref ? (
                      <a
                        href={googleSheetsGuideHref}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[12px] font-medium text-accent transition-colors hover:text-accent-hover"
                      >
                        View guide
                      </a>
                    ) : null}
                  </div>

                  <div className="mt-4">
                    <label className="mb-1 block text-[12px] font-medium text-text-primary">
                      Google Sheets URL
                    </label>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input
                        className="settings-input"
                        type="url"
                        placeholder="https://docs.google.com/spreadsheets/d/..."
                        value={googleSheetUrl}
                        onChange={(event) => onGoogleSheetUrlChange(event.target.value)}
                      />
                      <button
                        type="button"
                        className="btn-outline shrink-0"
                        disabled={isGoogleSheetConnecting || googleSheetUrl.trim().length === 0}
                        onClick={onGoogleSheetConnect}
                      >
                        {isGoogleSheetConnecting ? "Saving..." : googleSheetConnected ? "Update link" : "Connect"}
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 rounded-[12px] border border-border-subtle bg-bg-subtle px-3.5 py-3 text-[12px] text-text-secondary">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`stripe-dot ${googleSheetConnection?.status === "error" ? "bg-[#E54D4D]" : ""}`} />
                      <span className="text-text-primary">{googleSheetStatusLabel}</span>
                    </div>
                    <div className="mt-2 space-y-0.5">
                      <div>
                        Connected sheet:{" "}
                        <span className="text-text-primary">
                          {googleSheetConnection?.sheetTitle || googleSheetConnection?.sheetUrl || "—"}
                        </span>
                      </div>
                      <div>
                        Last import:{" "}
                        <span className="text-text-primary">{formatTimestamp(googleSheetConnection?.lastImportedAt)}</span>
                      </div>
                      {googleSheetConnection?.lastImportError ? (
                        <div className="text-[#E07070]">{googleSheetConnection.lastImportError}</div>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                    <FeedbackText
                      feedback={googleSheetFeedback}
                      fallback="Required columns: date, type, direction, client, amount, currency, status"
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        className="btn-outline"
                        disabled={!googleSheetConnected || isGoogleSheetImporting}
                        onClick={onGoogleSheetImport}
                      >
                        {isGoogleSheetImporting ? "Importing..." : "Import now"}
                      </button>
                      <button
                        type="button"
                        className="btn-outline"
                        disabled={!googleSheetConnected || isGoogleSheetDisconnecting}
                        onClick={() => setDisconnectDialog("google-sheets")}
                      >
                        Disconnect
                      </button>
                    </div>
                  </div>
                </>
              ) : null}
            </ConnectorDialogShell>
          ) : null}
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root
        open={disconnectDialog !== null}
        onOpenChange={(open) => {
          if (!open) setDisconnectDialog(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[2px]" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-[60] w-[calc(100%-24px)] max-w-[460px] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-5 shadow-xl sm:w-[calc(100%-32px)] sm:p-7">
            <Dialog.Title className="font-heading text-[20px] font-semibold text-text-primary">
              {disconnectCopy.title}
            </Dialog.Title>
            <p className="mt-3 text-[14px] leading-[1.6] text-text-secondary">
              {disconnectCopy.description}
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Dialog.Close asChild>
                <button type="button" className="btn-outline" disabled={disconnectCopy.isLoading}>
                  Cancel
                </button>
              </Dialog.Close>
              <button
                type="button"
                className="btn-delete"
                disabled={disconnectCopy.isLoading}
                onClick={() => {
                  disconnectCopy.onConfirm();
                  setDisconnectDialog(null);
                }}
              >
                {disconnectCopy.confirmLabel}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={googleSheetHelpDialogOpen} onOpenChange={onGoogleSheetHelpDialogOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[2px]" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-24px)] max-w-[460px] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-5 shadow-xl sm:w-[calc(100%-32px)] sm:p-7">
            <Dialog.Title className="font-heading text-[20px] font-semibold text-text-primary">
              {googleSheetHelpDialogTitle}
            </Dialog.Title>
            <p className="mt-3 text-[14px] leading-[1.6] text-text-secondary">
              {googleSheetHelpDialogMessage}
            </p>
            <div className="mt-6 flex justify-end">
              <Dialog.Close asChild>
                <button type="button" className="btn-outline">
                  OK
                </button>
              </Dialog.Close>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

function FilterButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-[13px] font-medium transition-all duration-150 ${
        active
          ? "border border-[rgba(158,153,248,0.6)] bg-gradient-to-b from-[#7B76DF] to-[#5E58C4] text-white shadow-[0_0.45px_1px_rgba(10,10,10,0.2)]"
          : "border border-border-subtle bg-input-bg text-text-secondary hover:text-text-primary"
      }`}
    >
      {label}
    </button>
  );
}

function StatusPill({ status, label }: { status: CardStatus; label: string }) {
  const toneClass =
    status === "connected"
      ? "bg-[#ECFDF3] text-[#15803D]"
      : status === "pending"
        ? "bg-[#FFF7E8] text-[#B45309]"
        : status === "error"
          ? "bg-[#FEF2F2] text-[#B91C1C]"
          : "bg-bg-subtle text-text-secondary";

  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[11px] font-medium ${toneClass}`}>
      <StatusDot status={status} />
      {label}
    </span>
  );
}

function StatusDot({ status }: { status: CardStatus }) {
  const color =
    status === "connected"
      ? "bg-[#22C55E]"
      : status === "pending"
        ? "bg-[#F59E0B]"
        : status === "error"
          ? "bg-[#E54D4D]"
          : "bg-[#D9D9D9]";

  return <span className={`h-[6px] w-[6px] shrink-0 rounded-full ${color}`} />;
}

function ConnectorDialogShell({
  card,
  children,
}: {
  card: CardDef;
  children: React.ReactNode;
}) {
  return (
    <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-24px)] max-w-[720px] -translate-x-1/2 -translate-y-1/2 rounded-[16px] bg-[#F5F5F5] p-[3px] shadow-[0_24px_80px_rgba(17,24,39,0.28)] sm:w-[calc(100%-32px)]">
      <div className="max-h-[min(88vh,760px)] overflow-y-auto rounded-[13px] bg-white p-5 shadow-[0_0.45px_1px_rgba(10,10,10,0.12)] sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-4">
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px]"
              style={{ backgroundColor: card.iconBg }}
            >
              <img src={card.icon} alt="" className="h-[26px] w-[26px] object-contain" />
            </div>
            <div className="min-w-0">
              <Dialog.Title className="text-[28px] font-semibold text-text-primary">
                {card.title}
              </Dialog.Title>
              <p className="mt-1 text-[15px] leading-[1.6] text-text-secondary">
                {card.description}
              </p>
              <div className="mt-3">
                <StatusPill status={card.status} label={card.statusLabel} />
              </div>
            </div>
          </div>

          <Dialog.Close asChild>
            <button
              type="button"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border-subtle bg-white text-text-secondary transition-colors hover:text-text-primary"
              aria-label="Close"
            >
              <X size={18} weight="bold" />
            </button>
          </Dialog.Close>
        </div>

        <div className="mt-6">{children}</div>
      </div>
    </Dialog.Content>
  );
}

function LockedConnectorMessage({ onUpgradeClick }: { onUpgradeClick: () => void }) {
  return (
    <div className="rounded-[14px] border border-border-subtle bg-bg-subtle px-4 py-4">
      <div className="text-[14px] font-medium text-text-primary">Requires Stage Pro</div>
      <p className="mt-2 text-[13px] leading-[1.65] text-text-secondary">
        Native publishing is part of Stage Pro. Upgrade first, then connect the provider directly from this settings page.
      </p>
      <div className="mt-4">
        <button type="button" className="btn-save" onClick={onUpgradeClick}>
          Upgrade to Pro
        </button>
      </div>
    </div>
  );
}

function formatClaudeStatusLabel(connection: ClaudeConnectionSummary) {
  if (!connection || connection.status === "disconnected") return "Not connected";
  if (connection.status === "error") return "Needs attention";
  if (connection.status === "connected" && connection.stageApiVerified) return "Connected";
  return "Pending";
}

function formatCredentialStatus(status: AnthropicCredentialSummary["status"]) {
  switch (status) {
    case "valid":
      return "Valid";
    case "invalid":
      return "Needs attention";
    default:
      return "Untested";
  }
}

function toNativeCardStatus(connection: NativeIntegrationSummary): CardStatus {
  if (!connection) return "none";
  switch (connection.status) {
    case "active":
      return "connected";
    case "pending":
      return "pending";
    case "error":
      return "error";
    default:
      return "none";
  }
}

function formatNativeStatusLabel(connection: NativeIntegrationSummary) {
  if (!connection) return "Setup required";
  switch (connection.status) {
    case "active":
      return "Connected";
    case "pending":
      return "Pending";
    case "error":
      return "Needs attention";
    case "disconnected":
      return "Not connected";
    default:
      return "Setup required";
  }
}

function formatConnectionStatus(status: string | null) {
  if (!status) return "Not connected";
  switch (status) {
    case "active":
      return "Active";
    case "pending":
      return "Pending";
    case "error":
      return "Needs attention";
    case "disconnected":
      return "Disconnected";
    default:
      return status;
  }
}

function formatStripeErrorMessage(message: string | null) {
  if (!message) return null;
  const normalized = message.trim().toLowerCase();
  switch (normalized) {
    case "access_denied":
      return "Access denied.";
    case "invalid_client":
    case "unauthorized_client":
      return "Stripe connection is unavailable right now.";
    case "invalid_grant":
      return "This Stripe connection expired. Please reconnect Stripe.";
    case "invalid_request":
    case "invalid_scope":
      return "Stripe needs attention before it can connect.";
    default:
      break;
  }
  if (/access[\s_-]?denied|forbidden|not authorized|unauthorized/i.test(message)) return "Access denied.";
  if (/oauth|client_id|client_secret|redirect_uri|webhook|secret|signature/i.test(message))
    return "Stripe needs attention before it can connect.";
  return message;
}

function formatTimestamp(value: number | null | undefined) {
  if (!value) return "Never";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
