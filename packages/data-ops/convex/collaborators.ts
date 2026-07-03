import { action, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireProjectOwner } from "./_helpers";
import { internal } from "./_generated/api";
import { enforceWorkspaceInviteRateLimit } from "./platform/rateLimits";
import { sendInviteEmail, toInviteErrorMessage } from "./platform/inviteEmail";
import { listWorkspaceMembers } from "./domain/collaborators/service";
import type { Id } from "./_generated/dataModel";

type AddedCollaboratorPayload = {
  collaboratorId: Id<"projectCollaborators">;
  ownerId: string;
  inviterName: string;
  recipientEmail: string;
  projectName: string;
  portalUrl: string;
  workspaceUrl: string;
};

type AddCollaboratorResult = {
  collaboratorId: Id<"projectCollaborators">;
  inviteSent: boolean;
  inviteError?: string;
};

export const add = action({
  args: {
    projectId: v.id("projects"),
    email: v.string(),
  },
  handler: async (ctx, args): Promise<AddCollaboratorResult> => {
    const collaborator = (await ctx.runMutation(
      internal.domain.collaborators.invites.addRecord,
      args,
    )) as AddedCollaboratorPayload;

    try {
      await enforceWorkspaceInviteRateLimit(ctx, {
        ownerId: collaborator.ownerId,
        email: collaborator.recipientEmail,
      });

      await sendInviteEmail({
        email: collaborator.recipientEmail,
        inviterName: collaborator.inviterName,
        projectName: collaborator.projectName,
        workspaceUrl: collaborator.workspaceUrl,
      });

      return {
        collaboratorId: collaborator.collaboratorId,
        inviteSent: true,
      };
    } catch (error) {
      console.error("Failed to send project invite email", error);
      return {
        collaboratorId: collaborator.collaboratorId,
        inviteSent: false,
        inviteError: toInviteErrorMessage(error),
      };
    }
  },
});

export const remove = mutation({
  args: {
    projectId: v.id("projects"),
    collaboratorId: v.id("projectCollaborators"),
  },
  handler: async (ctx, { projectId, collaboratorId }) => {
    const { user: owner } = await requireProjectOwner(ctx, projectId);

    const record = await ctx.db.get(collaboratorId);
    if (!record || record.ownerUserId !== owner._id) {
      throw new Error("Collaborator not found.");
    }

    await ctx.db.delete(collaboratorId);
  },
});

export const listByProject = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, { projectId }) => {
    const { user: owner } = await requireProjectOwner(ctx, projectId);
    return listWorkspaceMembers(ctx, owner._id);
  },
});
