import * as Dialog from "@radix-ui/react-dialog";
import { useState } from "react";
import googleSheetsIcon from "@/assets/icons/google-sheets.svg";
import stripeIcon from "@/assets/icons/stripe.svg";
import { FeedbackText } from "@/components/settings/FeedbackText";
import type { SaveFeedback } from "@/hooks/useFeedback";
import type {
  GoogleSheetSummary,
  StripeConnectionSummary,
} from "@/types/settings";

type IntegrationsTabProps = {
  active: boolean;
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

export function IntegrationsTab({
  active,
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
  const [disconnectDialog, setDisconnectDialog] = useState<"stripe" | "google-sheets" | null>(
    null,
  );

  const disconnectCopy =
    disconnectDialog === "stripe"
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

  return (
    <div className={`tab-content ${active ? "active" : ""}`}>
      {/* Claude AI integration card */}
      <div className="settings-card">
        <div className="card-body">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px]"
                style={{ backgroundColor: "#FDF0E8" }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M16.98 3H7.02C4.804 3 3 4.804 3 7.02v9.96C3 19.196 4.804 21 7.02 21h9.96C19.196 21 21 19.196 21 16.98V7.02C21 4.804 19.196 3 16.98 3Z"
                    fill="#D97757"
                  />
                  <path
                    d="M13.14 8.429 10.7 15.571h1.68l2.44-7.142h-1.68Zm-2.96 0L7.74 15.571h1.68l2.44-7.142H9.18Z"
                    fill="#FDF0E8"
                  />
                </svg>
              </div>
              <div>
                <div className="card-heading sf">Claude AI</div>
                <div className="text-[13px] text-text-secondary">Anthropic</div>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#34C759]" />
              <span className="text-[13px] font-medium text-text-secondary">Connected</span>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <div>
              <label className="settings-label">API key</label>
              <div className="flex gap-2">
                <input
                  className="settings-input"
                  type="password"
                  value="sk-ant-api03-xxxx...xxxx"
                  readOnly
                />
                <button type="button" className="btn-outline shrink-0">
                  Test
                </button>
              </div>
            </div>
            <div className="flex gap-6 text-[13px] text-text-secondary">
              <div>
                Usage this month: <span className="text-text-primary">$12.40</span>
              </div>
              <div>
                Model preference: <span className="text-text-primary">Claude Sonnet 4</span>
              </div>
            </div>
          </div>
        </div>
        <div className="card-footer">
          <a
            href="https://console.anthropic.com"
            target="_blank"
            rel="noreferrer"
            className="text-[13px] font-medium text-accent transition-colors hover:text-accent-hover"
          >
            Manage on Anthropic &rarr;
          </a>
          <button type="button" className="btn-save">
            Save
          </button>
        </div>
      </div>

      {/* Figma integration card */}
      <div className="settings-card">
        <div className="card-body">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px]"
                style={{ backgroundColor: "#F5F0FF" }}
              >
                <svg width="16" height="22" viewBox="0 0 38 57" fill="none" aria-hidden="true">
                  <path
                    d="M19 28.5a9.5 9.5 0 1 1 19 0 9.5 9.5 0 0 1-19 0z"
                    fill="#1ABCFE"
                  />
                  <path
                    d="M0 47.5A9.5 9.5 0 0 1 9.5 38H19v9.5a9.5 9.5 0 1 1-19 0z"
                    fill="#0ACF83"
                  />
                  <path
                    d="M19 0v19h9.5a9.5 9.5 0 1 0 0-19H19z"
                    fill="#FF7262"
                  />
                  <path
                    d="M0 9.5A9.5 9.5 0 0 0 9.5 19H19V0H9.5A9.5 9.5 0 0 0 0 9.5z"
                    fill="#F24E1E"
                  />
                  <path
                    d="M0 28.5A9.5 9.5 0 0 0 9.5 38H19V19H9.5A9.5 9.5 0 0 0 0 28.5z"
                    fill="#A259FF"
                  />
                </svg>
              </div>
              <div>
                <div className="card-heading sf">Figma</div>
                <div className="text-[13px] text-text-secondary">sam@stage.design</div>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#34C759]" />
              <span className="text-[13px] font-medium text-text-secondary">Connected</span>
            </div>
          </div>

          <div className="card-desc mt-3">
            Import designs, extract design systems, and push wireframes to Figma.
          </div>
          <div className="mt-3 text-[13px] text-text-secondary">
            Last sync: <span className="text-text-primary">2 hours ago</span>
          </div>
        </div>
        <div className="card-footer">
          <button
            type="button"
            className="text-[13px] font-medium text-text-secondary transition-colors hover:text-text-primary"
          >
            Disconnect
          </button>
          <button type="button" className="btn-save">
            Sync now
          </button>
        </div>
      </div>

      {/* Notion integration card */}
      <div className="settings-card">
        <div className="card-body">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px]"
                style={{ backgroundColor: "#F5F5F5" }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M4.46 3.12c.58.47.8.44 1.89.37l10.29-.62c.22 0 .04-.22-.04-.25l-1.71-1.24c-.33-.25-.77-.52-1.61-.45L3.24 1.87c-.36.03-.44.22-.29.36l1.51.89Zm.6 2.19v10.83c0 .58.29.8.95.76l11.29-.64c.66-.04.73-.44.73-.91V4.62c0-.47-.18-.69-.58-.66l-11.8.67c-.44.04-.59.25-.59.68Zm11.14.43c.07.33 0 .66-.33.69l-.55.11v8.01c-.47.26-.92.4-1.28.4-.59 0-.73-.18-1.17-.73l-3.58-5.62v5.44l1.14.26s0 .66-.92.66l-2.53.15c-.07-.15 0-.51.26-.58l.66-.18V9.04l-.92-.07c-.07-.33.11-.8.62-.84l2.72-.18 3.72 5.69V9.27l-.95-.11c-.08-.4.22-.69.58-.73l2.53-.15Zm-14.06-4L13.5.8c1.32-.11 1.65-.04 2.47.55l3.41 2.39c.55.4.73.51.73.94v13.43c0 .84-.29 1.32-1.32 1.39l-12.03.73C2.18 20.27 1.8 20.09 1.47 19.67L.18 17.98c-.36-.47-.51-.84-.51-1.24V2.69c0-.55.29-1.02.95-1.02v.07Z"
                    fill="#000"
                  />
                </svg>
              </div>
              <div>
                <div className="card-heading sf">Notion</div>
                <div className="text-[13px] text-text-secondary">sam@stage.design</div>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#34C759]" />
              <span className="text-[13px] font-medium text-text-secondary">Connected</span>
            </div>
          </div>

          <div className="card-desc mt-3">
            Export research and strategy documents as fully formatted Notion pages.
          </div>
          <div className="mt-3 text-[13px] text-text-secondary">
            Last export: <span className="text-text-primary">1 day ago</span>
          </div>
        </div>
        <div className="card-footer">
          <button
            type="button"
            className="text-[13px] font-medium text-text-secondary transition-colors hover:text-text-primary"
          >
            Disconnect
          </button>
          <button type="button" className="btn-save">
            Export now
          </button>
        </div>
      </div>

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
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-32px)] max-w-[460px] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-7 shadow-xl">
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
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-32px)] max-w-[460px] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-7 shadow-xl">
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
