import * as Dialog from "@radix-ui/react-dialog";
import { useState } from "react";
import { Code, FileText, Sparkle } from "@phosphor-icons/react";
import googleSheetsIcon from "@/assets/icons/google-sheets.svg";
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

type DisconnectTarget = "claude" | "figma" | "notion" | "google-sheets" | null;

function isNativeConnected(connection: NativeIntegrationSummary) {
  return connection?.status === "active" || connection?.status === "pending";
}

function isSheetConnected(connection: GoogleSheetSummary) {
  return connection?.status === "active" || connection?.status === "pending";
}

function Toggle({ active, busy }: { active: boolean; busy?: boolean }) {
  return (
    <span className={`integration-toggle ${active ? "active" : ""} ${busy ? "busy" : ""}`}>
      <span />
    </span>
  );
}

export function IntegrationsTab(props: IntegrationsTabProps) {
  const {
    active,
    isPro,
    claudeConnection,
    notionConnection,
    figmaConnection,
    isClaudeDisconnecting,
    isNotionConnecting,
    isNotionDisconnecting,
    isFigmaConnecting,
    isFigmaDisconnecting,
    claudeSetupHref,
    onClaudeDisconnect,
    onNotionConnect,
    onNotionDisconnect,
    onFigmaConnect,
    onFigmaDisconnect,
    googleSheetsGuideHref,
    googleSheetConnection,
    isGoogleSheetConnecting,
    isGoogleSheetDisconnecting,
    onGoogleSheetConnect,
    onGoogleSheetDisconnect,
    onOpenDeveloperSettings,
    onUpgradeClick,
  } = props;
  const [disconnectDialog, setDisconnectDialog] = useState<DisconnectTarget>(null);

  const claudeConnected =
    claudeConnection?.status === "connected" && claudeConnection.stageApiVerified;
  const figmaConnected = isNativeConnected(figmaConnection);
  const notionConnected = isNativeConnected(notionConnection);
  const googleSheetsConnected = isSheetConnected(googleSheetConnection);

  const disconnectCopy =
    disconnectDialog === "claude"
      ? {
          title: "Are you sure, you want to disconnect Claude?",
          description:
            "You are in the process of disconnecting from Claude. Please be aware that all operations and functionalities associated with Claude will be temporarily halted during this disconnection. Ensure that you have saved any important work before proceeding.",
          label: isClaudeDisconnecting ? "Disconnecting..." : "Disconnect Claude",
          onConfirm: onClaudeDisconnect,
          busy: isClaudeDisconnecting,
        }
      : disconnectDialog === "figma"
        ? {
            title: "Are you sure, you want to disconnect Figma?",
            description:
              "This removes the native Figma connection for this workspace. You can reconnect it later from Integrations.",
            label: isFigmaDisconnecting ? "Disconnecting..." : "Disconnect Figma",
            onConfirm: onFigmaDisconnect,
            busy: isFigmaDisconnecting,
          }
        : disconnectDialog === "notion"
          ? {
              title: "Are you sure, you want to disconnect Notion?",
              description:
                "This removes the native Notion connection for this workspace. You can reconnect it later from Integrations.",
              label: isNotionDisconnecting ? "Disconnecting..." : "Disconnect Notion",
              onConfirm: onNotionDisconnect,
              busy: isNotionDisconnecting,
            }
          : {
              title: "Are you sure, you want to disconnect Google Sheets?",
              description:
                "This will remove the connected sheet link and stop future imports until you connect it again.",
              label: isGoogleSheetDisconnecting ? "Disconnecting..." : "Disconnect Google Sheets",
              onConfirm: onGoogleSheetDisconnect,
              busy: isGoogleSheetDisconnecting,
            };

  function handleClaudeToggle() {
    if (claudeConnected) {
      setDisconnectDialog("claude");
      return;
    }
    if (!isPro) {
      onUpgradeClick();
      return;
    }
    window.open(claudeSetupHref, "_blank", "noopener,noreferrer");
  }

  function handleGoogleSheetsToggle() {
    if (googleSheetsConnected) {
      setDisconnectDialog("google-sheets");
      return;
    }
    if (googleSheetsGuideHref) {
      window.open(googleSheetsGuideHref, "_blank", "noopener,noreferrer");
      return;
    }
    onGoogleSheetConnect();
  }

  return (
    <div className={`tab-content ${active ? "active" : ""}`}>
      <div className="integrations-page-grid">
        <div className="settings-section-card">
          <div className="settings-section-title">Connected</div>
          <button
            type="button"
            className="integration-row"
            onClick={handleClaudeToggle}
          >
            <span className="integration-row-main">
              <Sparkle size={18} weight="fill" className="integration-claude-icon" />
              <span>
                <span className="integration-row-title">Claude</span>
                <span className="integration-row-description">Research, strategy, and generation</span>
              </span>
            </span>
            <Toggle active={claudeConnected} busy={isClaudeDisconnecting} />
          </button>
        </div>

        <div className="settings-section-card">
          <div className="settings-section-title">Available Tools</div>
          <div className="integration-list">
            <button type="button" className="integration-row" onClick={onOpenDeveloperSettings}>
              <span className="integration-row-main">
                <Code size={18} weight="bold" />
                <span>
                  <span className="integration-row-title">Codex</span>
                  <span className="integration-row-description">Research, strategy, and generation</span>
                </span>
              </span>
              <Toggle active={false} />
            </button>

            <button
              type="button"
              className="integration-row"
              onClick={() => (figmaConnected ? setDisconnectDialog("figma") : onFigmaConnect())}
            >
              <span className="integration-row-main">
                <img src="/logos/integrations/figma.svg" alt="" className="integration-provider-mark" />
                <span>
                  <span className="integration-row-title">Figma</span>
                  <span className="integration-row-description">Native design export and handoff</span>
                </span>
              </span>
              <Toggle active={figmaConnected} busy={isFigmaConnecting || isFigmaDisconnecting} />
            </button>

            <button
              type="button"
              className="integration-row"
              onClick={() => (notionConnected ? setDisconnectDialog("notion") : onNotionConnect())}
            >
              <span className="integration-row-main">
                <FileText size={18} weight="bold" />
                <span>
                  <span className="integration-row-title">Notion</span>
                  <span className="integration-row-description">Native document export and review</span>
                </span>
              </span>
              <Toggle active={notionConnected} busy={isNotionConnecting || isNotionDisconnecting} />
            </button>

            <button type="button" className="integration-row" onClick={handleGoogleSheetsToggle}>
              <span className="integration-row-main">
                <img src={googleSheetsIcon} alt="" className="integration-provider-mark" />
                <span>
                  <span className="integration-row-title">Google Sheets</span>
                  <span className="integration-row-description">Import transactions</span>
                </span>
              </span>
              <Toggle
                active={googleSheetsConnected}
                busy={isGoogleSheetConnecting || isGoogleSheetDisconnecting}
              />
            </button>
          </div>
        </div>
      </div>

      <Dialog.Root
        open={disconnectDialog !== null}
        onOpenChange={(open) => {
          if (!open) setDisconnectDialog(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="settings-modal-overlay integrations-disconnect-overlay" />
          <Dialog.Content className="settings-modal-card integrations-disconnect-modal">
            <Sparkle size={32} weight="fill" className="integration-claude-icon" />
            <Dialog.Title className="settings-modal-title">{disconnectCopy.title}</Dialog.Title>
            <p className="settings-modal-copy">{disconnectCopy.description}</p>
            <div className="settings-modal-actions">
              <Dialog.Close asChild>
                <button type="button" className="btn-outline" disabled={disconnectCopy.busy}>
                  Cancel
                </button>
              </Dialog.Close>
              <button
                type="button"
                className="btn-delete"
                disabled={disconnectCopy.busy}
                onClick={() => {
                  disconnectCopy.onConfirm();
                  setDisconnectDialog(null);
                }}
              >
                {disconnectCopy.label}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
