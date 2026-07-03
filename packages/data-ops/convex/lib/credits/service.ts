import type { Doc, Id } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";

type ReaderCtx = QueryCtx | MutationCtx;

export type UsageKind = "voice" | "moodboard" | "reference" | "other";
export type LedgerReason = "monthly_grant" | "trial_grant" | "topup" | "usage" | "adjustment";

// Locked pricing (source of truth: TEAM_CREDITS_PAYMENTS_PLAN.md).
// Refero request counts are fixed fallbacks until the engine reports actual counts.
export const CREDIT_COSTS = {
  voicePerMinute: 5,
  referoPerRequest: 1,
  moodboardFallback: 4,
  researchFallback: 27,
} as const;

function walletTotal(wallet: Doc<"creditWallets">): number {
  return wallet.monthlyBalance + wallet.topupBalance;
}

export async function getWalletForOwnerOrNull(
  ctx: ReaderCtx,
  ownerUserId: Id<"users">,
): Promise<Doc<"creditWallets"> | null> {
  return ctx.db
    .query("creditWallets")
    .withIndex("by_owner", (q) => q.eq("ownerUserId", ownerUserId))
    .unique();
}

// Wallet is created empty. Credits ONLY ever enter via grantCredits (Stripe
// webhook or manual admin grant) — never seeded, never fabricated. No payment =
// no credits.
export async function getOrCreateWallet(
  ctx: MutationCtx,
  ownerUserId: Id<"users">,
): Promise<Doc<"creditWallets">> {
  const existing = await getWalletForOwnerOrNull(ctx, ownerUserId);
  if (existing) {
    return existing;
  }

  const walletId = await ctx.db.insert("creditWallets", {
    ownerUserId,
    monthlyBalance: 0,
    topupBalance: 0,
    updatedAt: Date.now(),
  });

  const wallet = await ctx.db.get(walletId);
  if (!wallet) {
    throw new Error("Failed to create credit wallet.");
  }
  return wallet;
}

// Pre-check before an expensive run. Always fails closed: a run cannot start
// unless the owner's wallet covers the estimated cost.
export async function requireCredits(
  ctx: MutationCtx,
  ownerUserId: Id<"users">,
  estimatedCost: number,
): Promise<Doc<"creditWallets">> {
  const wallet = await getOrCreateWallet(ctx, ownerUserId);
  if (walletTotal(wallet) < estimatedCost) {
    throw new Error("insufficient_credits");
  }
  return wallet;
}

function idempotencyKeyFor(kind: UsageKind, runId?: string, explicit?: string): string | undefined {
  if (explicit) return explicit;
  if (runId) return `${runId}:${kind}`;
  return undefined;
}

async function findLedgerByKey(ctx: MutationCtx, key: string) {
  return ctx.db
    .query("creditLedger")
    .withIndex("by_idempotencyKey", (q) => q.eq("idempotencyKey", key))
    .first();
}

// Deduct credits atomically (monthly bucket first, then top-ups). Idempotent on
// idempotencyKey / runId so a retried run cannot charge twice.
export async function recordUsage(
  ctx: MutationCtx,
  args: {
    ownerUserId: Id<"users">;
    kind: UsageKind;
    credits: number;
    userId: Id<"users">;
    runId?: string;
    idempotencyKey?: string;
  },
): Promise<{ balanceAfter: number; deducted: number; idempotent: boolean }> {
  const key = idempotencyKeyFor(args.kind, args.runId, args.idempotencyKey);
  if (key) {
    const existing = await findLedgerByKey(ctx, key);
    if (existing) {
      return { balanceAfter: existing.balanceAfter, deducted: 0, idempotent: true };
    }
  }

  const wallet = await getOrCreateWallet(ctx, args.ownerUserId);
  const cost = Math.max(0, Math.round(args.credits));
  const fromMonthly = Math.min(wallet.monthlyBalance, cost);
  const fromTopup = Math.min(wallet.topupBalance, cost - fromMonthly);
  const deducted = fromMonthly + fromTopup;
  const newMonthly = wallet.monthlyBalance - fromMonthly;
  const newTopup = wallet.topupBalance - fromTopup;
  const balanceAfter = newMonthly + newTopup;
  const timestamp = Date.now();

  await ctx.db.patch(wallet._id, {
    monthlyBalance: newMonthly,
    topupBalance: newTopup,
    updatedAt: timestamp,
  });

  await ctx.db.insert("creditLedger", {
    walletId: wallet._id,
    delta: -deducted,
    reason: "usage",
    kind: args.kind,
    userId: args.userId,
    runId: args.runId,
    idempotencyKey: key,
    balanceAfter,
    createdAt: timestamp,
  });

  return { balanceAfter, deducted, idempotent: false };
}

