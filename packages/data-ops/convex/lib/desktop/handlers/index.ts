import { v, type Infer } from "convex/values";
import type { MutationCtx, QueryCtx } from "../../../_generated/server";
import {
  buildApiPhaseSummary,
  buildApiProjectDetail,
  buildApiProjectSummary,
  buildApiTaskSummary,
} from "../../../domain/projects/apiReadModel";
import {
  createProjectForUser,
  deleteTaskForUser,
  setTaskBoardStateForUser,
  setTaskKanbanColumnForUser,
  setTaskPriorityForUser,
} from "../../../domain/projects/service";
import { recomputeProjectState } from "../../../domain/projects/readModel";
import { requireAuthUser, requirePhaseAccess, requireProjectAccess, requireProjectAccessOrNull } from "../../../_helpers";
import { now } from "../../../helpers/time";
import { createProjectArgsObject } from "../../../models/projects/validators";

const projectTypeValidator = v.union(
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

const projectStatusValidator = v.union(
  v.literal("active"),
  v.literal("paused"),
  v.literal("completed"),
);

const phaseStatusValidator = v.union(
  v.literal("completed"),
  v.literal("active"),
  v.literal("upcoming"),
);

const taskPriorityValidator = v.union(
  v.literal("low"),
  v.literal("medium"),
  v.literal("high"),
);

const taskBoardStatusValidator = v.union(
  v.literal("backlog"),
  v.literal("todo"),
  v.literal("in-progress"),
  v.literal("done"),
);

export const projectSummaryReturn = v.object({
  id: v.string(),
  name: v.string(),
  clientName: v.string(),
  projectImageUrl: v.optional(v.string()),
  type: projectTypeValidator,
  status: projectStatusValidator,
  startDate: v.number(),
  endDate: v.number(),
  progress: v.number(),
});

export const projectDetailReturn = v.object({
  id: v.string(),
  name: v.string(),
  clientName: v.string(),
  clientEmail: v.optional(v.string()),
  clientAvatarUrl: v.optional(v.string()),
  projectImageUrl: v.optional(v.string()),
  type: projectTypeValidator,
  status: projectStatusValidator,
  startDate: v.number(),
  endDate: v.number(),
  progress: v.number(),
  enabledSteps: v.array(v.string()),
  accessRole: v.union(v.literal("owner"), v.literal("editor")),
  phaseCount: v.number(),
  taskCount: v.number(),
  completedTaskCount: v.number(),
  createdAt: v.number(),
  updatedAt: v.number(),
  shareToken: v.optional(v.string()),
  shareUrl: v.optional(v.string()),
  portalEnabled: v.optional(v.boolean()),
});

export const phaseSummaryReturn = v.object({
  id: v.string(),
  projectId: v.string(),
  name: v.string(),
  order: v.number(),
  status: phaseStatusValidator,
  progress: v.number(),
  taskCount: v.number(),
  completedTaskCount: v.number(),
  createdAt: v.number(),
  updatedAt: v.number(),
});

const taskAssigneeReturn = v.object({
  userId: v.string(),
  name: v.union(v.string(), v.null()),
});

export const taskSummaryReturn = v.object({
  id: v.string(),
  phaseId: v.string(),
  projectId: v.string(),
  title: v.string(),
  isCompleted: v.boolean(),
  dueDate: v.optional(v.number()),
  assigneeIds: v.array(v.string()),
  assignees: v.array(taskAssigneeReturn),
  attachmentCount: v.number(),
  hasContent: v.boolean(),
  summary: v.optional(v.string()),
  priority: v.union(taskPriorityValidator, v.null()),
  boardStatus: v.union(taskBoardStatusValidator, v.null()),
  order: v.number(),
  createdAt: v.number(),
  updatedAt: v.number(),
});

async function normalizeProjectId(ctx: Parameters<typeof requireProjectAccess>[0], projectId: string) {
  const normalized = await ctx.db.normalizeId("projects", projectId);
  if (!normalized) {
    throw new Error("Project not found.");
  }
  return normalized;
}

async function normalizePhaseId(ctx: Parameters<typeof requirePhaseAccess>[0], phaseId: string) {
  const normalized = await ctx.db.normalizeId("phases", phaseId);
  if (!normalized) {
    throw new Error("Phase not found.");
  }
  return normalized;
}

async function normalizeTaskId(ctx: Parameters<typeof deleteTaskForUser>[0], taskId: string) {
  const normalized = await ctx.db.normalizeId("tasks", taskId);
  if (!normalized) {
    throw new Error("Task not found.");
  }
  return normalized;
}

export const listProjectsArgs = {};
export const listProjectsReturns = v.array(projectSummaryReturn);

export async function listProjectsHandler(ctx: QueryCtx) {
  const user = await requireAuthUser(ctx);
  const projects = await ctx.db
    .query("projects")
    .withIndex("by_user", (q) => q.eq("userId", user._id))
    .collect();

  const sortedProjects = [...projects].sort((a, b) => a.startDate - b.startDate);
  return Promise.all(sortedProjects.map((project) => buildApiProjectSummary(project)));
}

export const searchProjectsForChatArgs = {
  search: v.string(),
  limit: v.optional(v.number()),
};
export const searchProjectsForChatReturns = v.array(v.object({
  projectId: v.string(),
  projectName: v.string(),
  clientName: v.string(),
  status: projectStatusValidator,
  updatedAt: v.number(),
}));

export async function searchProjectsForChatHandler(
  ctx: QueryCtx,
  args: { search: string; limit?: number },
) {
  const user = await requireAuthUser(ctx);
  const limit = Math.max(1, Math.min(args.limit ?? 10, 200));
  const search = args.search.trim().toLocaleLowerCase();
  const projects = await ctx.db
    .query("projects")
    .withIndex("by_user_updatedAt", (q) => q.eq("userId", user._id))
    .order("desc")
    .take(200);
  const matches = projects
    .filter((project) => {
      if (!search) return true;
      return project.name.toLocaleLowerCase().includes(search) ||
        project.clientName.toLocaleLowerCase().includes(search);
    })
    .sort((left, right) => {
      if (!search) return right.updatedAt - left.updatedAt;
      const leftName = left.name.toLocaleLowerCase();
      const rightName = right.name.toLocaleLowerCase();
      const leftClient = left.clientName.toLocaleLowerCase();
      const rightClient = right.clientName.toLocaleLowerCase();
      const leftRank = leftName.startsWith(search) ? 0 : leftClient.startsWith(search) ? 1 : 2;
      const rightRank = rightName.startsWith(search) ? 0 : rightClient.startsWith(search) ? 1 : 2;
      return leftRank - rightRank || right.updatedAt - left.updatedAt;
    })
    .slice(0, limit);

  return matches.map((project) => ({
    projectId: String(project._id),
    projectName: project.name,
    clientName: project.clientName,
    status: project.status,
    updatedAt: project.updatedAt,
  }));
}

export const getProjectArgs = {
  projectId: v.string(),
};
export const getProjectReturns = v.union(projectDetailReturn, v.null());

export async function getProjectHandler(ctx: QueryCtx, args: { projectId: string }) {
  const projectId = await normalizeProjectId(ctx, args.projectId);
  const { project, role } = await requireProjectAccess(ctx, projectId);
  return buildApiProjectDetail(ctx, project, role);
}

export const listProjectPhasesArgs = {
  projectId: v.string(),
};
export const listProjectPhasesReturns = v.array(phaseSummaryReturn);

export async function listProjectPhasesHandler(ctx: QueryCtx, args: { projectId: string }) {
  const projectId = await normalizeProjectId(ctx, args.projectId);
  await requireProjectAccess(ctx, projectId);
  const phases = await ctx.db
    .query("phases")
    .withIndex("by_project_order", (q) => q.eq("projectId", projectId))
    .collect();

  return Promise.all(phases.map((phase) => buildApiPhaseSummary(ctx, phase)));
}

export const getProjectDataArgs = {
  projectId: v.string(),
};
export const getProjectDataReturns = v.union(
  v.object({
    project: projectDetailReturn,
    phases: v.array(phaseSummaryReturn),
    tasks: v.array(taskSummaryReturn),
  }),
  v.null(),
);

export async function getProjectDataHandler(ctx: QueryCtx, args: { projectId: string }) {
  const projectId = await ctx.db.normalizeId("projects", args.projectId);
  if (!projectId) {
    return null;
  }

  const access = await requireProjectAccessOrNull(ctx, projectId);
  if (!access) {
    return null;
  }

  const { project, role } = access;
  const phases = await ctx.db
    .query("phases")
    .withIndex("by_project_order", (q) => q.eq("projectId", projectId))
    .collect();
  const phaseSummaries = await Promise.all(phases.map((phase) => buildApiPhaseSummary(ctx, phase)));
  const tasks = (
    await Promise.all(
      phases.map((phase) =>
        ctx.db
          .query("tasks")
          .withIndex("by_phase_order", (q) => q.eq("phaseId", phase._id))
          .collect(),
      ),
    )
  ).flat();

  return {
    project: await buildApiProjectDetail(ctx, project, role),
    phases: phaseSummaries,
    tasks: await Promise.all(tasks.map((task) => buildApiTaskSummary(ctx, task))),
  };
}

export const listPhaseTasksArgs = {
  phaseId: v.string(),
};
export const listPhaseTasksReturns = v.array(taskSummaryReturn);

export async function listPhaseTasksHandler(ctx: QueryCtx, args: { phaseId: string }) {
  const phaseId = await normalizePhaseId(ctx, args.phaseId);
  const { phase } = await requirePhaseAccess(ctx, phaseId);
  const tasks = await ctx.db
    .query("tasks")
    .withIndex("by_phase_order", (q) => q.eq("phaseId", phase._id))
    .collect();

  return Promise.all(tasks.map((task) => buildApiTaskSummary(ctx, task)));
}

export const listUserTasksArgs = {
  limit: v.optional(v.number()),
};
export const listUserTasksReturns = v.array(taskSummaryReturn);

export async function listUserTasksHandler(ctx: QueryCtx, args: { limit?: number }) {
  const user = await requireAuthUser(ctx);
  const limit = Math.max(1, Math.min(args.limit ?? 100, 200));
  const projects = await ctx.db
    .query("projects")
    .withIndex("by_user", (q) => q.eq("userId", user._id))
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
  const ordered = [...tasks].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, limit);

  return Promise.all(ordered.map((task) => buildApiTaskSummary(ctx, task)));
}

