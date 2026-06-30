import type { Doc, Id } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";
import { resolveAssetUrl } from "../../r2";

type ReaderCtx = QueryCtx | MutationCtx;

async function resolveAttachmentPublicUrl(
  ctx: ReaderCtx,
  attachment: Doc<"attachments">,
): Promise<string> {
  if (attachment.r2ObjectKey) {
    return (await resolveAssetUrl(attachment.r2ObjectKey)) ?? attachment.url;
  }

  if (attachment.storageId !== undefined) {
    return (await ctx.storage.getUrl(attachment.storageId)) ?? attachment.url;
  }

  return attachment.url;
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
      url: await resolveAttachmentPublicUrl(ctx, attachment),
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
    tasks.map(async (task) => {
      const assigneeIds = task.assigneeIds ?? [];
      const assignees = await Promise.all(
        assigneeIds.map(async (userId) => {
          const user = await ctx.db.get(userId as Id<"users">);
          return {
            userId,
            name: user?.name ?? null,
            email: user?.email ?? null,
          };
        }),
      );

      return {
        id: String(task._id),
        phaseId: String(task.phaseId),
        title: task.title,
        isCompleted: task.isCompleted,
        content: task.content,
        dueDate: task.dueDate,
        boardStatus: task.boardStatus,
        revisionNote: task.revisionNote,
        assigneeIds,
        assignees,
        attachments: await getAttachmentsForTask(ctx, task._id),
        order: task.order,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
      };
    }),
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
