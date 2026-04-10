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
      <div className="settings-card">
        <div className="card-body">
          <div className="card-heading sf">Delete account</div>
          <div className="card-desc">
            Permanently delete your account and all associated projects, research, strategies, and
            generated assets. This action is immediate and cannot be undone.
          </div>
        </div>
        <div className="card-footer">
          <span className="card-footer-text">Proceed with caution</span>
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
              Delete account
            </button>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[2px]" />
              <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-32px)] max-w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-7 shadow-xl">
                <Dialog.Title className="font-heading text-[20px] font-semibold text-text-primary">
                  Delete account
                </Dialog.Title>
                <p className="mt-3 text-[14px] leading-[1.6] text-text-secondary">
                  This deletes your account, projects, uploads, billing state, Stripe connections,
                  Google Sheets connections, and active sessions.
                </p>
                <p className="mt-3 text-[14px] leading-[1.6] text-text-secondary">
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
                <p className="mt-3 text-[14px] leading-[1.6] text-text-secondary">
                  Type <span className="font-medium text-text-primary">DELETE</span> to confirm.
                </p>
                <input
                  className="settings-input mt-4"
                  type="text"
                  value={deleteConfirmation}
                  onChange={(event) => setDeleteConfirmation(event.target.value)}
                  placeholder="DELETE"
                  autoFocus
                />
                <div className="mt-3">
                  <FeedbackText feedback={deleteAccountFeedback} />
                </div>
                <div className="mt-6 flex items-center justify-end gap-3">
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
                    {isDeletingAccount ? "Deleting..." : "Delete account"}
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
