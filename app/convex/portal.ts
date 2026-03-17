import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentSubscriptionSnapshot } from "./billing";
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

    if (project.userId === userId) {
      return { canEdit: true, user: userInfo };
    }

    const collaborator = await ctx.db
      .query("projectCollaborators")
      .withIndex("by_project_user", (q) =>
        q.eq("projectId", config.projectId).eq("userId", userId),
      )
      .unique();

    if (!collaborator) {
      return { canEdit: false, user: userInfo };
    }

    const ownerSubscription = await getCurrentSubscriptionSnapshot(ctx, String(project.userId));
    if (!ownerSubscription) {
      return { canEdit: false, user: userInfo };
    }

    const subscription = await getCurrentSubscriptionSnapshot(ctx, String(userId));
    if (!subscription) {
      return { canEdit: false, user: userInfo };
    }

    return { canEdit: true, user: userInfo };
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
