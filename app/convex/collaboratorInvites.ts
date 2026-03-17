import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { addCollaboratorRecord } from "./collaboratorInviteHelpers";

export const addRecord = internalMutation({
  args: {
    projectId: v.id("projects"),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    return addCollaboratorRecord(ctx, args);
  },
});
