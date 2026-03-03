import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { ensurePortalConfig, ensureUserByEmail, getUserByEmail } from "./_helpers";

const DEFAULT_PORTAL_COLOR = "#E8734A";

function now() {
  return Date.now();
}

function fallbackNameFromEmail(email: string) {
  const [localPart] = email.split("@");
  if (!localPart) {
    return "Stage User";
  }

  return localPart
    .split(/[._-]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizeHexColor(value: string) {
  const trimmed = value.trim().toUpperCase();
  const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;

  if (!/^#[0-9A-F]{6}$/.test(withHash)) {
    throw new Error("Portal color must be a valid hex value.");
  }

  return withHash;
}

function buildUserReplacement(
  user: {
    email: string;
    name: string;
    avatarUrl?: string;
    defaultPortalLogoUrl?: string;
    defaultPortalAccentColor?: string;
    role: "freelancer" | "studio" | "in-house" | "agency";
    plan: "free" | "pro";
    createdAt: number;
  },
  updates: {
    name?: string;
    avatarUrl?: string;
    defaultPortalLogoUrl?: string | null;
    defaultPortalAccentColor?: string;
  },
) {
  return {
    email: user.email,
    name: updates.name ?? user.name,
    ...(updates.avatarUrl !== undefined
      ? { avatarUrl: updates.avatarUrl }
      : user.avatarUrl
        ? { avatarUrl: user.avatarUrl }
        : {}),
    ...(updates.defaultPortalLogoUrl !== undefined
      ? updates.defaultPortalLogoUrl
        ? { defaultPortalLogoUrl: updates.defaultPortalLogoUrl }
        : {}
      : user.defaultPortalLogoUrl
        ? { defaultPortalLogoUrl: user.defaultPortalLogoUrl }
        : {}),
    ...(updates.defaultPortalAccentColor !== undefined
      ? { defaultPortalAccentColor: updates.defaultPortalAccentColor }
      : user.defaultPortalAccentColor
        ? { defaultPortalAccentColor: user.defaultPortalAccentColor }
        : {}),
    role: user.role,
    plan: user.plan,
    createdAt: user.createdAt,
    updatedAt: now(),
  };
}

function buildPortalConfigReplacement(
  config: {
    projectId: Id<"projects">;
    isEnabled: boolean;
    shareToken: string;
    shareUrl: string;
    logoUrl?: string;
    accentColor: string;
    createdAt: number;
  },
  updates: {
    logoUrl?: string | null;
    accentColor?: string;
  },
) {
  return {
    projectId: config.projectId,
    isEnabled: config.isEnabled,
    shareToken: config.shareToken,
    shareUrl: config.shareUrl,
    ...(updates.logoUrl !== undefined
      ? updates.logoUrl
        ? { logoUrl: updates.logoUrl }
        : {}
      : config.logoUrl
        ? { logoUrl: config.logoUrl }
        : {}),
    accentColor: updates.accentColor ?? config.accentColor,
    createdAt: config.createdAt,
    updatedAt: now(),
  };
}

export const getOverview = query({
  args: {
    email: v.string(),
  },
  handler: async (ctx, { email }) => {
    const user = await getUserByEmail(ctx, email);

    if (!user) {
      return {
        profile: {
          email,
          name: fallbackNameFromEmail(email),
          avatarUrl: null,
        },
        subscription: null,
        paymentConnection: null,
        portalBranding: {
          logoUrl: null,
          accentColor: DEFAULT_PORTAL_COLOR,
        },
        previewPortalUrl: null,
      };
    }

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
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl ?? null,
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
    email: v.string(),
    name: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, { email, name, avatarUrl }) => {
    const user = await ensureUserByEmail(ctx, { email });

    const nextName = name?.trim();
    if (nextName !== undefined && nextName.length === 0) {
      throw new Error("Name is required.");
    }

    const replacement = buildUserReplacement(user, {
      name: nextName,
      avatarUrl,
    });

    await ctx.db.replace(user._id, replacement);

    return {
      email: replacement.email,
      name: replacement.name,
      avatarUrl: replacement.avatarUrl ?? null,
    };
  },
});

export const updatePortalBranding = mutation({
  args: {
    email: v.string(),
    logoUrl: v.optional(v.union(v.string(), v.null())),
    accentColor: v.optional(v.string()),
  },
  handler: async (ctx, { email, logoUrl, accentColor }) => {
    const user = await ensureUserByEmail(ctx, { email });
    const normalizedColor =
      accentColor !== undefined ? normalizeHexColor(accentColor) : undefined;

    const userReplacement = buildUserReplacement(user, {
      defaultPortalLogoUrl: logoUrl,
      defaultPortalAccentColor: normalizedColor,
    });

    await ctx.db.replace(user._id, userReplacement);

    const projects = await ctx.db
      .query("projects")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    for (const project of projects) {
      const config = await ensurePortalConfig(ctx, project._id);
      const replacement = buildPortalConfigReplacement(config, {
        logoUrl,
        accentColor: normalizedColor,
      });
      await ctx.db.replace(config._id, replacement);
    }

    return {
      logoUrl:
        logoUrl !== undefined
          ? logoUrl
          : userReplacement.defaultPortalLogoUrl ?? null,
      accentColor:
        normalizedColor ?? userReplacement.defaultPortalAccentColor ?? DEFAULT_PORTAL_COLOR,
    };
  },
});
