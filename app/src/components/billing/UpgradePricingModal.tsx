import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Check, CrownSimple, Lightning } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import {
  PRO_FEATURES,
  PRO_PRICING,
  type BillingCycle,
} from "@/components/onboarding/OnboardingPaywall";

type UpgradePricingModalProps = {
  open: boolean;
  onClose: () => void;
  onUpgrade: (billingCycle: BillingCycle) => void;
  isLoading?: boolean;
  errorMessage?: string | null;
};

export function UpgradePricingModal({
  open,
  onClose,
  onUpgrade,
  isLoading = false,
  errorMessage = null,
}: UpgradePricingModalProps) {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("yearly");
  const pricing = PRO_PRICING[billingCycle];

  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[rgba(25,24,42,0.54)] backdrop-blur-[3px]" />
        <Dialog.Content className="fixed inset-x-2 bottom-2 z-50 max-h-[calc(100dvh-16px)] overflow-y-auto overscroll-contain rounded-[22px] bg-white p-4 shadow-[0_28px_90px_rgba(10,12,22,0.26)] outline-none sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[calc(100%-32px)] sm:max-w-[760px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:p-6 md:p-7">
          <div className="mb-4 flex items-center justify-between">
            <Dialog.Title className="font-heading text-[20px] leading-[1.2] font-medium tracking-[-0.2px] text-text-primary">
              Get started
            </Dialog.Title>
          </div>

          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-[rgba(135,130,245,0.1)] px-3 py-1 text-[12px] font-medium text-accent">
            <Lightning size={12} weight="fill" />
            Early Access Offer
          </div>

          <h3 className="font-heading text-[24px] leading-[1.15] font-semibold tracking-[-0.4px] text-text-primary">
            Choose your plan
          </h3>
          <p className="mt-2 text-[15px] leading-normal text-text-secondary">
            Unlock everything with Pro.
          </p>

          <div className="mt-5 flex justify-center sm:justify-start">
            <div className="inline-flex rounded-full bg-input-bg p-1">
              <button
                type="button"
                onClick={() => setBillingCycle("monthly")}
                className={`rounded-full px-4 py-2 text-[13px] font-medium transition-colors focus:outline-none ${
                  billingCycle === "monthly"
                    ? "bg-white text-text-primary shadow-[0_1px_2px_rgba(17,24,39,0.08)]"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle("yearly")}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-medium transition-colors focus:outline-none ${
                  billingCycle === "yearly"
                    ? "bg-white text-text-primary shadow-[0_1px_2px_rgba(17,24,39,0.08)]"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                Yearly
                <span className="rounded-full bg-[rgba(135,130,245,0.1)] px-2 py-0.5 text-[11px] font-semibold text-accent">
                  Save 50%
                </span>
              </button>
            </div>
          </div>

          <div className="mt-7">
            <div className="relative flex flex-col rounded-[16px] border-[1.5px] border-accent bg-[rgba(135,130,245,0.04)] p-5">
              {pricing.badge ? (
                <div className="absolute -top-2.5 right-4 inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-semibold text-white">
                  <CrownSimple size={11} weight="fill" />
                  {pricing.badge}
                </div>
              ) : null}

              <h4 className="text-[17px] font-semibold text-accent">Pro</h4>

              <div className="mt-3">
                <div className="flex items-baseline gap-2">
                  {pricing.originalPrice ? (
                    <span className="text-[15px] text-text-tertiary line-through">
                      {pricing.originalPrice}
                    </span>
                  ) : null}
                  <span className="text-[32px] font-bold leading-none tracking-[-1px] text-accent">
                    {pricing.price}
                  </span>
                  <span className="text-[14px] text-text-secondary">{pricing.period}</span>
                </div>
                <p className="mt-1 text-[12px] font-medium text-accent">{pricing.note}</p>
                <p className="mt-0.5 text-[12px] text-text-tertiary">{pricing.subnote}</p>
              </div>

              <ul className="mt-5 flex-1 space-y-2.5">
                {PRO_FEATURES.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2 text-[14px] text-text-primary"
                  >
                    <Check size={14} weight="bold" className="mt-0.5 shrink-0 text-accent" />
                    {feature}
                  </li>
                ))}
              </ul>

              {errorMessage ? (
                <p className="mt-3 text-[13px] text-destructive">{errorMessage}</p>
              ) : null}

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
                <Button variant="secondary" onClick={onClose} className="w-full sm:w-auto">
                  Maybe later
                </Button>
                <Button
                  onClick={() => onUpgrade(billingCycle)}
                  isLoading={isLoading}
                  className="w-full sm:w-auto"
                >
                  {isLoading ? "Redirecting to checkout..." : pricing.cta}
                </Button>
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
