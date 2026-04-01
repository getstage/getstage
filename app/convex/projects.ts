import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  deleteClientAvatarIfUnused,
  deleteClientIfUnused,
  deleteProjectMarkerImageIfUnused,
  getClientByUserAndName,
  requireAuthUser,
  requireProjectAccess,
  requireProjectOwner,
  syncClientAvatarAcrossProjects,
  upsertClient,
} from "./_helpers";
import {
  buildProject,
  buildProjectWithAccess,
  recomputeProjectState,
} from "./domain/projects/readModel";
import {
  createProjectArgsValidator,
  createProjectForUser,
  phaseInputValidator,
} from "./domain/projects/service";
import { attachTrackedR2Asset, deleteOldR2Asset, resolveAssetUrl } from "./r2";
import { deleteGeneratedDesignsForProject } from "./integrations/stitch";

function now() {
  return Date.now();
}

const projectStatusValidator = v.union(
  v.literal("active"),
  v.literal("paused"),
  v.literal("completed"),
);

export const getById = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, { projectId }) => {
    const { project, role } = await requireProjectAccess(ctx, projectId);
    return buildProjectWithAccess(ctx, project, role);
  },
});

export const getDockProjects = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuthUser(ctx);
    const timestamp = now();
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const activeProjects = projects
      .filter((project) => project.status === "active" && project.endDate > timestamp)
      .sort((a, b) => a.startDate - b.startDate || a.endDate - b.endDate)
      .slice(0, 6);

    return Promise.all(
      activeProjects.map(async (project) => {
        const clientAvatarUrl = await resolveAssetUrl(project.clientAvatarUrl ?? null);
        const projectImageUrl = await resolveAssetUrl(project.projectImageUrl ?? null);
        const startMarkerImageUrl = await resolveAssetUrl(project.startMarkerImageUrl ?? null);
        const endMarkerImageUrl = await resolveAssetUrl(project.endMarkerImageUrl ?? null);

        return {
          id: String(project._id),
          name: project.name,
          clientName: project.clientName,
          clientAvatarUrl: clientAvatarUrl ?? undefined,
          projectImageUrl:
            projectImageUrl ??
            endMarkerImageUrl ??
            startMarkerImageUrl ??
            clientAvatarUrl ??
            undefined,
        };
      }),
    );
  },
});

export const count = query({
  args: {},
  handler: async (ctx) => {
    const projects = await ctx.db.query("projects").collect();
    return projects.length;
  },
});

export const create = mutation({
  args: createProjectArgsValidator,
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);
    return createProjectForUser(ctx, {
      userId: user._id,
      ...args,
    });
  },
});

