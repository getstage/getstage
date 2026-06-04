import { v } from "convex/values";
import type { Doc, Id } from "../../_generated/dataModel";
import {
  internalMutation,
  internalQuery,
  type MutationCtx,
  type QueryCtx,
} from "../../_generated/server";
import { getCurrentSubscriptionSnapshot } from "../../billing";
import {
  deleteClientAvatarIfUnused,
  ensurePortalConfig,
  getClientByUserAndName,
  syncClientAvatarAcrossProjects,
  upsertClient,
} from "../../_helpers";
import { attachTrackedR2Asset, deleteOldR2Asset } from "../../r2";
import {
  buildApiPhaseSummary,
  buildApiProjectDetail,
  buildApiProjectReference,
  buildApiProjectSummary,
  buildApiTaskDetail,
  buildApiTaskSummary,
} from "./apiReadModel";
import { assertProjectCreationAllowed } from "./entitlement";
import { buildProject, recomputeProjectState } from "./readModel";

type ReaderCtx = QueryCtx | MutationCtx;

const DEFAULT_PROJECT_PHASES = [
  "Discovery",
  "Strategy",
  "Design",
  "Development",
  "Launch",
] as const;
const MIN_PROJECT_PHASE_COUNT = 2;

export const projectTypeValidator = v.union(
  v.literal("branding"),
  v.literal("web-design"),
  v.literal("product-design"),
  v.literal("app-design"),
  v.literal("web-app"),
  v.literal("packaging"),
  v.literal("motion-design"),
  v.literal("illustration"),
  v.literal("other"),
);

export const phaseInputValidator = v.object({
  id: v.optional(v.id("phases")),
  name: v.string(),
});

export const phaseCreationInputValidator = v.object({
  name: v.string(),
  tasks: v.optional(v.array(v.string())),
});

export const createProjectArgsValidator = {
  name: v.string(),
  clientName: v.string(),
  clientEmail: v.optional(v.string()),
  clientAvatarUrl: v.optional(v.string()),
  projectImageUrl: v.optional(v.string()),
  startMarkerImageUrl: v.optional(v.string()),
  endMarkerImageUrl: v.optional(v.string()),
  type: projectTypeValidator,
  method: v.union(v.literal("ai"), v.literal("manual")),
  startDate: v.number(),
  endDate: v.number(),
  phases: v.optional(v.array(phaseCreationInputValidator)),
} as const;

function now() {
  return Date.now();
}

function requireNonEmptyTrimmedString(value: string, field: string) {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new Error(`${field} is required.`);
  }
  return normalized;
}

function normalizePhaseInputs(phases?: Array<{ name: string; tasks?: string[] }>) {
  if (!phases) {
    return [];
  }

  return phases.map((phase, phaseIndex) => {
    const name = requireNonEmptyTrimmedString(phase.name, `Phase ${phaseIndex + 1} name`);
    const tasks =
      phase.tasks?.map((task, taskIndex) =>
        requireNonEmptyTrimmedString(task, `Phase ${phaseIndex + 1} task ${taskIndex + 1}`),
      ) ?? [];

    return { name, tasks };
  });
}

function buildDefaultProjectPhases() {
  return DEFAULT_PROJECT_PHASES.map((name) => ({
    name,
    tasks: [] as string[],
  }));
}

function requireMinimumPhaseCount(
  phases: Array<{ name: string; tasks: string[] }>,
  field = "phases",
) {
  if (phases.length < MIN_PROJECT_PHASE_COUNT) {
    throw new Error(`At least ${MIN_PROJECT_PHASE_COUNT} phases are required for ${field}.`);
  }
}

async function requireActorUser(ctx: ReaderCtx, userId: Id<"users">) {
  const user = await ctx.db.get(userId);
  if (!user) {
    throw new Error("User not found.");
  }
  return user;
}

