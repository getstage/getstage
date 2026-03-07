import * as Dialog from "@radix-ui/react-dialog";
import { useState } from "react";
import type { ChangeEvent, RefObject } from "react";
import type { SaveFeedback } from "@/hooks/useFeedback";
import { FeedbackText } from "@/components/settings/FeedbackText";

type GeneralTabProps = {
  active: boolean;
  name: string;
  avatarDataUrl: string | null;
  avatarInitial: string;
  avatarInputRef: RefObject<HTMLInputElement | null>;
  isSavingName: boolean;
  isSavingAvatar: boolean;
  isDeletingAccount: boolean;
  nameFeedback: SaveFeedback;
  avatarFeedback: SaveFeedback;
  deleteAccountFeedback: SaveFeedback;
  onNameChange: (value: string) => void;
  onAvatarInputChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onSaveName: () => void;
  onSaveAvatar: () => void;
  onDeleteAccount: (confirmation: string) => Promise<boolean>;
};

export function GeneralTab({
  active,
  name,
  avatarDataUrl,
  avatarInitial,
  avatarInputRef,
  isSavingName,
  isSavingAvatar,
  isDeletingAccount,
  nameFeedback,
  avatarFeedback,
  deleteAccountFeedback,
  onNameChange,
  onAvatarInputChange,
  onSaveName,
  onSaveAvatar,
  onDeleteAccount,
}: GeneralTabProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

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
          <div className="card-heading sf">Full name</div>
          <div className="card-desc">
            This is your name as it will be displayed on the platform.
          </div>
          <label className="settings-label">Name</label>
          <input
            className="settings-input"
            type="text"
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
          />
        </div>
        <div className="card-footer">
          <FeedbackText feedback={nameFeedback} />
          <button type="button" className="btn-save" onClick={onSaveName} disabled={isSavingName}>
            Save
          </button>
        </div>
      </div>

      <div className="settings-card">
        <div className="card-body">
          <div className="card-heading sf">Avatar</div>
          <div className="card-desc">This is what you will look like on the platform.</div>
          <div className="avatar-row">
            <div className="avatar-circle">
              {avatarDataUrl ? <img src={avatarDataUrl} alt="Avatar preview" /> : avatarInitial}
            </div>
            <button
              type="button"
              className="avatar-browse"
              onClick={() => avatarInputRef.current?.click()}
            >
              Browse
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              onChange={onAvatarInputChange}
              className="hidden-file-input"
            />
          </div>
        </div>
        <div className="card-footer">
          <FeedbackText feedback={avatarFeedback} fallback="Square image recommended" />
          <button
            type="button"
            className="btn-save"
            onClick={onSaveAvatar}
            disabled={isSavingAvatar || !avatarDataUrl}
          >
            Save
          </button>
        </div>
      </div>

      <div className="settings-card">
        <div className="card-body">
          <div className="card-heading sf">Delete account</div>
          <div className="card-desc">
            Permanently delete your account and all associated projects. This action is immediate
            and cannot be undone.
          </div>
        </div>
        <div className="card-footer">
          <FeedbackText
            feedback={deleteAccountFeedback}
            fallback="This permanently removes your workspace data."
          />
          <Dialog.Root
            open={deleteDialogOpen}
            onOpenChange={(open) => {
              setDeleteDialogOpen(open);
              if (!open) {
                setDeleteConfirmation("");
              }
            }}
          >
            <Dialog.Trigger asChild>
              <button type="button" className="btn-delete">
                Delete
              </button>
            </Dialog.Trigger>
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
