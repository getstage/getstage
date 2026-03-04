import { Check, LinkSimple } from "@phosphor-icons/react";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/Button";
import type { Project } from "@/types";

type ProjectDialogsProps = {
  project: Project;
  clientAccess: boolean;
  shareUrl: string;
  copied: boolean;
  projectId: string;
  showShareModal: boolean;
  showEditNameModal: boolean;
  showEditClientModal: boolean;
  showTimelineModal: boolean;
  showPhasesModal: boolean;
  showDeleteConfirm: boolean;
  editNameValue: string;
  editClientValue: string;
  editStartDate: string;
  editEndDate: string;
  editPhasesValue: string;
  onShowShareModalChange: (open: boolean) => void;
  onShowEditNameModalChange: (open: boolean) => void;
  onShowEditClientModalChange: (open: boolean) => void;
  onShowTimelineModalChange: (open: boolean) => void;
  onShowPhasesModalChange: (open: boolean) => void;
  onShowDeleteConfirmChange: (open: boolean) => void;
  onEditNameValueChange: (value: string) => void;
  onEditClientValueChange: (value: string) => void;
  onEditStartDateChange: (value: string) => void;
  onEditEndDateChange: (value: string) => void;
  onEditPhasesValueChange: (value: string) => void;
  onSaveProjectName: () => void;
  onSaveClient: () => void;
  onSaveTimeline: () => void;
  onSavePhases: () => void;
  onConfirmDeleteProject: () => void;
  onTogglePortalEnabled: () => void;
  onCopyShareUrl: () => void;
};