export async function requireProjectAccessForUserId(
  ctx: ReaderCtx,
  args: {
    userId: Id<"users">;
    projectId: Id<"projects">;
  },
): Promise<{ user: Doc<"users">; project: Doc<"projects">; role: "owner" | "editor" }> {
  const user = await requireActorUser(ctx, args.userId);
  const project = await ctx.db.get(args.projectId);

  if (!project) {
    throw new Error("Project not found.");
  }

  if (project.userId === user._id) {
    return { user, project, role: "owner" };
  }

  const collaborator = await ctx.db
    .query("projectCollaborators")
    .withIndex("by_project_user", (q) =>
      q.eq("projectId", args.projectId).eq("userId", args.userId),
    )
    .unique();

  if (!collaborator) {
    throw new Error("Not authorized.");
  }

  const ownerSubscription = await getCurrentSubscriptionSnapshot(ctx, String(project.userId));
  if (!ownerSubscription) {
    throw new Error("Not authorized. Project owner needs an active subscription.");
  }

  const subscription = await getCurrentSubscriptionSnapshot(ctx, String(user._id));
  if (!subscription) {
    throw new Error("Not authorized. Active subscription required.");
  }

  return { user, project, role: "editor" };
}

export async function requirePhaseAccessForUserId(
  ctx: ReaderCtx,
  args: {
    userId: Id<"users">;
    phaseId: Id<"phases">;
  },
) {
  const phase = await ctx.db.get(args.phaseId);
  if (!phase) {
    throw new Error("Phase not found.");
  }

  const { user, project, role } = await requireProjectAccessForUserId(ctx, {
    userId: args.userId,
    projectId: phase.projectId,
  });

  return { user, project, phase, role };
}

export async function requireTaskAccessForUserId(
  ctx: ReaderCtx,
  args: {
    userId: Id<"users">;
    taskId: Id<"tasks">;
  },
) {
  const task = await ctx.db.get(args.taskId);
  if (!task) {
    throw new Error("Task not found.");
  }

  const phase = await ctx.db.get(task.phaseId);
  if (!phase) {
    throw new Error("Phase not found.");
  }

  const { user, project, role } = await requireProjectAccessForUserId(ctx, {
    userId: args.userId,
    projectId: phase.projectId,
  });

  return { user, project, phase, task, role };
}

export async function listProjectSummariesForUser(
  ctx: ReaderCtx,
  userId: Id<"users">,
) {
  const projectDocs = await ctx.db
    .query("projects")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();

  const sortedProjectDocs = [...projectDocs].sort(
    (a, b) => a.startDate - b.startDate || a.createdAt - b.createdAt,
  );

  return Promise.all(sortedProjectDocs.map((project) => buildApiProjectSummary(project)));
}

