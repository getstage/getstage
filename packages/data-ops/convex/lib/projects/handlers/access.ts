import { v } from "convex/values";
import { internalQuery, type MutationCtx, type QueryCtx } from "../../../_generated/server";
import type { Id } from "../../../_generated/dataModel";
import { buildApiProjectDetail, buildApiProjectReference, buildApiTaskDetail } from "../../../domain/projects/apiReadModel";
import {
  requireProjectAccessForUserId,
  requireTaskAccessForUserId,
} from "../../../domain/projects/service";

type ReaderCtx = QueryCtx | MutationCtx;

export async function normalizeProjectId(ctx: ReaderCtx, projectId: string) {
  const normalized = await ctx.db.normalizeId("projects", projectId);
  if (!normalized) {
    throw new Error("Project not found.");
  }
  return normalized;
}

export async function normalizePhaseId(ctx: ReaderCtx, phaseId: string) {
  const normalized = await ctx.db.normalizeId("phases", phaseId);
  if (!normalized) {
    throw new Error("Phase not found.");
  }
  return normalized;
}

export async function normalizeTaskId(ctx: ReaderCtx, taskId: string) {
  const normalized = await ctx.db.normalizeId("tasks", taskId);
  if (!normalized) {
    throw new Error("Task not found.");
  }
  return normalized;
}

export const getProjectForApi = internalQuery({
  args: {
    userId: v.id("users"),
    projectId: v.string(),
  },
  handler: async (ctx, args) => {
    const projectId = await normalizeProjectId(ctx, args.projectId);
    const { project, role } = await requireProjectAccessForUserId(ctx, {
      userId: args.userId,
      projectId,
    });

    return buildApiProjectDetail(ctx, project, role);
  },
});

export const getProjectReferenceForApi = internalQuery({
  args: {
    userId: v.id("users"),
    projectId: v.string(),
  },
  handler: async (ctx, args) => {
    const projectId = await normalizeProjectId(ctx, args.projectId);
    const { project } = await requireProjectAccessForUserId(ctx, {
      userId: args.userId,
      projectId,
    });

    return buildApiProjectReference(project);
  },
});

export const getTaskForApi = internalQuery({
  args: {
    userId: v.id("users"),
    taskId: v.string(),
  },
  handler: async (ctx, args) => {
    const taskId = await normalizeTaskId(ctx, args.taskId);
    const { task } = await requireTaskAccessForUserId(ctx, {
      userId: args.userId,
      taskId: taskId as Id<"tasks">,
    });

    return buildApiTaskDetail(ctx, task);
  },
});
