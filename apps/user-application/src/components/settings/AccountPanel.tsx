import { useState } from "react";
import { useAction } from "convex/react";
import { useDesktopSession } from "@/hooks/engine/useDesktopSession";
import { useDesktopUpdate } from "@/hooks/useDesktopUpdate";
import { useDesktopBridge } from "@/hooks/useDesktopBridge";
import { api } from "@/lib/convexApi";
import { CANCELLATION_FORM_URL } from "@/lib/settings/accountConstants";
import { openExternalLink } from "@/lib/settings/openExternalLink";
import { DeleteAccountDialog } from "./DeleteAccountDialog";
import { SettingsCard, SettingsRow } from "./SettingsPrimitives";

export function AccountPanel() {
  const desktop = useDesktopBridge();
  const { status: updateStatus, isDesktop, checkForUpdates } = useDesktopUpdate();
  const session = useDesktopSession();
  const deleteAccount = useAction(api.settings.deleteAccount);
  const [authStatus, setAuthStatus] = useState<
    "idle" | "opening" | "opened" | "error"
  >("idle");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);
  const desktopSession = session.data ?? null;

  async function openDesktopLogin() {
    setAuthStatus("opening");

    try {
      await desktop.auth.openLogin();
      setAuthStatus("opened");
    } catch {
      setAuthStatus("error");
    }
  }

  function openCancellationForm() {
    void openExternalLink(CANCELLATION_FORM_URL);
  }

  function openDeleteDialog() {
    setDeleteError(null);
    setIsDeleteDialogOpen(true);
    openCancellationForm();
  }

  async function confirmDeleteAccount(confirmation: string) {
    setIsDeletingAccount(true);
    setDeleteError(null);
    try {
      await deleteAccount({ confirmation });
      await desktop.auth.logout();
      setIsDeleteDialogOpen(false);
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "Could not delete account.");
    } finally {
      setIsDeletingAccount(false);
    }
  }

  async function handleCheckForUpdates() {
    setIsCheckingUpdates(true);
    try {
      await checkForUpdates();
    } finally {
      setIsCheckingUpdates(false);
    }
  }

  const authStatusLabel =
    authStatus === "opening"
      ? "Opening browser"
      : session.isLoading
        ? "Checking session"
        : desktopSession?.hasAccessToken
          ? "Connected to Stage web"
          : authStatus === "opened"
            ? "Browser opened"
            : authStatus === "error"
              ? "Could not open browser"
              : "Not connected";

  return (
    <div className="flex flex-col gap-[22px]">
      {isDesktop ? (
        <SettingsCard title="Desktop app">
          <SettingsRow>
            <div className="flex items-center justify-between gap-[20px]">
              <div>
                <h2 className="text-[15px] font-semibold leading-none text-[#171717]">
                  Stage for macOS
                </h2>
                <p className="mt-[4px] max-w-[471px] text-[12px] font-normal leading-[1.5] text-[#171717]">
                  {updateStatus?.availableVersion
                    ? `Version ${updateStatus.availableVersion} is available. You are on ${updateStatus.currentVersion}.`
                    : `You are on version ${updateStatus?.currentVersion ?? "…"}.`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void handleCheckForUpdates()}
                disabled={isCheckingUpdates || updateStatus?.isChecking}
                className="rounded-[6px] border border-[#E5E5E5] bg-white px-[12px] py-[8px] text-[13px] font-medium leading-none text-[#171717] transition-colors hover:bg-[#FAFAFA] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isCheckingUpdates || updateStatus?.isChecking ? "Checking…" : "Check for updates"}
              </button>
            </div>
          </SettingsRow>
        </SettingsCard>
      ) : null}

      <SettingsCard title="Desktop session">
        <SettingsRow>
          <div className="flex items-center justify-between gap-[20px]">
            <div>
              <h2 className="text-[15px] font-semibold leading-none text-[#171717]">Stage web session</h2>
              <p className="mt-[4px] max-w-[471px] text-[12px] font-normal leading-[1.5] text-[#171717]">
                {desktopSession?.name ?? desktopSession?.email ?? authStatusLabel}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void openDesktopLogin()}
              disabled={authStatus === "opening" || session.isLoading}
              className="rounded-[6px] border border-[rgba(158,153,248,0.75)] bg-gradient-to-b from-[#7B76DF] to-[#463FBA] px-[12px] py-[8px] text-[13px] font-medium leading-none text-[#FAFAFA] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-opacity [text-shadow:0_0.5px_1.5px_rgba(0,0,0,0.15)] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {desktopSession?.hasAccessToken ? "Refresh session" : "Log in with Stage"}
            </button>
          </div>
        </SettingsRow>
      </SettingsCard>

      <SettingsCard>
        <SettingsRow>
          <h2 className="text-[15px] font-semibold leading-none text-[#171717]">Delete account</h2>
          <p className="mt-[4px] max-w-[471px] text-[12px] font-normal leading-[1.5] text-[#171717]">
            Permanently delete your account and all associated projects, research, strategies,
            and generated assets. This action is immediate and cannot be undone.
          </p>
          <button
            type="button"
            onClick={openDeleteDialog}
            className="mt-[24px] rounded-[6px] border border-[#F87171] bg-gradient-to-b from-[#EF4444] to-[#DC2626] px-[12px] py-[8px] text-[13px] font-medium leading-none text-[#FAFAFA] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-opacity hover:opacity-95 [text-shadow:0_0.5px_1.5px_rgba(0,0,0,0.15)]"
          >
            Delete Account
          </button>
        </SettingsRow>
      </SettingsCard>

      {isDeleteDialogOpen ? (
        <DeleteAccountDialog
          onCancel={() => setIsDeleteDialogOpen(false)}
          onOpenCancellationForm={openCancellationForm}
          onConfirm={(confirmation) => void confirmDeleteAccount(confirmation)}
          error={deleteError}
          isDeleting={isDeletingAccount}
        />
      ) : null}
    </div>
  );
}
