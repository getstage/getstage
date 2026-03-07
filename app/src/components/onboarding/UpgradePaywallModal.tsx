import type { ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { CrownSimple, LockKeyOpen, TrendUp } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";

type UpgradePaywallModalProps = {
  open: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  isLoading?: boolean;
  errorMessage?: string | null;
};

export function UpgradePaywallModal({
  open,
  onClose,
  onUpgrade,
  isLoading = false,
  errorMessage = null,
}: UpgradePaywallModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[rgba(25,24,42,0.54)] backdrop-blur-[3px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-32px)] max-w-[620px] -translate-x-1/2 -translate-y-1/2 rounded-[22px] bg-white p-6 sm:p-7">
          <div className="mb-6 flex items-center justify-between">
            <Dialog.Title className="font-heading text-[20px] leading-[1.2] font-medium tracking-[-0.2px] text-text-primary">
              Unlock your dashboard
            </Dialog.Title>
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(135,130,245,0.12)] text-accent">
              <CrownSimple size={18} weight="fill" />
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <h3 className="font-heading text-[28px] leading-[1.1] font-semibold tracking-[-0.5px] text-text-primary">
                Finish setup, then unlock Stage.
              </h3>
              <p className="mt-3 text-[15px] leading-[1.6] text-text-secondary">
                You have seen the preview. Upgrade next to turn this into your live workspace and start tracking real projects, payments, and client work.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <FeatureCard
                icon={<TrendUp size={18} weight="fill" />}
                title="Live dashboard"
                description="Replace the preview with your real project and revenue data."
              />
              <FeatureCard
                icon={<LockKeyOpen size={18} weight="fill" />}
                title="Billing access"
                description="Enable subscription billing and unlock the full workspace."
              />
              <FeatureCard
                icon={<CrownSimple size={18} weight="fill" />}
                title="Next connectors"
                description="Stripe Connect and Google Sheets import come right after."
              />
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
            {errorMessage ? (
              <div className="mr-auto text-[13px] text-[#E07070]">{errorMessage}</div>
            ) : null}
            <Button variant="secondary" onClick={onClose}>
              Keep exploring preview
            </Button>
            <Button onClick={onUpgrade} isLoading={isLoading}>
              Upgrade to continue
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[16px] border border-border-subtle bg-bg-subtle p-4">
      <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-[rgba(135,130,245,0.12)] text-accent">
        {icon}
      </div>
      <div className="text-[15px] font-medium text-text-primary">{title}</div>
      <div className="mt-1 text-[13px] leading-[1.5] text-text-secondary">{description}</div>
    </div>
  );
}
