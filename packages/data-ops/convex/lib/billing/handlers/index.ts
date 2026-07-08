import { StripeSubscriptions, type StripeComponent } from "@convex-dev/stripe";
import Stripe from "stripe";
import { v } from "convex/values";
import type { Id } from "../../../_generated/dataModel";
import type { ActionCtx, MutationCtx, QueryCtx } from "../../../_generated/server";
import { components, internal } from "../../../_generated/api";
import { requireAuthUser } from "../../../_helpers";
import { getEnv, requireEnv, requireSiteUrl } from "../../../helpers/env";
import { now } from "../../../helpers/time";
import {
  type BillingCycle,
  type Tier,
  billingCycleForPriceId,
  configForPriceId,
  priceIdForTier,
  seatAddOnPriceId,
  resolveTier,
} from "../../credits/priceConfig";

const stripeComponent = (components as { stripe: StripeComponent }).stripe;
const stripe = new StripeSubscriptions(stripeComponent, {});

// Trial length in days. Locked: 14 days, all paid tiers. Card is required at
// checkout by Stripe's default (we do NOT set payment_method_collection).
export const TRIAL_DAYS = 14;

// Statuses that count as "an active subscription exists" for portal access and
// the first-payment email. Credit revocation on past_due/unpaid is handled
// separately in the webhook handlers (fail closed for AI usage).
const ACTIVE_SUBSCRIPTION_STATUSES = new Set([
  "active",
  "trialing",
  "past_due",
  "unpaid",
  "incomplete",
]);

// Total purchased seats for a Team subscription. We bake the requested seat count
// into subscription metadata at checkout (createCheckoutSession), and the Stripe
// component syncs metadata, so this is readable from a query/mutation ctx. Falls
// back to the tier's included seats when metadata is absent (legacy subs).
function resolveSeats(subscription: StripeSubscriptionSummary): number {
  const included = configForPriceId(subscription.priceId)?.includedSeats ?? 1;
  const raw = Number((subscription.metadata as { seats?: unknown } | null | undefined)?.seats);
  return Number.isFinite(raw) && raw > included ? Math.round(raw) : included;
}

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
  metadata?: Record<string, unknown> | null;
};

