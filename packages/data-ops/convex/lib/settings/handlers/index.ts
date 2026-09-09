import { StripeSubscriptions, type StripeComponent } from "@convex-dev/stripe";
import { v } from "convex/values";
import type { Id } from "../../../_generated/dataModel";
import type { ActionCtx, MutationCtx, QueryCtx } from "../../../_generated/server";
import { components, internal } from "../../../_generated/api";
import { deleteAccountDataForUser } from "../../../domain/accountCleanup";
import { now } from "../../../helpers/time";
import { getCurrentSubscriptionSnapshot } from "../../billing/handlers";
import { attachTrackedR2Asset, deleteOldR2Asset, resolveAssetUrl } from "../../../r2";
import { ensurePortalConfig, pruneOrphanClientsForUser, requireAuthUser } from "../../../_helpers";
import { assertImportedSkillHubItems, importedSkillHubItemValidator } from "../githubImport";

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

function normalizeHexColor(value: string) {
  const trimmed = value.trim().toUpperCase();
  const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;

  if (!/^#[0-9A-F]{6}$/.test(withHash)) {
    throw new Error("Portal color must be a valid hex value.");
  }

  return withHash;
}

const userRoleValidator = v.union(
  v.literal("freelancer"),
  v.literal("studio"),
  v.literal("in-house"),
  v.literal("agency"),
);

export const getOverviewArgs = {};

export async function getOverviewHandler(ctx: QueryCtx) {
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

  const firstProject =
    (await ctx.db
      .query("projects")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first()) ?? null;
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
          plan: subscription.plan ?? "free",
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
      accentColor: user.defaultPortalAccentColor ?? previewConfig?.accentColor ?? DEFAULT_PORTAL_COLOR,
    },
    previewPortalUrl: previewConfig?.shareUrl ? `${previewConfig.shareUrl}?preview=1` : null,
    skillHub: {
      installedSkillIds: user.installedSkillIds ?? null,
      enabledSkillIds: user.enabledSkillIds ?? null,
      enabledComponentPackIds: user.enabledComponentPackIds ?? null,
      importedSkillHubItems: user.importedSkillHubItems ?? null,
    },
  };
}

export const updateProfileArgs = {
  name: v.optional(v.string()),
  avatarUrl: v.optional(v.string()),
  avatarKey: v.optional(v.string()),
  role: v.optional(userRoleValidator),
};

export async function updateProfileHandler(
  ctx: MutationCtx,
  args: { name?: string; avatarUrl?: string; avatarKey?: string; role?: "freelancer" | "studio" | "in-house" | "agency" },
) {
  const user = await requireAuthUser(ctx);

  const nextName = args.name?.trim();
  if (nextName !== undefined && nextName.length === 0) {
    throw new Error("Name is required.");
  }

  const nextAvatarUrl = args.avatarKey ?? args.avatarUrl;

  if (nextAvatarUrl !== undefined && user.avatarUrl) {
    await deleteOldR2Asset(ctx, user.avatarUrl);
  }

  const patch: Record<string, string | number> = { updatedAt: now() };
  if (nextName !== undefined) patch.name = nextName;
  if (nextAvatarUrl !== undefined) patch.avatarUrl = nextAvatarUrl;
  if (args.role !== undefined) patch.role = args.role;

  await ctx.db.patch(user._id, patch);
  await attachTrackedR2Asset(ctx, { key: nextAvatarUrl ?? user.avatarUrl });

  return {
    email: user.email ?? "",
    name: nextName ?? user.name ?? "",
    avatarUrl: await resolveAssetUrl(nextAvatarUrl ?? user.avatarUrl ?? null),
    role: args.role ?? user.role ?? "freelancer",
  };
}

export const updatePortalBrandingArgs = {
  logoUrl: v.optional(v.union(v.string(), v.null())),
  logoKey: v.optional(v.string()),
  accentColor: v.optional(v.string()),
};

export async function updatePortalBrandingHandler(
  ctx: MutationCtx,
  args: { logoUrl?: string | null; logoKey?: string; accentColor?: string },
) {
  const user = await requireAuthUser(ctx);
  const subscription = await getCurrentSubscriptionSnapshot(ctx, String(user._id));
  const plan = subscription?.plan ?? user.plan ?? "free";
  const normalizedColor = args.accentColor !== undefined ? normalizeHexColor(args.accentColor) : undefined;
  const nextLogoUrl = args.logoKey ?? args.logoUrl;

  if (plan === "free" && nextLogoUrl !== undefined && nextLogoUrl !== null) {
    throw new Error("Custom portal logos require a paid Stage plan.");
  }

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
  await attachTrackedR2Asset(ctx, {
    key: nextLogoUrl !== undefined ? nextLogoUrl : user.defaultPortalLogoUrl,
  });

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
    accentColor: normalizedColor ?? user.defaultPortalAccentColor ?? DEFAULT_PORTAL_COLOR,
  };
}

