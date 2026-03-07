import { StripeSubscriptions, type StripeComponent } from "@convex-dev/stripe";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { ActionCtx, QueryCtx } from "./_generated/server";
import { action, query } from "./_generated/server";
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
  billingCycle: "yearly";
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

async function loadSubscriptionByUserId(
  ctx: QueryCtx,
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
    billingCycle: "yearly" as const,
    currentPeriodEnd: toMilliseconds(preferred.currentPeriodEnd),
    cancelAtPeriodEnd: preferred.cancelAtPeriodEnd,
    paymentMethodBrand: null,
    paymentMethodLast4: null,
    stripeCustomerId: preferred.stripeCustomerId,
    stripeSubscriptionId: preferred.stripeSubscriptionId,
    stripePriceId: preferred.priceId,
  };
}

export async function getCurrentSubscriptionSnapshot(ctx: QueryCtx, userId: string) {
  return loadSubscriptionByUserId(ctx, userId);
}

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
  },
  handler: async (ctx, args): Promise<CheckoutSessionResponse> => {
    const viewer = (await ctx.runQuery(internal.onboarding.getViewerContext, {})) as ViewerContext;
    const priceId = args.priceId ?? getEnv("STRIPE_YEARLY_PRICE_ID") ?? getEnv("STRIPE_PRICE_ID");
    if (!priceId) {
      throw new Error("STRIPE_YEARLY_PRICE_ID is not configured.");
    }

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
