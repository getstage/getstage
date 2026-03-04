import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  buildProject,
  ensurePortalConfig,
  recomputeProjectState,
  requireAuthUser,
  requireProjectOwner,
  upsertClient,
} from "./_helpers";

function now() {
  return Date.now();
}

const projectStatusValidator = v.union(
  v.literal("active"),
  v.literal("paused"),
  v.literal("completed"),
);

const phaseInputValidator = v.object({
  id: v.optional(v.id("phases")),
  name: v.string(),
});

export const getById = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, { projectId }) => {
    const { project } = await requireProjectOwner(ctx, projectId);
    return buildProject(ctx, project);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    clientName: v.string(),
    clientAvatarUrl: v.optional(v.string()),
    type: v.union(
      v.literal("branding"),
      v.literal("web-design"),
      v.literal("product-design"),
      v.literal("app-design"),
      v.literal("packaging"),
      v.literal("motion-design"),
      v.literal("illustration"),
      v.literal("other"),
    ),
    method: v.union(v.literal("ai"), v.literal("manual")),
    startDate: v.number(),
    endDate: v.number(),
    phases: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);

    await upsertClient(ctx, {
      userId: user._id,
      name: args.clientName.trim(),
      avatarUrl: args.clientAvatarUrl,
    });

    const timestamp = now();
    const projectId = await ctx.db.insert("projects", {
      userId: user._id,
      name: args.name.trim(),
      clientName: args.clientName.trim(),
      clientAvatarUrl: args.clientAvatarUrl,
      type: args.type,
      status: "active",
      startDate: args.startDate,
      endDate: args.endDate,
      progress: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    const phaseNames =
      args.phases?.map((phase) => phase.trim()).filter((phase) => phase.length > 0) ?? [];

    const normalizedPhaseNames = phaseNames.length > 0 ? phaseNames : ["Planning"];

    await Promise.all(
      normalizedPhaseNames.map((phaseName, index) =>
        ctx.db.insert("phases", {
          projectId,
          name: phaseName,
          order: index,
          status: index === 0 ? "active" : "upcoming",
          progress: 0,
          createdAt: timestamp,
          updatedAt: timestamp,
        }),
      ),
    );

    await ensurePortalConfig(ctx, projectId);
    await recomputeProjectState(ctx, projectId);

    const project = await ctx.db.get(projectId);
    if (!project) {
      throw new Error("Failed to create project.");
    }

    return buildProject(ctx, project);
  },
});

