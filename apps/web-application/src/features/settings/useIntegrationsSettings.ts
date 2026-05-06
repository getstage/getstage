import { useEffect, useMemo, useState } from "react";
import {
  useAction as useConvexAction,
  useMutation as useConvexMutation,
  useQuery as useConvexQuery,
} from "convex/react";
import type { AuthUser } from "@/lib/auth";
import { SAVED_FEEDBACK, useFeedback } from "@/hooks/useFeedback";
import { api } from "@/lib/convex";
import { trackDatafastGoal } from "@/lib/datafast";
import { googleSheetsUrlSchema } from "@/lib/validation";
import type {
  AnthropicCredentialSummary,
  ClaudeConnectionSummary,
  ClaudeToolSummary,
  NativeIntegrationSummary,
} from "@/types/settings";
import {
  GOOGLE_SHEETS_TRANSACTIONS_DIALOG_MESSAGE,
  GOOGLE_SHEETS_TRANSACTIONS_DIALOG_TITLE,
  hasGoogleSheetGid,
  shouldShowTransactionsTabDialog,
} from "./googleSheetsErrors";
import { showFriendlyFeedback } from "./feedback";

export const CLAUDE_INSTALL_COMMAND = "npx skills add getstage/agent-mode";
export const STAGE_API_BASE_URL =
  import.meta.env.VITE_CONVEX_SITE_URL ?? "https://reliable-bullfrog-917.convex.site";

type IntegrationsSettingsInput = {
  user: AuthUser | null;
  enabled: boolean;
  isPro: boolean;
};

function buildClaudeSetupHref(source: "settings" | "onboarding") {
  return `/agents/claude?source=${source}`;
}

function buildVerifyPrompt(connection: ClaudeConnectionSummary | null) {
  if (!connection?.id) {
    return null;
  }

  return [
    "Use the installed Stage skill and verify that Claude can talk to Stage.",
    `Handshake connectionId "${connection.id}" with client "claude_code".`,
    'If Notion MCP is available set notionMcp=true. If Figma MCP is available set figmaMcp=true.',
    "Then tell me whether the handshake succeeded.",
  ].join(" ");
}