export function ProjectDialogs({
  project,
  clientAccess,
  shareUrl,
  copied,
  showShareModal,
  showEditNameModal,
  showEditClientModal,
  showTimelineModal,
  showPhasesModal,
  showDeleteConfirm,
  editNameValue,
  editClientValue,
  editStartDate,
  editEndDate,
  editPhasesValue,
  onShowShareModalChange,
  onShowEditNameModalChange,
  onShowEditClientModalChange,
  onShowTimelineModalChange,
  onShowPhasesModalChange,
  onShowDeleteConfirmChange,
  onEditNameValueChange,
  onEditClientValueChange,
  onEditStartDateChange,
  onEditEndDateChange,
  onEditPhasesValueChange,
  onSaveProjectName,
  onSaveClient,
  onSaveTimeline,
  onSavePhases,
  onConfirmDeleteProject,
  onTogglePortalEnabled,
  onCopyShareUrl,
}: ProjectDialogsProps) {
  return (
    <>
      <Dialog.Root open={showShareModal} onOpenChange={onShowShareModalChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[2px]" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-[460px] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-7">
            <Dialog.Title className="font-heading text-[24px] font-semibold text-text-primary">
              Share with client
            </Dialog.Title>
            <p className="mt-1 text-[14px] text-text-secondary">
              Clients can view progress, phases, and tasks. They cannot edit anything.
            </p>

            <div className="mt-6 flex items-center justify-between rounded-xl border border-border-subtle px-4 py-3">
              <span className="text-[14px] text-text-primary">Client access</span>
              <button
                onClick={onTogglePortalEnabled}
                className={`relative h-5 w-9 cursor-pointer rounded-full transition-colors ${
                  clientAccess ? "bg-accent" : "bg-border"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${
                    clientAccess ? "left-4.5" : "left-0.5"
                  }`}
                />
              </button>
            </div>

            {clientAccess ? (
              <div className="mt-4 rounded-xl border border-border-subtle p-3">
                <div className="flex items-center gap-2">
                  <LinkSimple size={16} className="text-text-secondary" />
                  <span className="flex-1 truncate text-[13px] text-text-secondary">
                    {shareUrl}
                  </span>
                  <Button size="sm" variant="secondary" onClick={onCopyShareUrl}>
                    {copied ? (
                      <>
                        <Check size={12} />
                        Copied
                      </>
                    ) : (
                      "Copy"
                    )}
                  </Button>
                </div>
              </div>
            ) : null}

            <Dialog.Close asChild>
              <Button className="mt-6 w-full" variant="ghost">
                Done
              </Button>
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <EditTextDialog
        open={showEditNameModal}
        title="Edit project name"
        value={editNameValue}
        onOpenChange={onShowEditNameModalChange}
        onValueChange={onEditNameValueChange}
        onSave={onSaveProjectName}
      />

      <EditTextDialog
        open={showEditClientModal}
        title="Edit client"
        value={editClientValue}
        onOpenChange={onShowEditClientModalChange}
        onValueChange={onEditClientValueChange}
        onSave={onSaveClient}
      />

      <Dialog.Root open={showTimelineModal} onOpenChange={onShowTimelineModalChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[2px]" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-7">
            <Dialog.Title className="font-heading text-[20px] font-semibold text-text-primary">
              Adjust timeline
            </Dialog.Title>
            <div className="mt-4 flex gap-3">
              <div className="flex-1">
                <label className="mb-1.5 block text-[13px] font-medium text-text-primary">
                  Start date
                </label>
                <input
                  type="date"
                  value={editStartDate}
                  onChange={(event) => onEditStartDateChange(event.target.value)}
                  className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-[14px] text-text-primary outline-none transition-colors focus:border-accent"
                />
              </div>
              <div className="flex-1">
                <label className="mb-1.5 block text-[13px] font-medium text-text-primary">
                  End date
                </label>
                <input
                  type="date"
                  value={editEndDate}
                  onChange={(event) => onEditEndDateChange(event.target.value)}
                  className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-[14px] text-text-primary outline-none transition-colors focus:border-accent"
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Dialog.Close asChild>
                <Button variant="ghost" size="sm">
                  Cancel
                </Button>
              </Dialog.Close>
              <Button
                size="sm"
                onClick={() => void onSaveTimeline()}
                disabled={!editStartDate || !editEndDate}
              >
                Save
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={showPhasesModal} onOpenChange={onShowPhasesModalChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[2px]" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-7">
            <Dialog.Title className="font-heading text-[20px] font-semibold text-text-primary">
              Add or remove phases
            </Dialog.Title>
            <p className="mt-1 text-[13px] text-text-secondary">
              Enter phase names separated by commas.
            </p>
            <div className="mt-4">
              <input
                type="text"
                value={editPhasesValue}
                onChange={(event) => onEditPhasesValueChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void onSavePhases();
                }}
                autoFocus
                placeholder="Strategy, Design, Development, Launch"
                className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-[15px] text-text-primary outline-none transition-colors placeholder:text-text-tertiary focus:border-accent"
              />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Dialog.Close asChild>
                <Button variant="ghost" size="sm">
                  Cancel
                </Button>
              </Dialog.Close>
              <Button
                size="sm"
                onClick={() => void onSavePhases()}
                disabled={editPhasesValue.trim().length === 0}
              >
                Save
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={showDeleteConfirm} onOpenChange={onShowDeleteConfirmChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[2px]" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-7">
            <Dialog.Title className="font-heading text-[20px] font-semibold text-text-primary">
              Delete project
            </Dialog.Title>
            <p className="mt-2 text-[14px] text-text-secondary">
              Delete &ldquo;{project.name}&rdquo;? This removes the project and its tasks
              permanently.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Dialog.Close asChild>
                <Button variant="ghost" size="sm">
                  Cancel
                </Button>
              </Dialog.Close>
              <Button
                size="sm"
                className="bg-destructive text-white hover:bg-destructive/90"
                onClick={() => void onConfirmDeleteProject()}
              >
                Delete
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

type EditTextDialogProps = {
  open: boolean;
  title: string;
  value: string;
  onOpenChange: (open: boolean) => void;
  onValueChange: (value: string) => void;
  onSave: () => void;
};

function EditTextDialog({
  open,
  title,
  value,
  onOpenChange,
  onValueChange,
  onSave,
}: EditTextDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[2px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-7">
          <Dialog.Title className="font-heading text-[20px] font-semibold text-text-primary">
            {title}
          </Dialog.Title>
          <div className="mt-4">
            <input
              type="text"
              value={value}
              onChange={(event) => onValueChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void onSave();
              }}
              autoFocus
              className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-[15px] text-text-primary outline-none transition-colors placeholder:text-text-tertiary focus:border-accent"
            />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Dialog.Close asChild>
              <Button variant="ghost" size="sm">
                Cancel
              </Button>
            </Dialog.Close>
            <Button size="sm" onClick={() => void onSave()} disabled={value.trim().length === 0}>
              Save
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
