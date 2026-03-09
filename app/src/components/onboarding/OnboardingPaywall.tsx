import { Check, CrownSimple, Lightning } from "@phosphor-icons/react";

const FREE_FEATURES = [
  "Up to 3 projects",
  "Task management",
  "Client portal (Stage branding)",
];

const PRO_FEATURES = [
  "Unlimited projects",
  "Custom portal branding",
  "Stripe Connect integration",
  "Google Sheets & CSV import",
  "Priority support",
];

type OnboardingPaywallProps = {
  onContinueFree: () => void;
  onUpgrade: () => void;
  isUpgradeLoading: boolean;
  upgradeError: string | null;
};

export function OnboardingPaywall({
  onContinueFree,
  onUpgrade,
  isUpgradeLoading,
  upgradeError,
}: OnboardingPaywallProps) {
  return (
    <div>
      <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-[rgba(135,130,245,0.1)] px-3 py-1 text-[12px] font-medium text-accent">
        <Lightning size={12} weight="fill" />
        Early Access Offer
      </div>

      <h3 className="font-heading text-[24px] leading-[1.15] font-semibold tracking-[-0.4px] text-text-primary">
        Choose your plan
      </h3>
      <p className="mt-2 text-[15px] leading-normal text-text-secondary">
        Start free or unlock everything with Pro.
      </p>

      <div className="mt-7 grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col rounded-[16px] border border-border-subtle bg-white p-5">
          <h4 className="text-[17px] font-semibold text-text-primary">Free</h4>

          <div className="mt-3">
            <span className="text-[32px] font-bold leading-none tracking-[-1px] text-text-primary">
              $0
            </span>
            <span className="ml-1 text-[14px] text-text-secondary">/forever</span>
          </div>

          <ul className="mt-5 flex-1 space-y-2.5">
            {FREE_FEATURES.map((feature) => (
              <li
                key={feature}
                className="flex items-start gap-2 text-[14px] text-text-secondary"
              >
                <Check size={14} weight="bold" className="mt-0.5 shrink-0 text-text-tertiary" />
                {feature}
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={onContinueFree}
            className="mt-6 h-[44px] w-full cursor-pointer rounded-[10px] border border-border bg-white text-[14px] font-medium text-text-primary transition-colors hover:bg-bg-subtle focus:outline-none"
          >
            Continue free
          </button>
        </div>

        <div className="relative flex flex-col rounded-[16px] border-[1.5px] border-accent bg-[rgba(135,130,245,0.04)] p-5">
          <div className="absolute -top-2.5 right-4 inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-semibold text-white">
            <CrownSimple size={11} weight="fill" />
            Best value
          </div>

          <h4 className="text-[17px] font-semibold text-accent">Pro</h4>

          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-[15px] text-text-tertiary line-through">$99</span>
              <span className="text-[32px] font-bold leading-none tracking-[-1px] text-accent">
                $49
              </span>
              <span className="text-[14px] text-text-secondary">/year</span>
            </div>
            <p className="mt-1 text-[12px] font-medium text-accent">Launch price — save 50%</p>
            <p className="mt-0.5 text-[12px] text-text-tertiary">or $9/month</p>
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

          {upgradeError ? (
            <p className="mt-3 text-[13px] text-destructive">{upgradeError}</p>
          ) : null}

          <button
            type="button"
            onClick={onUpgrade}
            disabled={isUpgradeLoading}
            className="mt-6 h-[44px] w-full cursor-pointer rounded-[10px] bg-accent text-[14px] font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-default disabled:opacity-50 focus:outline-none"
          >
            {isUpgradeLoading ? "Redirecting to checkout..." : "Get Pro — $49/year"}
          </button>
        </div>
      </div>
    </div>
  );
}
