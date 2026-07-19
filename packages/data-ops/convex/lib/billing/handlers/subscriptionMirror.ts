import { v } from "convex/values";
import type { Id } from "../../../_generated/dataModel";
import type { MutationCtx } from "../../../_generated/server";
import { now } from "../../../helpers/time";
import {
  type BillingCycle,
  type Tier,
  billingCycleForPriceId,
  configForPriceId,
  resolveTier,
} from "../../credits/priceConfig";

type AppSubscriptionStatus =
  | "active"
  | "trialing"
  | "cancelling"
  | "past_due"
  | "unpaid"
  | "incomplete"
  | "canceled"
  | "expired";

export function cancelReasonFromStripeSubscription(subscription: {
  cancellation_details?: {
    reason?: string | null;
    feedback?: string | null;
  } | null;
}): string | undefined {
  const details = subscription.cancellation_details;
  return details?.feedback ?? details?.reason ?? undefined;
}

export function trialStartedAtMsFromStripe(subscription: {
  trial_start?: number | null;
}): number | undefined {
  return typeof subscription.trial_start === "number"
    ? subscription.trial_start * 1000
    : undefined;
}

export const syncSubscriptionMirrorArgs = {
  userId: v.id("users"),
  stripeSubscriptionId: v.string(),
  stripeCustomerId: v.string(),
  stripePriceId: v.string(),
  stripeStatus: v.string(),
  currentPeriodEndMs: v.number(),
  cancelAtPeriodEnd: v.boolean(),
  cancelReason: v.optional(v.string()),
  trialStartedAtMs: v.optional(v.number()),
};

function mapSubscriptionStatus(
  stripeStatus: string,
  cancelAtPeriodEnd: boolean,
): AppSubscriptionStatus {
  if (cancelAtPeriodEnd && (stripeStatus === "active" || stripeStatus === "trialing")) {
    return "cancelling";
  }
  switch (stripeStatus) {
    case "active":
      return "active";
    case "trialing":
      return "trialing";
    case "past_due":
      return "past_due";
    case "unpaid":
      return "unpaid";
    case "incomplete":
      return "incomplete";
    case "canceled":
      return "canceled";
    default:
      return "expired";
  }
}

/** Keep cancelReason only while the sub is actually exiting or already canceled. */
function resolveCancelReason(
  status: AppSubscriptionStatus,
  cancelAtPeriodEnd: boolean,
  cancelReason?: string,
): string | undefined {
  if (!cancelReason) {
    return undefined;
  }
  if (status === "canceled" || cancelAtPeriodEnd) {
    return cancelReason;
  }
  return undefined;
}

function resolvePlan(priceId: string, metadata?: Record<string, unknown> | null): Tier | null {
  const fromPrice = resolveTier(priceId);
  if (fromPrice) {
    return fromPrice;
  }
  const rawTier = metadata?.tier;
  if (rawTier === "start" || rawTier === "pro" || rawTier === "team") {
    return rawTier;
  }
  return null;
}

function resolveBillingCycle(
  priceId: string,
  metadata?: Record<string, unknown> | null,
): BillingCycle {
  const config = configForPriceId(priceId);
  if (config && !config.isSeatAddOn) {
    return config.billingCycle;
  }
  const rawCycle = metadata?.billingCycle;
  if (rawCycle === "monthly" || rawCycle === "yearly") {
    return rawCycle;
  }
  return billingCycleForPriceId(priceId);
}

export async function syncSubscriptionMirrorHandler(
  ctx: MutationCtx,
  args: {
    userId: Id<"users">;
    stripeSubscriptionId: string;
    stripeCustomerId: string;
    stripePriceId: string;
    stripeStatus: string;
    currentPeriodEndMs: number;
    cancelAtPeriodEnd: boolean;
    cancelReason?: string;
    trialStartedAtMs?: number;
  },
) {
  const plan = resolvePlan(args.stripePriceId);
  if (!plan) {
    console.error("syncSubscriptionMirror: unknown priceId", {
      stripeSubscriptionId: args.stripeSubscriptionId,
      stripePriceId: args.stripePriceId,
    });
    return;
  }

  const billingCycle = resolveBillingCycle(args.stripePriceId);
  const status = mapSubscriptionStatus(args.stripeStatus, args.cancelAtPeriodEnd);
  const cancelReason = resolveCancelReason(
    status,
    args.cancelAtPeriodEnd,
    args.cancelReason,
  );
  const timestamp = now();

  const existing = await ctx.db
    .query("subscriptions")
    .withIndex("by_user", (q) => q.eq("userId", args.userId))
    .collect();
  const match = existing.find(
    (row) => row.stripeSubscriptionId === args.stripeSubscriptionId,
  );

  const trialStartedAt = args.trialStartedAtMs ?? match?.trialStartedAt;

  // NOTE: db.replace below drops every field not listed here. When adding new
  // optional fields to the `subscriptions` schema, also add them to this row
  // (or copy them from `match` if they are managed externally like payment fields).
  const row = {
    userId: args.userId,
    provider: "stripe" as const,
    plan,
    status,
    billingCycle,
    currentPeriodEnd: args.currentPeriodEndMs,
    cancelAtPeriodEnd: args.cancelAtPeriodEnd,
    stripeCustomerId: args.stripeCustomerId,
    stripeSubscriptionId: args.stripeSubscriptionId,
    stripePriceId: args.stripePriceId,
    ...(trialStartedAt !== undefined ? { trialStartedAt } : {}),
    ...(cancelReason ? { cancelReason } : {}),
    ...(match?.paymentMethodBrand ? { paymentMethodBrand: match.paymentMethodBrand } : {}),
    ...(match?.paymentMethodLast4 ? { paymentMethodLast4: match.paymentMethodLast4 } : {}),
    ...(match?.externalCustomerId ? { externalCustomerId: match.externalCustomerId } : {}),
    ...(match?.externalSubscriptionId
      ? { externalSubscriptionId: match.externalSubscriptionId }
      : {}),
    createdAt: match?.createdAt ?? timestamp,
    updatedAt: timestamp,
  };

  if (match) {
    // replace so stale cancelReason is dropped when the sub is no longer exiting
    await ctx.db.replace(match._id, row);
  } else {
    await ctx.db.insert("subscriptions", row);
  }

  const user = await ctx.db.get(args.userId);
  if (user) {
    await ctx.db.patch(args.userId, {
      plan,
      updatedAt: timestamp,
    });
  }
}

export const markSubscriptionMirrorCanceledArgs = {
  userId: v.id("users"),
  stripeSubscriptionId: v.string(),
  cancelReason: v.optional(v.string()),
};

export async function markSubscriptionMirrorCanceledHandler(
  ctx: MutationCtx,
  args: { userId: Id<"users">; stripeSubscriptionId: string; cancelReason?: string },
) {
  const existing = await ctx.db
    .query("subscriptions")
    .withIndex("by_user", (q) => q.eq("userId", args.userId))
    .collect();
  const match = existing.find(
    (row) => row.stripeSubscriptionId === args.stripeSubscriptionId,
  );
  if (!match) {
    return;
  }

  const timestamp = now();
  await ctx.db.patch(match._id, {
    status: "canceled",
    cancelAtPeriodEnd: false,
    ...(args.cancelReason ? { cancelReason: args.cancelReason } : {}),
    updatedAt: timestamp,
  });
  const user = await ctx.db.get(args.userId);
  if (user) {
    await ctx.db.patch(args.userId, {
      plan: "free",
      updatedAt: timestamp,
    });
  }
}
