import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { buildProject, ensurePortalConfig } from "./_helpers";

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

    return {
      project: await buildProject(ctx, project),
      config: {
        projectId: String(config.projectId),
        isEnabled: config.isEnabled,
        shareToken: config.shareToken,
        shareUrl: config.shareUrl,
        logoUrl: config.logoUrl,
        accentColor: config.accentColor,
      },
    };
  },
});

export const setEnabled = mutation({
  args: {
    projectId: v.id("projects"),
    isEnabled: v.boolean(),
  },
  handler: async (ctx, { projectId, isEnabled }) => {
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
