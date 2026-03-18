import { useEffect, useState } from "react";
import {
  useAction as useConvexAction,
  useMutation as useConvexMutation,
  useQuery as useConvexQuery,
} from "convex/react";
import type { AuthUser } from "@/lib/auth";
import { SAVED_FEEDBACK, useFeedback } from "@/hooks/useFeedback";
import { api } from "@/lib/convex";
import { googleSheetsUrlSchema } from "@/lib/validation";
import {
  GOOGLE_SHEETS_TRANSACTIONS_DIALOG_MESSAGE,
  GOOGLE_SHEETS_TRANSACTIONS_DIALOG_TITLE,
  hasGoogleSheetGid,
  shouldShowTransactionsTabDialog,
} from "./googleSheetsErrors";
import { showFriendlyFeedback } from "./feedback";

type IntegrationsSettingsInput = {
  user: AuthUser | null;
  enabled: boolean;
};

export function useIntegrationsSettings({ user, enabled }: IntegrationsSettingsInput) {
  const stripeConnection = useConvexQuery(
    api.stripeConnect.getStripeConnectionStatus,
    !user || !enabled ? "skip" : {},
  );
  const sheetConnections = useConvexQuery(
    api.googleSheets.getSheetConnectionStatus,
    !user || !enabled ? "skip" : {},
  );
  const connectSheet = useConvexMutation(api.googleSheets.connectSheet);
  const disconnectSheet = useConvexMutation(api.googleSheets.disconnectSheet);
  const disconnectStripe = useConvexAction(api.stripeConnect.disconnectStripe);
  const startStripeConnect = useConvexAction(api.stripeConnect.startConnect);
  const syncStripeData = useConvexAction(api.stripeConnect.syncStripeData);
  const runSheetImport = useConvexAction(api.googleSheets.runSheetImport);
  const [googleSheetUrl, setGoogleSheetUrl] = useState("");
  const [googleSheetHelpDialogOpen, setGoogleSheetHelpDialogOpen] = useState(false);
  const [googleSheetHelpDialogTitle, setGoogleSheetHelpDialogTitle] = useState(
    GOOGLE_SHEETS_TRANSACTIONS_DIALOG_TITLE,
  );
  const [googleSheetHelpDialogMessage, setGoogleSheetHelpDialogMessage] = useState(
    GOOGLE_SHEETS_TRANSACTIONS_DIALOG_MESSAGE,
  );
  const [isStripeConnecting, setIsStripeConnecting] = useState(false);
  const [isStripeSyncing, setIsStripeSyncing] = useState(false);
  const [isStripeDisconnecting, setIsStripeDisconnecting] = useState(false);
  const [isGoogleSheetConnecting, setIsGoogleSheetConnecting] = useState(false);
  const [isGoogleSheetImporting, setIsGoogleSheetImporting] = useState(false);
  const [isGoogleSheetDisconnecting, setIsGoogleSheetDisconnecting] = useState(false);
  const { feedback: stripeFeedback, showFeedback: showStripeFeedback } = useFeedback();
  const { feedback: googleSheetFeedback, showFeedback: showGoogleSheetFeedback } = useFeedback();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const stripeParam = params.get("stripe");

    if (stripeParam === "connected") {
      showStripeFeedback(SAVED_FEEDBACK);
    } else if (stripeParam === "error") {
      const reason = params.get("reason");
      showStripeFeedback({
        kind: "error",
        message:
          reason === "missing_code"
            ? "Stripe connection failed: no authorization code received. Please try again."
            : "Something went wrong connecting Stripe. Please try again.",
      });
    } else {
      return;
    }

    params.delete("stripe");
    params.delete("reason");
    const nextSearch = params.toString();
    const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}${window.location.hash}`;
    window.history.replaceState({}, "", nextUrl);
  }, [showStripeFeedback]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    setGoogleSheetUrl(sheetConnections?.googleSheet?.sheetUrl ?? "");
  }, [enabled, sheetConnections?.googleSheet?.sheetUrl]);

  function openGoogleSheetHelpDialog(title: string, message: string) {
    setGoogleSheetHelpDialogTitle(title);
    setGoogleSheetHelpDialogMessage(message);
    setGoogleSheetHelpDialogOpen(true);
  }

  async function handleStripeConnect() {
    setIsStripeConnecting(true);
    try {
      const result = await startStripeConnect({});
      if (!result.url) {
        throw new Error("Stripe Connect URL is missing.");
      }
      window.location.assign(result.url);
    } catch (error) {
      showFriendlyFeedback(
        showStripeFeedback,
        error,
        "Could not start Stripe Connect right now.",
      );
      setIsStripeConnecting(false);
    }
  }

  async function handleStripeSync() {
    setIsStripeSyncing(true);
    try {
      await syncStripeData({});
      showStripeFeedback(SAVED_FEEDBACK);
    } catch (error) {
      showFriendlyFeedback(showStripeFeedback, error, "Could not sync Stripe data.");
    } finally {
      setIsStripeSyncing(false);
    }
  }

  async function handleStripeDisconnect() {
    setIsStripeDisconnecting(true);
    try {
      await disconnectStripe({});
      showStripeFeedback(SAVED_FEEDBACK);
    } catch (error) {
      showFriendlyFeedback(showStripeFeedback, error, "Could not disconnect Stripe.");
    } finally {
      setIsStripeDisconnecting(false);
    }
  }

  async function handleGoogleSheetConnect() {
    const parsed = googleSheetsUrlSchema.safeParse(googleSheetUrl);
    if (!parsed.success) {
      showGoogleSheetFeedback({
        kind: "error",
        message:
          parsed.error.issues[0]?.message ?? "Please paste a valid Google Sheets document URL.",
      });
      return;
    }

    const normalizedUrl = parsed.data;
    if (!hasGoogleSheetGid(normalizedUrl)) {
      showGoogleSheetFeedback({
        kind: "error",
        message: "Please paste the full URL from the Transactions tab, not Share -> Copy link.",
      });
      openGoogleSheetHelpDialog(
        GOOGLE_SHEETS_TRANSACTIONS_DIALOG_TITLE,
        GOOGLE_SHEETS_TRANSACTIONS_DIALOG_MESSAGE,
      );
      return;
    }

    setIsGoogleSheetConnecting(true);
    try {
      await connectSheet({
        sheetUrl: normalizedUrl,
        templateVersion: "v1",
      });
      setGoogleSheetUrl(normalizedUrl);
      showGoogleSheetFeedback(SAVED_FEEDBACK);
    } catch (error) {
      showFriendlyFeedback(
        showGoogleSheetFeedback,
        error,
        "Could not connect that Google Sheet.",
      );
    } finally {
      setIsGoogleSheetConnecting(false);
    }
  }

  async function handleGoogleSheetImport() {
    setIsGoogleSheetImporting(true);
    try {
      await runSheetImport({
        sourceType: "google_sheet",
      });
      showGoogleSheetFeedback(SAVED_FEEDBACK);
    } catch (error) {
      if (shouldShowTransactionsTabDialog(error)) {
        openGoogleSheetHelpDialog(
          GOOGLE_SHEETS_TRANSACTIONS_DIALOG_TITLE,
          GOOGLE_SHEETS_TRANSACTIONS_DIALOG_MESSAGE,
        );
      }
      showFriendlyFeedback(
        showGoogleSheetFeedback,
        error,
        "Could not import Google Sheets right now.",
      );
    } finally {
      setIsGoogleSheetImporting(false);
    }
  }

  async function handleGoogleSheetDisconnect() {
    setIsGoogleSheetDisconnecting(true);
    try {
      await disconnectSheet({
        sourceType: "google_sheet",
      });
      showGoogleSheetFeedback(SAVED_FEEDBACK);
      setGoogleSheetUrl("");
    } catch (error) {
      showFriendlyFeedback(
        showGoogleSheetFeedback,
        error,
        "Could not disconnect Google Sheets.",
      );
    } finally {
      setIsGoogleSheetDisconnecting(false);
    }
  }

  return {
    stripeConnection: stripeConnection ?? null,
    sheetConnection: sheetConnections?.googleSheet ?? null,
    stripeFeedback,
    googleSheetFeedback,
    googleSheetUrl,
    googleSheetHelpDialogOpen,
    googleSheetHelpDialogTitle,
    googleSheetHelpDialogMessage,
    isStripeConnecting,
    isStripeSyncing,
    isStripeDisconnecting,
    isGoogleSheetConnecting,
    isGoogleSheetImporting,
    isGoogleSheetDisconnecting,
    setGoogleSheetUrl,
    setGoogleSheetHelpDialogOpen,
    handleStripeConnect,
    handleStripeSync,
    handleStripeDisconnect,
    handleGoogleSheetConnect,
    handleGoogleSheetImport,
    handleGoogleSheetDisconnect,
  };
}
