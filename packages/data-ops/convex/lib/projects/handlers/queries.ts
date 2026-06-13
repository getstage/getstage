import { v } from "convex/values";
import { internalQuery } from "../../../_generated/server";
import {
  buildApiPhaseSummary,
  buildApiTaskSummary,
} from "../../../domain/projects/apiReadModel";
import {
  listProjectSummariesForUser,
  requirePhaseAccessForUserId,
  requireProjectAccessForUserId,
} from "../domain/projectService";
import { normalizePhaseId, normalizeProjectId } from "./access";

const DEFAULT_USER_TASKS_LIMIT = 100;
const MAX_USER_TASKS_LIMIT = 200;

export const listProjectsForApi = internalQuery({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => listProjectSummariesForUser(ctx, args.userId),
});

export const listPhasesForApi = internalQuery({
  args: {
    userId: v.id("users"),
    projectId: v.string(),
  },
  handler: async (ctx, args) => {
    const projectId = await normalizeProjectId(ctx, args.projectId);
    await requireProjectAccessForUserId(ctx, {
      userId: args.userId,
      projectId,
    });
    const phases = await ctx.db
      .query("phases")
      .withIndex("by_project_order", (q) => q.eq("projectId", projectId))
      .collect();

    return Promise.all(phases.map((phase) => buildApiPhaseSummary(ctx, phase)));
  },
});

export const listTasksForApi = internalQuery({
  args: {
    userId: v.id("users"),
    phaseId: v.string(),
  },
  handler: async (ctx, args) => {
    const phaseId = await normalizePhaseId(ctx, args.phaseId);
    const { phase } = await requirePhaseAccessForUserId(ctx, {
      userId: args.userId,
      phaseId,
    });

    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_phase_order", (q) => q.eq("phaseId", phase._id))
      .collect();

    return Promise.all(tasks.map((task) => buildApiTaskSummary(ctx, task)));
  },
});

/**
 * Tasks across all of a user's owned projects, sorted by `updatedAt` desc.
 *
 * Scope is intentionally "owned" only for v1. Collaborator-shared projects
 * are out of scope here until the desktop UX surfaces team tasks separately.
 *
 * Implementation walks projects -> phases -> tasks. This is fine while the
 * per-user task count is bounded; if it gets slow we can add a denormalised
 * `tasks.by_user` index later.
 */
export const listUserTasksForApi = internalQuery({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.max(
      1,
      Math.min(args.limit ?? DEFAULT_USER_TASKS_LIMIT, MAX_USER_TASKS_LIMIT),
    );

    const projects = await ctx.db
      .query("projects")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const phases = (
      await Promise.all(
        projects.map((project) =>
          ctx.db
            .query("phases")
            .withIndex("by_project", (q) => q.eq("projectId", project._id))
            .collect(),
        ),
      )
    ).flat();

    const tasks = (
      await Promise.all(
        phases.map((phase) =>
          ctx.db
            .query("tasks")
            .withIndex("by_phase", (q) => q.eq("phaseId", phase._id))
            .collect(),
        ),
      )
    ).flat();

    const ordered = [...tasks]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, limit);

    return Promise.all(ordered.map((task) => buildApiTaskSummary(ctx, task)));
  },
});