export const createProjectArgs = createProjectArgsObject;
export const createProjectReturns = projectDetailReturn;

export async function createProjectHandler(
  ctx: MutationCtx,
  args: Infer<typeof createProjectArgsObject>,
) {
  const user = await requireAuthUser(ctx);
  const fallbackAvatarUrl = user.avatarUrl ?? user.image;
  const created = await createProjectForUser(ctx, {
    userId: user._id,
    ...args,
    clientAvatarUrl: args.clientAvatarUrl ?? fallbackAvatarUrl,
  });
  const projectId = await normalizeProjectId(ctx, created.id);
  const project = await ctx.db.get(projectId);
  if (!project) {
    throw new Error("Failed to load created project.");
  }
  return buildApiProjectDetail(ctx, project, "owner");
}

export const createTaskArgs = {
  projectId: v.string(),
  title: v.string(),
  phaseId: v.optional(v.string()),
  priority: v.optional(taskPriorityValidator),
  summary: v.optional(v.string()),
  content: v.optional(v.string()),
  boardStatus: v.optional(taskBoardStatusValidator),
  isCompleted: v.optional(v.boolean()),
};
export const createTaskReturns = taskSummaryReturn;

export async function createTaskHandler(
  ctx: MutationCtx,
  args: {
    projectId: string;
    title: string;
    phaseId?: string;
    priority?: "low" | "medium" | "high";
    summary?: string;
    content?: string;
    boardStatus?: "backlog" | "todo" | "in-progress" | "done";
    isCompleted?: boolean;
  },
) {
  await requireAuthUser(ctx);
  const projectId = await normalizeProjectId(ctx, args.projectId);
  await requireProjectAccess(ctx, projectId);
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

  let targetPhase =
    phases.find((phase) => phase.status === "active") ?? [...phases].sort((a, b) => a.order - b.order)[0]!;

  if (args.phaseId) {
    const phaseId = await normalizePhaseId(ctx, args.phaseId);
    const selected = phases.find((phase) => phase._id === phaseId);
    if (!selected || selected.projectId !== projectId) {
      throw new Error("Phase not found for this project.");
    }
    targetPhase = selected;
  }

  const boardStatus = args.boardStatus ?? "todo";
  const completed = args.isCompleted ?? boardStatus === "done";
  const existing = await ctx.db
    .query("tasks")
    .withIndex("by_phase_order", (q) => q.eq("phaseId", targetPhase._id))
    .collect();
  const timestamp = now();
  const taskId = await ctx.db.insert("tasks", {
    phaseId: targetPhase._id,
    title: trimmedTitle,
    isCompleted: completed,
    summary: args.summary?.trim() || args.content?.trim() || "",
    content: "",
    priority: completed ? undefined : args.priority,
    boardStatus,
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
}

export const setTaskKanbanColumnArgs = {
  taskId: v.string(),
  boardStatus: taskBoardStatusValidator,
};
export const setTaskKanbanColumnReturns = taskSummaryReturn;

export async function setTaskKanbanColumnHandler(
  ctx: MutationCtx,
  args: { taskId: string; boardStatus: "backlog" | "todo" | "in-progress" | "done" },
) {
  const user = await requireAuthUser(ctx);
  const taskId = await normalizeTaskId(ctx, args.taskId);
  const task = await setTaskKanbanColumnForUser(ctx, {
    userId: user._id,
    taskId,
    boardStatus: args.boardStatus,
  });
  return buildApiTaskSummary(ctx, task);
}

export const setTaskPriorityArgs = {
  taskId: v.string(),
  priority: v.union(taskPriorityValidator, v.null()),
};
export const setTaskPriorityReturns = taskSummaryReturn;

export async function setTaskPriorityHandler(
  ctx: MutationCtx,
  args: { taskId: string; priority: "low" | "medium" | "high" | null },
) {
  const user = await requireAuthUser(ctx);
  const taskId = await normalizeTaskId(ctx, args.taskId);
  const task = await setTaskPriorityForUser(ctx, {
    userId: user._id,
    taskId,
    priority: args.priority,
  });
  return buildApiTaskSummary(ctx, task);
}

export const updateTaskBoardStateArgs = {
  taskId: v.string(),
  priority: v.union(taskPriorityValidator, v.null()),
  isCompleted: v.boolean(),
};
export const updateTaskBoardStateReturns = taskSummaryReturn;

export async function updateTaskBoardStateHandler(
  ctx: MutationCtx,
  args: { taskId: string; priority: "low" | "medium" | "high" | null; isCompleted: boolean },
) {
  const user = await requireAuthUser(ctx);
  const taskId = await normalizeTaskId(ctx, args.taskId);
  const task = await setTaskBoardStateForUser(ctx, {
    userId: user._id,
    taskId,
    priority: args.priority,
    isCompleted: args.isCompleted,
  });
  return buildApiTaskSummary(ctx, task);
}

export const deleteTaskArgs = {
  taskId: v.string(),
};
export const deleteTaskReturns = v.object({ ok: v.boolean() });

export async function deleteTaskHandler(ctx: MutationCtx, args: { taskId: string }) {
  const user = await requireAuthUser(ctx);
  const taskId = await normalizeTaskId(ctx, args.taskId);
  await deleteTaskForUser(ctx, {
    userId: user._id,
    taskId,
  });
  return { ok: true };
}