export const update = mutation({
  args: {
    projectId: v.id("projects"),
    name: v.optional(v.string()),
    clientName: v.optional(v.string()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    status: v.optional(projectStatusValidator),
  },
  handler: async (ctx, args) => {
    const { project } = await requireProjectOwner(ctx, args.projectId);

    const nextName = args.name?.trim();
    const nextClientName = args.clientName?.trim();
    const nextStartDate = args.startDate ?? project.startDate;
    const nextEndDate = args.endDate ?? project.endDate;

    if (nextName !== undefined && nextName.length === 0) {
      throw new Error("Project name is required.");
    }

    if (nextClientName !== undefined && nextClientName.length === 0) {
      throw new Error("Client name is required.");
    }

    if (nextEndDate < nextStartDate) {
      throw new Error("End date must be after the start date.");
    }

    const timestamp = now();
    const patch: {
      name?: string;
      clientName?: string;
      startDate?: number;
      endDate?: number;
      status?: "active" | "paused" | "completed";
      updatedAt: number;
    } = {
      updatedAt: timestamp,
    };
    let hasChanges = false;

    if (nextName !== undefined && nextName !== project.name) {
      patch.name = nextName;
      hasChanges = true;
    }

    if (nextClientName !== undefined && nextClientName !== project.clientName) {
      patch.clientName = nextClientName;
      hasChanges = true;
      await upsertClient(ctx, {
        userId: project.userId,
        name: nextClientName,
        avatarUrl: project.clientAvatarUrl,
      });
    }

    if (nextStartDate !== project.startDate) {
      patch.startDate = nextStartDate;
      hasChanges = true;
    }

    if (nextEndDate !== project.endDate) {
      patch.endDate = nextEndDate;
      hasChanges = true;
    }

    if (args.status !== undefined && args.status !== project.status) {
      patch.status = args.status;
      hasChanges = true;
    }

    if (hasChanges) {
      await ctx.db.patch(args.projectId, patch);
    }

    const updatedProject = await ctx.db.get(args.projectId);
    if (!updatedProject) {
      throw new Error("Project not found.");
    }

    return buildProject(ctx, updatedProject);
  },
});

export const syncPhases = mutation({
  args: {
    projectId: v.id("projects"),
    phases: v.array(phaseInputValidator),
  },
  handler: async (ctx, { projectId, phases }) => {
    await requireProjectOwner(ctx, projectId);

    const normalizedPhases = phases.map((phase, index) => ({
      id: phase.id,
      name: phase.name.trim() || `Phase ${index + 1}`,
      order: index,
    }));

    if (normalizedPhases.length === 0) {
      throw new Error("At least one phase is required.");
    }

    const existingPhases = await ctx.db
      .query("phases")
      .withIndex("by_project_order", (q) => q.eq("projectId", projectId))
      .collect();

    const existingPhaseById = new Map(existingPhases.map((phase) => [phase._id, phase]));
    const incomingIds = new Set(
      normalizedPhases.flatMap((phase) => (phase.id ? [phase.id] : [])),
    );

    for (const phase of normalizedPhases) {
      if (phase.id && !existingPhaseById.has(phase.id)) {
        throw new Error("One of the phases no longer exists.");
      }
    }

    for (const existingPhase of existingPhases) {
      if (incomingIds.has(existingPhase._id)) {
        continue;
      }

      const tasks = await ctx.db
        .query("tasks")
        .withIndex("by_phase", (q) => q.eq("phaseId", existingPhase._id))
        .collect();

      if (tasks.length > 0) {
        throw new Error(`Cannot remove phase "${existingPhase.name}" while it still has tasks.`);
      }
    }

    const timestamp = now();

    for (const phase of normalizedPhases) {
      if (phase.id) {
        const existingPhase = existingPhaseById.get(phase.id);
        if (
          existingPhase &&
          (existingPhase.name !== phase.name || existingPhase.order !== phase.order)
        ) {
          await ctx.db.patch(phase.id, {
            name: phase.name,
            order: phase.order,
            updatedAt: timestamp,
          });
        }
        continue;
      }

      await ctx.db.insert("phases", {
        projectId,
        name: phase.name,
        order: phase.order,
        status: "upcoming",
        progress: 0,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    }

    for (const existingPhase of existingPhases) {
      if (!incomingIds.has(existingPhase._id)) {
        await ctx.db.delete(existingPhase._id);
      }
    }

    await recomputeProjectState(ctx, projectId);

    const updatedProject = await ctx.db.get(projectId);
    if (!updatedProject) {
      throw new Error("Project not found.");
    }

    return buildProject(ctx, updatedProject);
  },
});

export const deleteById = mutation({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, { projectId }) => {
    const { project } = await requireProjectOwner(ctx, projectId);

    const phases = await ctx.db
      .query("phases")
      .withIndex("by_project", (q) => q.eq("projectId", projectId))
      .collect();

    for (const phase of phases) {
      const tasks = await ctx.db
        .query("tasks")
        .withIndex("by_phase", (q) => q.eq("phaseId", phase._id))
        .collect();

      for (const task of tasks) {
        const attachments = await ctx.db
          .query("attachments")
          .withIndex("by_task", (q) => q.eq("taskId", task._id))
          .collect();

        for (const attachment of attachments) {
          if (attachment.storageId) {
            await ctx.storage.delete(attachment.storageId);
          }
          await ctx.db.delete(attachment._id);
        }

        await ctx.db.delete(task._id);
      }

      await ctx.db.delete(phase._id);
    }

    const portalConfig = await ctx.db
      .query("portalConfigs")
      .withIndex("by_project", (q) => q.eq("projectId", projectId))
      .unique();

    if (portalConfig) {
      await ctx.db.delete(portalConfig._id);
    }

    await ctx.db.delete(project._id);
  },
});
