import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "@/lib/convex";
import { getDatafastCheckoutMetadata, trackDatafastGoal } from "@/lib/datafast";
import { BillingPeriodToggle, PLANS, PLAN_FEATURES, PlanCard, type BillingCycle, type Tier } from "./planCards";
import { SetupScreen } from "./SetupScreens";

// Copy of the Mac onboarding paywall. Stripe returns to /app (success or cancel).
export function Paywall({ title = "Pick your Stage plan", beforeCheckout }: { title?: string; beforeCheckout?: () => Promise<unknown> }) {
  const createCheckoutSession = useAction(api.billing.createCheckoutSession);
  const [billingPeriod, setBillingPeriod] = useState<BillingCycle>("monthly");
  const [loadingTier, setLoadingTier] = useState<Tier>();
  const [error, setError] = useState<string>();
  const pricePeriod = billingPeriod === "yearly" ? "/year" : "/month";

  const startTrial = async (tier: Tier) => {
    setLoadingTier(tier);
    setError(undefined);
    try {
      await beforeCheckout?.();
      const result = await createCheckoutSession({
        tier,
        billingCycle: billingPeriod,
        isTrial: true,
        source: "onboarding_paywall",
        platform: "web",
        ...getDatafastCheckoutMetadata(),
      });
      if (!result.url) throw new Error("Checkout URL missing.");
      trackDatafastGoal("checkout_started", { source: "onboarding_paywall", billing_cycle: billingPeriod, plan: tier });
      window.location.assign(result.url);
    } catch {
      setError("Could not start checkout. Please try again.");
      setLoadingTier(undefined);
    }
  };

  return (
    <SetupScreen wide>
      <div className="flex flex-col gap-[20px] min-[720px]:flex-row min-[720px]:items-end min-[720px]:justify-between">
        <div>
          <h1 className="text-[21px] font-semibold leading-[1.2] text-[#0a0a0a]">{title}</h1>
          <p className="mt-[10px] text-[13px] font-medium leading-[1.5] text-[#525252]">
            14-day free trial. Card required, cancel anytime.
          </p>
        </div>
        <BillingPeriodToggle value={billingPeriod} onChange={setBillingPeriod} />
      </div>

      <section className="mt-6 w-full rounded-[12px] bg-[#f5f5f5] p-[4px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
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
              onCtaClick={() => void startTrial(plan.tier)}
              ctaLoading={loadingTier === plan.tier}
              ctaDisabled={loadingTier !== undefined}
            />
          ))}
        </div>
      </section>

      {error ? <p role="alert" className="mt-3 text-center text-[12px] font-medium leading-[1.5] text-[#B91C1C]">{error}</p> : null}
      <p className="mt-4 text-center text-[13px] font-medium leading-[1.5] text-[#737373]">
        AI credits are pooled across each Studio or Agency workspace.
      </p>
    </SetupScreen>
  );
}
