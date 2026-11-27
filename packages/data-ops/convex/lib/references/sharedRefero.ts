import { v } from "convex/values";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import type { ActionCtx, MutationCtx, QueryCtx } from "../../_generated/server";
import { getEnv } from "../../helpers/env";
import { getConnection } from "../integrations/contentPlatforms/domain";

// Stage's own Refero key, kept as a grace period for users who had Stage before everyone connected their own
// accounts (STA-78): only until December 31, only until they connect Refero or Mobbin, and capped per user.

/** The shared access ends after this moment (31 Dec 2026, end of day, UTC). */
export const SHARED_REFERO_ENDS_AT = Date.UTC(2026, 11, 31, 23, 59, 59);
/** Accounts created before this (the release of STA-78) are existing users. */
export const EXISTING_USERS_BEFORE = Date.UTC(2026, 10, 28);
const DEFAULT_LOOKUP_LIMIT = 100;

function lookupLimit() {
  const configured = Number(getEnv("SHARED_REFERO_LOOKUP_LIMIT"));
  return Number.isFinite(configured) && configured >= 0 ? configured : DEFAULT_LOOKUP_LIMIT;
}

export function sharedReferoKey() {
  return getEnv("REFERO_MCP_TOKEN")?.trim() || null;
}

/** Whether the user may still use Stage's shared Refero key (before counting this lookup). */
export async function sharedReferoAvailable(ctx: QueryCtx | MutationCtx, userId: Id<"users">, now = Date.now()) {
  if (now > SHARED_REFERO_ENDS_AT || !sharedReferoKey()) return false;
  const user = await ctx.db.get(userId);
  if (!user || user._creationTime >= EXISTING_USERS_BEFORE) return false;
  const [mobbin, refero] = await Promise.all([getConnection(ctx, userId, "mobbin"), getConnection(ctx, userId, "refero")]);
  if (mobbin?.status === "active" || refero?.status === "active") return false;
  const usage = await ctx.db.query("sharedReferoUsage").withIndex("by_user", (q) => q.eq("userId", userId)).unique();
  return (usage?.lookups ?? 0) < lookupLimit();
}

export const claimSharedReferoLookupArgs = { userId: v.id("users") };

/** Counts one lookup on the shared key; false when the user may not use it (any more). */
export async function claimSharedReferoLookupHandler(ctx: MutationCtx, { userId }: { userId: Id<"users"> }) {
  if (!(await sharedReferoAvailable(ctx, userId))) return false;
  const usage = await ctx.db.query("sharedReferoUsage").withIndex("by_user", (q) => q.eq("userId", userId)).unique();
  if (usage) await ctx.db.patch(usage._id, { lookups: usage.lookups + 1, updatedAt: Date.now() });
  else await ctx.db.insert("sharedReferoUsage", { userId, lookups: 1, updatedAt: Date.now() });
  return true;
}

/** Stage's shared Refero key for this lookup, or null when the user's grace period doesn't cover it. */
export async function sharedReferoToken(ctx: Pick<ActionCtx, "runMutation">, userId: Id<"users">) {
  const key = sharedReferoKey();
  if (!key) return null;
  return (await ctx.runMutation(internal.integrations.sharedRefero.claimLookup, { userId })) ? key : null;
}

export const sharedReferoStatusArgs = {};

/** For the "connect your own account" banner: whether the user still relies on the shared access, and until when. */
export async function sharedReferoStatusHandler(ctx: QueryCtx, userId: Id<"users"> | null) {
  if (!userId) return { showBanner: false, endsAt: SHARED_REFERO_ENDS_AT };
  const user = await ctx.db.get(userId);
  const connected = await Promise.all((["mobbin", "refero", "details"] as const).map((provider) => getConnection(ctx, userId, provider)));
  const ownAccount = connected.some((connection) => connection?.status === "active");
  return { showBanner: Boolean(user && user._creationTime < EXISTING_USERS_BEFORE && !ownAccount), endsAt: SHARED_REFERO_ENDS_AT };
}
