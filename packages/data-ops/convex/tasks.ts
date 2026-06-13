import { mutation, query } from "./_generated/server";
import * as handlers from "./lib/tasks/handlers";

export const getProjectMembers = query({
  args: handlers.getProjectMembersArgs,
  handler: handlers.getProjectMembersHandler,
});

export const create = mutation({
  args: handlers.createArgs,
  handler: handlers.createHandler,
});

export const getDetail = query({
  args: handlers.getDetailArgs,
  handler: handlers.getDetailHandler,
});

export const update = mutation({
  args: handlers.updateArgs,
  handler: handlers.updateHandler,
});

export const setDueDate = mutation({
  args: handlers.setDueDateArgs,
  handler: handlers.setDueDateHandler,
});

export const setAssignees = mutation({
  args: handlers.setAssigneesArgs,
  handler: handlers.setAssigneesHandler,
});

export const setPhase = mutation({
  args: handlers.setPhaseArgs,
  handler: handlers.setPhaseHandler,
});

export const toggleComplete = mutation({
  args: handlers.toggleCompleteArgs,
  handler: handlers.toggleCompleteHandler,
});

export const deleteById = mutation({
  args: handlers.deleteByIdArgs,
  handler: handlers.deleteByIdHandler,
});

export const generateUploadUrl = mutation({
  args: handlers.generateUploadUrlArgs,
  handler: handlers.generateUploadUrlHandler,
});

export const saveAttachment = mutation({
  args: handlers.saveAttachmentArgs,
  handler: handlers.saveAttachmentHandler,
});

export const deleteAttachment = mutation({
  args: handlers.deleteAttachmentArgs,
  handler: handlers.deleteAttachmentHandler,
});
