import { Check, LinkSimple } from "@phosphor-icons/react";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/Button";

type ShareProjectDialogProps = {
  open: boolean;
  shareUrl: string;
  copied: boolean;
  onOpenChange: (open: boolean) => void;
  onCopyShareUrl: () => void;
};

export function ShareProjectDialog({
  open,
  shareUrl,
  copied,
  onOpenChange,
  onCopyShareUrl,
}: ShareProjectDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[2px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-[470px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[16px] border border-border-subtle bg-white shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
          <div className="px-6 py-6">
            <Dialog.Title className="font-heading text-[22px] font-semibold tracking-[-0.3px] text-text-primary">
              Share with client
            </Dialog.Title>
            <p className="mt-1 text-[14px] leading-7 text-text-secondary">
              Clients can view progress, phases, and tasks. They cannot edit anything.
            </p>

            <div className="mt-6">
              <label className="mb-2 block text-[13px] font-medium text-text-primary">
                Client portal link
              </label>

              <div className="flex items-center gap-3 rounded-[10px] border border-border bg-bg px-3">
                <LinkSimple size={18} className="shrink-0 text-text-secondary" />
                <input
                  readOnly
                  value={shareUrl}
                  onFocus={(event) => event.currentTarget.select()}
                  onClick={(event) => event.currentTarget.select()}
                  spellCheck={false}
                  className="share-project-dialog-input h-11 min-w-0 flex-1 border-0 bg-transparent p-0 text-[14px] text-text-primary"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-border-subtle px-6 py-4">
            <p className="text-[13px] text-text-secondary">
              Anyone with the link can view the portal.
            </p>

            <div className="flex items-center gap-2">
              <Dialog.Close asChild>
                <Button size="sm" variant="ghost">
                  Done
                </Button>
              </Dialog.Close>

              <Button size="sm" onClick={onCopyShareUrl}>
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
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
