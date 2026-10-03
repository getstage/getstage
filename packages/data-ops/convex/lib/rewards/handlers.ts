import Stripe from "stripe";
import { v } from "convex/values";
import type { Id } from "../../_generated/dataModel";
import type { ActionCtx, MutationCtx, QueryCtx } from "../../_generated/server";
import { internal } from "../../_generated/api";
import { getAuthUser, requireAuthUser } from "../../_helpers";
import { requireEnv } from "../../helpers/env";
import { now } from "../../helpers/time";
import { resolveCustomerId, type ViewerContext } from "../billing/handlers";

// "Share on X, get a month free" (rules from Adrien's x_share_code.py): the Stripe
// coupon in STRIPE_REWARD_COUPON_ID ($29 off once, Solo), one single-use code per
// verified post, valid 30 days, locked to the user's Stripe customer.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I lookalikes
const CODE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
// A reservation without a code older than this belongs to a failed attempt.
const STALE_RESERVATION_MS = 2 * 60 * 1000;
const X_POST_URL = /^https:\/\/(?:www\.)?(?:x|twitter)\.com\/[A-Za-z0-9_]{1,15}\/status\/(\d+)\/?(?:\?\S*)?$/;

export type RewardClaimResult =
  | { status: "approved"; code: string }
  | { status: "invalid" | "unpublished" | "unrelated" | "unavailable" | "claimed" };

type Reservation =
  | { kind: "existing"; code: string }
  | { kind: "claimed" | "unpublished" | "busy" }
  | { kind: "reserved"; claimId: Id<"rewardClaims">; profilePath: string };

export function xPostId(postUrl: string) {
  return X_POST_URL.exec(postUrl.trim())?.[1] ?? null;
}

function newCode() {
  // 32 symbols divide 256 evenly, so `byte % 32` is unbiased.
  const symbols = Array.from(crypto.getRandomValues(new Uint8Array(12)), (byte) => CODE_ALPHABET[byte % 32]).join("");
  return `STG-${symbols.slice(0, 4)}-${symbols.slice(4, 8)}-${symbols.slice(8)}`;
}

// X wraps links in t.co and truncates their visible text, so short links are expanded.
async function postLinksToProfile(postUrl: string, profilePath: string): Promise<"ok" | "unrelated" | "unavailable"> {
  const response = await fetch(`https://publish.twitter.com/oembed?omit_script=1&url=${encodeURIComponent(postUrl)}`);
  if (!response.ok) return "unavailable";
  const html = ((await response.json()) as { html?: string }).html?.toLowerCase();
  if (!html) return "unavailable";
  if (html.includes(profilePath)) return "ok";
  const shortLinks = [...new Set(html.match(/https:\/\/t\.co\/[a-z0-9]+/g) ?? [])].slice(0, 5);
  for (const link of shortLinks) {
    const expanded = await fetch(link, { method: "HEAD" }).catch(() => null);
    if (expanded?.url.toLowerCase().includes(profilePath)) return "ok";
  }
  return "unrelated";
}

export const reserveClaimArgs = { postId: v.string(), postUrl: v.string() };

export async function reserveClaimHandler(
  ctx: MutationCtx,
  { postId, postUrl }: { postId: string; postUrl: string },
): Promise<Reservation> {
  const user = await requireAuthUser(ctx);
  const own = await ctx.db.query("rewardClaims").withIndex("by_user", (q) => q.eq("userId", user._id)).unique();
  if (own?.code) return { kind: "existing", code: own.code };
  if (own && now() - own.createdAt < STALE_RESERVATION_MS) return { kind: "busy" };
  if (await ctx.db.query("rewardClaims").withIndex("by_post", (q) => q.eq("postId", postId)).first()) {
    return { kind: "claimed" };
  }
  const profile = await ctx.db.query("builderProfiles").withIndex("by_user", (q) => q.eq("userId", user._id)).unique();
  if (!profile?.published) return { kind: "unpublished" };
  if (own) await ctx.db.delete(own._id);
  const claimId = await ctx.db.insert("rewardClaims", { userId: user._id, postId, postUrl, createdAt: now() });
  return { kind: "reserved", claimId, profilePath: `getstage.co/builders/${profile.handle}` };
}

export const completeClaimArgs = { claimId: v.id("rewardClaims"), code: v.string(), promotionCodeId: v.string() };

export async function completeClaimHandler(
  ctx: MutationCtx,
  { claimId, code, promotionCodeId }: { claimId: Id<"rewardClaims">; code: string; promotionCodeId: string },
) {
  await ctx.db.patch(claimId, { code, promotionCodeId });
}

export const releaseClaimArgs = { claimId: v.id("rewardClaims") };

export async function releaseClaimHandler(ctx: MutationCtx, { claimId }: { claimId: Id<"rewardClaims"> }) {
  await ctx.db.delete(claimId);
}

export async function myRewardClaimHandler(ctx: QueryCtx) {
  const user = await getAuthUser(ctx);
  if (!user) return null;
  const claim = await ctx.db.query("rewardClaims").withIndex("by_user", (q) => q.eq("userId", user._id)).unique();
  return claim?.code ? { code: claim.code } : null;
}

export const claimXShareRewardArgs = { postUrl: v.string() };

export async function claimXShareRewardHandler(
  ctx: ActionCtx,
  { postUrl }: { postUrl: string },
): Promise<RewardClaimResult> {
  const postId = xPostId(postUrl);
  if (!postId) return { status: "invalid" };
  const reservation: Reservation = await ctx.runMutation(internal.rewards.reserveClaim, { postId, postUrl: postUrl.trim() });
  if (reservation.kind === "existing") return { status: "approved", code: reservation.code };
  if (reservation.kind === "busy") return { status: "unavailable" };
  if (reservation.kind !== "reserved") return { status: reservation.kind };

  const { claimId, profilePath } = reservation;
  try {
    const verdict = await postLinksToProfile(postUrl.trim(), profilePath);
    if (verdict !== "ok") {
      await ctx.runMutation(internal.rewards.releaseClaim, { claimId });
      return { status: verdict };
    }
    const viewer = (await ctx.runQuery(internal.onboarding.getViewerContext, {})) as ViewerContext;
    const sdk = new Stripe(requireEnv("STRIPE_SECRET_KEY"));
    const promotionCode = await sdk.promotionCodes.create({
      promotion: { type: "coupon", coupon: requireEnv("STRIPE_REWARD_COUPON_ID") },
      code: newCode(),
      max_redemptions: 1,
      expires_at: Math.floor((now() + CODE_TTL_MS) / 1000),
      customer: await resolveCustomerId(ctx, sdk, viewer),
      metadata: { x_post: postUrl.trim(), userId: viewer.userIdString },
    });
    await ctx.runMutation(internal.rewards.completeClaim, {
      claimId,
      code: promotionCode.code,
      promotionCodeId: promotionCode.id,
    });
    return { status: "approved", code: promotionCode.code };
  } catch (error) {
    await ctx.runMutation(internal.rewards.releaseClaim, { claimId });
    throw error;
  }
}
