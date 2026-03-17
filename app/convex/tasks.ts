import { v } from "convex/values";
import { mutation, type MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import {
  requirePhaseAccess,
  requireTaskAccess,
  requireTaskOwner,
} from "./_helpers";
import { recomputeProjectState } from "./domain/projects/readModel";
import { deleteOldR2Asset, r2 } from "./r2";

function now() {
  return Date.now();
}

async function getProjectIdForTask(
  ctx: MutationCtx,
  taskId: Id<"tasks">,
) {
  const { task, project, role } = await requireTaskAccess(ctx, taskId);
  return { task, projectId: project._id, role };
}

export const create = mutation({
  args: {
    phaseId: v.id("phases"),
    title: v.string(),
  },
  handler: async (ctx, { phaseId, title }) => {
    const { project } = await requirePhaseAccess(ctx, phaseId);

    const existingTasks = await ctx.db
      .query("tasks")
      .withIndex("by_phase_order", (q) => q.eq("phaseId", phaseId))
      .collect();

    const timestamp = now();
    const taskId = await ctx.db.insert("tasks", {
      phaseId,
      title: title.trim(),
      isCompleted: false,
      content: "",
      order: existingTasks.length,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    await recomputeProjectState(ctx, project._id);
    return taskId;
  },
});

export const update = mutation({
  args: {
    taskId: v.id("tasks"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
  },
  handler: async (ctx, { taskId, title, content }) => {
    await requireTaskAccess(ctx, taskId);

    const patch: Record<string, string | number> = {
      updatedAt: now(),
    };

    if (title !== undefined) {
      patch.title = title.trim();
    }

    if (content !== undefined) {
      patch.content = content;
    }

    await ctx.db.patch(taskId, patch);
  },
});

export const toggleComplete = mutation({
  args: {
    taskId: v.id("tasks"),
  },
  handler: async (ctx, { taskId }) => {
    const { task, projectId } = await getProjectIdForTask(ctx, taskId);

    await ctx.db.patch(taskId, {
      isCompleted: !task.isCompleted,
      updatedAt: now(),
    });

    await recomputeProjectState(ctx, projectId);
  },
});

export const deleteById = mutation({
  args: {
    taskId: v.id("tasks"),
  },
  handler: async (ctx, { taskId }) => {
    const { task, project } = await requireTaskOwner(ctx, taskId);

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
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async () => {
    throw new Error("Use api.r2.generateUploadUrl instead.");
  },
});

export const saveAttachment = mutation({
  args: {
    taskId: v.id("tasks"),
    r2ObjectKey: v.string(),
    fileName: v.string(),
    fileSize: v.number(),
    mimeType: v.string(),
  },
  handler: async (ctx, args) => {
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
      url: await r2.getUrl(args.r2ObjectKey),
      fileName: args.fileName,
      fileSize: args.fileSize,
      mimeType: args.mimeType,
      createdAt: timestamp,
    });

    await ctx.db.patch(args.taskId, {
      updatedAt: timestamp,
    });

    return attachmentId;
  },
});

export const deleteAttachment = mutation({
  args: {
    attachmentId: v.id("attachments"),
  },
  handler: async (ctx, { attachmentId }) => {
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
  },
});
