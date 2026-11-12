import { useState, type ReactNode } from "react";
import { useAction } from "convex/react";
import { api } from "@stage/data-ops/convex/api";
import { usePlatform } from "../platform";
import { CANCELLATION_FORM_URL } from "./accountConstants";
import { DeleteAccountDialog } from "./DeleteAccountDialog";
import { SettingsCard, SettingsRow } from "./SettingsPrimitives";

// Account settings shared by Mac and web. `desktopSettings` holds the Mac-only cards (widget, updates, session);
// `onAccountDeleted` signs the user out in the way each app does.
export function AccountPanel({ desktopSettings, onAccountDeleted }: {
  desktopSettings?: ReactNode;
  onAccountDeleted: () => Promise<void>;
}) {
  const platform = usePlatform();
  const deleteAccount = useAction(api.settings.deleteAccount);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  function openCancellationForm() {
    void platform.openExternal(CANCELLATION_FORM_URL);
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
      await onAccountDeleted();
      setIsDeleteDialogOpen(false);
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "Could not delete account.");
    } finally {
      setIsDeletingAccount(false);
    }
  }

  return (
    <div className="flex flex-col gap-[22px]">
      {desktopSettings}

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
