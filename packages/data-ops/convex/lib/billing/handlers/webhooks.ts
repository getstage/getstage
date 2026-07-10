import type Stripe from "stripe";
import type { GenericActionCtx, GenericDataModel } from "convex/server";
import { components, internal } from "../../../_generated/api";
import type { Id } from "../../../_generated/dataModel";
import { cancelReasonFromStripeSubscription } from "./subscriptionMirror";
import {
  TRIAL_CREDIT_CAP,
  configForPriceId,
} from "../../credits/priceConfig";

// The stripe component's event handlers expect a generic action ctx, not the
// generated DataModel-specialised one. Using the generic ctx keeps the handlers
// assignable to StripeEventHandlers while runMutation/runQuery still type-check
// the function references and args.
type WebhookCtx = GenericActionCtx<GenericDataModel>;

type SyncedStripeSubscription = {
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  status: string;
  currentPeriodEnd: number;
  cancelAtPeriodEnd: boolean;
  priceId: string;
  userId?: string;
  metadata?: Record<string, unknown> | null;
};

// Statuses that keep credits live. Anything else (past_due, unpaid, canceled,
// incomplete) revokes credits so AI runs fail closed.
const ACTIVE_STATUSES = new Set(["active", "trialing"]);

function asUserId(value: string | undefined | null): Id<"users"> | null {
  if (!value) {
    return null;
  }
  return value as Id<"users">;
}

function toMilliseconds(timestampSeconds: number) {
  return timestampSeconds * 1000;
}

async function mirrorAppSubscription(
  ctx: WebhookCtx,
  stripeSubscriptionId: string,
  fallback?: {
    userId?: string | null;
    metadata?: Record<string, unknown> | null;
    cancelReason?: string;
  },
) {
  const synced = (await ctx.runQuery(components.stripe.public.getSubscription, {
    stripeSubscriptionId,
  })) as SyncedStripeSubscription | null;

  const userId = asUserId(synced?.userId ?? fallback?.userId);
  if (!userId || !synced?.priceId) {
    return;
  }

  await ctx.runMutation(internal.billing.syncSubscriptionMirror, {
    userId,
    stripeSubscriptionId: synced.stripeSubscriptionId,
    stripeCustomerId: synced.stripeCustomerId,
    stripePriceId: synced.priceId,
    stripeStatus: synced.status,
    currentPeriodEndMs: toMilliseconds(synced.currentPeriodEnd),
    cancelAtPeriodEnd: synced.cancelAtPeriodEnd,
    cancelReason: fallback?.cancelReason,
  });
}

// Stripe SDK v20 moved the invoice→subscription link under
// `parent.subscription_details.subscription`. Older API versions still expose a
// top-level `subscription`. Handle both so the grant works regardless of the
// account's pinned API version.
function subscriptionIdFromInvoice(invoice: Stripe.Invoice): string | null {
  const current = invoice.parent?.subscription_details?.subscription;
  if (current) {
    return typeof current === "string" ? current : current.id;
  }
  const legacy = (invoice as { subscription?: string | { id: string } | null }).subscription;
  if (legacy) {
    return typeof legacy === "string" ? legacy : legacy.id;
  }
  return null;
}

