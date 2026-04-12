import type { ChangeEvent, RefObject } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { AVATAR_ACCEPT } from "@/lib/r2Uploads";

type EditClientDialogProps = {
  open: boolean;
  clientName: string;
  clientAvatarUrl: string | null;
  isSaving: boolean;
  onOpenChange: (open: boolean) => void;
  onClientNameChange: (value: string) => void;
  onAvatarInputChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemoveAvatar: () => void;
  onSave: () => void;
  avatarInputRef: RefObject<HTMLInputElement | null>;
};

export function EditClientDialog({
  open,
  clientName,
  clientAvatarUrl,
  isSaving,
  onOpenChange,
  onClientNameChange,
  onAvatarInputChange,
  onRemoveAvatar,
  onSave,
  avatarInputRef,
}: EditClientDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[2px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-24px)] max-w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-5 shadow-xl sm:w-[calc(100%-32px)] sm:p-7">
          <Dialog.Title className="font-heading text-[20px] font-semibold text-text-primary">
            Edit client
          </Dialog.Title>

          <div className="mt-5 flex items-center gap-4">
            <Avatar
              name={clientName.trim() || "Client"}
              src={clientAvatarUrl ?? undefined}
              size="lg"
              className="border border-border-subtle"
            />

            <div className="flex flex-col items-start gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => avatarInputRef.current?.click()}
              >
                Upload image
              </Button>
              <button
                type="button"
                className="text-[13px] text-text-secondary transition-colors hover:text-destructive disabled:cursor-not-allowed disabled:opacity-50"
                onClick={onRemoveAvatar}
                disabled={!clientAvatarUrl}
              >
                Remove image
              </button>
            </div>
          </div>

          <input
            ref={avatarInputRef}
            type="file"
            accept={AVATAR_ACCEPT}
            className="hidden"
            onChange={onAvatarInputChange}
          />

          <div className="mt-5">
            <label className="mb-1.5 block text-[13px] font-medium text-text-primary">
              Client name
            </label>
            <input
              type="text"
              value={clientName}
              onChange={(event) => onClientNameChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  onSave();
                }
              }}
              autoFocus
              className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-[15px] text-text-primary outline-none transition-colors placeholder:text-text-tertiary focus:border-accent"
            />
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Dialog.Close asChild>
              <Button variant="ghost" size="sm" disabled={isSaving}>
                Cancel
              </Button>
            </Dialog.Close>
            <Button
              size="sm"
              onClick={onSave}
              disabled={clientName.trim().length === 0}
              isLoading={isSaving}
            >
              Save
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
