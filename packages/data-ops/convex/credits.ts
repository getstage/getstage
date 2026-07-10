import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { components } from "./_generated/api";
import { requireAuthUser, requireProjectAccess } from "./_helpers";
import {
  CREDIT_COSTS,
  capTrialWalletTo150Once,
  getCreditSummaryForOwner,
  getWalletForOwnerOrNull,
  grantCredits,
  recordUsage,
  revokeCredits,
  reverseCredits,
} from "./lib/credits/service";
import { TRIAL_CREDIT_CAP, monthlyCreditsForTier, type Tier } from "./lib/credits/priceConfig";
import { getCurrentSubscriptionSnapshot } from "./billing";

// Monthly credit pool for the card: the trial cap while trialing, otherwise the
// tier's monthly allotment. Free / no subscription → 0 (card shows an empty pool).
function monthlyAllowanceForSubscription(subscription: {
  status: string;
  plan: Tier | null;
} | null): number {
  if (!subscription) {
    return 0;
  }
  if (subscription.status === "trialing") {
    return TRIAL_CREDIT_CAP;
  }
  return subscription.plan ? monthlyCreditsForTier(subscription.plan) : 0;
}

// Credit balance for the signed-in user's own workspace. Loading is undefined
// (tri-state) on the client; this always resolves to a concrete summary.
export const getCreditSummary = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuthUser(ctx);
    const subscription = await getCurrentSubscriptionSnapshot(ctx, String(user._id));
    const monthlyAllowance = monthlyAllowanceForSubscription(subscription);
    return getCreditSummaryForOwner(ctx, user._id, monthlyAllowance);
  },
});

// Purchase history for Billing → Purchase History. Pulls top-up payments the
// Stripe component syncs (checkout.session.completed, mode=payment). Subscription
// renewals surface as invoices, not payments, so this list is top-ups only.
export const getPurchaseHistory = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuthUser(ctx);
    const payments = await ctx.runQuery(components.stripe.public.listPaymentsByUserId, {
      userId: String(user._id),
    });

    return payments
      .filter((payment) => (payment.metadata as { kind?: string } | null)?.kind === "topup")
      .sort((a, b) => b.created - a.created)
      .map((payment) => {
        const metadata = (payment.metadata ?? {}) as { topupCredits?: string | number };
        return {
          id: payment.stripePaymentIntentId,
          description: "Credit Top-up",
          status: payment.status === "succeeded" ? "completed" : payment.status,
          amountCents: payment.amount,
          currency: payment.currency,
          createdAt: payment.created * 1000,
          credits: Number(metadata.topupCredits ?? 0),
        };
      });
  },
});

// Voice usage: ceil(durationMs / 60s) * 5 credits, charged to the project owner.
// idempotencyKey (e.g. the recording id) makes retries safe.
export const recordVoiceUsage = mutation({
  args: {
    projectId: v.id("projects"),
    durationMs: v.number(),
    idempotencyKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user, project } = await requireProjectAccess(ctx, args.projectId);
    const minutes = Math.max(1, Math.ceil(args.durationMs / 60000));
    return recordUsage(ctx, {
      ownerUserId: project.userId,
      kind: "voice",
      credits: minutes * CREDIT_COSTS.voicePerMinute,
      userId: user._id,
      idempotencyKey: args.idempotencyKey,
    });
  },
});

// Voice usage from the global companion (no project context). Charges the
// signed-in user's own wallet — correct for workspace owners; team members
// fail closed (no wallet of their own). idempotent on idempotencyKey.
export const recordVoiceUsageSelf = mutation({
  args: {
    durationMs: v.number(),
    idempotencyKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);
    const minutes = Math.max(1, Math.ceil(args.durationMs / 60000));
    return recordUsage(ctx, {
      ownerUserId: user._id,
      kind: "voice",
      credits: minutes * CREDIT_COSTS.voicePerMinute,
      userId: user._id,
      idempotencyKey: args.idempotencyKey,
    });
  },
});

// Manual grant for QA before Stripe. Callable from the Convex dashboard.
export const grantCreditsForOwner = internalMutation({
  args: {
    ownerUserId: v.id("users"),
    credits: v.number(),
    reason: v.union(
      v.literal("monthly_grant"),
      v.literal("trial_grant"),
      v.literal("topup"),
      v.literal("adjustment"),
    ),
    idempotencyKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return grantCredits(ctx, {
      ownerUserId: args.ownerUserId,
      credits: args.credits,
      reason: args.reason,
      idempotencyKey: args.idempotencyKey,
    });
  },
});

// Read-only wallet snapshot for the trial-cap migration's dry run. Not exposed
// to the client — only used internally by the capTrialingWalletsTo150 internalAction.
export const getWalletBalanceForOwner = internalQuery({
  args: { ownerUserId: v.id("users") },
  handler: async (ctx, args) => {
    const wallet = await getWalletForOwnerOrNull(ctx, args.ownerUserId);
    if (!wallet) {
      return null;
    }
    return { monthlyBalance: wallet.monthlyBalance, topupBalance: wallet.topupBalance };
  },
});

// Per-user atomic trial cap (150). Idempotent on idempotencyKey. Called once per
// trialing user by the capTrialingWalletsTo150 internalAction — never call directly.
export const capTrialWalletTo150 = internalMutation({
  args: {
    ownerUserId: v.id("users"),
    idempotencyKey: v.string(),
  },
  handler: async (ctx, args) => capTrialWalletTo150Once(ctx, args),
});

// Revoke all credits (subscription cancelled / dunning exhausted). Called by the
// customer.subscription.deleted and past_due webhook paths.
export const revokeCreditsForOwner = internalMutation({
  args: {
    ownerUserId: v.id("users"),
    idempotencyKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return revokeCredits(ctx, {
      ownerUserId: args.ownerUserId,
      idempotencyKey: args.idempotencyKey,
    });
  },
});

// Reverse a top-up grant on refund. Clamps at zero so spent wallets don't go
// negative. Called by the charge.refunded webhook path.
export const reverseCreditsForOwner = internalMutation({
  args: {
    ownerUserId: v.id("users"),
    credits: v.number(),
    idempotencyKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return reverseCredits(ctx, {
      ownerUserId: args.ownerUserId,
      credits: args.credits,
      idempotencyKey: args.idempotencyKey,
    });
  },
});
