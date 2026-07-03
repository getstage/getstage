import { v } from "convex/values";
import { internalMutation } from "../../_generated/server";
import { addCollaboratorRecord, addWorkspaceMemberRecord } from "./service";

export const addRecord = internalMutation({
  args: {
    projectId: v.id("projects"),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    return addCollaboratorRecord(ctx, args);
  },
});

export const addWorkspaceRecord = internalMutation({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    return addWorkspaceMemberRecord(ctx, args);
  },
});
