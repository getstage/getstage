import { useEffect, useMemo, useState } from "react";
import {
  useAction as useConvexAction,
  useConvexAuth,
  useMutation as useConvexMutation,
  useQuery as useConvexQuery,
} from "convex/react";
import type { PaperConnectionStatusResponse, ProviderId } from "@stage/data-ops/contracts";
import { useProviderRefresh, useProviderStatus } from "@/hooks/engine/useProviderStatus";
import { useProviderPreferences } from "@/hooks/engine/useProviderPreferences";
import { api } from "@/lib/convex";
import {
  googleSheetsIntegrationToRow,
  nativeIntegrationToRow,
  paperIntegrationToRow,
  providerToIntegrationRow,
} from "@/lib/settings/providerIntegrationRows";
import { isProviderCliReady } from "@/lib/settings/providerCliSetup";
import { openExternalLink } from "@/lib/settings/openExternalLink";
import type { IntegrationRowModel } from "@/types/settings/integrations";

// One place for connecting tools (Claude/Codex CLIs, Figma, Notion, Paper, Google Sheets).
// Used by Settings → Integrations and the onboarding Tech Stack step.
export function useToolConnections() {
  const { isAuthenticated } = useConvexAuth();
  const providers = useProviderStatus();
  const providerRefresh = useProviderRefresh();
  const providerPreferences = useProviderPreferences();
  const [busyIntegrationId, setBusyIntegrationId] = useState<string | null>(null);
  const [setupDialogProviderId, setSetupDialogProviderId] = useState<ProviderId | null>(null);
  const [figmaSetupOpen, setFigmaSetupOpen] = useState(false);
  const [paperSetupMessage, setPaperSetupMessage] = useState<string | null>(null);
  const [paperStatus, setPaperStatus] = useState<PaperConnectionStatusResponse | null>(null);
  const [paperStatusPending, setPaperStatusPending] = useState(false);

  const nativeConnectionStatus = useConvexQuery(
    api.integrations.contentPlatforms.getNativeConnectionStatus,
    isAuthenticated ? {} : "skip",
  );
  const sheetConnectionStatus = useConvexQuery(
    api.integrations.googleSheets.getSheetConnectionStatus,
    isAuthenticated ? {} : "skip",
  );
  const startOAuthConnect = useConvexAction(api.integrations.contentPlatforms.startOAuthConnect);
  const disconnectNativeConnection = useConvexMutation(api.integrations.contentPlatforms.disconnectConnection);
  const connectSheet = useConvexMutation(api.integrations.googleSheets.connectSheet);
  const disconnectSheet = useConvexMutation(api.integrations.googleSheets.disconnectSheet);

  const providerRows = useMemo(
    () =>
      providers.providerList.providers.map((provider) =>
        providerToIntegrationRow(provider, providerPreferences.isProviderEnabled(provider.id)),
      ),
    [providerPreferences, providers.providerList.providers],
  );
  const nativeIntegrationRows = useMemo(
    () => [
      nativeIntegrationToRow("figma", nativeConnectionStatus?.figma ?? null),
      nativeIntegrationToRow("notion", nativeConnectionStatus?.notion ?? null),
      paperIntegrationToRow(paperStatus, paperStatusPending),
      googleSheetsIntegrationToRow(sheetConnectionStatus?.googleSheet ?? null),
    ],
    [
      nativeConnectionStatus?.figma,
      nativeConnectionStatus?.notion,
      paperStatus,
      paperStatusPending,
      sheetConnectionStatus?.googleSheet,
    ],
  );

  async function refreshPaperStatus(showSetupOnFailure = false) {
    if (!window.stageDesktop?.engine?.getPaperStatus) return;

    setPaperStatusPending(true);
    try {
      const status = await window.stageDesktop.engine.getPaperStatus();
      setPaperStatus(status);
      if (showSetupOnFailure && !status.ready) {
        setPaperSetupMessage(status.message);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not check Paper Desktop.";
      setPaperStatus({ apiVersion: "v1", ready: false, status: "not-ready", message });
      if (showSetupOnFailure) {
        setPaperSetupMessage(message);
      }
    } finally {
      setPaperStatusPending(false);
    }
  }

  async function refreshIntegrations() {
    await Promise.all([providerRefresh.mutateAsync(), refreshPaperStatus()]);
  }

  useEffect(() => {
    void refreshPaperStatus();
  }, []);

  useEffect(() => {
    if (!window.stageDesktop?.integrations?.onOAuthCompleted) {
      return;
    }

    return window.stageDesktop.integrations.onOAuthCompleted((result) => {
      if (!result.ok) {
        window.alert(result.error);
        return;
      }

      if (result.status === "error") {
        window.alert(`Could not connect ${result.provider === "figma" ? "Figma" : "Notion"}.`);
        return;
      }

      if (result.provider === "figma") {
        setFigmaSetupOpen(true);
      }
    });
  }, []);

  async function handleIntegrationAction(integration: IntegrationRowModel) {
    try {
      setBusyIntegrationId(integration.id);

      if (integration.providerId) {
        if (integration.connected) {
          providerPreferences.setProviderEnabled(integration.providerId, false);
          return;
        }

        if (integration.status === "checking" || integration.status === "error") {
          await providerRefresh.mutateAsync();
          return;
        }

        const provider = providers.providerList.providers.find((entry) => entry.id === integration.providerId);
        if (!isProviderCliReady(provider)) {
          setSetupDialogProviderId(integration.providerId);
          return;
        }

        providerPreferences.setProviderEnabled(integration.providerId, true);
        return;
      }

      if (integration.nativeIntegrationId === "figma" || integration.nativeIntegrationId === "notion") {
        if (integration.connected) {
          await disconnectNativeConnection({ provider: integration.nativeIntegrationId });
          return;
        }

        const returnUrl = await window.stageDesktop.integrations.getOAuthReturnUrl(integration.nativeIntegrationId);
        const result = await startOAuthConnect({ provider: integration.nativeIntegrationId, returnUrl });
        await openExternalLink(result.url);
        return;
      }

      if (integration.nativeIntegrationId === "paper") {
        await refreshPaperStatus(true);
        return;
      }

      if (integration.nativeIntegrationId === "google-sheets") {
        if (integration.connected) {
          await disconnectSheet({ sourceType: "google_sheet" });
          return;
        }

        const sheetUrl = window.prompt("Paste your Google Sheets URL");
        if (!sheetUrl) return;
        await connectSheet({ sheetUrl });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Integration action failed.";
      window.alert(message);
    } finally {
      setBusyIntegrationId(null);
    }
  }

  function connectSetupDialogProvider() {
    if (setupDialogProviderId) {
      providerPreferences.setProviderEnabled(setupDialogProviderId, true);
    }
    setSetupDialogProviderId(null);
  }

  return {
    providers,
    providerRefresh,
    providerRows,
    nativeIntegrationRows,
    isRefreshing: providerRefresh.isPending || paperStatusPending,
    busyIntegrationId,
    handleIntegrationAction,
    refreshIntegrations,
    setupDialogProviderId,
    closeSetupDialog: () => setSetupDialogProviderId(null),
    connectSetupDialogProvider,
    figmaSetupOpen,
    setFigmaSetupOpen,
    paperSetupMessage,
    closePaperSetup: () => setPaperSetupMessage(null),
  };
}

export type ToolConnections = ReturnType<typeof useToolConnections>;

// True once Codex or Claude is set up locally and turned on for Stage.
export function useAiToolConnected() {
  const providers = useProviderStatus();
  const providerPreferences = useProviderPreferences();
  return providers.providerList.providers.some(
    (provider) => providerToIntegrationRow(provider, providerPreferences.isProviderEnabled(provider.id)).connected,
  );
}
