import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/Button";

type EditProjectPhasesDialogProps = {
  open: boolean;
  value: string;
  onOpenChange: (open: boolean) => void;
  onValueChange: (value: string) => void;
  onSave: () => void;
};

export function EditProjectPhasesDialog({
  open,
  value,
  onOpenChange,
  onValueChange,
  onSave,
}: EditProjectPhasesDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
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
              value={value}
              onChange={(event) => onValueChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  onSave();
                }
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
            <Button size="sm" onClick={onSave} disabled={value.trim().length === 0}>
              Save
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
