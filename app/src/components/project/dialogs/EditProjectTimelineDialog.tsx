import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/Button";

type EditProjectTimelineDialogProps = {
  open: boolean;
  startDate: string;
  endDate: string;
  onOpenChange: (open: boolean) => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onSave: () => void;
};

export function EditProjectTimelineDialog({
  open,
  startDate,
  endDate,
  onOpenChange,
  onStartDateChange,
  onEndDateChange,
  onSave,
}: EditProjectTimelineDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
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
                value={startDate}
                onChange={(event) => onStartDateChange(event.target.value)}
                className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-[14px] text-text-primary outline-none transition-colors focus:border-accent"
              />
            </div>
            <div className="flex-1">
              <label className="mb-1.5 block text-[13px] font-medium text-text-primary">
                End date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(event) => onEndDateChange(event.target.value)}
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
            <Button size="sm" onClick={onSave} disabled={!startDate || !endDate}>
              Save
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
