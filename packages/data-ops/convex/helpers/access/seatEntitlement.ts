import type { Doc, Id } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";
import { getCurrentSubscriptionSnapshot } from "../../billing";

type ReaderCtx = QueryCtx | MutationCtx;

// Seat entitlement is derived from the owner's current plan on every read, never
// stored. The owner takes one seat; the earliest-joined members fill the rest.
// Members beyond the limit (after a downgrade) keep their row but get no access
// until the owner upgrades or removes someone.
export async function listOverLimitMemberIds(
  ctx: ReaderCtx,
  ownerUserId: Id<"users">,
): Promise<Set<Id<"projectCollaborators">>> {
  const [subscription, members] = await Promise.all([
    getCurrentSubscriptionSnapshot(ctx, String(ownerUserId)),
    ctx.db
      .query("projectCollaborators")
      .withIndex("by_owner", (q) => q.eq("ownerUserId", ownerUserId))
      .collect(),
  ]);
  const memberSeats = Math.max(0, (subscription?.seats ?? 1) - 1);
  return new Set(members.slice(memberSeats).map((member) => member._id));
}

export async function isActiveMembership(
  ctx: ReaderCtx,
  membership: Doc<"projectCollaborators">,
) {
  const overLimit = await listOverLimitMemberIds(ctx, membership.ownerUserId);
  return !overLimit.has(membership._id);
}

export async function listActiveMembershipsForUser(ctx: ReaderCtx, userId: Id<"users">) {
  const memberships = await ctx.db
    .query("projectCollaborators")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  const active = await Promise.all(
    memberships.map((membership) => isActiveMembership(ctx, membership)),
  );
  return memberships.filter((_, index) => active[index]);
}
