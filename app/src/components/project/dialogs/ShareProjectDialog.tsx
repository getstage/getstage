import { Check, LinkSimple } from "@phosphor-icons/react";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/Button";

type ShareProjectDialogProps = {
  open: boolean;
  shareUrl: string;
  copied: boolean;
  clientAccess: boolean;
  onOpenChange: (open: boolean) => void;
  onTogglePortalEnabled: () => void;
  onCopyShareUrl: () => void;
};

export function ShareProjectDialog({
  open,
  shareUrl,
  copied,
  clientAccess,
  onOpenChange,
  onTogglePortalEnabled,
  onCopyShareUrl,
}: ShareProjectDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
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
                <span className="flex-1 truncate text-[13px] text-text-secondary">{shareUrl}</span>
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
  );
}
