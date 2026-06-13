import { v } from "convex/values";
import type { Id } from "../../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../../_generated/server";
import {
  getAttachmentsForTask,
  requirePhaseAccess,
  requireProjectAccess,
  requireTaskAccess,
} from "../../../_helpers";
import { addTaskForUser, toggleTaskForUser } from "../../../domain/projects/service";
import { recomputeProjectState } from "../../../domain/projects/readModel";
import { attachTrackedR2Asset, deleteOldR2Asset, resolveAssetUrl } from "../../../r2";
import { now } from "../../../helpers/time";

export const getProjectMembersArgs = {
  projectId: v.id("projects"),
};

export async function getProjectMembersHandler(
  ctx: QueryCtx,
  { projectId }: { projectId: Id<"projects"> },
) {
  const { user } = await requireProjectAccess(ctx, projectId);

  const collaborators = await ctx.db
    .query("projectCollaborators")
    .withIndex("by_project", (q) => q.eq("projectId", projectId))
    .collect();

  const members: Array<{
    userId: string;
    name: string | null;
    email: string | null;
    role: "owner" | "editor";
  }> = [
    {
      userId: String(user._id),
      name: user.name ?? null,
      email: user.email ?? null,
      role: "owner",
    },
  ];

  for (const collab of collaborators) {
    const collabUser = await ctx.db.get(collab.userId);
    if (collabUser) {
      members.push({
        userId: String(collabUser._id),
        name: collabUser.name ?? null,
        email: collabUser.email ?? null,
        role: "editor",
      });
    }
  }

  return members;
}

export const createArgs = {
  phaseId: v.id("phases"),
  title: v.string(),
};

export async function createHandler(
  ctx: MutationCtx,
  { phaseId, title }: { phaseId: Id<"phases">; title: string },
) {
  const { user } = await requirePhaseAccess(ctx, phaseId);
  return addTaskForUser(ctx, {
    userId: user._id,
    phaseId,
    title,
  });
}

export const getDetailArgs = {
  taskId: v.id("tasks"),
};

export async function getDetailHandler(ctx: QueryCtx, { taskId }: { taskId: Id<"tasks"> }) {
  const task = await ctx.db.get(taskId);
  if (!task) {
    return null;
  }

  const phase = await ctx.db.get(task.phaseId);
  if (!phase) {
    return null;
  }

  const { project, role } = await requireProjectAccess(ctx, phase.projectId);

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
    project: {
      id: String(project._id),
      name: project.name,
      accessRole: role,
    },
    phase: {
      id: String(phase._id),
      name: phase.name,
    },
    task: {
      id: String(task._id),
      title: task.title,
      isCompleted: task.isCompleted,
      summary: task.summary,
      content: task.content,
      dueDate: task.dueDate,
      assigneeIds,
      assignees,
      attachments: await getAttachmentsForTask(ctx, task._id),
      updatedAt: task.updatedAt,
    },
  };
}

export const updateArgs = {
  taskId: v.id("tasks"),
  title: v.optional(v.string()),
  summary: v.optional(v.string()),
  content: v.optional(v.string()),
};

export async function updateHandler(
  ctx: MutationCtx,
  {
    taskId,
    title,
    summary,
    content,
  }: { taskId: Id<"tasks">; title?: string; summary?: string; content?: string },
) {
  await requireTaskAccess(ctx, taskId);

  const patch: Record<string, string | number> = {
    updatedAt: now(),
  };

  if (title !== undefined) {
    patch.title = title.trim();
  }

  if (summary !== undefined) {
    patch.summary = summary;
  }

  if (content !== undefined) {
    patch.content = content;
  }

  await ctx.db.patch(taskId, patch);
}

export const setDueDateArgs = {
  taskId: v.id("tasks"),
  dueDate: v.union(v.number(), v.null()),
};

export async function setDueDateHandler(
  ctx: MutationCtx,
  { taskId, dueDate }: { taskId: Id<"tasks">; dueDate: number | null },
) {
  await requireTaskAccess(ctx, taskId);

  await ctx.db.patch(taskId, {
    dueDate: dueDate ?? undefined,
    updatedAt: now(),
  });
}

export const setAssigneesArgs = {
  taskId: v.id("tasks"),
  assigneeIds: v.array(v.string()),
};

export async function setAssigneesHandler(
  ctx: MutationCtx,
  { taskId, assigneeIds }: { taskId: Id<"tasks">; assigneeIds: string[] },
) {
  await requireTaskAccess(ctx, taskId);

  await ctx.db.patch(taskId, {
    assigneeIds,
    updatedAt: now(),
  });
}

export const setPhaseArgs = {
  taskId: v.id("tasks"),
  phaseId: v.id("phases"),
};