type SubscriptionSnapshot = {
  plan: Tier | null;
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
  seats: number;
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

function getBillingUrls(platform?: "web" | "desktop") {
  const siteUrl = requireSiteUrl();
  if (platform === "desktop") {
    // Desktop checkout opens in the external browser, so return to a PUBLIC page
    // (no web auth) that deep-links back into the app. Never the auth-gated web
    // dashboard — that traps the desktop user in a sign-in loop.
    return {
      successUrl: `${siteUrl}/billing/return?status=success`,
      cancelUrl: `${siteUrl}/billing/return?status=cancel`,
      returnUrl: `${siteUrl}/billing/return?status=done`,
    };
  }
  return {
    successUrl: `${siteUrl}/dashboard?billing=success`,
    cancelUrl: `${siteUrl}/dashboard?billing=cancel`,
    returnUrl: `${siteUrl}/settings?tab=billing`,
  };
}

async function loadSubscriptionByUserId(
  ctx: Pick<QueryCtx, "runQuery">,
  userId: string,
): Promise<SubscriptionSnapshot> {
  const subscriptions = (await ctx.runQuery(stripeComponent.public.listSubscriptionsByUserId, {
    userId,
  })) as StripeSubscriptionSummary[];

  const sorted = [...subscriptions].sort((a, b) => b.currentPeriodEnd - a.currentPeriodEnd);
  // Pick the newest active subscription whose price maps to a known tier. A leftover
  // subscription from a reset/switched Stripe account (unknown price) must NOT mask a
  // valid current one — otherwise the workspace stays gated after a real payment.
  let preferred: StripeSubscriptionSummary | null = null;
  let plan: Tier | null = null;
  for (const subscription of sorted) {
    if (!ACTIVE_SUBSCRIPTION_STATUSES.has(subscription.status)) {
      continue;
    }
    const tier = resolveTier(subscription.priceId);
    if (tier) {
      preferred = subscription;
      plan = tier;
      break;
    }
  }

  if (!preferred || !plan) {
    return null;
  }

  return {
    plan,
    provider: "stripe" as const,
    status: preferred.cancelAtPeriodEnd ? "cancelling" : preferred.status,
    billingCycle: billingCycleForPriceId(preferred.priceId),
    currentPeriodEnd: toMilliseconds(preferred.currentPeriodEnd),
    cancelAtPeriodEnd: preferred.cancelAtPeriodEnd,
    paymentMethodBrand: null,
    paymentMethodLast4: null,
    stripeCustomerId: preferred.stripeCustomerId,
    stripeSubscriptionId: preferred.stripeSubscriptionId,
    stripePriceId: preferred.priceId,
    seats: resolveSeats(preferred),
  };
}

export async function getCurrentSubscriptionSnapshot(ctx: Pick<QueryCtx, "runQuery">, userId: string) {
  return loadSubscriptionByUserId(ctx, userId);
}

export const getFirstPaymentEventStateArgs = {
  userId: v.id("users"),
};

export async function getFirstPaymentEventStateHandler(
  ctx: QueryCtx,
  args: { userId: Id<"users"> },
): Promise<FirstPaymentEventState> {
  const user = await ctx.db.get(args.userId);
  if (!user) {
    throw new Error("User not found.");
  }

  return {
    email: user.email ?? "",
    firstPaymentEmailSentAt: user.firstPaymentEmailSentAt ?? null,
  };
}

export const markFirstPaymentEmailSentArgs = {
  userId: v.id("users"),
};

export async function markFirstPaymentEmailSentHandler(
  ctx: MutationCtx,
  args: { userId: Id<"users"> },
) {
  await ctx.db.patch(args.userId, {
    firstPaymentEmailSentAt: now(),
    updatedAt: now(),
  });
}

export const getCurrentSubscriptionArgs = {};

export async function getCurrentSubscriptionHandler(ctx: QueryCtx) {
  const user = await requireAuthUser(ctx);
  return loadSubscriptionByUserId(ctx, String(user._id));
}

export const createCheckoutSessionArgs = {
  kind: v.optional(v.union(v.literal("subscription"), v.literal("topup"))),
  tier: v.optional(v.union(v.literal("start"), v.literal("pro"), v.literal("team"))),
  billingCycle: v.optional(v.union(v.literal("monthly"), v.literal("yearly"))),
  isTrial: v.optional(v.boolean()),
  seats: v.optional(v.number()),
  topupSize: v.optional(v.union(v.literal("small"), v.literal("medium"), v.literal("large"))),
  source: v.optional(v.string()),
  datafastVisitorId: v.optional(v.string()),
  datafastSessionId: v.optional(v.string()),
  platform: v.optional(v.union(v.literal("web"), v.literal("desktop"))),
};

type TopupSize = "small" | "medium" | "large";

// A customer id cached by the Stripe component can dangle if the Stripe account's
// data was reset ("delete test data") or the API key now points at a different
// account. Verify it still exists; if Stripe 404s it, mint a fresh customer in the
// current account (idempotent on userId) so checkout self-heals instead of throwing.
async function resolveUsableCustomerId(
  ctx: ActionCtx,
  sdk: Stripe,
  viewer: ViewerContext,
  customerId: string,
): Promise<string> {
  try {
    const existing = await sdk.customers.retrieve(customerId);
    if (!("deleted" in existing)) {
      return customerId;
    }
  } catch (error) {
    const isMissing =
      error instanceof Stripe.errors.StripeError && error.code === "resource_missing";
    if (!isMissing) {
      throw error;
    }
  }

  const fresh = await stripe.createCustomer(ctx, {
    email: viewer.email || undefined,
    name: viewer.name || undefined,
    metadata: { userId: viewer.userIdString },
    idempotencyKey: viewer.userIdString,
  });
  return fresh.customerId;
}

export async function createCheckoutSessionHandler(
  ctx: ActionCtx,
  args: {
    kind?: "subscription" | "topup";
    tier?: Tier;
    billingCycle?: BillingCycle;
    isTrial?: boolean;
    seats?: number;
    topupSize?: TopupSize;
    source?: string;
    datafastVisitorId?: string;
    datafastSessionId?: string;
    platform?: "web" | "desktop";
  },
): Promise<CheckoutSessionResponse> {
  const viewer = (await ctx.runQuery(internal.onboarding.getViewerContext, {})) as ViewerContext;
  const kind = args.kind ?? "subscription";
  const urls = getBillingUrls(args.platform);
  const sdk = new Stripe(requireEnv("STRIPE_SECRET_KEY"));

  const customer = await stripe.getOrCreateCustomer(ctx, {
    userId: viewer.userIdString,
    email: viewer.email || undefined,
    name: viewer.name || undefined,
  });
  const customerId = await resolveUsableCustomerId(ctx, sdk, viewer, customer.customerId);

  const baseMetadata: Record<string, string> = {
    scope: "stage_billing",
    userId: viewer.userIdString,
    ...(args.source ? { source: args.source } : {}),
    ...(args.datafastVisitorId ? { datafast_visitor_id: args.datafastVisitorId } : {}),
    ...(args.datafastSessionId ? { datafast_session_id: args.datafastSessionId } : {}),
  };

  if (kind === "topup") {
    const size = args.topupSize;
    if (!size) {
      throw new Error("topupSize is required for top-up checkout.");
    }
    const topupPriceId = getEnv(
      size === "small"
        ? "STRIPE_TOPUP_SMALL_PRICE_ID"
        : size === "medium"
          ? "STRIPE_TOPUP_MEDIUM_PRICE_ID"
          : "STRIPE_TOPUP_LARGE_PRICE_ID",
    );
    if (!topupPriceId) {
      throw new Error(`${size} top-up checkout is not configured yet.`);
    }
    const config = configForPriceId(topupPriceId);
    const topupCredits = config?.topupCredits ?? 0;

    const session = await sdk.checkout.sessions.create({
      mode: "payment",
      customer: customerId,
      line_items: [{ price: topupPriceId, quantity: 1 }],
      success_url: urls.successUrl,
      cancel_url: urls.cancelUrl,
      metadata: { ...baseMetadata, priceId: topupPriceId, kind: "topup" },
      payment_intent_data: {
        metadata: { ...baseMetadata, priceId: topupPriceId, kind: "topup", topupCredits: String(topupCredits) },
      },
    });

    return { sessionId: session.id, url: session.url };
  }

  const existingSubscription = await getCurrentSubscriptionSnapshot(ctx, viewer.userIdString);
  const isTrial = args.isTrial ?? false;
  if (existingSubscription && isTrial) {
    throw new Error(
      "You already have an active Stage subscription. Pick a different plan or manage billing in Settings.",
    );
  }

  // Subscription checkout (start / pro / team), optionally with a 14-day trial.
  const tier = args.tier ?? "pro";
  const billingCycle = args.billingCycle ?? "yearly";
  const priceId = priceIdForTier(tier, billingCycle);
  const grantTrial = isTrial && !existingSubscription;
  const config = configForPriceId(priceId);
  const includedSeats = config?.includedSeats ?? 1;
  const requestedSeats = Math.max(includedSeats, Math.round(args.seats ?? includedSeats));
  const extraSeats = Math.max(0, requestedSeats - includedSeats);

  // Team: add the per-seat add-on line item for seats beyond the 3 included.
  const seatAddOnId = extraSeats > 0 ? seatAddOnPriceId(billingCycle) : null;
  if (extraSeats > 0 && !seatAddOnId) {
    throw new Error("Team extra-seat checkout is not configured yet.");
  }

  const subscriptionMetadata: Record<string, string> = {
    ...baseMetadata,
    priceId,
    tier,
    billingCycle,
    seats: String(requestedSeats),
    ...(grantTrial ? { isTrial: "true" } : {}),
  };

  const session = await sdk.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [
      { price: priceId, quantity: 1 },
      ...(seatAddOnId ? [{ price: seatAddOnId, quantity: extraSeats }] : []),
    ],
    success_url: urls.successUrl,
    cancel_url: urls.cancelUrl,
    metadata: {
      ...baseMetadata,
      priceId,
      tier,
      billingCycle,
      ...(grantTrial ? { isTrial: "true" } : {}),
    },
    subscription_data: {
      metadata: subscriptionMetadata,
      ...(grantTrial ? { trial_period_days: TRIAL_DAYS } : {}),
    },
  });

  return { sessionId: session.id, url: session.url };
}

