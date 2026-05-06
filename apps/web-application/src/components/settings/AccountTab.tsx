import * as Dialog from "@radix-ui/react-dialog";
import { useState } from "react";
import { FeedbackText } from "@/components/settings/FeedbackText";
import type { SaveFeedback } from "@/hooks/useFeedback";

const DELETE_TALLY_URL = "https://tally.so/r/D4eYOE";

type AccountTabProps = {
  active: boolean;
  isDeletingAccount: boolean;
  deleteAccountFeedback: SaveFeedback;
  onDeleteAccount: (confirmation: string) => Promise<boolean>;
};

export function AccountTab({
  active,
  isDeletingAccount,
  deleteAccountFeedback,
  onDeleteAccount,
}: AccountTabProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  function handleDeleteIntent() {
    setDeleteDialogOpen(true);
    window.open(DELETE_TALLY_URL, "_blank", "noopener,noreferrer");
  }

  async function handleDeleteSubmit() {
    const deleted = await onDeleteAccount(deleteConfirmation);
    if (deleted) {
      setDeleteDialogOpen(false);
      setDeleteConfirmation("");
    }
  }

  return (
    <div className={`tab-content ${active ? "active" : ""}`}>
      <div className="settings-section-card">
        <div className="settings-row-card settings-account-delete">
          <div className="settings-row-title">Delete account</div>
          <div className="settings-row-description">
            Permanently delete your account and all associated projects, research, strategies, and
            generated assets. This action is immediate and cannot be undone.
          </div>
          <Dialog.Root
            open={deleteDialogOpen}
            onOpenChange={(open) => {
              setDeleteDialogOpen(open);
              if (!open) {
                setDeleteConfirmation("");
              }
            }}
          >
            <button type="button" className="btn-delete" onClick={handleDeleteIntent}>
              Delete Account
            </button>
            <Dialog.Portal>
              <Dialog.Overlay className="settings-modal-overlay" />
              <Dialog.Content className="settings-modal-card settings-account-modal">
                <Dialog.Title className="settings-modal-title">
                  Delete account
                </Dialog.Title>
                <p className="settings-modal-copy">
                  This deletes your account, projects, uploads, billing state, Stripe connections,
                  Google Sheets connections, and active sessions.
                </p>
                <p className="settings-modal-copy">
                  We also opened a short cancellation form in a new tab. If it did not open,{" "}
                  <a
                    href={DELETE_TALLY_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-accent underline underline-offset-2"
                  >
                    open it here
                  </a>
                  .
                </p>
                <p className="settings-modal-copy">
                  Type <span className="font-medium text-text-primary">DELETE</span> to confirm.
                </p>
                <input
                  className="settings-input settings-modal-input"
                  type="text"
                  value={deleteConfirmation}
                  onChange={(event) => setDeleteConfirmation(event.target.value)}
                  placeholder="DELETE"
                  autoFocus
                />
                <div className="settings-modal-feedback">
                  <FeedbackText feedback={deleteAccountFeedback} />
                </div>
                <div className="settings-modal-actions">
                  <Dialog.Close asChild>
                    <button type="button" className="btn-outline" disabled={isDeletingAccount}>
                      Cancel
                    </button>
                  </Dialog.Close>
                  <button
                    type="button"
                    className="btn-delete"
                    onClick={() => void handleDeleteSubmit()}
                    disabled={
                      isDeletingAccount ||
                      deleteConfirmation.trim().toUpperCase() !== "DELETE"
                    }
                  >
                    {isDeletingAccount ? "Deleting..." : "Delete Account"}
                  </button>
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </div>
      </div>
    </div>
  );
}
