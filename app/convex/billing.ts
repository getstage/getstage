import { StripeSubscriptions, type StripeComponent } from "@convex-dev/stripe";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { ActionCtx, QueryCtx } from "./_generated/server";
import { action, internalMutation, internalQuery, query } from "./_generated/server";
import { components, internal } from "./_generated/api";
import { requireAuthUser } from "./_helpers";

function getEnv(name: string) {
  return (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.[
    name
  ];
}

function requireEnv(name: string) {
  const value = getEnv(name);
  if (!value) {
    throw new Error(`${name} is not configured.`);
  }
  return value;
}

const stripeComponent = (components as { stripe: StripeComponent }).stripe;
const stripe = new StripeSubscriptions(stripeComponent, {});
const ACTIVE_SUBSCRIPTION_STATUSES = new Set([
  "active",
  "trialing",
  "past_due",
  "unpaid",
  "incomplete",
]);

type ViewerContext = {
  userId: Id<"users">;
  userIdString: string;
  email: string;
  name: string;
};

type BillingCycle = "monthly" | "yearly";

type StripeSubscriptionSummary = {
  currentPeriodEnd: number;
  status: string;
  cancelAtPeriodEnd: boolean;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  priceId: string;
};

type SubscriptionSnapshot = {
  plan: "pro";
  provider: "stripe";
  status: string;
  billingCycle: BillingCycle;
  currentPeriodEnd: number;
  cancelAtPeriodEnd: boolean;
  paymentMethodBrand: null;
  paymentMethodLast4: null;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  stripePriceId: string;
} | null;

type CheckoutSessionResponse = {
  sessionId: string;
  url: string | null;
};

type CustomerPortalSessionResponse = {
  url: string;
};

type FirstPaymentEventState = {
  email: string;
  firstPaymentEmailSentAt: number | null;
};

function toMilliseconds(timestampSeconds: number) {
  return timestampSeconds * 1000;
}

function getBillingUrls() {
  const siteUrl = requireEnv("SITE_URL");
  return {
    successUrl: `${siteUrl}/dashboard?billing=success`,
    cancelUrl: `${siteUrl}/dashboard?billing=cancel`,
    returnUrl: `${siteUrl}/settings?tab=billing`,
  };
}

function getBillingCycleForPriceId(priceId: string | null | undefined): BillingCycle {
  const monthlyPriceId = getEnv("STRIPE_MONTHLY_PRICE_ID");
  if (monthlyPriceId && priceId === monthlyPriceId) {
    return "monthly";
  }

  return "yearly";
}

function getPriceIdForBillingCycle(billingCycle: BillingCycle, explicitPriceId?: string) {
  if (explicitPriceId) {
    return explicitPriceId;
  }

  if (billingCycle === "monthly") {
    const monthlyPriceId = getEnv("STRIPE_MONTHLY_PRICE_ID");
    if (!monthlyPriceId) {
      throw new Error("Monthly checkout is not configured yet.");
    }
    return monthlyPriceId;
  }

  const yearlyPriceId = getEnv("STRIPE_YEARLY_PRICE_ID") ?? getEnv("STRIPE_PRICE_ID");
  if (!yearlyPriceId) {
    throw new Error("Yearly checkout is not configured yet.");
  }

  return yearlyPriceId;
}

function getLoopsEventApiKey() {
  return getEnv("AUTH_LOOPS_API_KEY") ?? requireEnv("LOOPS_API_KEY");
}

async function loadSubscriptionByUserId(
  ctx: Pick<QueryCtx, "runQuery">,
  userId: string,
): Promise<SubscriptionSnapshot> {
  const subscriptions = (await ctx.runQuery(stripeComponent.public.listSubscriptionsByUserId, {
    userId,
  })) as StripeSubscriptionSummary[];

  const sorted = [...subscriptions].sort((a, b) => b.currentPeriodEnd - a.currentPeriodEnd);
  const preferred =
    sorted.find((subscription) => ACTIVE_SUBSCRIPTION_STATUSES.has(subscription.status)) ?? null;

  if (!preferred) {
    return null;
  }

  return {
    plan: "pro" as const,
    provider: "stripe" as const,
    status: preferred.cancelAtPeriodEnd ? "cancelling" : preferred.status,
    billingCycle: getBillingCycleForPriceId(preferred.priceId),
    currentPeriodEnd: toMilliseconds(preferred.currentPeriodEnd),
    cancelAtPeriodEnd: preferred.cancelAtPeriodEnd,
    paymentMethodBrand: null,
    paymentMethodLast4: null,
    stripeCustomerId: preferred.stripeCustomerId,
    stripeSubscriptionId: preferred.stripeSubscriptionId,
    stripePriceId: preferred.priceId,
  };
}

export async function getCurrentSubscriptionSnapshot(
  ctx: Pick<QueryCtx, "runQuery">,
  userId: string,
) {
  return loadSubscriptionByUserId(ctx, userId);
}

export const getFirstPaymentEventState = internalQuery({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args): Promise<FirstPaymentEventState> => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found.");
    }

    return {
      email: user.email ?? "",
      firstPaymentEmailSentAt: user.firstPaymentEmailSentAt ?? null,
    };
  },
});

