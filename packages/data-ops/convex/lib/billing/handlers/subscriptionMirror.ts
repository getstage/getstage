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

export const syncSubscriptionMirrorArgs = {
  userId: v.id("users"),
  stripeSubscriptionId: v.string(),
  stripeCustomerId: v.string(),
  stripePriceId: v.string(),
  stripeStatus: v.string(),
  currentPeriodEndMs: v.number(),
  cancelAtPeriodEnd: v.boolean(),
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
  const timestamp = now();

  const existing = await ctx.db
    .query("subscriptions")
    .withIndex("by_user", (q) => q.eq("userId", args.userId))
    .collect();
  const match = existing.find(
    (row) => row.stripeSubscriptionId === args.stripeSubscriptionId,
  );

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
    updatedAt: timestamp,
  };

  if (match) {
    await ctx.db.patch(match._id, row);
  } else {
    await ctx.db.insert("subscriptions", {
      ...row,
      createdAt: timestamp,
    });
  }

  await ctx.db.patch(args.userId, {
    plan,
    updatedAt: timestamp,
  });
}

export const markSubscriptionMirrorCanceledArgs = {
  userId: v.id("users"),
  stripeSubscriptionId: v.string(),
};

export async function markSubscriptionMirrorCanceledHandler(
  ctx: MutationCtx,
  args: { userId: Id<"users">; stripeSubscriptionId: string },
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
    updatedAt: timestamp,
  });
  await ctx.db.patch(args.userId, {
    plan: "free",
    updatedAt: timestamp,
  });
}
