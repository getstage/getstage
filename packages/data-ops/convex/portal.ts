import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { ensurePortalConfig, requireProjectOwner } from "./_helpers";
import { buildProject, recomputeProjectState } from "./domain/projects/readModel";
import { resolveAssetUrl } from "./r2";

const MAX_REVISION_NOTE_LENGTH = 2000;

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

/**
 * Client-facing revision request from the public portal. The share token is the
 * authorization: anyone holding an enabled link may move one of that project's
 * tasks into the Revision column and attach their thoughts. We fail closed if the
 * token is unknown/disabled or the task does not belong to the token's project.
 */
export const requestTaskRevision = mutation({
  args: {
    shareToken: v.string(),
    taskId: v.id("tasks"),
    note: v.string(),
  },
  handler: async (ctx, { shareToken, taskId, note }) => {
    const config = await ctx.db
      .query("portalConfigs")
      .withIndex("by_share_token", (q) => q.eq("shareToken", shareToken))
      .unique();

    if (!config || !config.isEnabled) {
      throw new Error("This portal link is no longer active.");
    }

    const task = await ctx.db.get(taskId);
    if (!task) {
      throw new Error("Task not found.");
    }

    const phase = await ctx.db.get(task.phaseId);
    if (!phase || phase.projectId !== config.projectId) {
      // The task is not part of the project this link grants access to.
      throw new Error("Task not found.");
    }

    const trimmed = note.trim().slice(0, MAX_REVISION_NOTE_LENGTH);

    await ctx.db.patch(task._id, {
      boardStatus: "revision",
      isCompleted: false,
      revisionNote: trimmed.length > 0 ? trimmed : undefined,
      updatedAt: Date.now(),
    });

    await recomputeProjectState(ctx, config.projectId);

    return { taskId: String(task._id) };
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
