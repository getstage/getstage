import type { Doc, Id } from "../../../_generated/dataModel";
import { type MutationCtx, type QueryCtx } from "../../../_generated/server";
import { getCurrentSubscriptionSnapshot } from "../../../billing";
import {
  deleteClientAvatarIfUnused,
  ensurePortalConfig,
  getClientByUserAndName,
  syncClientAvatarAcrossProjects,
  upsertClient,
} from "../../../_helpers";
import { attachTrackedR2Asset, deleteOldR2Asset } from "../../../r2";
import { buildApiProjectSummary } from "../../../domain/projects/apiReadModel";
import { assertProjectCreationAllowed } from "../../../domain/projects/entitlement";
import { buildProject, recomputeProjectState } from "../../../domain/projects/readModel";
import { requireProjectAccessForUserId } from "../../../helpers/access/projectAccess";
import { now } from "../../../helpers/time";

export { requireProjectAccessForUserId };
import {
  createProjectArgsValidator,
  phaseCreationInputValidator,
  phaseInputValidator,
  projectTypeValidator,
} from "../../../models/projects/validators";

export {
  createProjectArgsValidator,
  phaseCreationInputValidator,
  phaseInputValidator,
  projectTypeValidator,
};

type ReaderCtx = QueryCtx | MutationCtx;

const DEFAULT_PROJECT_PHASES = [
  "Discovery",
  "Strategy",
  "Design",
  "Development",
  "Launch",
] as const;
const MIN_PROJECT_PHASE_COUNT = 2;

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
            summary: "",
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
          summary: "",
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
    summary: "",
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
