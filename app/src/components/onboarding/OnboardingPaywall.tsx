import { useState } from "react";
import {
  ArrowRight,
  Briefcase,
  FolderSimple,
  HardDrives,
  Headset,
  Sparkle,
  Stack,
} from "@phosphor-icons/react";

export const FREE_FEATURES = [
  "Up to 3 projects",
  "Task management",
  "Client portal (Stage branding)",
];

export const PRO_FEATURES: Array<{ icon: typeof FolderSimple; label: string }> = [
  { icon: FolderSimple, label: "Unlimited projects" },
  { icon: Stack, label: "Connect claude, figma, notion & more" },
  { icon: HardDrives, label: "Unlimited file storage" },
  { icon: Briefcase, label: "Customizable client portal (your brand, your domain)" },
  { icon: Headset, label: "Priority support" },
];

type OnboardingPaywallProps = {
  onContinueFree: () => void;
  onUpgrade: (billingCycle: BillingCycle) => void;
  isUpgradeLoading: boolean;
  upgradeError: string | null;
};

export type BillingCycle = "monthly" | "yearly";

export const PRO_PRICING: Record<
  BillingCycle,
  {
    originalPrice?: string;
    price: string;
    period: string;
    note: string;
    subnote: string;
    cta: string;
    badge: string | null;
  }
> = {
  monthly: {
    price: "$29",
    period: "/month",
    note: "",
    subnote: "",
    cta: "Start 14-Day Trial",
    badge: null,
  },
  yearly: {
    originalPrice: "$348",
    price: "$99",
    period: "/year",
    note: "",
    subnote: "Save ~71% with yearly billing.",
    cta: "Start 14-Day Trial",
    badge: "Best value",
  },
};

export function OnboardingPaywall({
  onContinueFree,
  onUpgrade,
  isUpgradeLoading,
  upgradeError,
}: OnboardingPaywallProps) {
  const [billingCycle] = useState<BillingCycle>("monthly");
  const pricing = PRO_PRICING[billingCycle];

  return (
    <div className="mx-auto w-full max-w-[520px] rounded-[12px] bg-[#F5F5F5] p-1 shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
      <div className="flex items-center gap-2 px-3 py-3">
        <Sparkle size={18} weight="fill" className="text-[#5A52D5]" />
        <p className="bg-gradient-to-r from-[#463FBA] via-[rgba(70,63,186,0.75)] to-[#463FBA] bg-clip-text text-[13px] font-medium text-transparent">
          Unlock more with Pro
        </p>
      </div>

      <div className="rounded-[8px] bg-gradient-to-b from-white to-[rgba(158,153,248,0.05)] p-4 shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
        <div className="flex items-center justify-between">
          <p className="bg-gradient-to-r from-[#463FBA] via-[rgba(70,63,186,0.75)] to-[#463FBA] bg-clip-text text-[13px] font-medium text-transparent">
            Pro
          </p>
          {pricing.badge ? (
            <p className="bg-gradient-to-r from-[#463FBA] via-[rgba(70,63,186,0.75)] to-[#463FBA] bg-clip-text text-[13px] font-medium text-transparent">
              Most Popular
            </p>
          ) : (
            <p className="bg-gradient-to-r from-[#463FBA] via-[rgba(70,63,186,0.75)] to-[#463FBA] bg-clip-text text-[13px] font-medium text-transparent">
              Most Popular
            </p>
          )}
        </div>

        <div className="mt-5">
          <span className="block text-[19px] font-semibold leading-none text-text-primary">
            {pricing.price}
          </span>
          <span className="block text-[13px] font-medium leading-normal text-text-secondary">
            {pricing.period}
          </span>
        </div>

        <ul className="mt-6 space-y-3">
          {PRO_FEATURES.map(({ icon: Icon, label }) => (
            <li key={label} className="flex items-center gap-2 text-[13px] font-medium text-text-secondary">
              <Icon size={16} weight="fill" className="shrink-0 text-text-secondary" />
              <span className="min-w-0">{label}</span>
            </li>
          ))}
        </ul>

        {upgradeError ? (
          <p className="mt-4 text-[13px] text-destructive">{upgradeError}</p>
        ) : null}

        <button
          type="button"
          onClick={() => onUpgrade(billingCycle)}
          disabled={isUpgradeLoading}
          className="mt-6 inline-flex h-[40px] w-full cursor-pointer items-center justify-center rounded-[6px] border border-[rgba(158,153,248,0.75)] bg-gradient-to-b from-[#7B76DF] to-[#463FBA] text-[13px] font-medium text-white shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] transition-opacity hover:opacity-95 disabled:cursor-default disabled:opacity-50 focus:outline-none"
        >
          {isUpgradeLoading ? "Redirecting to checkout..." : pricing.cta}
        </button>
      </div>

      <button
        type="button"
        onClick={onContinueFree}
        className="mt-1 inline-flex h-[40px] w-full cursor-pointer items-center justify-center gap-2 rounded-[6px] bg-white text-[13px] font-medium text-text-secondary shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] transition-colors hover:bg-[#EFEFF2] focus:outline-none"
      >
        See All Plans
        <ArrowRight size={14} weight="bold" />
      </button>
    </div>
  );
}
