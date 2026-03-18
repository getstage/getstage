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
