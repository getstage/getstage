import * as Dialog from "@radix-ui/react-dialog";
import { useState } from "react";
import { ArrowRight, Check, CopySimple } from "@phosphor-icons/react";
import googleSheetsIcon from "@/assets/icons/google-sheets.svg";
import stripeIcon from "@/assets/icons/stripe.svg";
import { FeedbackText } from "@/components/settings/FeedbackText";
import { STAGE_API_BASE_URL } from "@/features/settings/useIntegrationsSettings";
import type { SaveFeedback } from "@/hooks/useFeedback";
import type {
  AnthropicCredentialSummary,
  ClaudeConnectionSummary,
  ClaudeToolSummary,
  GoogleSheetSummary,
  StripeConnectionSummary,
} from "@/types/settings";

type IntegrationsTabProps = {
  active: boolean;
  claudeConnection: ClaudeConnectionSummary;
  claudeTools: {
    figma: ClaudeToolSummary;
    notion: ClaudeToolSummary;
  };
  anthropicCredential: AnthropicCredentialSummary;
  claudeFeedback: SaveFeedback;
  anthropicFeedback: SaveFeedback;
  isClaudeDisconnecting: boolean;
  anthropicApiKey: string;
  anthropicModelPreference: string;
  isAnthropicSaving: boolean;
  isAnthropicTesting: boolean;
  claudeSetupHref: string;
  claudeInstallCommand: string;
  claudeVerifyPrompt: string | null;
  onClaudeDisconnect: () => void;
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
};

