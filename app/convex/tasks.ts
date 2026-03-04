import { v } from "convex/values";
import { mutation, type MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import {
  recomputeProjectState,
  requireAuthUser,
  requirePhaseOwner,
  requireTaskOwner,
} from "./_helpers";

function now() {
  return Date.now();
}

async function getProjectIdForTask(
  ctx: MutationCtx,
  taskId: Id<"tasks">,
) {
  const { task, project } = await requireTaskOwner(ctx, taskId);
  return { task, projectId: project._id };
}

export const create = mutation({
  args: {
    phaseId: v.id("phases"),
    title: v.string(),
  },
  handler: async (ctx, { phaseId, title }) => {
    const { project } = await requirePhaseOwner(ctx, phaseId);

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
    await requireTaskOwner(ctx, taskId);

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

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAuthUser(ctx);
    return ctx.storage.generateUploadUrl();
  },
});

export const saveAttachment = mutation({
  args: {
    taskId: v.id("tasks"),
    storageId: v.id("_storage"),
    fileName: v.string(),
    fileSize: v.number(),
    mimeType: v.string(),
  },
  handler: async (ctx, args) => {
    await requireTaskOwner(ctx, args.taskId);

    const storageUrl = await ctx.storage.getUrl(args.storageId);
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
      storageId: args.storageId,
      type,
      url: storageUrl ?? "",
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
