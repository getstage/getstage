import type { ChangeEvent, RefObject } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/Button";
import { PROJECT_MARKER_ACCEPT } from "@/lib/r2Uploads";

type EditProjectDialogProps = {
  open: boolean;
  projectName: string;
  startMarkerImageUrl: string | null;
  endMarkerImageUrl: string | null;
  isSaving: boolean;
  onOpenChange: (open: boolean) => void;
  onProjectNameChange: (value: string) => void;
  onStartMarkerInputChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onEndMarkerInputChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemoveStartMarker: () => void;
  onRemoveEndMarker: () => void;
  onSave: () => void;
  startMarkerInputRef: RefObject<HTMLInputElement | null>;
  endMarkerInputRef: RefObject<HTMLInputElement | null>;
};

export function EditProjectDialog({
  open,
  projectName,
  startMarkerImageUrl,
  endMarkerImageUrl,
  isSaving,
  onOpenChange,
  onProjectNameChange,
  onStartMarkerInputChange,
  onEndMarkerInputChange,
  onRemoveStartMarker,
  onRemoveEndMarker,
  onSave,
  startMarkerInputRef,
  endMarkerInputRef,
}: EditProjectDialogProps) {
  const canSave =
    projectName.trim().length > 0 && Boolean(startMarkerImageUrl) && Boolean(endMarkerImageUrl);

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

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <ProjectMarkerEditor
              label="Start marker image"
              imageUrl={startMarkerImageUrl}
              inputRef={startMarkerInputRef}
              onInputChange={onStartMarkerInputChange}
              onRemove={onRemoveStartMarker}
            />
            <ProjectMarkerEditor
              label="End marker image"
              imageUrl={endMarkerImageUrl}
              inputRef={endMarkerInputRef}
              onInputChange={onEndMarkerInputChange}
              onRemove={onRemoveEndMarker}
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

type ProjectMarkerEditorProps = {
  label: string;
  imageUrl: string | null;
  inputRef: RefObject<HTMLInputElement | null>;
  onInputChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
};

function ProjectMarkerEditor({
  label,
  imageUrl,
  inputRef,
  onInputChange,
  onRemove,
}: ProjectMarkerEditorProps) {
  return (
    <div>
      <p className="mb-1.5 text-[13px] font-medium text-text-primary">{label}</p>
      <div className="overflow-hidden rounded-xl border border-border-subtle bg-input-bg">
        <div className="aspect-square bg-input-bg">
          {imageUrl ? (
            <img src={imageUrl} alt={label} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center px-6 text-center text-[13px] text-text-tertiary">
              Upload image
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 px-3 py-3">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => inputRef.current?.click()}
          >
            {imageUrl ? "Replace image" : "Upload image"}
          </Button>
          <button
            type="button"
            className="text-[13px] text-text-secondary transition-colors hover:text-destructive disabled:cursor-not-allowed disabled:opacity-50"
            onClick={onRemove}
            disabled={!imageUrl}
          >
            Remove
          </button>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={PROJECT_MARKER_ACCEPT}
        className="hidden"
        onChange={onInputChange}
      />
    </div>
  );
}
