import { getAuthUserId } from "@convex-dev/auth/server";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { deleteOldR2Asset, r2, resolveAssetUrl } from "./r2";

function getEnv(name: string) {
  return (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.[
    name
  ];
}

const PORTAL_BASE_URL = getEnv("SITE_URL") ?? "https://getstage.co";

type ReaderCtx = QueryCtx | MutationCtx;

function now() {
  return Date.now();
}

function sanitizeNameFromEmail(email: string) {
  const [localPart] = email.split("@");
  if (!localPart) return "Stage User";

  return localPart
    .split(/[._-]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function generateShareToken() {
  return `share_${Math.random().toString(36).slice(2, 12)}`;
}

// --- Auth helpers ---

export async function getAuthUser(ctx: ReaderCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) return null;
  return ctx.db.get(userId);
}

export async function requireAuthUser(ctx: ReaderCtx) {
  const user = await getAuthUser(ctx);
  if (!user) throw new Error("Not authenticated");
  return user;
}

export async function requireProjectOwner(
  ctx: ReaderCtx,
  projectId: Id<"projects">,
) {
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

export async function requirePhaseOwner(
  ctx: ReaderCtx,
  phaseId: Id<"phases">,
) {
  const phase = await ctx.db.get(phaseId);
  if (!phase) {
    throw new Error("Phase not found.");
  }

  const { user, project } = await requireProjectOwner(ctx, phase.projectId);
  return { user, project, phase };
}

export async function requireTaskOwner(
  ctx: ReaderCtx,
  taskId: Id<"tasks">,
) {
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

// --- Legacy helpers (kept for backward compat during migration) ---

export async function getUserByEmail(ctx: ReaderCtx, email: string) {
  return ctx.db
    .query("users")
    .withIndex("email", (q) => q.eq("email", email))
    .unique();
}

export async function ensureUserByEmail(
  ctx: MutationCtx,
  args: { email: string; name?: string },
) {
  const existing = await getUserByEmail(ctx, args.email);
  if (existing) {
    return existing;
  }

  const timestamp = now();
  const userId = await ctx.db.insert("users", {
    email: args.email,
    name: args.name?.trim() || sanitizeNameFromEmail(args.email),
    role: "freelancer",
    plan: "free",
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  const created = await ctx.db.get(userId);
  if (!created) {
    throw new Error("Failed to create user.");
  }

  return created;
}

export async function upsertClient(
  ctx: MutationCtx,
  args: {
    userId: Id<"users">;
    name: string;
    avatarUrl?: string;
  },
) {
  const existing = await ctx.db
    .query("clients")
    .withIndex("by_user_name", (q) => q.eq("userId", args.userId).eq("name", args.name))
    .unique();

  const timestamp = now();

  if (existing) {
    const nextAvatarUrl = args.avatarUrl ?? existing.avatarUrl;
    if (nextAvatarUrl !== existing.avatarUrl) {
      await ctx.db.patch(existing._id, {
        avatarUrl: nextAvatarUrl,
        updatedAt: timestamp,
      });
    }
    return existing._id;
  }

  return ctx.db.insert("clients", {
    userId: args.userId,
    name: args.name,
    avatarUrl: args.avatarUrl,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}

function normalizeClientKey(value: string) {
  return value.trim().toLowerCase();
}

export async function getClientByUserAndName(
  ctx: ReaderCtx,
  args: {
    userId: Id<"users">;
    name: string;
  },
) {
  return ctx.db
    .query("clients")
    .withIndex("by_user_name", (q) => q.eq("userId", args.userId).eq("name", args.name))
    .unique();
}

export async function syncClientAvatarAcrossProjects(
  ctx: MutationCtx,
  args: {
    userId: Id<"users">;
    clientName: string;
    avatarUrl: string;
  },
) {
  const targetKey = normalizeClientKey(args.clientName);
  const projects = await ctx.db
    .query("projects")
    .withIndex("by_user", (q) => q.eq("userId", args.userId))
    .collect();

  const matchingProjects = projects.filter(
    (project) =>
      normalizeClientKey(project.clientName) === targetKey &&
      project.clientAvatarUrl !== args.avatarUrl,
  );

  if (matchingProjects.length === 0) {
    return [] as string[];
  }

  const previousAvatarUrls = Array.from(
    new Set(
      matchingProjects
        .map((project) => project.clientAvatarUrl)
        .filter((value): value is string => Boolean(value)),
    ),
  );
  const timestamp = now();

  await Promise.all(
    matchingProjects.map((project) =>
      ctx.db.patch(project._id, {
        clientAvatarUrl: args.avatarUrl,
        updatedAt: timestamp,
      }),
    ),
  );

  return previousAvatarUrls;
}

export async function deleteClientAvatarIfUnused(
  ctx: MutationCtx,
  args: {
    userId: Id<"users">;
    avatarUrl: string | null | undefined;
  },
) {
  if (!args.avatarUrl) {
    return;
  }

  const projects = await ctx.db
    .query("projects")
    .withIndex("by_user", (q) => q.eq("userId", args.userId))
    .collect();
  const stillReferencedByProject = projects.some(
    (project) => project.clientAvatarUrl === args.avatarUrl,
  );
  if (stillReferencedByProject) {
    return;
  }

  const clients = await ctx.db
    .query("clients")
    .withIndex("by_user", (q) => q.eq("userId", args.userId))
    .collect();
  const stillReferencedByClient = clients.some((client) => client.avatarUrl === args.avatarUrl);
  if (stillReferencedByClient) {
    return;
  }

  await deleteOldR2Asset(ctx, args.avatarUrl);
}

export async function deleteClientIfUnused(
  ctx: MutationCtx,
  args: {
    userId: Id<"users">;
    name: string;
  },
) {
  const targetKey = normalizeClientKey(args.name);
  if (!targetKey) {
    return 0;
  }

  const projects = await ctx.db
    .query("projects")
    .withIndex("by_user", (q) => q.eq("userId", args.userId))
    .collect();

  const isStillUsed = projects.some((project) => normalizeClientKey(project.clientName) === targetKey);
  if (isStillUsed) {
    return 0;
  }

  const clients = await ctx.db
    .query("clients")
    .withIndex("by_user", (q) => q.eq("userId", args.userId))
    .collect();

  const matchingClients = clients.filter((client) => normalizeClientKey(client.name) === targetKey);
  const deletedAvatarUrls = Array.from(
    new Set(
      matchingClients
        .map((client) => client.avatarUrl)
        .filter((value): value is string => Boolean(value)),
    ),
  );
  for (const client of matchingClients) {
    await ctx.db.delete(client._id);
  }

  await Promise.all(
    deletedAvatarUrls.map((avatarUrl) =>
      deleteClientAvatarIfUnused(ctx, {
        userId: args.userId,
        avatarUrl,
      }),
    ),
  );

  return matchingClients.length;
}

export async function pruneOrphanClientsForUser(
  ctx: MutationCtx,
  userId: Id<"users">,
) {
  const projects = await ctx.db
    .query("projects")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  const clients = await ctx.db
    .query("clients")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();

  const usedClientKeys = new Set(projects.map((project) => normalizeClientKey(project.clientName)));
  const orphanClients = clients.filter((client) => !usedClientKeys.has(normalizeClientKey(client.name)));
  const deletedAvatarUrls = Array.from(
    new Set(
      orphanClients
        .map((client) => client.avatarUrl)
        .filter((value): value is string => Boolean(value)),
    ),
  );

  for (const client of orphanClients) {
    await ctx.db.delete(client._id);
  }

  await Promise.all(
    deletedAvatarUrls.map((avatarUrl) =>
      deleteClientAvatarIfUnused(ctx, {
        userId,
        avatarUrl,
      }),
    ),
  );

  return {
    deletedCount: orphanClients.length,
    deletedNames: orphanClients.map((client) => client.name),
  };
}

export async function getPortalConfigByProjectId(
  ctx: ReaderCtx,
  projectId: Id<"projects">,
) {
  return ctx.db
    .query("portalConfigs")
    .withIndex("by_project", (q) => q.eq("projectId", projectId))
    .unique();
}

export async function ensurePortalConfig(
  ctx: MutationCtx,
  projectId: Id<"projects">,
) {
  const existing = await getPortalConfigByProjectId(ctx, projectId);
  if (existing) {
    return existing;
  }

  const project = await ctx.db.get(projectId);
  if (!project) {
    throw new Error("Project not found.");
  }

  const user = await ctx.db.get(project.userId);

  const shareToken = generateShareToken();
  const timestamp = now();
  const portalConfigId = await ctx.db.insert("portalConfigs", {
    projectId,
    isEnabled: true,
    shareToken,
    shareUrl: `${PORTAL_BASE_URL}/portal/${shareToken}`,
    logoUrl: user?.defaultPortalLogoUrl,
    accentColor: user?.defaultPortalAccentColor ?? "#E8734A",
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  const created = await ctx.db.get(portalConfigId);
  if (!created) {
    throw new Error("Failed to create portal config.");
  }

  return created;
}

export async function getAttachmentsForTask(ctx: ReaderCtx, taskId: Id<"tasks">) {
  const attachments = await ctx.db
    .query("attachments")
    .withIndex("by_task", (q) => q.eq("taskId", taskId))
    .collect();

  return Promise.all(
    attachments.map(async (attachment) => ({
      id: String(attachment._id),
      type: attachment.type,
      url:
        attachment.r2ObjectKey
          ? await r2.getUrl(attachment.r2ObjectKey)
          : attachment.storageId !== undefined
          ? ((await ctx.storage.getUrl(attachment.storageId)) ?? attachment.url)
          : attachment.url,
      fileName: attachment.fileName,
      fileSize: attachment.fileSize,
      mimeType: attachment.mimeType,
    })),
  );
}

export async function getTasksForPhase(ctx: ReaderCtx, phase: Doc<"phases">) {
  const tasks = await ctx.db
    .query("tasks")
    .withIndex("by_phase_order", (q) => q.eq("phaseId", phase._id))
    .collect();

  return Promise.all(
    tasks.map(async (task) => ({
      id: String(task._id),
      phaseId: String(task.phaseId),
      title: task.title,
      isCompleted: task.isCompleted,
      content: task.content,
      attachments: await getAttachmentsForTask(ctx, task._id),
      order: task.order,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    })),
  );
}

export async function getPhasesForProject(ctx: ReaderCtx, project: Doc<"projects">) {
  const phases = await ctx.db
    .query("phases")
    .withIndex("by_project_order", (q) => q.eq("projectId", project._id))
    .collect();

  return Promise.all(
    phases.map(async (phase) => ({
      id: String(phase._id),
      projectId: String(phase.projectId),
      name: phase.name,
      order: phase.order,
      status: phase.status,
      progress: phase.progress,
      tasks: await getTasksForPhase(ctx, phase),
    })),
  );
}

export async function buildProject(ctx: ReaderCtx, project: Doc<"projects">) {
  const portalConfig = await getPortalConfigByProjectId(ctx, project._id);

  return {
    id: String(project._id),
    userId: String(project.userId),
    name: project.name,
    clientName: project.clientName,
    clientAvatarUrl: await resolveAssetUrl(project.clientAvatarUrl ?? null) ?? undefined,
    type: project.type,
    status: project.status,
    startDate: project.startDate,
    endDate: project.endDate,
    progress: project.progress,
    createdAt: project.createdAt,
    shareToken: portalConfig?.shareToken,
    shareUrl: portalConfig?.shareUrl,
    portalEnabled: portalConfig?.isEnabled,
    phases: await getPhasesForProject(ctx, project),
  };
}

export async function listProjectsForUser(ctx: ReaderCtx, userId: Id<"users">) {
  const projectDocs = await ctx.db
    .query("projects")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();

  const sortedProjectDocs = [...projectDocs].sort((a, b) => a.startDate - b.startDate);
  return Promise.all(sortedProjectDocs.map((project) => buildProject(ctx, project)));
}

export async function recomputeProjectState(
  ctx: MutationCtx,
  projectId: Id<"projects">,
) {
  const project = await ctx.db.get(projectId);
  if (!project) {
    throw new Error("Project not found.");
  }

  const phases = await ctx.db
    .query("phases")
    .withIndex("by_project_order", (q) => q.eq("projectId", projectId))
    .collect();

  const timestamp = now();

  const phaseStates = await Promise.all(
    phases.map(async (phase) => {
      const tasks = await ctx.db
        .query("tasks")
        .withIndex("by_phase_order", (q) => q.eq("phaseId", phase._id))
        .collect();

      const total = tasks.length;
      const completed = tasks.filter((task) => task.isCompleted).length;
      const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

      return {
        phase,
        total,
        completed,
        progress,
      };
    }),
  );

  const firstIncompleteIndex = phaseStates.findIndex((phaseState) => phaseState.progress < 100);

  await Promise.all(
    phaseStates.map(async (phaseState, index) => {
      const nextStatus =
        firstIncompleteIndex === -1
          ? "completed"
          : index < firstIncompleteIndex
            ? "completed"
            : index === firstIncompleteIndex
              ? "active"
              : "upcoming";

      if (
        phaseState.phase.progress !== phaseState.progress ||
        phaseState.phase.status !== nextStatus
      ) {
        await ctx.db.patch(phaseState.phase._id, {
          progress: phaseState.progress,
          status: nextStatus,
          updatedAt: timestamp,
        });
      }
    }),
  );

  const totalTasks = phaseStates.reduce((sum, phaseState) => sum + phaseState.total, 0);
  const completedTasks = phaseStates.reduce((sum, phaseState) => sum + phaseState.completed, 0);
  const nextProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const nextStatus =
    phaseStates.length > 0 && phaseStates.every((phaseState) => phaseState.progress === 100)
      ? "completed"
      : project.status === "paused"
        ? "paused"
        : "active";

  if (project.progress !== nextProgress || project.status !== nextStatus) {
    await ctx.db.patch(project._id, {
      progress: nextProgress,
      status: nextStatus,
      updatedAt: timestamp,
    });
  }
}
