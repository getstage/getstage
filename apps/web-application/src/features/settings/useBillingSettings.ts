import { useMemo, useState } from "react";
import { useAction as useConvexAction } from "convex/react";
import { PRO_PRICING, type BillingCycle } from "@/components/onboarding/OnboardingPaywall";
import { useFeedback } from "@/hooks/useFeedback";
import { api } from "@/lib/convex";
import { getDatafastCheckoutMetadata, trackDatafastGoal } from "@/lib/datafast";
import { capitalize } from "@/lib/format";
import { showFriendlyFeedback } from "./feedback";

type SubscriptionSnapshot = {
  plan: string;
  status: string;
  billingCycle: BillingCycle;
  paymentMethodBrand: string | null;
  paymentMethodLast4: string | null;
  provider: string | null;
} | null;

type BillingSettingsInput = {
  profilePlan?: string;
  subscription: SubscriptionSnapshot;
};

export function useBillingSettings({ profilePlan, subscription }: BillingSettingsInput) {
  const createCheckoutSession = useConvexAction(api.billing.createCheckoutSession);
  const createCustomerPortalSession = useConvexAction(api.billing.createCustomerPortalSession);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [isPortalLoading, setIsPortalLoading] = useState(false);
  const [upgradePricingOpen, setUpgradePricingOpen] = useState(false);
  const { feedback: billingFeedback, showFeedback: showBillingFeedback } = useFeedback();

  async function handleStartCheckout(billingCycle: BillingCycle) {
    setIsCheckoutLoading(true);
    try {
      const result = await createCheckoutSession({
        billingCycle,
        source: "settings_billing",
        ...getDatafastCheckoutMetadata(),
      });
      if (!result.url) {
        throw new Error("Stripe checkout URL is missing.");
      }
      trackDatafastGoal("checkout_started", {
        source: "settings_billing",
        billing_cycle: billingCycle,
        plan: "pro",
      });
      window.location.assign(result.url);
    } catch (error) {
      showFriendlyFeedback(
        showBillingFeedback,
        error,
        "Could not start checkout right now. Please try again.",
      );
    } finally {
      setIsCheckoutLoading(false);
    }
  }

  async function handleOpenPortal() {
    setIsPortalLoading(true);
    try {
      const result = await createCustomerPortalSession({});
      if (!result.url) {
        throw new Error("Stripe portal URL is missing.");
      }
      window.location.assign(result.url);
    } catch (error) {
      showFriendlyFeedback(
        showBillingFeedback,
        error,
        "Could not open the billing portal right now.",
      );
    } finally {
      setIsPortalLoading(false);
    }
  }

  const viewModel = useMemo(() => {
    const isPro = profilePlan === "pro";
    const planName = subscription
      ? `Stage ${capitalize(subscription.plan)}`
      : isPro
        ? "Stage Pro"
        : "Stage Free";
    const planStatus = subscription
      ? capitalize(subscription.status)
      : isPro
        ? "Included"
        : "Free";
    const planCycle = subscription
      ? `${capitalize(subscription.billingCycle)} · ${PRO_PRICING[subscription.billingCycle].price}${PRO_PRICING[subscription.billingCycle].period}`
      : isPro
        ? "Pro access without an active Stripe subscription"
        : "No active subscription";
    const paymentText =
      subscription?.paymentMethodBrand && subscription.paymentMethodLast4
        ? `${capitalize(subscription.paymentMethodBrand)} ending in ${subscription.paymentMethodLast4}`
        : "No payment method on file";
    const paymentProviderText = subscription?.provider
      ? `Powered by ${capitalize(subscription.provider)}`
      : isPro
        ? "Payment details are not available for this Pro account yet."
        : "Payment details appear here after you start Stage Pro.";

    return {
      planName,
      planStatus,
      planCycle,
      paymentText,
      paymentProviderText,
      hasActiveSubscription: Boolean(subscription),
      isPro,
    };
  }, [profilePlan, subscription]);

  return {
    ...viewModel,
    billingFeedback,
    isCheckoutLoading,
    isPortalLoading,
    upgradePricingOpen,
    setUpgradePricingOpen,
    handleStartCheckout,
    handleOpenPortal,
  };
}