export const createCustomerPortalSessionArgs = {
  platform: v.optional(v.union(v.literal("web"), v.literal("desktop"))),
};

export async function createCustomerPortalSessionHandler(
  ctx: ActionCtx,
  args: { platform?: "web" | "desktop" },
): Promise<CustomerPortalSessionResponse> {
  const viewer = (await ctx.runQuery(internal.onboarding.getViewerContext, {})) as ViewerContext;
  const subscription = await getCurrentSubscriptionSnapshot(ctx, viewer.userIdString);

  if (!subscription?.stripeCustomerId) {
    throw new Error("No Stripe subscription found for this account.");
  }

  const { returnUrl } = getBillingUrls(args.platform);

  const session = await stripe.createCustomerPortalSession(ctx, {
    customerId: subscription.stripeCustomerId,
    returnUrl,
  });

  return session;
}

export const endTrialNowArgs = {};

// End the viewer's active trial immediately by setting trial_end to "now" on the
// Stripe subscription. Stripe then finalizes the first paid invoice; the
// `invoice.paid` webhook grants the full monthly allotment (e.g. 10,000 for Pro)
// — so the user is unblocked within seconds of confirming. Idempotent in effect:
// a non-trialing subscription is rejected, and Stripe no-ops a second trial_end.
export async function endTrialNowHandler(
  ctx: ActionCtx,
): Promise<{ activated: boolean; plan: Tier | null }> {
  const viewer = (await ctx.runQuery(internal.onboarding.getViewerContext, {})) as ViewerContext;
  const subscription = await getCurrentSubscriptionSnapshot(ctx, viewer.userIdString);

  if (!subscription) {
    throw new Error("No subscription found to activate.");
  }
  if (subscription.status !== "trialing") {
    throw new Error("Your trial is no longer active.");
  }
  if (!subscription.stripeSubscriptionId) {
    throw new Error("Subscription is missing a Stripe id.");
  }

  const sdk = new Stripe(requireEnv("STRIPE_SECRET_KEY"));
  await sdk.subscriptions.update(subscription.stripeSubscriptionId, {
    trial_end: "now",
  });

  return { activated: true, plan: subscription.plan };
}

