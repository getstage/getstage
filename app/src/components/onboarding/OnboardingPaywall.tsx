import { useState } from "react";
import stageLogo from "@/assets/logos/stage-logo-light.png";

export type BillingCycle = "monthly" | "yearly";

export const FREE_FEATURES = [
  "Up to 3 projects",
  "Task management",
  "Client portal (Stage branding)",
];

export const PRO_FEATURES = [
  { iconSrc: "/logos/pricing/folder.svg", label: "Unlimited projects" },
  { iconSrc: "/logos/pricing/connect.svg", label: "Connect claude, figma, notion & more" },
  { iconSrc: "/logos/pricing/storage.svg", label: "Unlimited file storage" },
  { iconSrc: "/logos/pricing/portal.svg", label: "Customizable client portal (your brand, your domain)" },
  { iconSrc: "/logos/pricing/priority.svg", label: "Priority support" },
];

const START_FEATURES = [
  { iconSrc: "/logos/pricing/folder.svg", label: "3 active projects" },
  { iconSrc: "/logos/pricing/connect.svg", label: "Connect claude, figma, notion & more" },
  { iconSrc: "/logos/pricing/portal.svg", label: "Client portal (standard)" },
  { iconSrc: "/logos/pricing/storage.svg", label: "Unlimited file storage" },
];

const TEAM_FEATURES = [
  { iconSrc: "/logos/pricing/folder.svg", label: "Everything in Pro" },
  { iconSrc: "/logos/pricing/connect.svg", label: "Team workspace & shared projects" },
  { iconSrc: "/logos/pricing/portal.svg", label: "Role-based permissions" },
  { iconSrc: "/logos/pricing/storage.svg", label: "Centralized billing" },
];

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

type OnboardingPaywallProps = {
  onContinueFree: () => void;
  isUpgradeLoading: boolean;
  upgradeError: string | null;
};

function FeatureList({ features }: { features: Array<{ iconSrc: string; label: string }> }) {
  return (
    <ul className="mt-6 space-y-3">
      {features.map((feature) => (
        <li key={feature.label} className="flex items-center gap-3 text-[13px] font-medium text-text-secondary">
          <img src={feature.iconSrc} alt="" className="h-4 w-4 shrink-0 object-contain opacity-80" />
          <span className="min-w-0">{feature.label}</span>
        </li>
      ))}
    </ul>
  );
}

function PlanButton({
  children,
  onClick,
  primary = false,
  disabled = false,
}: {
  children: string;
  onClick: () => void;
  primary?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={
        primary
          ? "mt-6 inline-flex h-[40px] w-full cursor-pointer items-center justify-center rounded-[6px] border border-[rgba(158,153,248,0.75)] bg-gradient-to-b from-[#7B76DF] to-[#463FBA] text-[13px] font-medium text-white shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] transition-opacity hover:opacity-95 disabled:cursor-default disabled:opacity-50 focus:outline-none"
          : "mt-6 inline-flex h-[40px] w-full cursor-pointer items-center justify-center rounded-[6px] bg-white text-[13px] font-medium text-text-secondary shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] transition-colors hover:bg-[#EFEFF2] disabled:cursor-default disabled:opacity-50 focus:outline-none"
      }
    >
      {children}
    </button>
  );
}

