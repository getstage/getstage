import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { ensurePortalConfig, requireProjectOwner } from "./_helpers";
import { buildProject } from "./domain/projects/readModel";
import { resolveAssetUrl } from "./r2";

export const getByShareToken = query({
  args: {
    shareToken: v.string(),
  },
  handler: async (ctx, { shareToken }) => {
    const config = await ctx.db
      .query("portalConfigs")
      .withIndex("by_share_token", (q) => q.eq("shareToken", shareToken))
      .unique();

    if (!config || !config.isEnabled) {
      return null;
    }

    const project = await ctx.db.get(config.projectId);
    if (!project) {
      return null;
    }

    const owner = await ctx.db.get(project.userId);

    return {
      project: await buildProject(ctx, project),
      config: {
        projectId: String(config.projectId),
        isEnabled: config.isEnabled,
        shareToken: config.shareToken,
        shareUrl: config.shareUrl,
        logoUrl: await resolveAssetUrl(config.logoUrl ?? owner?.defaultPortalLogoUrl ?? null),
        accentColor: config.accentColor,
      },
    };
  },
});

export const getCollaboratorAccess = query({
  args: {
    shareToken: v.string(),
  },
  handler: async (ctx, { shareToken }) => {
    const userId = await getAuthUserId(ctx);

    if (!userId) {
      return { canEdit: false, user: null };
    }

    const config = await ctx.db
      .query("portalConfigs")
      .withIndex("by_share_token", (q) => q.eq("shareToken", shareToken))
      .unique();

    if (!config || !config.isEnabled) {
      return { canEdit: false, user: null };
    }

    const project = await ctx.db.get(config.projectId);
    if (!project) {
      return { canEdit: false, user: null };
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      return { canEdit: false, user: null };
    }

    const userInfo = { name: user.name ?? null, email: user.email ?? null };
    return { canEdit: false, user: userInfo };
  },
});

export const ensureShareLink = mutation({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, { projectId }) => {
    await requireProjectOwner(ctx, projectId);
    const config = await ensurePortalConfig(ctx, projectId);

    if (!config.isEnabled) {
      await ctx.db.patch(config._id, {
        isEnabled: true,
        updatedAt: Date.now(),
      });
    }

    return {
      projectId: String(projectId),
      shareToken: config.shareToken,
      shareUrl: config.shareUrl,
      isEnabled: true,
    };
  },
});

export const setEnabled = mutation({
  args: {
    projectId: v.id("projects"),
    isEnabled: v.boolean(),
  },
  handler: async (ctx, { projectId, isEnabled }) => {
    await requireProjectOwner(ctx, projectId);
    const config = await ensurePortalConfig(ctx, projectId);

    if (config.isEnabled !== isEnabled) {
      await ctx.db.patch(config._id, {
        isEnabled,
        updatedAt: Date.now(),
      });
    }

    return {
      projectId: String(projectId),
      isEnabled,
    };
  },
});
