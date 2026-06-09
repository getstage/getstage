import type { Doc, Id } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";
import { getAttachmentsForTask, getPortalConfigByProjectId } from "../../_helpers";
import { resolveAssetUrl } from "../../r2";

type ReaderCtx = QueryCtx | MutationCtx;

async function buildAssigneeSummaries(
  ctx: ReaderCtx,
  assigneeIds: Array<Id<"users"> | string>,
) {
  return Promise.all(
    assigneeIds.map(async (userId) => {
      const user = await ctx.db.get(userId as Id<"users">);
      return {
        userId: String(userId),
        name: user?.name ?? null,
      };
    }),
  );
}

async function getTaskStatsForProject(ctx: ReaderCtx, projectId: Id<"projects">) {
  const phases = await ctx.db
    .query("phases")
    .withIndex("by_project", (q) => q.eq("projectId", projectId))
    .collect();

  let taskCount = 0;
  let completedTaskCount = 0;

  for (const phase of phases) {
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_phase", (q) => q.eq("phaseId", phase._id))
      .collect();

    taskCount += tasks.length;
    completedTaskCount += tasks.filter((task) => task.isCompleted).length;
  }

  return {
    phaseCount: phases.length,
    taskCount,
    completedTaskCount,
  };
}

export async function buildApiProjectSummary(
  project: Doc<"projects">,
) {
  const projectImageUrl = await resolveAssetUrl(project.projectImageUrl ?? null);
  const startMarkerImageUrl = await resolveAssetUrl(project.startMarkerImageUrl ?? null);
  const endMarkerImageUrl = await resolveAssetUrl(project.endMarkerImageUrl ?? null);
  const clientAvatarUrl = await resolveAssetUrl(project.clientAvatarUrl ?? null);

  return {
    id: String(project._id),
    name: project.name,
    clientName: project.clientName,
    projectImageUrl:
      projectImageUrl ??
      endMarkerImageUrl ??
      startMarkerImageUrl ??
      clientAvatarUrl ??
      undefined,
    type: project.type,
    status: project.status,
    startDate: project.startDate,
    endDate: project.endDate,
    progress: project.progress,
  };
}

export async function buildApiProjectDetail(
  ctx: ReaderCtx,
  project: Doc<"projects">,
  accessRole: "owner" | "editor",
) {
  const projectImageUrl = await resolveAssetUrl(project.projectImageUrl ?? null);
  const startMarkerImageUrl = await resolveAssetUrl(project.startMarkerImageUrl ?? null);
  const endMarkerImageUrl = await resolveAssetUrl(project.endMarkerImageUrl ?? null);
  const clientAvatarUrl = await resolveAssetUrl(project.clientAvatarUrl ?? null);
  const stats = await getTaskStatsForProject(ctx, project._id);
  const portalConfig = await getPortalConfigByProjectId(ctx, project._id);

  return {
    id: String(project._id),
    name: project.name,
    clientName: project.clientName,
    clientEmail: project.clientEmail,
    clientAvatarUrl: clientAvatarUrl ?? undefined,
    projectImageUrl:
      projectImageUrl ??
      endMarkerImageUrl ??
      startMarkerImageUrl ??
      clientAvatarUrl ??
      undefined,
    type: project.type,
    status: project.status,
    startDate: project.startDate,
    endDate: project.endDate,
    progress: project.progress,
    accessRole,
    phaseCount: stats.phaseCount,
    taskCount: stats.taskCount,
    completedTaskCount: stats.completedTaskCount,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    shareToken: portalConfig?.shareToken,
    shareUrl: portalConfig?.shareUrl,
    portalEnabled: portalConfig?.isEnabled,
  };
}

export function buildApiProjectReference(project: Doc<"projects">) {
  return {
    projectId: project._id,
    id: String(project._id),
    name: project.name,
  };
}

export async function buildApiPhaseSummary(
  ctx: ReaderCtx,
  phase: Doc<"phases">,
) {
  const tasks = await ctx.db
    .query("tasks")
    .withIndex("by_phase", (q) => q.eq("phaseId", phase._id))
    .collect();

  return {
    id: String(phase._id),
    projectId: String(phase.projectId),
    name: phase.name,
    order: phase.order,
    status: phase.status,
    progress: phase.progress,
    taskCount: tasks.length,
    completedTaskCount: tasks.filter((task) => task.isCompleted).length,
    createdAt: phase.createdAt,
    updatedAt: phase.updatedAt,
  };
}

export async function buildApiTaskSummary(
  ctx: ReaderCtx,
  task: Doc<"tasks">,
) {
  const assigneeIds = task.assigneeIds ?? [];
  const [assignees, attachments, phase] = await Promise.all([
    buildAssigneeSummaries(ctx, assigneeIds),
    ctx.db
      .query("attachments")
      .withIndex("by_task", (q) => q.eq("taskId", task._id))
      .collect(),
    ctx.db.get(task.phaseId),
  ]);

  if (!phase) {
    throw new Error(`Task ${task._id} references missing phase ${task.phaseId}.`);
  }

  return {
    id: String(task._id),
    phaseId: String(task.phaseId),
    projectId: String(phase.projectId),
    title: task.title,
    isCompleted: task.isCompleted,
    dueDate: task.dueDate,
    assigneeIds,
    assignees,
    attachmentCount: attachments.length,
    hasContent:
      (task.summary ?? "").trim().length > 0 || (task.content ?? "").trim().length > 0,
    summary: task.summary,
    priority: task.priority ?? null,
    boardStatus: task.boardStatus ?? null,
    order: task.order,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  };
}

export async function buildApiTaskDetail(
  ctx: ReaderCtx,
  task: Doc<"tasks">,
) {
  const assigneeIds = task.assigneeIds ?? [];
  const assignees = await buildAssigneeSummaries(ctx, assigneeIds);

  return {
    id: String(task._id),
    phaseId: String(task.phaseId),
    title: task.title,
    isCompleted: task.isCompleted,
    summary: task.summary,
    content: task.content,
    dueDate: task.dueDate,
    assigneeIds,
    assignees,
    attachments: await getAttachmentsForTask(ctx, task._id),
    order: task.order,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  };
}
