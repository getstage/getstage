import * as Dialog from "@radix-ui/react-dialog";
import { useState } from "react";
import { ArrowRight, Check, CopySimple } from "@phosphor-icons/react";
import googleSheetsIcon from "@/assets/icons/google-sheets.svg";
import stripeIcon from "@/assets/icons/stripe.svg";
import { FeedbackText } from "@/components/settings/FeedbackText";
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

type DisconnectDialogType = "claude" | "stripe" | "google-sheets" | null;

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
  const stripeStatusLabel = formatConnectionStatus(stripeConnection?.status ?? null);
  const stripeErrorMessage = formatStripeErrorMessage(stripeConnection?.lastSyncError ?? null);
  const googleSheetStatusLabel = formatConnectionStatus(googleSheetConnection?.status ?? null);
  const stripeConnected =
    stripeConnection?.status === "active" || stripeConnection?.status === "pending";
  const googleSheetConnected =
    googleSheetConnection?.status === "active" || googleSheetConnection?.status === "pending";
  const [disconnectDialog, setDisconnectDialog] = useState<DisconnectDialogType>(null);
  const [copiedValue, setCopiedValue] = useState<"install" | "verify" | "full" | null>(null);

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

  async function handleCopy(value: string, key: "install" | "verify" | "full") {
    await navigator.clipboard.writeText(value);
    setCopiedValue(key);
    window.setTimeout(() => setCopiedValue(null), key === "full" ? 4000 : 1600);
  }

  function buildFullSetupPrompt() {
    const parts = [
      "Set up the Stage skill in this project.",
      "",
      `1. Run: ${claudeInstallCommand}`,
      "",
      "2. Make sure STAGE_API_KEY is set in your environment (create one in Stage → Settings → Developer if you don't have one).",
    ];

    if (claudeVerifyPrompt) {
      parts.push("", "3. Then verify the connection:", claudeVerifyPrompt);
    }

    return parts.join("\n");
  }

  async function handleContinueWithClaude() {
    await handleCopy(buildFullSetupPrompt(), "full");
    window.setTimeout(() => {
      window.open("https://claude.ai/new", "_blank");
    }, 1200);
  }

  return (
    <div className={`tab-content ${active ? "active" : ""}`}>
      <div className="settings-card">
        <div className="card-body">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <img src="/claude.svg" alt="" className="h-8 w-8 shrink-0" />
              <div>
                <div className="card-heading sf">Claude</div>
                <div className="text-[13px] text-text-secondary">
                  Research, strategy, and generation
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`h-[7px] w-[7px] shrink-0 rounded-full ${
                  claudeConnection?.status === "connected" && claudeConnection.stageApiVerified
                    ? "bg-success"
                    : claudeConnection?.status === "error"
                      ? "bg-destructive"
                      : "bg-border"
                }`}
              />
              <span className="text-[12px] font-medium text-text-secondary">
                {formatClaudeStatusLabel(claudeConnection)}
              </span>
            </div>
          </div>

          {claudeConnection?.lastError ? (
            <p className="mt-3 text-[13px] text-destructive">{claudeConnection.lastError}</p>
          ) : null}

          {/* Primary action */}
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-[10px] border border-[#D97757]/18 bg-[#D97757]/[0.06] px-4 text-[14px] font-medium text-text-primary transition-all duration-150 hover:bg-[#D97757]/[0.11] active:bg-[#D97757]/[0.15]"
              onClick={() => void handleContinueWithClaude()}
            >
              {copiedValue === "full" ? (
                <>
                  <Check size={14} weight="bold" className="text-[#22C55E]" />
                  Copied — opening Claude
                </>
              ) : (
                <>
                  Continue with
                  <img src="/claude-full.svg" alt="Claude" className="h-[13px]" />
                  <ArrowRight size={13} weight="bold" className="text-text-tertiary" />
                </>
              )}
            </button>
            <button
              type="button"
              className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-[10px] border border-[#D97757]/15 bg-[#D97757]/[0.04] px-4 text-[13px] font-medium text-[#D97757] transition-all duration-150 hover:bg-[#D97757]/[0.09]"
              onClick={() => void handleCopy(buildFullSetupPrompt(), "full")}
            >
              <CopySimple size={13} weight="bold" />
              {copiedValue === "full" ? "Copied!" : "Copy prompt"}
            </button>
            <a
              href={claudeSetupHref}
              className="inline-flex h-9 items-center rounded-[10px] border border-border px-4 text-[14px] font-medium text-text-primary transition-all duration-150 hover:bg-bg-subtle"
            >
              Setup guide
            </a>
            {claudeConnection && claudeConnection.status !== "disconnected" ? (
              <button
                type="button"
                className="inline-flex h-9 cursor-pointer items-center rounded-[10px] border border-border px-4 text-[14px] font-medium text-text-primary transition-all duration-150 hover:bg-bg-subtle"
                disabled={isClaudeDisconnecting}
                onClick={() => setDisconnectDialog("claude")}
              >
                {isClaudeDisconnecting ? "Disconnecting..." : "Disconnect"}
              </button>
            ) : null}
          </div>

          {claudeConnection?.lastHandshakeAt ? (
            <p className="mt-3 text-[12px] text-text-tertiary">
              Last synced {formatTimestamp(claudeConnection.lastHandshakeAt)}
            </p>
          ) : null}

          <div className="mt-1">
            <FeedbackText feedback={claudeFeedback} />
          </div>

          {/* API key section */}
          <div className="mt-6 border-t border-border-subtle pt-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-[13px] font-medium text-text-primary">Anthropic API key</div>
                <div className="mt-0.5 text-[12px] text-text-secondary">
                  Optional. Store your key to enable Stage-managed background runs.
                </div>
              </div>
              <a
                href="https://console.anthropic.com"
                target="_blank"
                rel="noreferrer"
                className="text-[13px] font-medium text-accent transition-colors hover:text-accent-hover"
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

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3 text-[13px] text-text-secondary">
                <label className="inline-flex items-center gap-2">
                  <span>Model</span>
                  <select
                    className="rounded-[8px] border border-border-subtle bg-white px-2 py-1 text-[13px] text-text-primary"
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

            <div className="mt-2">
              <FeedbackText feedback={anthropicFeedback} />
            </div>
          </div>
        </div>
      </div>

      <ToolCard
        iconSrc="/figma.svg"
        iconBackground="#F5F0FF"
        title="Figma in Claude"
        description="Open wireframes, iterate outputs, and push updates through Claude with Figma tooling."
        tool={claudeTools.figma}
        available={claudeConnection?.figmaInClaude === "claimed"}
        setupHref={claudeSetupHref}
        primaryLabel="Open Claude setup"
      />

      <ToolCard
        iconSrc="/notion.svg"
        iconBackground="#F5F5F5"
        title="Notion in Claude"
        description="Export research and strategy artifacts to Notion through Claude."
        tool={claudeTools.notion}
        available={claudeConnection?.notionInClaude === "claimed"}
        setupHref={claudeSetupHref}
        primaryLabel="Open Claude setup"
      />

      <Dialog.Root
        open={disconnectDialog !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDisconnectDialog(null);
          }
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

      <Dialog.Root
        open={googleSheetHelpDialogOpen}
        onOpenChange={onGoogleSheetHelpDialogOpenChange}
      >
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

      <div className="settings-card">
        <div className="card-body">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="card-heading-row">
                <img className="integration-provider-icon" src={stripeIcon} alt="" />
                <div className="card-heading sf">Stripe Connect</div>
              </div>
              <div className="card-desc">
                Connect a client-facing Stripe account so Stage can sync invoices and payments.
              </div>
            </div>
            {stripeGuideHref ? (
              <a
                href={stripeGuideHref}
                target="_blank"
                rel="noreferrer"
                className="text-[13px] font-medium text-accent transition-colors hover:text-accent-hover"
              >
                View guide
              </a>
            ) : null}
          </div>

          <div className="rounded-[10px] border border-border-subtle bg-bg-subtle px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`stripe-dot ${stripeConnection?.status === "error" ? "bg-[#E54D4D]" : ""}`}
              />
              <span className="text-[14px] text-text-primary">
                {stripeConnection?.displayName ||
                  stripeConnection?.accountEmail ||
                  "No Stripe account connected"}
              </span>
              <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-text-secondary">
                {stripeStatusLabel}
              </span>
            </div>

            <div className="mt-3 space-y-1 text-[13px] text-text-secondary">
              <div>
                Account email:{" "}
                <span className="text-text-primary">{stripeConnection?.accountEmail || "—"}</span>
              </div>
              <div>
                Last sync:{" "}
                <span className="text-text-primary">
                  {formatTimestamp(stripeConnection?.lastSyncedAt)}
                </span>
              </div>
              {stripeErrorMessage ? (
                <div className="text-[#E07070]">{stripeErrorMessage}</div>
              ) : null}
            </div>
          </div>
        </div>
        <div className="card-footer">
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
              {isStripeConnecting ? "Redirecting..." : stripeConnected ? "Reconnect" : "Connect Stripe"}
            </button>
            <button
              type="button"
              className="btn-outline"
              disabled={!stripeConnected || isStripeSyncing}
              onClick={onStripeSync}
            >
              {isStripeSyncing ? "Syncing..." : "Sync data"}
            </button>
            <button
              type="button"
              className="btn-outline"
              disabled={!stripeConnected || isStripeDisconnecting}
              onClick={() => setDisconnectDialog("stripe")}
            >
              {isStripeDisconnecting ? "Disconnecting..." : "Disconnect"}
            </button>
          </div>
        </div>
      </div>

      <div className="settings-card">
        <div className="card-body">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="card-heading-row">
                <img className="integration-provider-icon" src={googleSheetsIcon} alt="" />
                <div className="card-heading sf">Google Sheets (CSV)</div>
              </div>
              <div className="card-desc">
                Paste a Google Sheets link that follows your template. Import manually whenever
                the sheet changes.
              </div>
            </div>
            {googleSheetsGuideHref ? (
              <a
                href={googleSheetsGuideHref}
                target="_blank"
                rel="noreferrer"
                className="text-[13px] font-medium text-accent transition-colors hover:text-accent-hover"
              >
                View guide
              </a>
            ) : null}
          </div>

          <label className="settings-label">Google Sheets URL</label>
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

          <div className="mt-4 rounded-[10px] border border-border-subtle bg-bg-subtle px-4 py-3 text-[13px] text-text-secondary">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`stripe-dot ${googleSheetConnection?.status === "error" ? "bg-[#E54D4D]" : ""}`}
              />
              <span className="text-text-primary">{googleSheetStatusLabel}</span>
            </div>
            <div className="mt-3 space-y-1">
              <div>
                Connected sheet:{" "}
                <span className="text-text-primary">
                  {googleSheetConnection?.sheetTitle || googleSheetConnection?.sheetUrl || "—"}
                </span>
              </div>
              <div>
                Last import:{" "}
                <span className="text-text-primary">
                  {formatTimestamp(googleSheetConnection?.lastImportedAt)}
                </span>
              </div>
              {googleSheetConnection?.lastImportError ? (
                <div className="text-[#E07070]">{googleSheetConnection.lastImportError}</div>
              ) : null}
            </div>
          </div>
        </div>
        <div className="card-footer">
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
              {isGoogleSheetDisconnecting ? "Disconnecting..." : "Disconnect"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ToolCard({
  iconSrc,
  iconBackground,
  title,
  description,
  tool,
  available,
  setupHref,
  primaryLabel,
}: {
  iconSrc: string;
  iconBackground: string;
  title: string;
  description: string;
  tool: ClaudeToolSummary;
  available: boolean;
  setupHref: string;
  primaryLabel: string;
}) {
  return (
    <div className="settings-card">
      <div className="card-body">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px]"
              style={{ backgroundColor: iconBackground }}
            >
              <img src={iconSrc} alt="" className="h-5 w-5 object-contain" />
            </div>
            <div>
              <div className="card-heading sf">{title}</div>
              <div className="text-[13px] text-text-secondary">
                {available ? "Connected and ready" : "Not connected yet"}
              </div>
            </div>
          </div>
          <StatusPill
            label={available ? "Connected" : "Setup required"}
            tone={available ? "success" : "neutral"}
          />
        </div>

        <div className="card-desc mt-3">{description}</div>
        <div className="mt-3 space-y-1 text-[13px] text-text-secondary">
          <div>
            Last export: <span className="text-text-primary">{formatTimestamp(tool.lastExportAt)}</span>
          </div>
          <div>
            Last status:{" "}
            <span className="text-text-primary">{tool.lastExportStatus ? formatExportStatus(tool.lastExportStatus) : "Never"}</span>
          </div>
          {tool.lastError ? <div className="text-[#E07070]">{tool.lastError}</div> : null}
        </div>
      </div>
      <div className="card-footer">
        <span className="text-[13px] text-text-secondary">
          {tool.destinationLabel || tool.lastExportUrl || "Connect through the Claude setup page."}
        </span>
        <a href={setupHref} className="btn-save">
          {primaryLabel}
        </a>
      </div>
    </div>
  );
}

function StatusPill({
  label,
  tone,
}: {
  label: string;
  tone: "success" | "warning" | "neutral";
}) {
  const className =
    tone === "success"
      ? "bg-[#EDFCF2] text-[#22C55E]"
      : tone === "warning"
        ? "bg-[#FEF9EC] text-[#D4890A]"
        : "bg-bg-subtle text-text-secondary";

  return <span className={`rounded-full px-2.5 py-1 text-[12px] font-medium ${className}`}>{label}</span>;
}

function formatClaudeStatusLabel(connection: ClaudeConnectionSummary) {
  if (!connection || connection.status === "disconnected") {
    return "Not connected";
  }
  if (connection.status === "error") {
    return "Needs attention";
  }
  if (connection.status === "connected" && connection.stageApiVerified) {
    return "Connected";
  }
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
  if (!status) {
    return "Not connected";
  }

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
  if (!message) {
    return null;
  }

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

  if (/access[\s_-]?denied|forbidden|not authorized|unauthorized/i.test(message)) {
    return "Access denied.";
  }

  if (/oauth|client_id|client_secret|redirect_uri|webhook|secret|signature/i.test(message)) {
    return "Stripe needs attention before it can connect.";
  }

  return message;
}

function formatTimestamp(value: number | null | undefined) {
  if (!value) {
    return "Never";
  }

  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
