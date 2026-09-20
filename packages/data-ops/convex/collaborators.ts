import { action, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireProjectOwner } from "./_helpers";
import { internal } from "./_generated/api";
import { enforceWorkspaceInviteRateLimit } from "./platform/rateLimits";
import {
  buildWorkspaceInviteUrl,
  sendInviteEmail,
  toInviteErrorMessage,
} from "./platform/inviteEmail";
import { createInviteToken, hashInviteToken } from "./platform/inviteTokens";
import { listWorkspaceMembers } from "./domain/collaborators/service";
import type { Id } from "./_generated/dataModel";

type AddedCollaboratorPayload = {
  inviteId: Id<"workspaceInvites">;
  ownerId: string;
  inviterName: string;
  recipientEmail: string;
  projectName: string;
};

type AddCollaboratorResult = {
  inviteId: Id<"workspaceInvites">;
  inviteSent: boolean;
  inviteError?: string;
};

type InviteRateLimitContext = { ownerId: string; recipientEmail: string };

export const add = action({
  args: {
    projectId: v.id("projects"),
    email: v.string(),
  },
  handler: async (ctx, args): Promise<AddCollaboratorResult> => {
    const rateLimitContext = (await ctx.runQuery(
      internal.domain.collaborators.invites.getProjectRateLimitContext,
      args,
    )) as InviteRateLimitContext;
    await enforceWorkspaceInviteRateLimit(ctx, {
      ownerId: rateLimitContext.ownerId,
      email: rateLimitContext.recipientEmail,
    });

    const token = createInviteToken();
    const tokenHash = await hashInviteToken(token);
    const collaborator = (await ctx.runMutation(
      internal.domain.collaborators.invites.addRecord,
      { ...args, tokenHash },
    )) as AddedCollaboratorPayload;

    try {
      await sendInviteEmail({
        email: collaborator.recipientEmail,
        inviterName: collaborator.inviterName,
        projectName: collaborator.projectName,
        inviteUrl: buildWorkspaceInviteUrl(token),
      });

      return {
        inviteId: collaborator.inviteId,
        inviteSent: true,
      };
    } catch (error) {
      console.error("Failed to send project invite email", error);
      return {
        inviteId: collaborator.inviteId,
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