export const handleSuccessfulPaymentEventArgs = {};

export async function handleSuccessfulPaymentEventHandler(_ctx: ActionCtx) {
  // Flow B ("Welcome to Pro" + retention) is now triggered server-side by the
  // Stripe webhook in lib/billing/handlers/webhooks.ts via the payment_confirmed
  // email event — which fires on real payments only (non-trial checkout + first
  // post-trial invoice.paid), never on trial start. This client-side hook (still
  // called from the checkout-success redirect in DashboardPage) is intentionally
  // a no-op so we don't double-send the welcome. The Loops welcome_email call
  // that lived here is removed; Resend now owns all marketing/drip email.
  return { sent: false, reason: "handled_by_webhook" as const };
}

export async function backfillSubscriptionMirrorsHandler(ctx: ActionCtx) {
  const sdk = new Stripe(requireEnv("STRIPE_SECRET_KEY"));
  let startingAfter: string | undefined;
  let mirrored = 0;

  while (true) {
    const page = await sdk.subscriptions.list({
      status: "all",
      limit: 100,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    });

    for (const subscription of page.data) {
      const userId = subscription.metadata?.userId;
      const item = subscription.items.data[0];
      const priceId = item?.price?.id;
      if (!userId || !priceId) {
        continue;
      }

      await ctx.runMutation(internal.billing.syncSubscriptionMirror, {
        userId: userId as Id<"users">,
        stripeSubscriptionId: subscription.id,
        stripeCustomerId:
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer.id,
        stripePriceId: priceId,
        stripeStatus: subscription.status,
        currentPeriodEndMs: (item?.current_period_end ?? 0) * 1000,
        cancelAtPeriodEnd: subscription.cancel_at_period_end ?? false,
      });
      mirrored += 1;
    }

    if (!page.has_more || page.data.length === 0) {
      break;
    }
    startingAfter = page.data[page.data.length - 1]?.id;
  }

  return { mirrored };
}