export function OnboardingPaywall({
  onContinueFree,
  isUpgradeLoading,
  upgradeError,
}: OnboardingPaywallProps) {
  const [showAllPlans, setShowAllPlans] = useState(false);

  if (showAllPlans) {
    return (
      <div className="w-full">
        <img src={stageLogo} alt="Stage" className="mb-8 h-[22px] w-auto" />
        <div className="mb-6">
          <h2 className="font-heading text-[24px] leading-[1.15] font-semibold tracking-[-0.3px] text-text-primary">
            Want to connect claude, figma &amp; notion?
          </h2>
          <p className="mt-1.5 text-[14px] leading-normal text-text-secondary">
            Upgrade your workspace plan to unlock integrations.
          </p>
        </div>

        <div className="rounded-[12px] bg-[#F5F5F5] p-1 shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
          <div className="flex items-center gap-2 px-3 py-3">
            <img src="/logos/pricing/connect.svg" alt="" className="h-4 w-4" />
            <p className="bg-gradient-to-r from-[#463FBA] to-[#7B76DF] bg-clip-text text-[13px] font-medium text-transparent">
              Unlock more with Pro
            </p>
          </div>

          <div className="space-y-1">
            <div className="rounded-[8px] bg-white p-4 shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
              <p className="text-[13px] font-medium text-text-primary">Start</p>
              <div className="mt-5">
                <span className="block text-[24px] font-semibold leading-none text-text-primary">$9</span>
                <span className="block text-[13px] font-medium text-text-secondary">/month</span>
              </div>
              <FeatureList features={START_FEATURES} />
              <p className="mt-4 text-[13px] font-medium text-text-secondary">
                Billed $99/year when paid annually
              </p>
              <PlanButton onClick={onContinueFree} disabled={isUpgradeLoading}>
                Continue with Start Plan
              </PlanButton>
            </div>

            <div className="rounded-[8px] bg-gradient-to-b from-[rgba(158,153,248,0.1)] to-white p-4 shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
              <div className="flex items-center justify-between gap-4">
                <p className="bg-gradient-to-r from-[#463FBA] to-[#7B76DF] bg-clip-text text-[13px] font-medium text-transparent">
                  Pro
                </p>
                <p className="bg-gradient-to-r from-[#463FBA] to-[#7B76DF] bg-clip-text text-[13px] font-medium text-transparent">
                  Most Popular
                </p>
              </div>
              <div className="mt-5">
                <span className="block text-[24px] font-semibold leading-none text-text-primary">$29</span>
                <span className="block text-[13px] font-medium text-text-secondary">/month</span>
              </div>
              <p className="mt-6 text-[13px] font-medium text-text-secondary">Everything in Start</p>
              <FeatureList features={PRO_FEATURES} />
              <PlanButton onClick={onContinueFree} primary disabled={isUpgradeLoading}>
                Start 14-Day Trial
              </PlanButton>
              <p className="mt-3 text-center text-[13px] font-medium leading-[1.35] text-text-secondary">
                Start 14-Day Free Trial
                <br />
                No credit card required.
              </p>
            </div>

            <div className="rounded-[8px] bg-white p-4 shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
              <p className="text-[13px] font-medium text-text-primary">Team</p>
              <div className="mt-5">
                <span className="block text-[24px] font-semibold leading-none text-text-primary">$29</span>
                <span className="block text-[13px] font-medium text-text-secondary">/seat/month</span>
              </div>
              <FeatureList features={TEAM_FEATURES} />
              <PlanButton onClick={onContinueFree} disabled={isUpgradeLoading}>
                Start 14-Day Trial
              </PlanButton>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <img src={stageLogo} alt="Stage" className="mb-8 h-[22px] w-auto" />
      <div className="mb-6">
        <h2 className="font-heading text-[24px] leading-[1.15] font-semibold tracking-[-0.3px] text-text-primary">
          Want to connect claude, figma &amp; notion?
        </h2>
        <p className="mt-1.5 text-[14px] leading-normal text-text-secondary">
          Upgrade your workspace plan to unlock integrations.
        </p>
      </div>

      <div className="mx-auto w-full max-w-[520px] rounded-[12px] bg-[#F5F5F5] p-1 shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
        <div className="flex items-center gap-2 px-3 py-3">
          <img src="/logos/pricing/connect.svg" alt="" className="h-4 w-4" />
          <p className="bg-gradient-to-r from-[#463FBA] to-[#7B76DF] bg-clip-text text-[13px] font-medium text-transparent">
            Unlock more with Pro
          </p>
        </div>

        <div className="rounded-[8px] bg-gradient-to-b from-white to-[rgba(158,153,248,0.05)] p-4 shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
          <div className="flex items-center justify-between gap-4">
            <p className="bg-gradient-to-r from-[#463FBA] to-[#7B76DF] bg-clip-text text-[13px] font-medium text-transparent">
              Pro
            </p>
            <p className="bg-gradient-to-r from-[#463FBA] to-[#7B76DF] bg-clip-text text-[13px] font-medium text-transparent">
              Most Popular
            </p>
          </div>

          <div className="mt-5">
            <span className="block text-[24px] font-semibold leading-none text-text-primary">$29</span>
            <span className="block text-[13px] font-medium text-text-secondary">/month</span>
          </div>

          <FeatureList features={PRO_FEATURES} />

          {upgradeError ? <p className="mt-4 text-[13px] text-destructive">{upgradeError}</p> : null}

          <PlanButton onClick={onContinueFree} primary disabled={isUpgradeLoading}>
            Start 14-Day Trial
          </PlanButton>
        </div>

        <button
          type="button"
          onClick={() => setShowAllPlans(true)}
          className="mt-1 inline-flex h-[40px] w-full cursor-pointer items-center justify-center gap-2 rounded-[6px] bg-white text-[13px] font-medium text-text-secondary shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] transition-colors hover:bg-[#EFEFF2] focus:outline-none"
        >
          See All Plans
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </div>
  );
}