export async function setPhaseHandler(
  ctx: MutationCtx,
  { taskId, phaseId: nextPhaseId }: { taskId: Id<"tasks">; phaseId: Id<"phases"> },
) {
  const { task, project } = await requireTaskAccess(ctx, taskId);

  if (task.phaseId === nextPhaseId) {
    return;
  }

  const { phase: nextPhase } = await requirePhaseAccess(ctx, nextPhaseId);
  if (nextPhase.projectId !== project._id) {
    throw new Error("Phase must belong to the same project.");
  }

  const timestamp = now();
  const oldPhaseId = task.phaseId;

  const remainingInOld = await ctx.db
    .query("tasks")
    .withIndex("by_phase_order", (q) => q.eq("phaseId", oldPhaseId))
    .collect();

  await Promise.all(
    remainingInOld
      .filter((remainingTask) => remainingTask._id !== taskId)
      .sort((a, b) => a.order - b.order)
      .map((remainingTask, index) => {
        if (remainingTask.order === index) {
          return Promise.resolve();
        }

        return ctx.db.patch(remainingTask._id, {
          order: index,
          updatedAt: timestamp,
        });
      }),
  );

  const tasksInNext = await ctx.db
    .query("tasks")
    .withIndex("by_phase_order", (q) => q.eq("phaseId", nextPhaseId))
    .collect();

  await ctx.db.patch(taskId, {
    phaseId: nextPhaseId,
    order: tasksInNext.length,
    updatedAt: timestamp,
  });

  await recomputeProjectState(ctx, project._id);
}

export const toggleCompleteArgs = {
  taskId: v.id("tasks"),
};

export async function toggleCompleteHandler(ctx: MutationCtx, { taskId }: { taskId: Id<"tasks"> }) {
  const { user } = await requireTaskAccess(ctx, taskId);
  return toggleTaskForUser(ctx, {
    userId: user._id,
    taskId,
  });
}

export const deleteByIdArgs = {
  taskId: v.id("tasks"),
};

export async function deleteByIdHandler(ctx: MutationCtx, { taskId }: { taskId: Id<"tasks"> }) {
  const { task, project } = await requireTaskAccess(ctx, taskId);

  const attachments = await ctx.db
    .query("attachments")
    .withIndex("by_task", (q) => q.eq("taskId", taskId))
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

  await ctx.db.delete(taskId);

  const remainingTasks = await ctx.db
    .query("tasks")
    .withIndex("by_phase_order", (q) => q.eq("phaseId", task.phaseId))
    .collect();

  const timestamp = now();
  await Promise.all(
    remainingTasks.map((remainingTask, index) => {
      if (remainingTask.order === index) {
        return Promise.resolve();
      }

      return ctx.db.patch(remainingTask._id, {
        order: index,
        updatedAt: timestamp,
      });
    }),
  );

  await recomputeProjectState(ctx, project._id);
}

export const generateUploadUrlArgs = {};

export async function generateUploadUrlHandler() {
  throw new Error("Use api.r2.generateUploadUrl instead.");
}

export const saveAttachmentArgs = {
  taskId: v.id("tasks"),
  r2ObjectKey: v.string(),
  fileName: v.string(),
  fileSize: v.number(),
  mimeType: v.string(),
};

export async function saveAttachmentHandler(
  ctx: MutationCtx,
  args: {
    taskId: Id<"tasks">;
    r2ObjectKey: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
  },
) {
  await requireTaskAccess(ctx, args.taskId);

  const timestamp = now();

  const type =
    args.mimeType.startsWith("image/")
      ? "image"
      : args.mimeType === "application/pdf"
        ? "pdf"
        : args.mimeType.includes("document") ||
            args.mimeType.includes("text") ||
            args.mimeType.includes("word")
          ? "document"
          : "other";

  const attachmentId = await ctx.db.insert("attachments", {
    taskId: args.taskId,
    r2ObjectKey: args.r2ObjectKey,
    type,
    url: (await resolveAssetUrl(args.r2ObjectKey)) ?? args.r2ObjectKey,
    fileName: args.fileName,
    fileSize: args.fileSize,
    mimeType: args.mimeType,
    createdAt: timestamp,
  });

  await ctx.db.patch(args.taskId, {
    updatedAt: timestamp,
  });

  await attachTrackedR2Asset(ctx, { key: args.r2ObjectKey });

  return attachmentId;
}

export const deleteAttachmentArgs = {
  attachmentId: v.id("attachments"),
};

export async function deleteAttachmentHandler(
  ctx: MutationCtx,
  { attachmentId }: { attachmentId: Id<"attachments"> },
) {
  const attachment = await ctx.db.get(attachmentId);
  if (!attachment) {
    throw new Error("Attachment not found.");
  }

  const { task } = await requireTaskAccess(ctx, attachment.taskId);

  if (attachment.storageId) {
    await ctx.storage.delete(attachment.storageId);
  }
  if (attachment.r2ObjectKey) {
    await deleteOldR2Asset(ctx, attachment.r2ObjectKey);
  }

  await ctx.db.delete(attachmentId);
  await ctx.db.patch(task._id, {
    updatedAt: now(),
  });
}