export const capTrialingWalletsTo150Args = {
  dryRun: v.optional(v.boolean()),
};

// One-off production migration: existing trialing users still carry the old 1500
// trial grant. Cap each to 150 (the new TRIAL_CREDIT_CAP). Sources trialing subs
// from Stripe (status === "trialing"), then dispatches the atomic per-user
// mutation. Idempotent: a ledger row keyed `trial-cap-150-2026-07-08:{userId}`
// guards every write, so re-running is safe and skips already-capped users.
// dryRun=true only reports what would change — it writes nothing.
export async function capTrialingWalletsTo150Handler(
  ctx: ActionCtx,
  args: { dryRun?: boolean },
) {
  const dryRun = args.dryRun ?? false;
  const MIGRATION_KEY_PREFIX = "trial-cap-150-2026-07-08";
  const sdk = new Stripe(requireEnv("STRIPE_SECRET_KEY"));

  const report = {
    dryRun,
    trialingFound: 0,
    capped: 0,
    alreadyCapped: 0,
    skipped: 0,
    entries: [] as Array<{
      userId: string;
      stripeSubscriptionId: string;
      before: number | null;
      after: number | null;
      status: "capped" | "already_capped" | "skipped";
    }>,
  };

  let startingAfter: string | undefined;
  while (true) {
    const page = await sdk.subscriptions.list({
      status: "all",
      limit: 100,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    });

    for (const subscription of page.data) {
      if (subscription.status !== "trialing") {
        continue;
      }
      report.trialingFound += 1;

      const userId = subscription.metadata?.userId;
      if (!userId) {
        report.skipped += 1;
        report.entries.push({
          userId: "(missing metadata)",
          stripeSubscriptionId: subscription.id,
          before: null,
          after: null,
          status: "skipped",
        });
        continue;
      }

      const idempotencyKey = `${MIGRATION_KEY_PREFIX}:${userId}`;

      if (dryRun) {
        const balance = await ctx.runQuery(internal.credits.getWalletBalanceForOwner, {
          ownerUserId: userId as Id<"users">,
        });
        report.entries.push({
          userId,
          stripeSubscriptionId: subscription.id,
          before: balance?.monthlyBalance ?? null,
          after: 150,
          status: "capped",
        });
        continue;
      }

      const result = await ctx.runMutation(internal.credits.capTrialWalletTo150, {
        ownerUserId: userId as Id<"users">,
        idempotencyKey,
      });
      if (result.status === "capped") {
        report.capped += 1;
      } else {
        report.alreadyCapped += 1;
      }
      report.entries.push({
        userId,
        stripeSubscriptionId: subscription.id,
        before: result.before,
        after: result.after,
        status: result.status,
      });
    }

    if (!page.has_more || page.data.length === 0) {
      break;
    }
    startingAfter = page.data[page.data.length - 1]?.id;
  }

  if (dryRun) {
    report.capped = report.entries.filter((e) => e.status === "capped").length;
  }

  return report;
}
