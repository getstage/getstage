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
    <div className="rounded-[16px] bg-[#F4F4F5] p-1">
      <div className="flex items-center gap-2 px-4 py-3">
        <Sparkle size={16} weight="fill" className="text-accent" />
        <p className="text-[14px] font-medium text-accent">Unlock more with Pro</p>
      </div>

      <div className="rounded-[12px] bg-[rgba(135,130,245,0.08)] p-5">
        <div className="flex items-center justify-between">
          <p className="text-[15px] font-semibold text-accent">Pro</p>
          {pricing.badge ? (
            <p className="text-[13px] font-medium text-accent">Most Popular</p>
          ) : (
            <p className="text-[13px] font-medium text-accent">Most Popular</p>
          )}
        </div>

        <div className="mt-4 flex items-baseline gap-1">
          <span className="text-[36px] font-bold leading-none tracking-[-1px] text-text-primary">
            {pricing.price}
          </span>
          <span className="text-[14px] text-text-secondary">{pricing.period}</span>
        </div>

        <ul className="mt-5 space-y-3">
          {PRO_FEATURES.map(({ icon: Icon, label }) => (
            <li key={label} className="flex items-start gap-2.5 text-[14px] text-text-primary">
              <Icon size={16} weight="regular" className="mt-0.5 shrink-0 text-text-secondary" />
              <span>{label}</span>
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
          className="mt-5 inline-flex h-[48px] w-full cursor-pointer items-center justify-center rounded-[12px] bg-accent text-[15px] font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-default disabled:opacity-50 focus:outline-none"
        >
          {isUpgradeLoading ? "Redirecting to checkout..." : pricing.cta}
        </button>
      </div>

      <button
        type="button"
        onClick={onContinueFree}
        className="mt-1 inline-flex h-[48px] w-full cursor-pointer items-center justify-center gap-2 rounded-[12px] bg-white text-[14px] font-medium text-text-primary transition-colors hover:bg-[#EFEFF2] focus:outline-none"
      >
        See All Plans
        <ArrowRight size={14} weight="bold" />
      </button>
    </div>
  );
}
