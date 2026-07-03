import { v } from "convex/values";
import type { QueryCtx } from "../../_generated/server";
import type { Id } from "../../_generated/dataModel";
import { getCurrentSubscriptionSnapshot } from "../billing/handlers";

// Isolated in its own file so the Stripe SDK (pulled in by the billing
// snapshot) only ends up in this one query's bundle, not in every email
// mutation. sendStep calls this to re-check the live subscription state before
// sending any Flow A (trial) email.
export const getSubscriptionStatusArgs = { userId: v.id("users") };

export async function getSubscriptionStatusHandler(
  ctx: QueryCtx,
  args: { userId: Id<"users"> },
): Promise<{ status: string | null; cancelAtPeriodEnd: boolean }> {
  const snapshot = await getCurrentSubscriptionSnapshot(ctx, String(args.userId));
  if (!snapshot) return { status: null, cancelAtPeriodEnd: false };
  return { status: snapshot.status, cancelAtPeriodEnd: snapshot.cancelAtPeriodEnd };
}