// Add credits (manual QA grant, monthly reset, trial, or top-up). Top-ups land in
// the persistent bucket; everything else refills the monthly bucket.
export async function grantCredits(
  ctx: MutationCtx,
  args: {
    ownerUserId: Id<"users">;
    credits: number;
    reason: LedgerReason;
    userId?: Id<"users">;
    idempotencyKey?: string;
  },
): Promise<{ balanceAfter: number; granted: number; idempotent: boolean }> {
  if (args.idempotencyKey) {
    const existing = await findLedgerByKey(ctx, args.idempotencyKey);
    if (existing) {
      return { balanceAfter: existing.balanceAfter, granted: 0, idempotent: true };
    }
  }

  const wallet = await getOrCreateWallet(ctx, args.ownerUserId);
  const amount = Math.max(0, Math.round(args.credits));
  const balanceBefore = walletTotal(wallet);

  // Top-ups are paid-for and NEVER reset: they land in their own bucket, which
  // survives monthly resets and cancellation. Subscription refills (monthly cycle
  // + trial start) RESET the monthly bucket to the tier allotment — unused monthly
  // credits do not roll over. Manual adjustments add to the monthly bucket.
  const isTopup = args.reason === "topup";
  const isMonthlyReset = args.reason === "monthly_grant" || args.reason === "trial_grant";
  const newMonthly = isTopup
    ? wallet.monthlyBalance
    : isMonthlyReset
      ? amount
      : wallet.monthlyBalance + amount;
  const newTopup = isTopup ? wallet.topupBalance + amount : wallet.topupBalance;
  const balanceAfter = newMonthly + newTopup;
  const timestamp = Date.now();

  await ctx.db.patch(wallet._id, {
    monthlyBalance: newMonthly,
    topupBalance: newTopup,
    updatedAt: timestamp,
  });

  await ctx.db.insert("creditLedger", {
    walletId: wallet._id,
    delta: balanceAfter - balanceBefore,
    reason: args.reason,
    kind: "other",
    userId: args.userId ?? args.ownerUserId,
    idempotencyKey: args.idempotencyKey,
    balanceAfter,
    createdAt: timestamp,
  });

  return { balanceAfter, granted: balanceAfter - balanceBefore, idempotent: false };
}

// Revoke monthly (subscription) credits on cancel / past_due / unpaid so AI runs
// fail closed. Paid-for top-ups are PRESERVED — the user bought those outright.
// Atomic with a ledger row for audit. Idempotent on idempotencyKey.
export async function revokeCredits(
  ctx: MutationCtx,
  args: { ownerUserId: Id<"users">; userId?: Id<"users">; idempotencyKey?: string },
): Promise<{ balanceAfter: number; revoked: number; idempotent: boolean }> {
  if (args.idempotencyKey) {
    const existing = await findLedgerByKey(ctx, args.idempotencyKey);
    if (existing) {
      return { balanceAfter: existing.balanceAfter, revoked: 0, idempotent: true };
    }
  }

  const wallet = await getOrCreateWallet(ctx, args.ownerUserId);
  const revoked = wallet.monthlyBalance;
  if (revoked === 0) {
    return { balanceAfter: wallet.topupBalance, revoked: 0, idempotent: false };
  }

  const timestamp = Date.now();
  const balanceAfter = wallet.topupBalance;
  await ctx.db.patch(wallet._id, {
    monthlyBalance: 0,
    updatedAt: timestamp,
  });

  await ctx.db.insert("creditLedger", {
    walletId: wallet._id,
    delta: -revoked,
    reason: "adjustment",
    kind: "other",
    userId: args.userId ?? args.ownerUserId,
    idempotencyKey: args.idempotencyKey,
    balanceAfter,
    createdAt: timestamp,
  });

  return { balanceAfter, revoked, idempotent: false };
}

// Reverse a top-up grant on refund — deduct from the top-up bucket first (that's
// what was refunded), then monthly only if needed. Clamps at zero so a spent
// wallet never goes negative (cost was already incurred). Idempotent on key.
export async function reverseCredits(
  ctx: MutationCtx,
  args: { ownerUserId: Id<"users">; credits: number; userId?: Id<"users">; idempotencyKey?: string },
): Promise<{ balanceAfter: number; reversed: number; idempotent: boolean }> {
  if (args.idempotencyKey) {
    const existing = await findLedgerByKey(ctx, args.idempotencyKey);
    if (existing) {
      return { balanceAfter: existing.balanceAfter, reversed: 0, idempotent: true };
    }
  }

  const wallet = await getOrCreateWallet(ctx, args.ownerUserId);
  const total = walletTotal(wallet);
  const reversed = Math.min(total, Math.max(0, Math.round(args.credits)));
  if (reversed === 0) {
    return { balanceAfter: total, reversed: 0, idempotent: false };
  }

  const fromTopup = Math.min(wallet.topupBalance, reversed);
  const fromMonthly = reversed - fromTopup;
  const timestamp = Date.now();

  await ctx.db.patch(wallet._id, {
    monthlyBalance: wallet.monthlyBalance - fromMonthly,
    topupBalance: wallet.topupBalance - fromTopup,
    updatedAt: timestamp,
  });

  await ctx.db.insert("creditLedger", {
    walletId: wallet._id,
    delta: -reversed,
    reason: "adjustment",
    kind: "other",
    userId: args.userId ?? args.ownerUserId,
    idempotencyKey: args.idempotencyKey,
    balanceAfter: total - reversed,
    createdAt: timestamp,
  });

  return { balanceAfter: total - reversed, reversed, idempotent: false };
}

export type CreditSummary = {
  total: number;
  monthly: number;
  topup: number;
  usedByKind: { voice: number; moodboard: number; reference: number; other: number };
};

export async function getCreditSummaryForOwner(
  ctx: ReaderCtx,
  ownerUserId: Id<"users">,
): Promise<CreditSummary> {
  const wallet = await getWalletForOwnerOrNull(ctx, ownerUserId);
  const usedByKind = { voice: 0, moodboard: 0, reference: 0, other: 0 };

  if (!wallet) {
    return { total: 0, monthly: 0, topup: 0, usedByKind };
  }

  const ledger = await ctx.db
    .query("creditLedger")
    .withIndex("by_wallet", (q) => q.eq("walletId", wallet._id))
    .collect();

  for (const row of ledger) {
    if (row.reason === "usage") {
      usedByKind[row.kind] += -row.delta;
    }
  }

  return {
    total: walletTotal(wallet),
    monthly: wallet.monthlyBalance,
    topup: wallet.topupBalance,
    usedByKind,
  };
}
