import { action, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireWorkspaceOwner } from "./_helpers";
import { internal } from "./_generated/api";
import { enforceWorkspaceInviteRateLimit } from "./platform/rateLimits";
import { sendInviteEmail, toInviteErrorMessage } from "./platform/inviteEmail";
import { listWorkspaceMembers } from "./domain/collaborators/service";
import type { Id } from "./_generated/dataModel";

// Workspace-native team API for Settings → Team. Every user owns exactly one
// workspace (the projects they own + the members they invite); these operate on
// the caller's own workspace, with no project context.

type AddedWorkspaceMemberPayload = {
  memberId: Id<"projectCollaborators">;
  ownerId: string;
  inviterName: string;
  recipientEmail: string;
  workspaceUrl: string;
};

type AddWorkspaceMemberResult = {
  memberId: Id<"projectCollaborators">;
  inviteSent: boolean;
  inviteError?: string;
};

export const list = query({
  args: {},
  handler: async (ctx) => {
    const { owner } = await requireWorkspaceOwner(ctx);
    return listWorkspaceMembers(ctx, owner._id);
  },
});

export const add = action({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args): Promise<AddWorkspaceMemberResult> => {
    const member = (await ctx.runMutation(
      internal.domain.collaborators.invites.addWorkspaceRecord,
      args,
    )) as AddedWorkspaceMemberPayload;

    try {
      await enforceWorkspaceInviteRateLimit(ctx, {
        ownerId: member.ownerId,
        email: member.recipientEmail,
      });

      await sendInviteEmail({
        email: member.recipientEmail,
        inviterName: member.inviterName,
        // Reuses the project invite template until Phase 3 ships workspace copy.
        projectName: "your workspace",
        workspaceUrl: member.workspaceUrl,
      });

      return {
        memberId: member.memberId,
        inviteSent: true,
      };
    } catch (error) {
      console.error("Failed to send workspace invite email", error);
      return {
        memberId: member.memberId,
        inviteSent: false,
        inviteError: toInviteErrorMessage(error),
      };
    }
  },
});

export const remove = mutation({
  args: {
    memberId: v.id("projectCollaborators"),
  },
  handler: async (ctx, { memberId }) => {
    const { owner } = await requireWorkspaceOwner(ctx);

    const record = await ctx.db.get(memberId);
    if (!record || record.ownerUserId !== owner._id) {
      throw new Error("Workspace member not found.");
    }

    await ctx.db.delete(memberId);
  },
});
