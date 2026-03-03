import { v } from "convex/values";
import { mutation, type MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { recomputeProjectState } from "./_helpers";

function now() {
  return Date.now();
}

async function getProjectIdForTask(
  ctx: MutationCtx,
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

  return { task, phase, projectId: phase.projectId };
}

export const create = mutation({
  args: {
    phaseId: v.id("phases"),
    title: v.string(),
  },
  handler: async (ctx, { phaseId, title }) => {
    const phase = await ctx.db.get(phaseId);
    if (!phase) {
      throw new Error("Phase not found.");
    }

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

    await recomputeProjectState(ctx, phase.projectId);
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
    const task = await ctx.db.get(taskId);
    if (!task) {
      throw new Error("Task not found.");
    }

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
    const task = await ctx.db.get(args.taskId);
    if (!task) {
      throw new Error("Task not found.");
    }

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
