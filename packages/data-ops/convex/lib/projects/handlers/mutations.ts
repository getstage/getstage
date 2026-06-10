import { v } from "convex/values";
import { internalMutation } from "../../../_generated/server";
import {
  buildApiPhaseSummary,
  buildApiTaskSummary,
} from "../../../domain/projects/apiReadModel";
import { recomputeProjectState } from "../../../domain/projects/readModel";
import { createProjectArgsValidator } from "../../../models/projects/validators";
import {
  addPhaseForUser,
  addTaskForUser,
  createProjectForUser,
  deleteTaskForUser,
  requireProjectAccessForUserId,
  setTaskPriorityForUser,
  toggleTaskForUser,
} from "../domain/projectService";
import { normalizePhaseId, normalizeProjectId, normalizeTaskId } from "./access";

export const createProjectForApi = internalMutation({
  args: {
    userId: v.id("users"),
    ...createProjectArgsValidator,
  },
  handler: async (ctx, args) => createProjectForUser(ctx, args),
});

export const addPhaseForApi = internalMutation({
  args: {
    userId: v.id("users"),
    projectId: v.string(),
    name: v.string(),
    tasks: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const projectId = await normalizeProjectId(ctx, args.projectId);
    const createdPhase = await addPhaseForUser(ctx, {
      userId: args.userId,
      projectId,
      name: args.name,
      tasks: args.tasks,
    });

    const phaseId = await normalizePhaseId(ctx, createdPhase.id);
    const phase = await ctx.db.get(phaseId);
    if (!phase) {
      throw new Error("Failed to load phase.");
    }

    return buildApiPhaseSummary(ctx, phase);
  },
});

export const addTaskForApi = internalMutation({
  args: {
    userId: v.id("users"),
    phaseId: v.string(),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const phaseId = await normalizePhaseId(ctx, args.phaseId);
    const createdTask = await addTaskForUser(ctx, {
      userId: args.userId,
      phaseId,
      title: args.title,
    });

    const taskId = await normalizeTaskId(ctx, createdTask.id);
    const task = await ctx.db.get(taskId);
    if (!task) {
      throw new Error("Failed to load task.");
    }

    return buildApiTaskSummary(ctx, task);
  },
});

/**
 * Create a task scoped to a project (no need to know phase IDs from the
 * desktop). Picks the active phase, falling back to the lowest-order phase.
 * Returns the created task summary so the caller can update its cache
 * without an extra round-trip.
 */
export const createProjectTaskForApi = internalMutation({
  args: {
    userId: v.id("users"),
    projectId: v.string(),
    title: v.string(),
    priority: v.optional(
      v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    ),
    content: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const projectId = await normalizeProjectId(ctx, args.projectId);
    await requireProjectAccessForUserId(ctx, {
      userId: args.userId,
      projectId,
    });

    const trimmedTitle = args.title.trim();
    if (!trimmedTitle) {
      throw new Error("Task title is required.");
    }

    const phases = await ctx.db
      .query("phases")
      .withIndex("by_project_order", (q) => q.eq("projectId", projectId))
      .collect();

    if (phases.length === 0) {
      throw new Error("Project has no phases yet; create a phase first.");
    }

    const targetPhase =
      phases.find((phase) => phase.status === "active") ??
      [...phases].sort((a, b) => a.order - b.order)[0]!;

    const existing = await ctx.db
      .query("tasks")
      .withIndex("by_phase_order", (q) => q.eq("phaseId", targetPhase._id))
      .collect();

    const timestamp = Date.now();
    const taskId = await ctx.db.insert("tasks", {
      phaseId: targetPhase._id,
      title: trimmedTitle,
      isCompleted: false,
      content: args.content?.trim() || "",
      priority: args.priority,
      order: existing.length,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    await recomputeProjectState(ctx, projectId);

    const task = await ctx.db.get(taskId);
    if (!task) {
      throw new Error("Failed to load created task.");
    }
    return buildApiTaskSummary(ctx, task);
  },
});

export const setTaskPriorityForApi = internalMutation({
  args: {
    userId: v.id("users"),
    taskId: v.string(),
    priority: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.null(),
    ),
  },
  handler: async (ctx, args) => {
    const taskId = await normalizeTaskId(ctx, args.taskId);
    const updated = await setTaskPriorityForUser(ctx, {
      userId: args.userId,
      taskId,
      priority: args.priority,
    });
    return buildApiTaskSummary(ctx, updated);
  },
});

export const deleteTaskForApi = internalMutation({
  args: {
    userId: v.id("users"),
    taskId: v.string(),
  },
  handler: async (ctx, args) => {
    const taskId = await normalizeTaskId(ctx, args.taskId);
    await deleteTaskForUser(ctx, {
      userId: args.userId,
      taskId,
    });
    return { ok: true as const };
  },
});

export const toggleTaskForApi = internalMutation({
  args: {
    userId: v.id("users"),
    taskId: v.string(),
  },
  handler: async (ctx, args) => {
    const taskId = await normalizeTaskId(ctx, args.taskId);
    const updatedTask = await toggleTaskForUser(ctx, {
      userId: args.userId,
      taskId,
    });

    const normalizedTaskId = await normalizeTaskId(ctx, updatedTask.id);
    const task = await ctx.db.get(normalizedTaskId);
    if (!task) {
      throw new Error("Failed to load task.");
    }

    return buildApiTaskSummary(ctx, task);
  },
});