export const cleanupOrphanClientsArgs = {};

export async function cleanupOrphanClientsHandler(ctx: MutationCtx) {
  const user = await requireAuthUser(ctx);
  return pruneOrphanClientsForUser(ctx, user._id);
}

export const deleteAccountDataArgs = {
  userId: v.id("users"),
};

export async function deleteAccountDataHandler(ctx: MutationCtx, args: { userId: Id<"users"> }) {
  return deleteAccountDataForUser(ctx, args.userId);
}

export const deleteAccountArgs = {
  confirmation: v.string(),
};

export async function deleteAccountHandler(ctx: ActionCtx, args: { confirmation: string }) {
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
      try {
        await stripe.cancelSubscription(ctx, {
          stripeSubscriptionId: subscription.stripeSubscriptionId,
          cancelAtPeriodEnd: false,
        });
      } catch (error) {
        // Best-effort: a stale/absent Stripe subscription (e.g. created against a
        // different Stripe account or already canceled) must not block account
        // deletion. Local billing state is torn down by deleteAccountData below.
        console.error("deleteAccount: failed to cancel Stripe subscription", error);
      }
    }
  }

  await ctx.runMutation(internal.settings.deleteAccountData, {
    userId: viewer.userId,
  });

  return {
    deleted: true,
  };
}

/** Keep in sync with `skillHubIdSchema` in user-application/shared/models/safeHttpsUrl.ts */
const SKILL_HUB_ID_PATTERN = /^[a-z][a-z0-9-]{0,62}$/;
const MAX_SKILL_HUB_IDS = 64;

function assertSkillHubIds(ids: string[], label: string) {
  if (ids.length > MAX_SKILL_HUB_IDS) {
    throw new Error(`${label} exceeds ${MAX_SKILL_HUB_IDS} entries.`);
  }
  for (const id of ids) {
    if (!SKILL_HUB_ID_PATTERN.test(id)) {
      throw new Error(`${label} contains an invalid id.`);
    }
  }
}

export const updateSkillHubPrefsArgs = {
  installedSkillIds: v.optional(v.array(v.string())),
  enabledSkillIds: v.optional(v.array(v.string())),
  enabledComponentPackIds: v.optional(v.array(v.string())),
  importedSkillHubItems: v.optional(v.array(importedSkillHubItemValidator)),
};

export async function updateSkillHubPrefsHandler(
  ctx: MutationCtx,
  args: {
    installedSkillIds?: string[];
    enabledSkillIds?: string[];
    enabledComponentPackIds?: string[];
    importedSkillHubItems?: Array<{
      id: string;
      kind: "skill" | "component";
      name: string;
      sourceUrl: string;
    }>;
  },
) {
  const user = await requireAuthUser(ctx);
  if (args.installedSkillIds !== undefined) {
    assertSkillHubIds(args.installedSkillIds, "installedSkillIds");
  }
  if (args.enabledSkillIds !== undefined) {
    assertSkillHubIds(args.enabledSkillIds, "enabledSkillIds");
  }
  if (args.enabledComponentPackIds !== undefined) {
    assertSkillHubIds(args.enabledComponentPackIds, "enabledComponentPackIds");
  }
  if (args.importedSkillHubItems !== undefined) {
    assertImportedSkillHubItems(args.importedSkillHubItems);
  }
  const timestamp = now();
  await ctx.db.patch(user._id, {
    ...(args.installedSkillIds !== undefined
      ? { installedSkillIds: args.installedSkillIds }
      : {}),
    ...(args.enabledSkillIds !== undefined
      ? { enabledSkillIds: args.enabledSkillIds }
      : {}),
    ...(args.enabledComponentPackIds !== undefined
      ? { enabledComponentPackIds: args.enabledComponentPackIds }
      : {}),
    ...(args.importedSkillHubItems !== undefined
      ? { importedSkillHubItems: args.importedSkillHubItems }
      : {}),
    updatedAt: timestamp,
  });
  return {
    installedSkillIds: args.installedSkillIds ?? user.installedSkillIds ?? null,
    enabledSkillIds: args.enabledSkillIds ?? user.enabledSkillIds ?? null,
    enabledComponentPackIds:
      args.enabledComponentPackIds ?? user.enabledComponentPackIds ?? null,
    importedSkillHubItems:
      args.importedSkillHubItems ?? user.importedSkillHubItems ?? null,
  };
}
