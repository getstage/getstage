import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/Button";

type DeleteProjectDialogProps = {
  open: boolean;
  projectName: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

export function DeleteProjectDialog({
  open,
  projectName,
  onOpenChange,
  onConfirm,
}: DeleteProjectDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[2px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-24px)] max-w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-5 sm:p-7">
          <Dialog.Title className="font-heading text-[20px] font-semibold text-text-primary">
            Delete project
          </Dialog.Title>
          <p className="mt-2 text-[14px] text-text-secondary">
            Delete &ldquo;{projectName}&rdquo;? This removes the project and its tasks
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
              onClick={onConfirm}
            >
              Delete
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
