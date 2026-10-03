import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  BillingPeriodToggle,
  PLANS,
  PLAN_FEATURES,
  PlanCard,
  type BillingCycle,
  type Tier,
} from "@/components/subscriptions/planCards";

type OnboardingPaywallProps = {
  onStartTrial: (billingCycle: BillingCycle, tier: Tier) => void;
  isUpgradeLoading: boolean;
  upgradeError: string | null;
};

// Same horizontal plan view as the Subscriptions page; checkout runs through the
// onboarding controller so onboarding is completed before Stripe opens.
export function OnboardingPaywall({ onStartTrial, isUpgradeLoading, upgradeError }: OnboardingPaywallProps) {
  const navigate = useNavigate();
  const [billingPeriod, setBillingPeriod] = useState<BillingCycle>("monthly");
  const [selectedTier, setSelectedTier] = useState<Tier | null>(null);
  const pricePeriod = billingPeriod === "yearly" ? "/year" : "/month";

  return (
    <div className="flex w-full flex-col gap-[clamp(18px,3vw,32px)]">
      <header className="flex w-full flex-col gap-[28px]">
        <div className="flex items-center gap-[2px]">
          <img src="/logos/stage.svg" alt="" aria-hidden="true" className="h-[23px] w-[19px] object-contain brightness-0" />
          <span className="text-[19px] font-semibold leading-none tracking-[-0.06em] text-black">Stage</span>
        </div>
        <div className="flex flex-col gap-[20px] min-[720px]:flex-row min-[720px]:items-end min-[720px]:justify-between">
          <div>
            <h1 className="text-[21px] font-semibold leading-[1.2] text-[#0a0a0a]">Pick your Stage plan</h1>
            <p className="mt-[10px] text-[13px] font-medium leading-[1.5] text-[#525252]">
              14-day free trial. Card required, cancel anytime.
            </p>
          </div>
          <BillingPeriodToggle value={billingPeriod} onChange={setBillingPeriod} />
        </div>
      </header>

      <section className="mx-auto w-full rounded-[12px] bg-[#f5f5f5] p-[4px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
        <div className="flex flex-col gap-[4px] min-[900px]:flex-row">
          {PLANS.map((plan) => (
            <PlanCard
              key={plan.tier}
              name={plan.name}
              price={plan.prices[billingPeriod]}
              pricePeriod={pricePeriod}
              description={plan.description}
              features={PLAN_FEATURES[plan.tier]}
              cta="Start 14-Day Trial"
              meta={plan.meta}
              popular={plan.popular}
              primary={plan.popular}
              onCtaClick={() => {
                setSelectedTier(plan.tier);
                onStartTrial(billingPeriod, plan.tier);
              }}
              ctaLoading={isUpgradeLoading && selectedTier === plan.tier}
              ctaDisabled={isUpgradeLoading}
            />
          ))}
        </div>
      </section>

      {upgradeError ? (
        <p className="text-center text-[12px] font-medium leading-[1.5] text-[#B91C1C]">{upgradeError}</p>
      ) : null}

      <p className="text-center text-[13px] font-medium leading-[1.5] text-[#737373]">
        AI credits are pooled across each Studio or Agency workspace.
      </p>

      <button
        type="button"
        onClick={() => void navigate({ to: "/settings/account" })}
        className="mx-auto text-[12px] font-medium text-[#737373] transition-opacity hover:opacity-80 focus:outline-none"
      >
        Manage or delete account
      </button>
    </div>
  );
}
