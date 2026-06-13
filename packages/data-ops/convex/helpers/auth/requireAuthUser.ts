import { getAuthUserId } from "@convex-dev/auth/server";
import type { Id } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";

type ReaderCtx = QueryCtx | MutationCtx;

export async function getAuthUser(ctx: ReaderCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    return null;
  }

  return ctx.db.get(userId);
}

export async function requireAuthUser(ctx: ReaderCtx) {
  const user = await getAuthUser(ctx);
  if (!user) {
    throw new Error("Not authenticated");
  }
  return user;
}

export async function requireProjectOwner(ctx: ReaderCtx, projectId: Id<"projects">) {
  const user = await requireAuthUser(ctx);
  const project = await ctx.db.get(projectId);

  if (!project) {
    throw new Error("Project not found.");
  }

  if (project.userId !== user._id) {
    throw new Error("Not authorized.");
  }

  return { user, project };
}

export async function requirePhaseOwner(ctx: ReaderCtx, phaseId: Id<"phases">) {
  const phase = await ctx.db.get(phaseId);
  if (!phase) {
    throw new Error("Phase not found.");
  }

  const { user, project } = await requireProjectOwner(ctx, phase.projectId);
  return { user, project, phase };
}

export async function requireTaskOwner(ctx: ReaderCtx, taskId: Id<"tasks">) {
  const task = await ctx.db.get(taskId);
  if (!task) {
    throw new Error("Task not found.");
  }

  const phase = await ctx.db.get(task.phaseId);
  if (!phase) {
    throw new Error("Phase not found.");
  }

  const { user, project } = await requireProjectOwner(ctx, phase.projectId);
  return { user, project, phase, task };
}
