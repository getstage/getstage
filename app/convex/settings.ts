import { StripeSubscriptions, type StripeComponent } from "@convex-dev/stripe";
import { v } from "convex/values";
import { action, internalMutation, mutation, query } from "./_generated/server";
import { components, internal } from "./_generated/api";
import { deleteAccountDataForUser } from "./domain/accountCleanup";
import { ensurePortalConfig, pruneOrphanClientsForUser, requireAuthUser } from "./_helpers";
import { getCurrentSubscriptionSnapshot } from "./billing";
import { deleteOldR2Asset, resolveAssetUrl } from "./r2";

const DEFAULT_PORTAL_COLOR = "#E8734A";
const DELETE_ACCOUNT_CONFIRMATION = "DELETE";
const ACTIVE_SUBSCRIPTION_STATUSES = new Set([
  "active",
  "trialing",
  "past_due",
  "unpaid",
  "incomplete",
]);

const stripeComponent = (components as { stripe: StripeComponent }).stripe;
const stripe = new StripeSubscriptions(stripeComponent, {});

function now() {
  return Date.now();
}

function normalizeHexColor(value: string) {
  const trimmed = value.trim().toUpperCase();
  const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;

  if (!/^#[0-9A-F]{6}$/.test(withHash)) {
    throw new Error("Portal color must be a valid hex value.");
  }

  return withHash;
}

export const getOverview = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuthUser(ctx);
    const subscription = await getCurrentSubscriptionSnapshot(ctx, String(user._id));

    const paymentConnections = await ctx.db
      .query("paymentConnections")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    const paymentConnection =
      paymentConnections.find((connection) => connection.status !== "disconnected") ??
      paymentConnections[0] ??
      null;

    const projects = await ctx.db
      .query("projects")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    const firstProject = projects[0] ?? null;
    const previewConfig = firstProject
      ? await ctx.db
          .query("portalConfigs")
          .withIndex("by_project", (q) => q.eq("projectId", firstProject._id))
          .unique()
      : null;

    return {
      profile: {
        id: String(user._id),
        email: user.email ?? "",
        name: user.name ?? "",
        avatarUrl: await resolveAssetUrl(user.avatarUrl ?? user.image ?? null),
        role: user.role ?? "freelancer",
        plan: subscription?.plan ?? user.plan ?? "free",
      },
      subscription: subscription
        ? {
            plan: subscription.plan,
            status: subscription.status,
            provider: subscription.provider,
            billingCycle: subscription.billingCycle,
            currentPeriodEnd: subscription.currentPeriodEnd,
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd ?? false,
            paymentMethodBrand: subscription.paymentMethodBrand ?? null,
            paymentMethodLast4: subscription.paymentMethodLast4 ?? null,
            stripeCustomerId: subscription.stripeCustomerId ?? null,
            stripeSubscriptionId: subscription.stripeSubscriptionId ?? null,
            stripePriceId: subscription.stripePriceId ?? null,
          }
        : null,
      paymentConnection: paymentConnection
        ? {
            provider: paymentConnection.provider,
            status: paymentConnection.status,
          }
        : null,
      portalBranding: {
        logoUrl: await resolveAssetUrl(user.defaultPortalLogoUrl ?? previewConfig?.logoUrl ?? null),
        accentColor:
          user.defaultPortalAccentColor ?? previewConfig?.accentColor ?? DEFAULT_PORTAL_COLOR,
      },
      previewPortalUrl: previewConfig?.shareUrl ? `${previewConfig.shareUrl}?preview=1` : null,
    };
  },
});

export const updateProfile = mutation({
  args: {
    name: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    avatarKey: v.optional(v.string()),
  },
  handler: async (ctx, { name, avatarUrl, avatarKey }) => {
    const user = await requireAuthUser(ctx);

    const nextName = name?.trim();
    if (nextName !== undefined && nextName.length === 0) {
      throw new Error("Name is required.");
    }

    const nextAvatarUrl = avatarKey ?? avatarUrl;

    // Delete old R2 avatar before saving new one to prevent ghost data.
    if (nextAvatarUrl !== undefined && user.avatarUrl) {
      await deleteOldR2Asset(ctx, user.avatarUrl);
    }

    const patch: Record<string, string | number> = { updatedAt: now() };
    if (nextName !== undefined) patch.name = nextName;
    if (nextAvatarUrl !== undefined) patch.avatarUrl = nextAvatarUrl;

    await ctx.db.patch(user._id, patch);

    return {
      email: user.email ?? "",
      name: nextName ?? user.name ?? "",
      avatarUrl: await resolveAssetUrl(nextAvatarUrl ?? user.avatarUrl ?? null),
    };
  },
});