// checkout.session.completed — first payment for a subscription, a top-up, or a
// trial start. We trust the metadata we baked in at createCheckoutSession time
// (userId, priceId, isTrial). Idempotent on the Stripe event id.
async function handleCheckoutCompleted(ctx: WebhookCtx, event: Stripe.Event) {
  const session = event.data.object as Stripe.Checkout.Session;
  const eventId = event.id;

  const userId = asUserId(session.metadata?.userId);
  const priceId = session.metadata?.priceId;
  if (!userId || !priceId) {
    console.error("checkout.session.completed: missing metadata", { eventId, hasUserId: Boolean(userId), hasPriceId: Boolean(priceId) });
    return;
  }

  const config = configForPriceId(priceId);
  if (!config) {
    console.error("checkout.session.completed: unknown priceId", { eventId, priceId });
    return;
  }

  if (config.kind === "topup") {
    await ctx.runMutation(internal.credits.grantCreditsForOwner, {
      ownerUserId: userId,
      credits: config.topupCredits,
      reason: "topup",
      idempotencyKey: eventId,
    });
    return;
  }

  const isTrial = session.metadata?.isTrial === "true";
  if (isTrial) {
    await ctx.runMutation(internal.credits.grantCreditsForOwner, {
      ownerUserId: userId,
      credits: TRIAL_CREDIT_CAP,
      reason: "trial_grant",
      idempotencyKey: eventId,
    });
    // Trial started (card entered at checkout) — anchors Flow A emails 2–5.
    await ctx.runMutation(internal.emails.recordEmailEvent, {
      userId,
      type: "trial_started",
      metadata: eventId,
    });
    if (typeof session.subscription === "string") {
      await mirrorAppSubscription(ctx, session.subscription, {
        userId,
        metadata: session.metadata ?? undefined,
      });
    }
    return;
  }

  await ctx.runMutation(internal.credits.grantCreditsForOwner, {
    ownerUserId: userId,
    credits: config.monthlyCredits,
    reason: "monthly_grant",
    idempotencyKey: eventId,
  });
  // Direct paid checkout (no trial) — conversion, anchors Flow B and cancels
  // any pending Flow A. Idempotent on (userId, "payment_confirmed").
  await ctx.runMutation(internal.emails.recordEmailEvent, {
    userId,
    type: "payment_confirmed",
    metadata: eventId,
  });

  if (typeof session.subscription === "string") {
    await mirrorAppSubscription(ctx, session.subscription, {
      userId,
      metadata: session.metadata ?? undefined,
    });
  }
}

// invoice.paid — recurring renewal.
async function handleInvoicePaid(ctx: WebhookCtx, event: Stripe.Event) {
  const invoice = event.data.object as Stripe.Invoice;
  const eventId = event.id;

  if (invoice.billing_reason === "subscription_create") {
    return;
  }

  const subscriptionId = subscriptionIdFromInvoice(invoice);
  if (!subscriptionId) {
    return;
  }

  const subscription = await ctx.runQuery(
    components.stripe.public.getSubscription,
    { stripeSubscriptionId: subscriptionId },
  );
  const userId = asUserId(subscription?.userId);
  if (!userId) {
    console.error("invoice.paid: no userId on subscription", { eventId, subscriptionId });
    return;
  }

  if (!subscription || !ACTIVE_STATUSES.has(subscription.status)) {
    return;
  }

  const config = configForPriceId(subscription.priceId);
  if (!config || config.kind !== "subscription" || config.isSeatAddOn) {
    return;
  }

  await ctx.runMutation(internal.credits.grantCreditsForOwner, {
    ownerUserId: userId,
    credits: config.monthlyCredits,
    reason: "monthly_grant",
    idempotencyKey: eventId,
  });
  // First post-trial invoice = real conversion. Fires on every renewal too, but
  // recordEmailEvent is idempotent on (userId, "payment_confirmed"), so only the
  // first one schedules Flow B; renewals no-op. subscription_create invoices are
  // skipped above (handled by checkout.session.completed instead).
  await ctx.runMutation(internal.emails.recordEmailEvent, {
    userId,
    type: "payment_confirmed",
    metadata: eventId,
  });
}

// customer.subscription.created — mirror readable plan/cycle into app subscriptions table.
async function handleSubscriptionCreated(ctx: WebhookCtx, event: Stripe.Event) {
  const subscription = event.data.object as Stripe.Subscription;
  await mirrorAppSubscription(ctx, subscription.id, {
    userId: subscription.metadata?.userId,
    metadata: subscription.metadata,
  });
}

