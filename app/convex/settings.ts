import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { ensurePortalConfig, requireAuthUser } from "./_helpers";

const DEFAULT_PORTAL_COLOR = "#E8734A";

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

    const subscriptions = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    const subscription = subscriptions[0] ?? null;

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
        avatarUrl: user.avatarUrl ?? user.image ?? null,
        role: user.role ?? "freelancer",
        plan: user.plan ?? "free",
      },
      subscription: subscription
        ? {
            plan: subscription.plan,
            status: subscription.status,
            provider: subscription.provider,
            billingCycle: subscription.billingCycle,
            currentPeriodEnd: subscription.currentPeriodEnd,
            paymentMethodBrand: subscription.paymentMethodBrand ?? null,
            paymentMethodLast4: subscription.paymentMethodLast4 ?? null,
          }
        : null,
      paymentConnection: paymentConnection
        ? {
            provider: paymentConnection.provider,
            status: paymentConnection.status,
          }
        : null,
      portalBranding: {
        logoUrl: user.defaultPortalLogoUrl ?? previewConfig?.logoUrl ?? null,
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
  },
  handler: async (ctx, { name, avatarUrl }) => {
    const user = await requireAuthUser(ctx);

    const nextName = name?.trim();
    if (nextName !== undefined && nextName.length === 0) {
      throw new Error("Name is required.");
    }

    const patch: Record<string, string | number> = { updatedAt: now() };
    if (nextName !== undefined) patch.name = nextName;
    if (avatarUrl !== undefined) patch.avatarUrl = avatarUrl;

    await ctx.db.patch(user._id, patch);

    return {
      email: user.email ?? "",
      name: nextName ?? user.name ?? "",
      avatarUrl: avatarUrl ?? user.avatarUrl ?? null,
    };
  },
});

export const updatePortalBranding = mutation({
  args: {
    logoUrl: v.optional(v.union(v.string(), v.null())),
    accentColor: v.optional(v.string()),
  },
  handler: async (ctx, { logoUrl, accentColor }) => {
    const user = await requireAuthUser(ctx);
    const normalizedColor =
      accentColor !== undefined ? normalizeHexColor(accentColor) : undefined;

    const userPatch: Record<string, string | number | undefined> = { updatedAt: now() };
    if (logoUrl !== undefined) {
      userPatch.defaultPortalLogoUrl = logoUrl ?? undefined;
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
      if (logoUrl !== undefined) {
        configPatch.logoUrl = logoUrl ?? undefined;
      }
      if (normalizedColor !== undefined) {
        configPatch.accentColor = normalizedColor;
      }
      await ctx.db.patch(config._id, configPatch);
    }

    return {
      logoUrl: logoUrl !== undefined ? logoUrl : user.defaultPortalLogoUrl ?? null,
      accentColor:
        normalizedColor ?? user.defaultPortalAccentColor ?? DEFAULT_PORTAL_COLOR,
    };
  },
});