export const updatePortalBranding = mutation({
  args: {
    logoUrl: v.optional(v.union(v.string(), v.null())),
    logoKey: v.optional(v.string()),
    accentColor: v.optional(v.string()),
  },
  handler: async (ctx, { logoUrl, logoKey, accentColor }) => {
    const user = await requireAuthUser(ctx);
    const subscription = await getCurrentSubscriptionSnapshot(ctx, String(user._id));
    const plan = subscription?.plan ?? user.plan ?? "free";
    const normalizedColor =
      accentColor !== undefined ? normalizeHexColor(accentColor) : undefined;
    const nextLogoUrl = logoKey ?? logoUrl;

    if (plan === "free" && nextLogoUrl !== undefined && nextLogoUrl !== null) {
      throw new Error("Custom portal logos require Stage Pro.");
    }

    // Delete old R2 logo before saving new one to prevent ghost data.
    if (nextLogoUrl !== undefined && user.defaultPortalLogoUrl) {
      await deleteOldR2Asset(ctx, user.defaultPortalLogoUrl);
    }

    const userPatch: Record<string, string | number | undefined> = { updatedAt: now() };
    if (nextLogoUrl !== undefined) {
      userPatch.defaultPortalLogoUrl = nextLogoUrl ?? undefined;
    }
    if (normalizedColor !== undefined) {
      userPatch.defaultPortalAccentColor = normalizedColor;
    }

    await ctx.db.patch(user._id, userPatch);

    const projects = await ctx.db
      .query("projects")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    for (const project of projects) {
      const config = await ensurePortalConfig(ctx, project._id);
      const configPatch: Record<string, string | number | undefined> = { updatedAt: now() };
      if (nextLogoUrl !== undefined) {
        configPatch.logoUrl = nextLogoUrl ?? undefined;
      }
      if (normalizedColor !== undefined) {
        configPatch.accentColor = normalizedColor;
      }
      await ctx.db.patch(config._id, configPatch);
    }

    return {
      logoUrl: await resolveAssetUrl(
        nextLogoUrl !== undefined ? nextLogoUrl : user.defaultPortalLogoUrl ?? null,
      ),
      accentColor:
        normalizedColor ?? user.defaultPortalAccentColor ?? DEFAULT_PORTAL_COLOR,
    };
  },
});

export const cleanupOrphanClients = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuthUser(ctx);
    return pruneOrphanClientsForUser(ctx, user._id);
  },
});

export const deleteAccountData = internalMutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return deleteAccountDataForUser(ctx, args.userId);
  },
});

export const deleteAccount = action({
  args: {
    confirmation: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.confirmation.trim().toUpperCase() !== DELETE_ACCOUNT_CONFIRMATION) {
      throw new Error(`Type ${DELETE_ACCOUNT_CONFIRMATION} to confirm account deletion.`);
    }

    const viewer = await ctx.runQuery(internal.onboarding.getViewerContext, {});
    const subscriptions = await ctx.runQuery(stripeComponent.public.listSubscriptionsByUserId, {
      userId: viewer.userIdString,
    });

    for (const subscription of subscriptions) {
      if (
        ACTIVE_SUBSCRIPTION_STATUSES.has(subscription.status) &&
        subscription.stripeSubscriptionId
      ) {
        await stripe.cancelSubscription(ctx, {
          stripeSubscriptionId: subscription.stripeSubscriptionId,
          cancelAtPeriodEnd: false,
        });
      }
    }

    await ctx.runMutation(internal.settings.deleteAccountData, {
      userId: viewer.userId,
    });

    return {
      deleted: true,
    };
  },
});
