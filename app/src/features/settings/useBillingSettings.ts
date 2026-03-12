import { useMemo, useState } from "react";
import { useAction as useConvexAction } from "convex/react";
import { PRO_PRICING, type BillingCycle } from "@/components/onboarding/OnboardingPaywall";
import { useFeedback } from "@/hooks/useFeedback";
import { api } from "@/lib/convex";
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
      const result = await createCheckoutSession({ billingCycle });
      if (!result.url) {
        throw new Error("Stripe checkout URL is missing.");
      }
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
    const planName = subscription ? `Stage ${capitalize(subscription.plan)}` : "Stage Pro";
    const planStatus = subscription ? capitalize(subscription.status) : "Pending";
    const planCycle = subscription
      ? `${capitalize(subscription.billingCycle)} · ${PRO_PRICING[subscription.billingCycle].price}${PRO_PRICING[subscription.billingCycle].period}`
      : "Provider not configured yet";
    const paymentText =
      subscription?.paymentMethodBrand && subscription.paymentMethodLast4
        ? `${capitalize(subscription.paymentMethodBrand)} ending in ${subscription.paymentMethodLast4}`
        : "No payment method on file";
    const paymentProviderText = subscription?.provider
      ? `Powered by ${capitalize(subscription.provider)}`
      : "Billing provider not configured";

    return {
      planName,
      planStatus,
      planCycle,
      paymentText,
      paymentProviderText,
      hasActiveSubscription: Boolean(subscription),
      isPro: profilePlan === "pro",
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