export const markFirstPaymentEmailSent = internalMutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      firstPaymentEmailSentAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const getCurrentSubscription = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuthUser(ctx);
    return loadSubscriptionByUserId(ctx, String(user._id));
  },
});

export const createCheckoutSession = action({
  args: {
    priceId: v.optional(v.string()),
    billingCycle: v.optional(v.union(v.literal("monthly"), v.literal("yearly"))),
  },
  handler: async (ctx, args): Promise<CheckoutSessionResponse> => {
    const viewer = (await ctx.runQuery(internal.onboarding.getViewerContext, {})) as ViewerContext;
    const billingCycle = args.billingCycle ?? "yearly";
    const priceId = getPriceIdForBillingCycle(billingCycle, args.priceId);

    const customer = await stripe.getOrCreateCustomer(ctx as ActionCtx, {
      userId: viewer.userIdString,
      email: viewer.email || undefined,
      name: viewer.name || undefined,
    });

    const urls = getBillingUrls();

    const session = await stripe.createCheckoutSession(ctx as ActionCtx, {
      priceId,
      customerId: customer.customerId,
      mode: "subscription",
      successUrl: urls.successUrl,
      cancelUrl: urls.cancelUrl,
      metadata: {
        scope: "stage_billing",
      },
      subscriptionMetadata: {
        userId: viewer.userIdString,
        scope: "stage_billing",
      },
    });

    return session;
  },
});

export const createCustomerPortalSession = action({
  args: {},
  handler: async (ctx): Promise<CustomerPortalSessionResponse> => {
    const viewer = (await ctx.runQuery(internal.onboarding.getViewerContext, {})) as ViewerContext;
    const subscriptions = (await ctx.runQuery(stripeComponent.public.listSubscriptionsByUserId, {
      userId: viewer.userIdString,
    })) as StripeSubscriptionSummary[];
    const activeSubscription =
      [...subscriptions]
        .sort((a, b) => b.currentPeriodEnd - a.currentPeriodEnd)
        .find((subscription) => ACTIVE_SUBSCRIPTION_STATUSES.has(subscription.status)) ?? null;

    if (!activeSubscription?.stripeCustomerId) {
      throw new Error("No Stripe subscription found for this account.");
    }

    const { returnUrl } = getBillingUrls();

    const session = await stripe.createCustomerPortalSession(ctx as ActionCtx, {
      customerId: activeSubscription.stripeCustomerId,
      returnUrl,
    });

    return session;
  },
});

export const handleSuccessfulPaymentEvent = action({
  args: {},
  handler: async (ctx) => {
    const viewer = (await ctx.runQuery(internal.onboarding.getViewerContext, {})) as ViewerContext;
    const eventState = (await ctx.runQuery(internal.billing.getFirstPaymentEventState, {
      userId: viewer.userId,
    })) as FirstPaymentEventState;

    if (!eventState.email) {
      return { sent: false, reason: "missing_email" as const };
    }

    if (eventState.firstPaymentEmailSentAt) {
      return { sent: false, reason: "already_sent" as const };
    }

    const subscriptions = (await ctx.runQuery(stripeComponent.public.listSubscriptionsByUserId, {
      userId: viewer.userIdString,
    })) as StripeSubscriptionSummary[];
    const activeSubscription =
      [...subscriptions]
        .sort((a, b) => b.currentPeriodEnd - a.currentPeriodEnd)
        .find((subscription) => ACTIVE_SUBSCRIPTION_STATUSES.has(subscription.status)) ?? null;

    if (!activeSubscription?.stripeSubscriptionId) {
      return { sent: false, reason: "no_active_subscription" as const };
    }

    const response = await fetch("https://app.loops.so/api/v1/events/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getLoopsEventApiKey()}`,
        "Content-Type": "application/json",
        "Idempotency-Key":
          `stage-first-payment:${viewer.userIdString}:${activeSubscription.stripeSubscriptionId}`,
      },
      body: JSON.stringify({
        email: eventState.email,
        eventName: "welcome_email",
      }),
    });

    if (response.status === 409) {
      // Idempotency key already processed — email was already sent.
      await ctx.runMutation(internal.billing.markFirstPaymentEmailSent, {
        userId: viewer.userId,
      });
      return { sent: false, reason: "already_sent" as const };
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to send first payment event: ${response.status} ${errorText}`);
    }

    await ctx.runMutation(internal.billing.markFirstPaymentEmailSent, {
      userId: viewer.userId,
    });

    return { sent: true, reason: "sent" as const };
  },
});