export const update = mutation({
  args: {
    projectId: v.id("projects"),
    name: v.optional(v.string()),
    clientName: v.optional(v.string()),
    clientEmail: v.optional(v.union(v.string(), v.null())),
    clientAvatarUrl: v.optional(v.union(v.string(), v.null())),
    projectImageUrl: v.optional(v.union(v.string(), v.null())),
    startMarkerImageUrl: v.optional(v.union(v.string(), v.null())),
    endMarkerImageUrl: v.optional(v.union(v.string(), v.null())),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    status: v.optional(projectStatusValidator),
  },
  handler: async (ctx, args) => {
    const { project } = await requireProjectAccess(ctx, args.projectId);
    const has = (key: string) => Object.prototype.hasOwnProperty.call(args, key);

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

    // Resolve nullable image args (only when explicitly provided)
    const resolve = (key: string) => {
      if (!has(key)) return { provided: false, value: undefined };
      const raw = (args as Record<string, unknown>)[key];
      const value = typeof raw === "string" ? raw.trim() || undefined : undefined;
      return { provided: true, value };
    };

    const clientEmailArg = resolve("clientEmail");
    const clientAvatar = resolve("clientAvatarUrl");
    const projectImage = resolve("projectImageUrl");
    const startMarker = resolve("startMarkerImageUrl");
    const endMarker = resolve("endMarkerImageUrl");

    // When client name changes, inherit existing client's avatar unless explicitly overridden
    const timestamp = now();
    const finalClientName = nextClientName ?? project.clientName;
    const existingTargetClient =
      nextClientName !== undefined
        ? await getClientByUserAndName(ctx, { userId: project.userId, name: finalClientName })
        : undefined;
    const resolvedClientAvatarUrl = clientAvatar.provided
      ? clientAvatar.value
      : nextClientName !== undefined && existingTargetClient?.avatarUrl !== undefined
        ? existingTargetClient.avatarUrl
        : project.clientAvatarUrl;

    // Build patch — only include fields that actually changed
    const patch: Record<string, unknown> = { updatedAt: timestamp };
    const changed = (key: string, next: unknown, prev: unknown) => {
      if (next !== prev) { patch[key] = next; return true; }
      return false;
    };

    if (nextName !== undefined) changed("name", nextName, project.name);
    if (nextClientName !== undefined) changed("clientName", nextClientName, project.clientName);
    if (clientEmailArg.provided) changed("clientEmail", clientEmailArg.value, project.clientEmail);
    changed("clientAvatarUrl", resolvedClientAvatarUrl, project.clientAvatarUrl);
    if (projectImage.provided) {
      changed("projectImageUrl", projectImage.value, project.projectImageUrl);
      // Auto-clear legacy marker fields to prevent ghost data in R2
      changed("startMarkerImageUrl", undefined, project.startMarkerImageUrl);
      changed("endMarkerImageUrl", undefined, project.endMarkerImageUrl);
    }
    if (startMarker.provided) changed("startMarkerImageUrl", startMarker.value, project.startMarkerImageUrl);
    if (endMarker.provided) changed("endMarkerImageUrl", endMarker.value, project.endMarkerImageUrl);
    changed("startDate", nextStartDate, project.startDate);
    changed("endDate", nextEndDate, project.endDate);
    if (args.status !== undefined) changed("status", args.status, project.status);

    const hasChanges = Object.keys(patch).length > 1; // more than just updatedAt
    if (hasChanges) {
      await ctx.db.patch(args.projectId, patch);
    }

    await Promise.all([
      attachTrackedR2Asset(ctx, { key: resolvedClientAvatarUrl }),
      attachTrackedR2Asset(ctx, {
        key: projectImage.provided ? projectImage.value : project.projectImageUrl,
      }),
      attachTrackedR2Asset(ctx, {
        key: startMarker.provided ? startMarker.value : project.startMarkerImageUrl,
      }),
      attachTrackedR2Asset(ctx, {
        key: endMarker.provided ? endMarker.value : project.endMarkerImageUrl,
      }),
    ]);

    // --- Client sync & cleanup ---
    if (nextClientName !== undefined || clientAvatar.provided || clientEmailArg.provided) {
      await upsertClient(ctx, {
        userId: project.userId,
        name: finalClientName,
        ...(clientEmailArg.provided ? { email: clientEmailArg.value ?? null } : {}),
        avatarUrl: resolvedClientAvatarUrl ?? null,
      });
    }

    if (clientAvatar.provided) {
      const previousAvatarUrls = await syncClientAvatarAcrossProjects(ctx, {
        userId: project.userId,
        clientName: finalClientName,
        avatarUrl: resolvedClientAvatarUrl ?? null,
      });
      await Promise.all(
        previousAvatarUrls.map((url) =>
          deleteClientAvatarIfUnused(ctx, { userId: project.userId, avatarUrl: url }),
        ),
      );
    }

    if (nextClientName !== undefined && nextClientName !== project.clientName) {
      await deleteClientIfUnused(ctx, { userId: project.userId, name: project.clientName });
    }
    if (resolvedClientAvatarUrl !== project.clientAvatarUrl) {
      await deleteClientAvatarIfUnused(ctx, { userId: project.userId, avatarUrl: project.clientAvatarUrl });
    }

    // --- Image asset cleanup ---
    // When projectImageUrl is explicitly provided, legacy fields were auto-cleared above,
    // so mark them as needing R2 cleanup too
    const imageCleanups = [
      { provided: projectImage.provided, next: projectImage.value, prev: project.projectImageUrl },
      {
        provided: startMarker.provided || projectImage.provided,
        next: startMarker.provided ? startMarker.value : undefined,
        prev: project.startMarkerImageUrl,
      },
      {
        provided: endMarker.provided || projectImage.provided,
        next: endMarker.provided ? endMarker.value : undefined,
        prev: project.endMarkerImageUrl,
      },
    ];
    await Promise.all(
      imageCleanups
        .filter((img) => img.provided && img.next !== img.prev)
        .map((img) =>
          deleteProjectMarkerImageIfUnused(ctx, { userId: project.userId, imageUrl: img.prev }),
        ),
    );

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
    await requireProjectAccess(ctx, projectId);

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
          if (attachment.r2ObjectKey) {
            await deleteOldR2Asset(ctx, attachment.r2ObjectKey);
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

    const financeEntries = await ctx.db
      .query("financeEntries")
      .withIndex("by_user", (q) => q.eq("userId", project.userId))
      .collect();

    for (const financeEntry of financeEntries) {
      if (financeEntry.projectId === projectId) {
        await ctx.db.patch(financeEntry._id, {
          projectId: undefined,
          updatedAt: now(),
        });
      }
    }

    await deleteGeneratedDesignsForProject(ctx, projectId);

    await ctx.db.delete(project._id);

    await deleteClientIfUnused(ctx, {
      userId: project.userId,
      name: project.clientName,
    });

    await deleteClientAvatarIfUnused(ctx, {
      userId: project.userId,
      avatarUrl: project.clientAvatarUrl,
    });

    await deleteProjectMarkerImageIfUnused(ctx, {
      userId: project.userId,
      imageUrl: project.projectImageUrl,
    });

    await deleteProjectMarkerImageIfUnused(ctx, {
      userId: project.userId,
      imageUrl: project.startMarkerImageUrl,
    });

    await deleteProjectMarkerImageIfUnused(ctx, {
      userId: project.userId,
      imageUrl: project.endMarkerImageUrl,
    });
  },
});
