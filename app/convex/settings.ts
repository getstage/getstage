import { StripeSubscriptions, type StripeComponent } from "@convex-dev/stripe";
import { v } from "convex/values";
import { action, internalMutation, mutation, query, type MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { components, internal } from "./_generated/api";
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

async function deleteAttachmentTreeForProject(
  ctx: MutationCtx,
  projectId: Id<"projects">,
) {
  const phases = await ctx.db
    .query("phases")
    .withIndex("by_project", (q) => q.eq("projectId", projectId))
    .collect();

  for (const phase of phases) {
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_phase", (q) => q.eq("phaseId", phase._id))
      .collect();

    for (const task of tasks) {
      const attachments = await ctx.db
        .query("attachments")
        .withIndex("by_task", (q) => q.eq("taskId", task._id))
        .collect();

      for (const attachment of attachments) {
        if (attachment.storageId) {
          await ctx.storage.delete(attachment.storageId);
        }
        if (attachment.r2ObjectKey) {
          await deleteOldR2Asset(ctx, attachment.r2ObjectKey);
        }
        await ctx.db.delete(attachment._id);
      }

      await ctx.db.delete(task._id);
    }

    await ctx.db.delete(phase._id);
  }

  const portalConfig = await ctx.db
    .query("portalConfigs")
    .withIndex("by_project", (q) => q.eq("projectId", projectId))
    .unique();

  if (portalConfig) {
    await ctx.db.delete(portalConfig._id);
  }
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
    const user = await ctx.db.get(args.userId);
    if (!user) {
      return { deleted: false };
    }

    const projectAvatarKeys = new Set<string>();
    const clientAvatarKeys = new Set<string>();

    const financeEntries = await ctx.db
      .query("financeEntries")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    for (const financeEntry of financeEntries) {
      await ctx.db.delete(financeEntry._id);
    }

    const payments = await ctx.db
      .query("payments")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    for (const payment of payments) {
      await ctx.db.delete(payment._id);
    }

    const invoices = await ctx.db
      .query("invoices")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    for (const invoice of invoices) {
      await ctx.db.delete(invoice._id);
    }

    const sheetImportRuns = await ctx.db
      .query("sheetImportRuns")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    for (const importRun of sheetImportRuns) {
      await ctx.db.delete(importRun._id);
    }

    const sheetConnections = await ctx.db
      .query("sheetConnections")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    for (const sheetConnection of sheetConnections) {
      if (sheetConnection.storageId) {
        await ctx.storage.delete(sheetConnection.storageId);
      }
      if (sheetConnection.r2ObjectKey) {
        await deleteOldR2Asset(ctx, sheetConnection.r2ObjectKey);
      }
      await ctx.db.delete(sheetConnection._id);
    }

    const paymentConnections = await ctx.db
      .query("paymentConnections")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    for (const paymentConnection of paymentConnections) {
      await ctx.db.delete(paymentConnection._id);
    }

    const subscriptions = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    for (const subscription of subscriptions) {
      await ctx.db.delete(subscription._id);
    }

    const projects = await ctx.db
      .query("projects")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    for (const project of projects) {
      if (project.clientAvatarUrl) {
        projectAvatarKeys.add(project.clientAvatarUrl);
      }
      await deleteAttachmentTreeForProject(ctx, project._id);
      await ctx.db.delete(project._id);
    }

    const clients = await ctx.db
      .query("clients")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    for (const client of clients) {
      if (client.avatarUrl) {
        clientAvatarKeys.add(client.avatarUrl);
      }
      await ctx.db.delete(client._id);
    }

    for (const avatarKey of projectAvatarKeys) {
      await deleteOldR2Asset(ctx, avatarKey);
    }
    for (const avatarKey of clientAvatarKeys) {
      await deleteOldR2Asset(ctx, avatarKey);
    }
    await deleteOldR2Asset(ctx, user.avatarUrl);
    await deleteOldR2Asset(ctx, user.defaultPortalLogoUrl);

    const authSessions = await ctx.db
      .query("authSessions")
      .withIndex("userId", (q) => q.eq("userId", args.userId))
      .collect();
    for (const authSession of authSessions) {
      const refreshTokens = await ctx.db
        .query("authRefreshTokens")
        .withIndex("sessionId", (q) => q.eq("sessionId", authSession._id))
        .collect();
      for (const refreshToken of refreshTokens) {
        await ctx.db.delete(refreshToken._id);
      }

      const verifiers = await ctx.db
        .query("authVerifiers")
        .filter((q) => q.eq(q.field("sessionId"), authSession._id))
        .collect();
      for (const verifier of verifiers) {
        await ctx.db.delete(verifier._id);
      }

      await ctx.db.delete(authSession._id);
    }

    const authAccounts = await ctx.db
      .query("authAccounts")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .collect();
    for (const authAccount of authAccounts) {
      const verificationCodes = await ctx.db
        .query("authVerificationCodes")
        .withIndex("accountId", (q) => q.eq("accountId", authAccount._id))
        .collect();
      for (const verificationCode of verificationCodes) {
        await ctx.db.delete(verificationCode._id);
      }

      await ctx.db.delete(authAccount._id);
    }

    const userEmail = user.email ?? null;
    if (userEmail) {
      const emailRateLimit = await ctx.db
        .query("authRateLimits")
        .withIndex("identifier", (q) => q.eq("identifier", userEmail))
        .unique();
      if (emailRateLimit) {
        await ctx.db.delete(emailRateLimit._id);
      }
    }

    const userPhone = user.phone ?? null;
    if (userPhone) {
      const phoneRateLimit = await ctx.db
        .query("authRateLimits")
        .withIndex("identifier", (q) => q.eq("identifier", userPhone))
        .unique();
      if (phoneRateLimit) {
        await ctx.db.delete(phoneRateLimit._id);
      }
    }

    await ctx.db.delete(args.userId);

    return { deleted: true };
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
