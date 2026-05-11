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
  variant?: "preview" | "general";
};

export function UpgradePaywallModal({
  open,
  onClose,
  onUpgrade,
  isLoading = false,
  errorMessage = null,
  variant = "preview",
}: UpgradePaywallModalProps) {
  const content =
    variant === "general"
      ? {
          title: "Upgrade to Stage Pro",
          headline: "Unlock the full workspace.",
          description:
            "Start checkout to unlock more projects, billing access, and the full Stage workspace.",
          features: [
            {
              icon: <TrendUp size={18} weight="fill" />,
              title: "Projects unlocked",
              description: "Create and manage live client projects in your paid workspace.",
            },
            {
              icon: <LockKeyOpen size={18} weight="fill" />,
              title: "Billing access",
              description: "Enable subscriptions and manage your billing setup in Stripe.",
            },
            {
              icon: <CrownSimple size={18} weight="fill" />,
              title: "Pro workspace",
              description: "Unlock the paid workspace without routing through settings first.",
            },
          ],
        }
      : {
          title: "Unlock your dashboard",
          headline: "Finish setup, then unlock Stage.",
          description:
            "You have seen the preview. Upgrade next to turn this into your live workspace and start tracking real projects, payments, and client work.",
          features: [
            {
              icon: <TrendUp size={18} weight="fill" />,
              title: "Live dashboard",
              description: "Replace the preview with your real project and revenue data.",
            },
            {
              icon: <LockKeyOpen size={18} weight="fill" />,
              title: "Billing access",
              description: "Enable subscription billing and unlock the full workspace.",
            },
            {
              icon: <CrownSimple size={18} weight="fill" />,
              title: "Next connectors",
              description: "Stripe Connect and Google Sheets import come right after.",
            },
          ],
        };

  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[rgba(25,24,42,0.54)] backdrop-blur-[3px]" />
        <Dialog.Content className="fixed inset-x-0 bottom-0 z-50 max-h-[92svh] overflow-y-auto overscroll-contain rounded-t-[22px] bg-white px-5 pt-5 pb-[calc(env(safe-area-inset-bottom)+20px)] shadow-[0_28px_90px_rgba(10,12,22,0.26)] outline-none sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-h-[calc(100svh-40px)] sm:w-[calc(100%-32px)] sm:max-w-[620px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[22px] sm:p-6 md:p-7">
          <div className="mb-5 flex items-start justify-between gap-4 sm:mb-6 sm:items-center">
            <Dialog.Title className="font-heading text-[18px] leading-[1.2] font-medium tracking-[-0.2px] text-text-primary sm:text-[20px]">
              {content.title}
            </Dialog.Title>
            <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[rgba(135,130,245,0.12)] text-accent sm:h-10 sm:w-10">
              <CrownSimple size={18} weight="fill" />
            </div>
          </div>

          <div className="space-y-4 sm:space-y-5">
            <div>
              <h3 className="font-heading text-[24px] leading-[1.08] font-semibold tracking-[-0.5px] text-text-primary sm:text-[28px]">
                {content.headline}
              </h3>
              <p className="mt-3 max-w-[54ch] text-[14px] leading-[1.55] text-text-secondary sm:text-[15px] sm:leading-[1.6]">
                {content.description}
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              {content.features.map((feature) => (
                <FeatureCard
                  key={feature.title}
                  icon={feature.icon}
                  title={feature.title}
                  description={feature.description}
                />
              ))}
            </div>
          </div>

          <div className="mt-6 space-y-3 sm:mt-8">
            {errorMessage ? (
              <div className="rounded-[12px] border border-[rgba(224,112,112,0.2)] bg-[rgba(224,112,112,0.08)] px-3 py-2 text-[13px] leading-[1.5] text-[#C35B5B]">
                {errorMessage}
              </div>
            ) : null}
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button variant="secondary" onClick={onClose} className="w-full sm:w-auto">
              Keep exploring preview
              </Button>
              <Button onClick={onUpgrade} isLoading={isLoading} className="w-full sm:w-auto">
              Upgrade to continue
              </Button>
            </div>
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
    <div className="min-w-0 rounded-[16px] border border-border-subtle bg-bg-subtle p-4">
      <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-[rgba(135,130,245,0.12)] text-accent">
        {icon}
      </div>
      <div className="text-[15px] font-medium text-text-primary">{title}</div>
      <div className="mt-1 text-[13px] leading-[1.5] text-text-secondary">{description}</div>
    </div>
  );
}
