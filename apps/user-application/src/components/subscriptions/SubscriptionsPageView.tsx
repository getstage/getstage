import { useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useAction as useConvexAction } from "convex/react";
import { api } from "@/lib/convexApi";
import { toUserFacingErrorMessage } from "@/lib/errors";
import { openExternalLink } from "@/lib/settings/openExternalLink";
import { useSettingsOverviewQuery } from "@/hooks/convex-data";
import { coveringPlan } from "@/models/settings/settings";
import { BillingPeriodToggle, PLANS, PLAN_FEATURES, PlanCard, planCta, type BillingCycle, type Tier } from "./planCards";

export function SubscriptionsPageView() {
  const navigate = useNavigate();
  const { from } = useSearch({ from: "/_authed/subscriptions" });
  const teamOnly = from === "teams";
  const overview = useSettingsOverviewQuery();
  const createCheckoutSession = useConvexAction(api.billing.createCheckoutSession);
  const createCustomerPortalSession = useConvexAction(api.billing.createCustomerPortalSession);
  const [billingPeriod, setBillingPeriod] = useState<BillingCycle>("monthly");
  const [pendingTier, setPendingTier] = useState<Tier | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const currentPlan = coveringPlan(overview.data);
  const isSubscribed = currentPlan !== undefined && currentPlan !== "free";
  const pricePeriod = billingPeriod === "yearly" ? "/year" : "/month";
  const backLabel = getBackLabel();

  function goBack() {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    void navigate({ to: teamOnly ? "/settings/team" : "/settings/billing" });
  }

  async function selectPlan(tier: Tier) {
    setCheckoutError(null);
    setPendingTier(tier);
    const isCurrentPlan = isSubscribed && currentPlan === tier;
    if (isCurrentPlan) {
      setPendingTier(null);
      return;
    }
    try {
      const result = await createCheckoutSession({
        kind: "subscription",
        tier,
        billingCycle: billingPeriod,
        isTrial: !isSubscribed,
        platform: "desktop",
      });
      if (!result.url) {
        throw new Error("Checkout URL missing.");
      }
      await openExternalLink(result.url);
    } catch (error) {
      setCheckoutError(toUserFacingErrorMessage(error, "Checkout could not be started. Please try again."));
    } finally {
      setPendingTier(null);
    }
  }

  async function openManageSubscription() {
    setCheckoutError(null);
    setPortalLoading(true);
    try {
      const result = await createCustomerPortalSession({ platform: "desktop" });
      if (!result.url) {
        throw new Error("Portal URL missing.");
      }
      await openExternalLink(result.url);
    } catch (error) {
      setCheckoutError(
        toUserFacingErrorMessage(error, "Could not open subscription management. Please try again."),
      );
    } finally {
      setPortalLoading(false);
    }
  }

  return (
    <div className="flex h-dvh w-full min-w-0 overflow-hidden bg-white">
      <div className="flex h-full w-full min-w-0 flex-col items-center overflow-auto px-[clamp(10px,3vw,56px)] pb-[clamp(18px,3vw,40px)] pt-[64px] min-[900px]:py-[clamp(14px,3vw,40px)]">
        <div className="flex w-full max-w-[1098px] flex-col gap-[clamp(18px,3vw,32px)] min-[900px]:min-h-full min-[900px]:justify-center">
          <div className="flex w-full flex-col gap-[32px]">
            <button
              type="button"
              onClick={goBack}
              className="inline-flex w-fit items-center gap-[8px] text-[13px] font-medium leading-[1.5] text-[#a3a3a3] transition-colors hover:text-[#737373]"
            >
              <ArrowLeftIcon />
              {backLabel}
            </button>

            <header className="flex w-full flex-col gap-[28px]">
              <div className="flex items-center gap-[2px]">
                <img src="/logos/stage.svg" alt="" aria-hidden="true" className="h-[23px] w-[19px] object-contain brightness-0" />
                <span className="text-[19px] font-semibold leading-none tracking-[-0.06em] text-black">Stage</span>
              </div>
              <div className="flex flex-col gap-[20px] min-[720px]:flex-row min-[720px]:items-end min-[720px]:justify-between">
                <div>
                  <h1 className="text-[21px] font-semibold leading-[1.2] text-[#0a0a0a]">
                    {teamOnly ? "Choose a team plan" : "Pick your Stage plan"}
                  </h1>
                  <p className="mt-[10px] text-[13px] font-medium leading-[1.5] text-[#525252]">
                    {teamOnly
                      ? "Solo includes one seat. Studio and Agency let you invite team members."
                      : isSubscribed
                        ? "Change plan anytime. Stripe handles proration on upgrades."
                        : "14-day free trial. Card required, cancel anytime."}
                  </p>
                  {isSubscribed ? (
                    <p className="mt-[8px] text-[12px] font-medium leading-[1.5] text-[#a3a3a3]">
                      Need invoices, cancel, or update your card?{" "}
                      <button
                        type="button"
                        onClick={() => void openManageSubscription()}
                        disabled={portalLoading}
                        className="underline decoration-[#d4d4d4] underline-offset-[3px] transition-colors hover:text-[#737373] disabled:opacity-60"
                      >
                        {portalLoading ? "Opening…" : "Manage subscription"}
                      </button>
                    </p>
                  ) : null}
                </div>
                <BillingPeriodToggle value={billingPeriod} onChange={setBillingPeriod} />
              </div>
            </header>
          </div>

          <section className="mx-auto w-full rounded-[12px] bg-[#f5f5f5] p-[4px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
            <div className="flex flex-col gap-[4px] min-[900px]:flex-row">
              {PLANS.filter((plan) => !teamOnly || plan.tier !== "start").map((plan) => (
                <PlanCard
                  key={plan.tier}
                  name={plan.name}
                  price={plan.prices[billingPeriod]}
                  pricePeriod={pricePeriod}
                  description={plan.description}
                  features={PLAN_FEATURES[plan.tier]}
                  cta={teamOnly ? "Manage subscription" : planCta(plan.tier, currentPlan, isSubscribed)}
                  meta={plan.meta}
                  popular={plan.popular}
                  primary={plan.popular}
                  onCtaClick={teamOnly ? () => void openManageSubscription() : () => selectPlan(plan.tier)}
                  ctaLoading={teamOnly ? portalLoading : pendingTier === plan.tier}
                  ctaDisabled={teamOnly ? portalLoading : pendingTier !== null || (isSubscribed && currentPlan === plan.tier)}
                />
              ))}
            </div>
          </section>

          {checkoutError ? (
            <p className="text-center text-[12px] font-medium leading-[1.5] text-[#B91C1C]">{checkoutError}</p>
          ) : null}

          <p className="text-center text-[13px] font-medium leading-[1.5] text-[#737373]">
            {teamOnly
              ? "Manage your existing Solo subscription in Stripe to switch plans. No second subscription is created here."
              : "AI credits are pooled across each Studio or Agency workspace."}
          </p>
        </div>
      </div>
    </div>
  );
}

function ArrowLeftIcon() {
  return <img src="/logos/back.svg" alt="" aria-hidden="true" className="h-[16px] w-[16px] shrink-0" />;
}

function getBackLabel() {
  const storedLabel = sessionStorage.getItem("stage:subscriptions-back-label");
  if (storedLabel) return storedLabel;

  const previousPath = document.referrer ? new URL(document.referrer).pathname : "";
  const currentSearch = new URLSearchParams(window.location.search);
  const from = currentSearch.get("from") ?? previousPath;

  if (from.includes("client-portal")) return "Back to client portal";
  if (from.includes("onboarding")) return "Back to onboarding";
  if (from.includes("settings")) return "Back to billing";
  return "Back to billing";
}