type CardId = "claude" | "figma" | "notion" | "stripe" | "google-sheets";
type DisconnectDialogType = "claude" | "stripe" | "google-sheets" | null;

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export function IntegrationsTab({
  active,
  claudeConnection,
  claudeTools,
  anthropicCredential,
  claudeFeedback,
  anthropicFeedback,
  isClaudeDisconnecting,
  anthropicApiKey,
  anthropicModelPreference,
  isAnthropicSaving,
  isAnthropicTesting,
  claudeSetupHref,
  claudeInstallCommand,
  claudeVerifyPrompt,
  onClaudeDisconnect,
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
}: IntegrationsTabProps) {
  const [expanded, setExpanded] = useState<CardId | null>(null);
  const [disconnectDialog, setDisconnectDialog] = useState<DisconnectDialogType>(null);
  const [copiedValue, setCopiedValue] = useState<"install" | "verify" | "full" | null>(null);

  function toggle(id: CardId) {
    setExpanded((prev) => (prev === id ? null : id));
  }

  /* ---- copy helpers ---- */

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
      "For example: `GET " + STAGE_API_BASE_URL + "/api/v1/projects`",
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

  /* ---- status derivation ---- */

  const claudeConnected = claudeConnection?.status === "connected" && claudeConnection.stageApiVerified;
  const figmaAvailable = claudeConnection?.figmaInClaude === "claimed";
  const notionAvailable = claudeConnection?.notionInClaude === "claimed";
  const stripeConnected = stripeConnection?.status === "active" || stripeConnection?.status === "pending";
  const googleSheetConnected = googleSheetConnection?.status === "active" || googleSheetConnection?.status === "pending";

  const stripeStatusLabel = formatConnectionStatus(stripeConnection?.status ?? null);
  const stripeErrorMessage = formatStripeErrorMessage(stripeConnection?.lastSyncError ?? null);
  const googleSheetStatusLabel = formatConnectionStatus(googleSheetConnection?.status ?? null);

  /* ---- disconnect dialog copy ---- */

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
        : {
            title: "Disconnect Google Sheets?",
            description:
              "This will remove the connected sheet link and stop future imports until you connect it again.",
            confirmLabel: isGoogleSheetDisconnecting ? "Disconnecting..." : "Disconnect",
            onConfirm: onGoogleSheetDisconnect,
            isLoading: isGoogleSheetDisconnecting,
          };

  /* ---- card definitions ---- */

  type CardDef = {
    id: CardId;
    icon: string;
    iconBg: string;
    title: string;
    description: string;
    status: "connected" | "pending" | "error" | "none";
    statusLabel: string;
  };

  const cards: CardDef[] = [
    {
      id: "claude",
      icon: "/claude.svg",
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
      icon: "/figma.svg",
      iconBg: "#F5F0FF",
      title: "Figma in Claude",
      description: "Wireframes and design tooling",
      status: figmaAvailable ? "connected" : "none",
      statusLabel: figmaAvailable ? "Connected" : "Setup required",
    },
    {
      id: "notion",
      icon: "/notion.svg",
      iconBg: "#F5F5F5",
      title: "Notion in Claude",
      description: "Export research and artifacts",
      status: notionAvailable ? "connected" : "none",
      statusLabel: notionAvailable ? "Connected" : "Setup required",
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

  return (
    <div className={`tab-content ${active ? "active" : ""}`}>
      {/* ---- Compact grid ---- */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-2">
        {cards.map((card) => (
          <button
            key={card.id}
            type="button"
            onClick={() => toggle(card.id)}
            className={`group flex cursor-pointer items-start gap-3 rounded-[14px] border px-4 py-3.5 text-left transition-all duration-150 ${
              expanded === card.id
                ? "border-accent/25 bg-accent/[0.03] shadow-[0_2px_8px_rgba(135,130,245,0.08)]"
                : "border-border-subtle bg-white hover:border-border hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
            }`}
          >
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]"
              style={{ backgroundColor: card.iconBg }}
            >
              <img src={card.icon} alt="" className="h-[18px] w-[18px] object-contain" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[13px] font-semibold text-text-primary">{card.title}</span>
                <StatusDot status={card.status} />
              </div>
              <span className="mt-0.5 block text-[11px] leading-[1.4] text-text-tertiary">
                {card.description}
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* ---- Expanded detail panel ---- */}
      {expanded === "claude" ? (
        <DetailPanel title="Claude" onClose={() => setExpanded(null)}>
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
                  <img src="/claude-full.svg" alt="Claude" className="h-[12px]" />
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
            <a
              href={claudeSetupHref}
              className="inline-flex h-9 items-center rounded-[10px] border border-border px-3 text-[13px] font-medium text-text-primary transition-all duration-150 hover:bg-bg-subtle"
            >
              Setup guide
            </a>
            {claudeConnection && claudeConnection.status !== "disconnected" ? (
              <button
                type="button"
                className="inline-flex h-9 cursor-pointer items-center rounded-[10px] border border-border px-3 text-[13px] font-medium text-text-primary transition-all duration-150 hover:bg-bg-subtle"
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

          {/* Anthropic API key section */}
          <div className="mt-4 border-t border-border-subtle pt-4">
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

            <div className="mt-2 flex gap-2">
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

            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
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
        </DetailPanel>
      ) : null}

      {expanded === "figma" ? (
        <DetailPanel title="Figma in Claude" onClose={() => setExpanded(null)}>
          <p className="text-[13px] text-text-secondary">
            Open wireframes, iterate outputs, and push updates through Claude with Figma tooling.
          </p>
          <div className="mt-3 space-y-1 text-[12px] text-text-secondary">
            <div>
              Last export:{" "}
              <span className="text-text-primary">{formatTimestamp(claudeTools.figma.lastExportAt)}</span>
            </div>
            <div>
              Last status:{" "}
              <span className="text-text-primary">
                {claudeTools.figma.lastExportStatus ? formatExportStatus(claudeTools.figma.lastExportStatus) : "Never"}
              </span>
            </div>
            {claudeTools.figma.lastError ? (
              <div className="text-[#E07070]">{claudeTools.figma.lastError}</div>
            ) : null}
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-[12px] text-text-tertiary">
              {claudeTools.figma.destinationLabel || "Connect through the Claude setup page."}
            </span>
            <a
              href={claudeSetupHref}
              className="btn-save text-[12px]"
            >
              Open Claude setup
            </a>
          </div>
        </DetailPanel>
      ) : null}

      {expanded === "notion" ? (
        <DetailPanel title="Notion in Claude" onClose={() => setExpanded(null)}>
          <p className="text-[13px] text-text-secondary">
            Export research and strategy artifacts to Notion through Claude.
          </p>
          <div className="mt-3 space-y-1 text-[12px] text-text-secondary">
            <div>
              Last export:{" "}
              <span className="text-text-primary">{formatTimestamp(claudeTools.notion.lastExportAt)}</span>
            </div>
            <div>
              Last status:{" "}
              <span className="text-text-primary">
                {claudeTools.notion.lastExportStatus ? formatExportStatus(claudeTools.notion.lastExportStatus) : "Never"}
              </span>
            </div>
            {claudeTools.notion.lastError ? (
              <div className="text-[#E07070]">{claudeTools.notion.lastError}</div>
            ) : null}
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-[12px] text-text-tertiary">
              {claudeTools.notion.destinationLabel || "Connect through the Claude setup page."}
            </span>
            <a
              href={claudeSetupHref}
              className="btn-save text-[12px]"
            >
              Open Claude setup
            </a>
          </div>
        </DetailPanel>
      ) : null}

      {expanded === "stripe" ? (
        <DetailPanel title="Stripe Connect" onClose={() => setExpanded(null)}>
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

          <div className="mt-3 rounded-[10px] border border-border-subtle bg-bg-subtle px-3.5 py-2.5 text-[12px]">
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

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <FeedbackText
              feedback={stripeFeedback}
              fallback="Use Connect first, then run a sync whenever you want fresh data."
            />
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" className="btn-outline" disabled={isStripeConnecting} onClick={onStripeConnect}>
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
        </DetailPanel>
      ) : null}

      {expanded === "google-sheets" ? (
        <DetailPanel title="Google Sheets (CSV)" onClose={() => setExpanded(null)}>
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

          <div className="mt-3">
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

          <div className="mt-3 rounded-[10px] border border-border-subtle bg-bg-subtle px-3.5 py-2.5 text-[12px] text-text-secondary">
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

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
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
        </DetailPanel>
      ) : null}

      {/* ---- Disconnect confirmation dialog ---- */}
      <Dialog.Root
        open={disconnectDialog !== null}
        onOpenChange={(open) => {
          if (!open) setDisconnectDialog(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[2px]" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-24px)] max-w-[460px] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-5 shadow-xl sm:w-[calc(100%-32px)] sm:p-7">
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

      {/* ---- Google Sheets help dialog ---- */}
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

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function StatusDot({ status }: { status: "connected" | "pending" | "error" | "none" }) {
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

function DetailPanel({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-2.5 rounded-[14px] border border-border-subtle bg-white px-5 py-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[13px] font-semibold text-text-primary">{title}</span>
        <button
          type="button"
          onClick={onClose}
          className="cursor-pointer text-[11px] font-medium text-text-tertiary transition-colors hover:text-text-secondary"
        >
          Close
        </button>
      </div>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Formatting helpers                                                 */
/* ------------------------------------------------------------------ */

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

function formatExportStatus(status: ClaudeToolSummary["lastExportStatus"]) {
  switch (status) {
    case "requested":
      return "Requested";
    case "in_progress":
      return "In progress";
    case "completed":
      return "Completed";
    case "failed":
      return "Failed";
    default:
      return "Never";
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