export async function createProjectForUser(
  ctx: MutationCtx,
  args: {
    userId: Id<"users">;
    name: string;
    clientName: string;
    clientEmail?: string;
    clientAvatarUrl?: string;
    projectImageUrl?: string;
    startMarkerImageUrl?: string;
    endMarkerImageUrl?: string;
    type: Doc<"projects">["type"];
    method: "ai" | "manual";
    startDate: number;
    endDate: number;
    phases?: Array<{ name: string; tasks?: string[] }>;
  },
) {
  const user = await requireActorUser(ctx, args.userId);
  const subscription = await getCurrentSubscriptionSnapshot(ctx, String(user._id));
  const plan = subscription?.plan ?? user.plan ?? "free";
  const projectName = requireNonEmptyTrimmedString(args.name, "Project name");
  const clientName = requireNonEmptyTrimmedString(args.clientName, "Client name");
  const clientEmail = args.clientEmail?.trim() || undefined;
  const requestedClientAvatarUrl = args.clientAvatarUrl?.trim() || undefined;
  const projectImageUrl = args.projectImageUrl?.trim() || undefined;
  const startMarkerImageUrl = args.startMarkerImageUrl?.trim() || undefined;
  const endMarkerImageUrl = args.endMarkerImageUrl?.trim() || undefined;

  if (args.endDate < args.startDate) {
    throw new Error("End date must be on or after the start date.");
  }

  const existingProjects = await ctx.db
    .query("projects")
    .withIndex("by_user", (q) => q.eq("userId", user._id))
    .collect();

  assertProjectCreationAllowed({
    plan,
    projectCount: existingProjects.length,
  });

  const existingClient = await getClientByUserAndName(ctx, {
    userId: user._id,
    name: clientName,
  });
  const nextClientEmail = clientEmail ?? existingClient?.email;
  const nextClientAvatarUrl = requestedClientAvatarUrl ?? existingClient?.avatarUrl;

  if (!nextClientEmail) {
    throw new Error("Client email is required.");
  }

  if (!nextClientAvatarUrl) {
    throw new Error("Client photo is required.");
  }

  await upsertClient(ctx, {
    userId: user._id,
    name: clientName,
    email: nextClientEmail,
    avatarUrl: nextClientAvatarUrl,
  });

  if (requestedClientAvatarUrl) {
    const previousProjectAvatarUrls = await syncClientAvatarAcrossProjects(ctx, {
      userId: user._id,
      clientName,
      avatarUrl: requestedClientAvatarUrl,
    });

    const staleAvatarUrls = new Set(previousProjectAvatarUrls);
    if (existingClient?.avatarUrl && existingClient.avatarUrl !== requestedClientAvatarUrl) {
      staleAvatarUrls.add(existingClient.avatarUrl);
    }

    await Promise.all(
      Array.from(staleAvatarUrls).map((avatarUrl) =>
        deleteClientAvatarIfUnused(ctx, {
          userId: user._id,
          avatarUrl,
        }),
      ),
    );
  }

  const normalizedProvidedPhases = normalizePhaseInputs(args.phases);
  if (args.method === "ai" && normalizedProvidedPhases.length === 0) {
    throw new Error("AI project import requires at least one phase.");
  }

  const timestamp = now();
  const projectId = await ctx.db.insert("projects", {
    userId: user._id,
    name: projectName,
    clientName,
    clientEmail: nextClientEmail,
    clientAvatarUrl: nextClientAvatarUrl,
    projectImageUrl,
    startMarkerImageUrl,
    endMarkerImageUrl,
    type: args.type,
    status: "active",
    startDate: args.startDate,
    endDate: args.endDate,
    progress: 0,
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  await Promise.all([
    attachTrackedR2Asset(ctx, { key: nextClientAvatarUrl }),
    attachTrackedR2Asset(ctx, { key: projectImageUrl }),
    attachTrackedR2Asset(ctx, { key: startMarkerImageUrl }),
    attachTrackedR2Asset(ctx, { key: endMarkerImageUrl }),
  ]);

  const normalizedPhases =
    normalizedProvidedPhases.length > 0
      ? normalizedProvidedPhases
      : buildDefaultProjectPhases();

  requireMinimumPhaseCount(normalizedPhases);

  for (const [index, phase] of normalizedPhases.entries()) {
    const phaseId = await ctx.db.insert("phases", {
      projectId,
      name: phase.name,
      order: index,
      status: index === 0 ? "active" : "upcoming",
      progress: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    if (phase.tasks.length > 0) {
      await Promise.all(
        phase.tasks.map((title, taskIndex) =>
          ctx.db.insert("tasks", {
            phaseId,
            title,
            isCompleted: false,
            content: "",
            order: taskIndex,
            createdAt: timestamp,
            updatedAt: timestamp,
          }),
        ),
      );
    }
  }

  await ensurePortalConfig(ctx, projectId);
  await recomputeProjectState(ctx, projectId);

  const project = await ctx.db.get(projectId);
  if (!project) {
    throw new Error("Failed to create project.");
  }

  return buildProject(ctx, project);
}

export async function addPhaseForUser(
  ctx: MutationCtx,
  args: {
    userId: Id<"users">;
    projectId: Id<"projects">;
    name: string;
    tasks?: string[];
  },
) {
  const { project } = await requireProjectAccessForUserId(ctx, {
    userId: args.userId,
    projectId: args.projectId,
  });

  const existingPhases = await ctx.db
    .query("phases")
    .withIndex("by_project_order", (q) => q.eq("projectId", project._id))
    .collect();

  const timestamp = now();
  const phaseId = await ctx.db.insert("phases", {
    projectId: project._id,
    name: args.name.trim(),
    order: existingPhases.length,
    status: existingPhases.length === 0 ? "active" : "upcoming",
    progress: 0,
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  const tasks = args.tasks?.map((task) => task.trim()).filter((task) => task.length > 0) ?? [];
  if (tasks.length > 0) {
    await Promise.all(
      tasks.map((title, index) =>
        ctx.db.insert("tasks", {
          phaseId,
          title,
          isCompleted: false,
          content: "",
          order: index,
          createdAt: timestamp,
          updatedAt: timestamp,
        }),
      ),
    );
  }

  await recomputeProjectState(ctx, project._id);
  const phase = await ctx.db.get(phaseId);

  if (!phase) {
    throw new Error("Failed to load phase.");
  }

  return {
    id: String(phase._id),
    projectId: String(phase.projectId),
    name: phase.name,
    order: phase.order,
    status: phase.status,
    progress: phase.progress,
    tasks: args.tasks ?? [],
  };
}

export async function addTaskForUser(
  ctx: MutationCtx,
  args: {
    userId: Id<"users">;
    phaseId: Id<"phases">;
    title: string;
  },
) {
  const { project, phase } = await requirePhaseAccessForUserId(ctx, {
    userId: args.userId,
    phaseId: args.phaseId,
  });

  const existingTasks = await ctx.db
    .query("tasks")
    .withIndex("by_phase_order", (q) => q.eq("phaseId", phase._id))
    .collect();

  const timestamp = now();
  const taskId = await ctx.db.insert("tasks", {
    phaseId: phase._id,
    title: args.title.trim(),
    isCompleted: false,
    content: "",
    order: existingTasks.length,
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  await recomputeProjectState(ctx, project._id);

  const task = await ctx.db.get(taskId);
  if (!task) {
    throw new Error("Failed to create task.");
  }

  return {
    id: String(task._id),
    phaseId: String(task.phaseId),
    title: task.title,
    isCompleted: task.isCompleted,
    content: task.content,
    dueDate: task.dueDate,
    assigneeIds: task.assigneeIds ?? [],
    assignees: [],
    attachments: [],
    order: task.order,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  };
}

export async function toggleTaskForUser(
  ctx: MutationCtx,
  args: {
    userId: Id<"users">;
    taskId: Id<"tasks">;
  },
) {
  const { task, project } = await requireTaskAccessForUserId(ctx, {
    userId: args.userId,
    taskId: args.taskId,
  });

  const updatedAt = now();
  const nextCompleted = !task.isCompleted;
  await ctx.db.patch(task._id, {
    isCompleted: nextCompleted,
    boardStatus: nextCompleted ? "done" : task.boardStatus === "done" ? "in-progress" : task.boardStatus,
    updatedAt,
  });

  await recomputeProjectState(ctx, project._id);

  const updatedTask = await ctx.db.get(task._id);
  if (!updatedTask) {
    throw new Error("Task not found.");
  }

  return {
    id: String(updatedTask._id),
    phaseId: String(updatedTask.phaseId),
    title: updatedTask.title,
    isCompleted: updatedTask.isCompleted,
    content: updatedTask.content,
    dueDate: updatedTask.dueDate,
    assigneeIds: updatedTask.assigneeIds ?? [],
    assignees: [],
    attachments: [],
    order: updatedTask.order,
    createdAt: updatedTask.createdAt,
    updatedAt: updatedTask.updatedAt,
  };
}

export async function setTaskPriorityForUser(
  ctx: MutationCtx,
  args: {
    userId: Id<"users">;
    taskId: Id<"tasks">;
    priority: "low" | "medium" | "high" | null;
  },
) {
  const { task } = await requireTaskAccessForUserId(ctx, {
    userId: args.userId,
    taskId: args.taskId,
  });

  // Convex `db.patch` accepts a typed Partial of the document. Setting a
  // field to `undefined` clears it server-side; explicit `null` is not a
  // valid task.priority value, so we map the API's `null` (= Backlog)
  // to `undefined` here.
  const patch: Partial<Doc<"tasks">> = {
    updatedAt: now(),
    priority: args.priority ?? undefined,
  };

  await ctx.db.patch(task._id, patch);

  const updated = await ctx.db.get(task._id);
  if (!updated) {
    throw new Error("Task not found after priority update.");
  }
  return updated;
}

export async function setTaskKanbanColumnForUser(
  ctx: MutationCtx,
  args: {
    userId: Id<"users">;
    taskId: Id<"tasks">;
    boardStatus: "backlog" | "todo" | "in-progress" | "done";
  },
) {
  const { task, project } = await requireTaskAccessForUserId(ctx, {
    userId: args.userId,
    taskId: args.taskId,
  });

  const isCompleted = args.boardStatus === "done";
  const updatedAt = now();
  await ctx.db.patch(task._id, {
    boardStatus: args.boardStatus,
    isCompleted,
    updatedAt,
    ...(isCompleted ? { priority: undefined } : {}),
  });

  await recomputeProjectState(ctx, project._id);

  const updated = await ctx.db.get(task._id);
  if (!updated) {
    throw new Error("Task not found after kanban update.");
  }
  return updated;
}

export async function setTaskBoardStateForUser(
  ctx: MutationCtx,
  args: {
    userId: Id<"users">;
    taskId: Id<"tasks">;
    priority: "low" | "medium" | "high" | null;
    isCompleted: boolean;
  },
) {
  const { task, project } = await requireTaskAccessForUserId(ctx, {
    userId: args.userId,
    taskId: args.taskId,
  });

  const updatedAt = now();
  const patch: Partial<Doc<"tasks">> = {
    updatedAt,
    isCompleted: args.isCompleted,
  };
  if (args.isCompleted) {
    patch.priority = undefined;
  } else {
    patch.priority = args.priority === null ? undefined : args.priority;
  }

  await ctx.db.patch(task._id, patch);
  await recomputeProjectState(ctx, project._id);

  const updated = await ctx.db.get(task._id);
  if (!updated) {
    throw new Error("Task not found after board update.");
  }
  return updated;
}

export async function deleteTaskForUser(
  ctx: MutationCtx,
  args: {
    userId: Id<"users">;
    taskId: Id<"tasks">;
  },
) {
  const { task, project } = await requireTaskAccessForUserId(ctx, {
    userId: args.userId,
    taskId: args.taskId,
  });

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

  const remaining = await ctx.db
    .query("tasks")
    .withIndex("by_phase_order", (q) => q.eq("phaseId", task.phaseId))
    .collect();

  const timestamp = now();
  await Promise.all(
    remaining.map((remainingTask, index) =>
      remainingTask.order === index
        ? Promise.resolve()
        : ctx.db.patch(remainingTask._id, { order: index, updatedAt: timestamp }),
    ),
  );

  await recomputeProjectState(ctx, project._id);
}

async function normalizeProjectId(ctx: ReaderCtx, projectId: string) {
  const normalized = await ctx.db.normalizeId("projects", projectId);
  if (!normalized) {
    throw new Error("Project not found.");
  }
  return normalized;
}

async function normalizePhaseId(ctx: ReaderCtx, phaseId: string) {
  const normalized = await ctx.db.normalizeId("phases", phaseId);
  if (!normalized) {
    throw new Error("Phase not found.");
  }
  return normalized;
}

async function normalizeTaskId(ctx: ReaderCtx, taskId: string) {
  const normalized = await ctx.db.normalizeId("tasks", taskId);
  if (!normalized) {
    throw new Error("Task not found.");
  }
  return normalized;
}

export const listProjectsForApi = internalQuery({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => listProjectSummariesForUser(ctx, args.userId),
});

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

export const createProjectForApi = internalMutation({
  args: {
    userId: v.id("users"),
    ...createProjectArgsValidator,
  },
  handler: async (ctx, args) => createProjectForUser(ctx, args),
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

    const timestamp = now();
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

export const getTaskForApi = internalQuery({
  args: {
    userId: v.id("users"),
    taskId: v.string(),
  },
  handler: async (ctx, args) => {
    const taskId = await normalizeTaskId(ctx, args.taskId);
    const { task } = await requireTaskAccessForUserId(ctx, {
      userId: args.userId,
      taskId,
    });

    return buildApiTaskDetail(ctx, task);
  },
});

const DEFAULT_USER_TASKS_LIMIT = 100;
const MAX_USER_TASKS_LIMIT = 200;

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
