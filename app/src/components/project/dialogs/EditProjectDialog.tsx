import type { ChangeEvent, RefObject } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/Button";
import { PROJECT_MARKER_ACCEPT } from "@/lib/r2Uploads";

type EditProjectDialogProps = {
  open: boolean;
  projectName: string;
  projectImageUrl: string | null;
  isSaving: boolean;
  onOpenChange: (open: boolean) => void;
  onProjectNameChange: (value: string) => void;
  onProjectImageInputChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemoveProjectImage: () => void;
  onSave: () => void;
  projectImageInputRef: RefObject<HTMLInputElement | null>;
};

export function EditProjectDialog({
  open,
  projectName,
  projectImageUrl,
  isSaving,
  onOpenChange,
  onProjectNameChange,
  onProjectImageInputChange,
  onRemoveProjectImage,
  onSave,
  projectImageInputRef,
}: EditProjectDialogProps) {
  const canSave = projectName.trim().length > 0;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[2px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[calc(100vh-32px)] w-[calc(100%-32px)] max-w-[560px] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-white p-7 shadow-xl">
          <Dialog.Title className="font-heading text-[20px] font-semibold text-text-primary">
            Edit project
          </Dialog.Title>

          <div className="mt-5">
            <label className="mb-1.5 block text-[13px] font-medium text-text-primary">
              Project name
            </label>
            <input
              type="text"
              value={projectName}
              onChange={(event) => onProjectNameChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && canSave) {
                  onSave();
                }
              }}
              autoFocus
              className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-[15px] text-text-primary outline-none transition-colors placeholder:text-text-tertiary focus:border-accent"
            />
          </div>

          <div className="mt-5">
            <label className="mb-1.5 block text-[13px] font-medium text-text-primary">
              Project image
            </label>

            <div className="flex items-center gap-4 rounded-[12px] border border-border-subtle bg-white px-4 py-4">
              <div className="shrink-0">
                {projectImageUrl ? (
                  <img
                    src={projectImageUrl}
                    alt="Project"
                    className="h-12 w-12 rounded-full border border-border-subtle object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border-subtle bg-input-bg text-[11px] text-text-tertiary">
                    IMG
                  </div>
                )}
              </div>

              <div className="min-w-0 space-y-1">
                <button
                  type="button"
                  onClick={() => projectImageInputRef.current?.click()}
                  className="block cursor-pointer bg-transparent p-0 text-left text-[13px] text-text-secondary transition-colors hover:text-accent"
                >
                  {projectImageUrl ? "Replace photo" : "Upload photo"}
                </button>
                <button
                  type="button"
                  onClick={onRemoveProjectImage}
                  disabled={!projectImageUrl}
                  className="block cursor-pointer bg-transparent p-0 text-left text-[13px] text-text-secondary transition-colors hover:text-destructive disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Remove
                </button>
              </div>
            </div>

            <input
              ref={projectImageInputRef}
              type="file"
              accept={PROJECT_MARKER_ACCEPT}
              className="hidden"
              onChange={onProjectImageInputChange}
            />
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Dialog.Close asChild>
              <Button variant="ghost" size="sm" disabled={isSaving}>
                Cancel
              </Button>
            </Dialog.Close>
            <Button size="sm" onClick={onSave} disabled={!canSave} isLoading={isSaving}>
              Save
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
