import { v } from "convex/values";
import type { Id } from "../../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../../_generated/server";
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
} from "../../../_helpers";
import { buildProject, buildProjectWithAccess, recomputeProjectState } from "../../../domain/projects/readModel";
import { buildProjectSearchText, createProjectForUser } from "../domain/projectService";
import { deleteProjectWithDependents } from "../domain/delete";
import { now } from "../../../helpers/time";
import {
  createProjectArgsValidator,
  phaseInputValidator,
  projectStatusValidator,
} from "../../../models/projects/validators";
import { attachTrackedR2Asset, deleteOldR2Asset, resolveAssetUrl } from "../../../r2";

export const getByIdArgs = {
  projectId: v.id("projects"),
};

export async function getByIdHandler(
  ctx: QueryCtx,
  args: { projectId: Id<"projects"> },
) {
  const { project, role } = await requireProjectAccess(ctx, args.projectId);
  return buildProjectWithAccess(ctx, project, role);
}

export const getDockProjectsArgs = {};

export async function getDockProjectsHandler(ctx: QueryCtx) {
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
}

export const countArgs = {};

export async function countHandler(ctx: QueryCtx) {
  const projects = await ctx.db.query("projects").collect();
  return projects.length;
}

export { createProjectArgsValidator };

export async function createHandler(
  ctx: MutationCtx,
  args: {
    name: string;
    clientName: string;
    clientEmail?: string;
    clientAvatarUrl?: string;
    projectImageUrl?: string;
    startMarkerImageUrl?: string;
    endMarkerImageUrl?: string;
    type: "branding" | "web-design" | "product-design" | "app-design" | "web-app" | "packaging" | "motion-design" | "illustration" | "other";
    typeOtherLabel?: string;
    method: "ai" | "manual";
    startDate: number;
    endDate: number;
    phases?: Array<{ name: string; tasks?: string[] }>;
  },
) {
  const user = await requireAuthUser(ctx);
  return createProjectForUser(ctx, {
    userId: user._id,
    ...args,
  });
}

export const updateArgs = {
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
  enabledSteps: v.optional(v.array(v.string())),
};

export async function updateHandler(
  ctx: MutationCtx,
  args: {
    projectId: Id<"projects">;
    name?: string;
    clientName?: string;
    clientEmail?: string | null;
    clientAvatarUrl?: string | null;
    projectImageUrl?: string | null;
    startMarkerImageUrl?: string | null;
    endMarkerImageUrl?: string | null;
    startDate?: number;
    endDate?: number;
    status?: "active" | "paused" | "completed";
    enabledSteps?: string[];
  },
) {
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

  const patch: Record<string, unknown> = { updatedAt: timestamp };
  const changed = (key: string, next: unknown, prev: unknown) => {
    if (next !== prev) {
      patch[key] = next;
      return true;
    }
    return false;
  };

  if (nextName !== undefined) changed("name", nextName, project.name);
  if (nextClientName !== undefined) changed("clientName", nextClientName, project.clientName);
  if (nextName !== undefined || nextClientName !== undefined) {
    changed(
      "searchText",
      buildProjectSearchText(nextName ?? project.name, nextClientName ?? project.clientName),
      project.searchText,
    );
  }
  if (clientEmailArg.provided) changed("clientEmail", clientEmailArg.value, project.clientEmail);
  changed("clientAvatarUrl", resolvedClientAvatarUrl, project.clientAvatarUrl);
  if (projectImage.provided) {
    changed("projectImageUrl", projectImage.value, project.projectImageUrl);
    changed("startMarkerImageUrl", undefined, project.startMarkerImageUrl);
    changed("endMarkerImageUrl", undefined, project.endMarkerImageUrl);
  }
  if (startMarker.provided) changed("startMarkerImageUrl", startMarker.value, project.startMarkerImageUrl);
  if (endMarker.provided) changed("endMarkerImageUrl", endMarker.value, project.endMarkerImageUrl);
  changed("startDate", nextStartDate, project.startDate);
  changed("endDate", nextEndDate, project.endDate);
  if (args.status !== undefined) changed("status", args.status, project.status);
  if (args.enabledSteps !== undefined) {
    // Normalize: de-dupe, drop blanks. "overview" is always enabled, so it is never stored.
    const nextSteps = Array.from(
      new Set(args.enabledSteps.map((step) => step.trim()).filter((step) => step && step !== "overview")),
    );
    patch.enabledSteps = nextSteps;
  }

  if (Object.keys(patch).length > 1) {
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
}

export const syncPhasesArgs = {
  projectId: v.id("projects"),
  phases: v.array(phaseInputValidator),
  deleteTasksInRemovedPhases: v.optional(v.boolean()),
};

export async function syncPhasesHandler(
  ctx: MutationCtx,
  args: {
    projectId: Id<"projects">;
    phases: Array<{ id?: Id<"phases">; name: string }>;
    deleteTasksInRemovedPhases?: boolean;
  },
) {
  await requireProjectAccess(ctx, args.projectId);

  const normalizedPhases = args.phases.map((phase, index) => ({
    id: phase.id,
    name: phase.name.trim() || `Phase ${index + 1}`,
    order: index,
  }));

  if (normalizedPhases.length === 0) {
    throw new Error("At least one phase is required.");
  }

  const existingPhases = await ctx.db
    .query("phases")
    .withIndex("by_project_order", (q) => q.eq("projectId", args.projectId))
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

    if (tasks.length > 0 && !args.deleteTasksInRemovedPhases) {
      throw new Error(`Cannot remove phase "${existingPhase.name}" while it still has tasks.`);
    }

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
      projectId: args.projectId,
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

  await recomputeProjectState(ctx, args.projectId);

  const updatedProject = await ctx.db.get(args.projectId);
  if (!updatedProject) {
    throw new Error("Project not found.");
  }

  return buildProject(ctx, updatedProject);
}

export const deleteByIdArgs = {
  projectId: v.id("projects"),
};

export async function deleteByIdHandler(
  ctx: MutationCtx,
  args: { projectId: Id<"projects"> },
) {
  const { project } = await requireProjectOwner(ctx, args.projectId);
  await deleteProjectWithDependents(ctx, project);
}