// customer.subscription.updated — covers tier changes, seat-quantity changes, and
// every failure transition (active → past_due/unpaid/canceled). Revokes credits
// on failure; leaves monthly grants to invoice.paid on success.
async function handleSubscriptionUpdated(ctx: WebhookCtx, event: Stripe.Event) {
  const subscription = event.data.object as Stripe.Subscription;
  const eventId = event.id;

  const synced = await ctx.runQuery(
    components.stripe.public.getSubscription,
    { stripeSubscriptionId: subscription.id },
  );
  const userId = asUserId(synced?.userId ?? subscription.metadata?.userId);
  if (!userId) {
    console.error("customer.subscription.updated: no userId", { eventId, subscriptionId: subscription.id });
    return;
  }

  if (!synced || !ACTIVE_STATUSES.has(synced.status)) {
    // Fail closed: payment failed, dunning exhausted, or cancelled.
    await ctx.runMutation(internal.credits.revokeCreditsForOwner, {
      ownerUserId: userId,
      idempotencyKey: eventId,
    });
  }

  await mirrorAppSubscription(ctx, subscription.id, {
    userId,
    metadata: subscription.metadata,
    cancelReason: cancelReasonFromStripeSubscription(subscription),
  });

  // Tier changes and seat-quantity changes refill/adjust on the next invoice.paid
  // for the new price — no credit grant here.
}

// customer.subscription.deleted — subscription ended. Zero the wallet.
async function handleSubscriptionDeleted(ctx: WebhookCtx, event: Stripe.Event) {
  const subscription = event.data.object as Stripe.Subscription;
  const eventId = event.id;

  const synced = await ctx.runQuery(
    components.stripe.public.getSubscription,
    { stripeSubscriptionId: subscription.id },
  );
  const userId = asUserId(synced?.userId ?? subscription.metadata?.userId);
  if (!userId) {
    return;
  }

  await ctx.runMutation(internal.credits.revokeCreditsForOwner, {
    ownerUserId: userId,
    idempotencyKey: eventId,
  });

  await ctx.runMutation(internal.billing.markSubscriptionMirrorCanceled, {
    userId,
    stripeSubscriptionId: subscription.id,
    cancelReason: cancelReasonFromStripeSubscription(subscription),
  });
}

// charge.refunded — reverse the credits a top-up granted. Clamps at zero if the
// user already spent them (the cost was already incurred). Resolves the user via
// the synced payment intent, falling back to charge metadata.
async function handleChargeRefunded(ctx: WebhookCtx, event: Stripe.Event) {
  const charge = event.data.object as Stripe.Charge;
  const eventId = event.id;

  const paymentIntentId = typeof charge.payment_intent === "string"
    ? charge.payment_intent
    : charge.payment_intent?.id;
  if (!paymentIntentId) {
    return;
  }

  const payment = await ctx.runQuery(
    components.stripe.public.getPayment,
    { stripePaymentIntentId: paymentIntentId },
  );
  const userId = asUserId(payment?.userId ?? charge.metadata?.userId);
  if (!userId) {
    return;
  }

  // topupCredits is baked into the payment intent metadata at checkout time, so
  // the refund reversal doesn't depend on price config still being present.
  const paymentMetadata = (payment?.metadata ?? {}) as Record<string, string | undefined>;
  const priceId = paymentMetadata.priceId ?? charge.metadata?.priceId;
  const config = configForPriceId(priceId);
  if (!config || config.kind !== "topup") {
    const rawCredits = Number(paymentMetadata.topupCredits);
    if (!Number.isFinite(rawCredits) || rawCredits <= 0) {
      return;
    }
    await ctx.runMutation(internal.credits.reverseCreditsForOwner, {
      ownerUserId: userId,
      credits: rawCredits,
      idempotencyKey: eventId,
    });
    return;
  }

  await ctx.runMutation(internal.credits.reverseCreditsForOwner, {
    ownerUserId: userId,
    credits: config.topupCredits,
    idempotencyKey: eventId,
  });
}

export const creditWebhookEvents = {
  "checkout.session.completed": handleCheckoutCompleted,
  "invoice.paid": handleInvoicePaid,
  "customer.subscription.created": handleSubscriptionCreated,
  "customer.subscription.updated": handleSubscriptionUpdated,
  "customer.subscription.deleted": handleSubscriptionDeleted,
  "charge.refunded": handleChargeRefunded,
} as const;