export function useIntegrationsSettings({ user, enabled, isPro }: IntegrationsSettingsInput) {
  const stripeConnection = useConvexQuery(
    api.integrations.stripeConnect.getStripeConnectionStatus,
    !user || !enabled ? "skip" : {},
  );
  const sheetConnections = useConvexQuery(
    api.integrations.googleSheets.getSheetConnectionStatus,
    !user || !enabled ? "skip" : {},
  );
  const claudeState = useConvexQuery(
    api.agentConnections.getClaudeConnectionSummary,
    !user || !enabled ? "skip" : {},
  ) as
    | {
        connection: ClaudeConnectionSummary;
        tools: {
          figma: ClaudeToolSummary;
          notion: ClaudeToolSummary;
        };
      }
    | undefined;
  const nativeConnections = useConvexQuery(
    api.integrations.contentPlatforms.getNativeConnectionStatus,
    !user || !enabled ? "skip" : {},
  ) as
    | {
        notion: NativeIntegrationSummary;
        figma: NativeIntegrationSummary;
      }
    | undefined;
  const anthropicCredential = useConvexQuery(
    api.aiCredentials.getAnthropicCredentialSummary,
    !user || !enabled ? "skip" : {},
  ) as AnthropicCredentialSummary | undefined;

  const connectSheet = useConvexMutation(api.integrations.googleSheets.connectSheet);
  const disconnectSheet = useConvexMutation(api.integrations.googleSheets.disconnectSheet);
  const disconnectStripe = useConvexAction(api.integrations.stripeConnect.disconnectStripe);
  const startStripeConnect = useConvexAction(api.integrations.stripeConnect.startConnect);
  const syncStripeData = useConvexAction(api.integrations.stripeConnect.syncStripeData);
  const runSheetImport = useConvexAction(api.integrations.googleSheets.runSheetImport);
  const disconnectClaude = useConvexMutation(api.agentConnections.disconnectClaude);
  const disconnectNativeIntegration = useConvexMutation(api.integrations.contentPlatforms.disconnectConnection);
  const startNativeOAuthConnect = useConvexAction(api.integrations.contentPlatforms.startOAuthConnect);
  const createPendingConnection = useConvexMutation(api.agentConnections.createPendingClaudeConnection);
  const saveAnthropicKey = useConvexMutation(api.aiCredentials.saveAnthropicKey);
  const testAnthropicKey = useConvexAction(api.aiCredentials.testAnthropicKey);

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
  const [isClaudeDisconnecting, setIsClaudeDisconnecting] = useState(false);
  const [isNotionConnecting, setIsNotionConnecting] = useState(false);
  const [isNotionDisconnecting, setIsNotionDisconnecting] = useState(false);
  const [isFigmaConnecting, setIsFigmaConnecting] = useState(false);
  const [isFigmaDisconnecting, setIsFigmaDisconnecting] = useState(false);
  const [anthropicApiKey, setAnthropicApiKey] = useState("");
  const [anthropicModelPreference, setAnthropicModelPreference] = useState("claude-sonnet-4-5");
  const [isAnthropicSaving, setIsAnthropicSaving] = useState(false);
  const [isAnthropicTesting, setIsAnthropicTesting] = useState(false);
  const { feedback: stripeFeedback, showFeedback: showStripeFeedback } = useFeedback();
  const { feedback: googleSheetFeedback, showFeedback: showGoogleSheetFeedback } = useFeedback();
  const { feedback: claudeFeedback, showFeedback: showClaudeFeedback } = useFeedback();
  const { feedback: anthropicFeedback, showFeedback: showAnthropicFeedback } = useFeedback();
  const { feedback: notionFeedback, showFeedback: showNotionFeedback } = useFeedback();
  const { feedback: figmaFeedback, showFeedback: showFigmaFeedback } = useFeedback();

  const claudeConnection = claudeState?.connection ?? null;
  const notionConnection = nativeConnections?.notion ?? null;
  const figmaConnection = nativeConnections?.figma ?? null;
  const claudeTools = useMemo(
    () => claudeState?.tools ?? { figma: defaultToolSummary(), notion: defaultToolSummary() },
    [claudeState?.tools],
  );

  // Auto-create a pending Claude connection so the verify prompt always has a connectionId
  useEffect(() => {
    if (!enabled || !user || !isPro || claudeState === undefined || claudeState.connection) {
      return;
    }

    void createPendingConnection({ source: "settings" });
  }, [enabled, user, isPro, claudeState, createPendingConnection]);

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
    const params = new URLSearchParams(window.location.search);
    const provider = params.get("integration");
    const status = params.get("integration_status");
    if ((provider !== "notion" && provider !== "figma") || !status) {
      return;
    }

    const showFeedback = provider === "notion" ? showNotionFeedback : showFigmaFeedback;
    if (status === "connected") {
      showFeedback(SAVED_FEEDBACK);
    } else {
      showFeedback({
        kind: "error",
        message:
          provider === "notion"
            ? "Could not complete Notion connection."
            : "Could not complete Figma connection.",
      });
    }

    params.delete("integration");
    params.delete("integration_status");
    params.delete("reason");
    const nextSearch = params.toString();
    const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}${window.location.hash}`;
    window.history.replaceState({}, "", nextUrl);
  }, [showFigmaFeedback, showNotionFeedback]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    setGoogleSheetUrl(sheetConnections?.googleSheet?.sheetUrl ?? "");
  }, [enabled, sheetConnections?.googleSheet?.sheetUrl]);

  useEffect(() => {
    if (!enabled || !anthropicCredential) {
      return;
    }

    setAnthropicModelPreference(anthropicCredential.modelPreference);
  }, [anthropicCredential, enabled]);

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
      trackDatafastGoal("google_sheets_connected", {
        source: "settings_integrations",
        import_type: "google_sheet",
      });
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

  async function handleClaudeDisconnect() {
    setIsClaudeDisconnecting(true);
    try {
      await disconnectClaude({});
      showClaudeFeedback(SAVED_FEEDBACK);
    } catch (error) {
      showFriendlyFeedback(showClaudeFeedback, error, "Could not disconnect Claude.");
    } finally {
      setIsClaudeDisconnecting(false);
    }
  }

  async function handleNativeConnect(provider: "notion" | "figma") {
    const setLoading = provider === "notion" ? setIsNotionConnecting : setIsFigmaConnecting;
    const showFeedback = provider === "notion" ? showNotionFeedback : showFigmaFeedback;
    const fallback =
      provider === "notion"
        ? "Could not start Notion connection."
        : "Could not start Figma connection.";

    setLoading(true);
    try {
      const result = await startNativeOAuthConnect({ provider });
      if (!result.url) {
        throw new Error("OAuth URL is missing.");
      }
      window.location.assign(result.url);
    } catch (error) {
      showFriendlyFeedback(showFeedback, error, fallback);
      setLoading(false);
    }
  }

  async function handleNativeDisconnect(provider: "notion" | "figma") {
    const setLoading = provider === "notion" ? setIsNotionDisconnecting : setIsFigmaDisconnecting;
    const showFeedback = provider === "notion" ? showNotionFeedback : showFigmaFeedback;
    const fallback =
      provider === "notion"
        ? "Could not disconnect Notion."
        : "Could not disconnect Figma.";

    setLoading(true);
    try {
      await disconnectNativeIntegration({ provider });
      showFeedback(SAVED_FEEDBACK);
    } catch (error) {
      showFriendlyFeedback(showFeedback, error, fallback);
    } finally {
      setLoading(false);
    }
  }

  async function handleAnthropicSave() {
    const trimmed = anthropicApiKey.trim();
    if (!trimmed) {
      showAnthropicFeedback({
        kind: "error",
        message: "Enter an Anthropic API key first.",
      });
      return;
    }

    setIsAnthropicSaving(true);
    try {
      await saveAnthropicKey({
        apiKey: trimmed,
        modelPreference: anthropicModelPreference,
      });
      showAnthropicFeedback(SAVED_FEEDBACK);
    } catch (error) {
      showFriendlyFeedback(showAnthropicFeedback, error, "Could not save the Anthropic API key.");
    } finally {
      setIsAnthropicSaving(false);
    }
  }

  async function handleAnthropicTest() {
    setIsAnthropicTesting(true);
    try {
      await testAnthropicKey({
        apiKey: anthropicApiKey.trim() || undefined,
        modelPreference: anthropicModelPreference,
      });
      showAnthropicFeedback(SAVED_FEEDBACK);
    } catch (error) {
      showFriendlyFeedback(showAnthropicFeedback, error, "Could not validate the Anthropic API key.");
    } finally {
      setIsAnthropicTesting(false);
    }
  }

  return {
    stripeConnection: stripeConnection ?? null,
    sheetConnection: sheetConnections?.googleSheet ?? null,
    claudeConnection,
    notionConnection,
    figmaConnection,
    claudeTools,
    anthropicCredential:
      anthropicCredential ??
      ({
        provider: "anthropic",
        label: "claude",
        keyLast4: null,
        modelPreference: anthropicModelPreference,
        status: "untested",
        testedAt: null,
        hasSavedKey: false,
      } satisfies AnthropicCredentialSummary),
    stripeFeedback,
    googleSheetFeedback,
    claudeFeedback,
    anthropicFeedback,
    notionFeedback,
    figmaFeedback,
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
    isClaudeDisconnecting,
    isNotionConnecting,
    isNotionDisconnecting,
    isFigmaConnecting,
    isFigmaDisconnecting,
    anthropicApiKey,
    anthropicModelPreference,
    isAnthropicSaving,
    isAnthropicTesting,
    claudeSetupHref: buildClaudeSetupHref("settings"),
    claudeInstallCommand: CLAUDE_INSTALL_COMMAND,
    claudeVerifyPrompt: buildVerifyPrompt(claudeConnection),
    setGoogleSheetUrl,
    setGoogleSheetHelpDialogOpen,
    setAnthropicApiKey,
    setAnthropicModelPreference,
    handleStripeConnect,
    handleStripeSync,
    handleStripeDisconnect,
    handleGoogleSheetConnect,
    handleGoogleSheetImport,
    handleGoogleSheetDisconnect,
    handleClaudeDisconnect,
    handleNotionConnect: () => handleNativeConnect("notion"),
    handleNotionDisconnect: () => handleNativeDisconnect("notion"),
    handleFigmaConnect: () => handleNativeConnect("figma"),
    handleFigmaDisconnect: () => handleNativeDisconnect("figma"),
    handleAnthropicSave,
    handleAnthropicTest,
  };
}

function defaultToolSummary(): ClaudeToolSummary {
  return {
    availability: "unknown",
    lastExportAt: null,
    lastExportStatus: null,
    lastExportUrl: null,
    destinationLabel: null,
    lastError: null,
  };
}
