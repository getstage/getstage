import { action, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAuthUser, requireWorkspaceOwner } from "./_helpers";
import { internal } from "./_generated/api";
import { enforceWorkspaceInviteRateLimit } from "./platform/rateLimits";
import {
  buildWorkspaceInviteUrl,
  sendInviteEmail,
  toInviteErrorMessage,
} from "./platform/inviteEmail";
import { createInviteToken, hashInviteToken } from "./platform/inviteTokens";
import {
  listPendingWorkspaceInvites,
  listWorkspaceMembers,
  resolveWorkspaceContext,
  revokeWorkspaceInviteRecord,
} from "./domain/collaborators/service";
import type { Id } from "./_generated/dataModel";

// Workspace-native team API for Settings → Team. Every user owns exactly one
// workspace (the projects they own + the members they invite); these operate on
// the caller's own workspace, with no project context.

type AddedWorkspaceMemberPayload = {
  inviteId: Id<"workspaceInvites">;
  ownerId: string;
  inviterName: string;
  recipientEmail: string;
  projectName: string;
};

type AddWorkspaceMemberResult = {
  inviteId: Id<"workspaceInvites">;
  inviteSent: boolean;
  inviteError?: string;
};

type InviteRateLimitContext = { ownerId: string; recipientEmail: string };

export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuthUser(ctx);
    const workspace = await resolveWorkspaceContext(ctx, user._id);
    return listWorkspaceMembers(ctx, workspace.ownerUserId);
  },
});

export const listPending = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuthUser(ctx);
    const workspace = await resolveWorkspaceContext(ctx, user._id);
    return listPendingWorkspaceInvites(ctx, workspace.ownerUserId);
  },
});

export const add = action({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args): Promise<AddWorkspaceMemberResult> => {
    const rateLimitContext = (await ctx.runQuery(
      internal.domain.collaborators.invites.getWorkspaceRateLimitContext,
      args,
    )) as InviteRateLimitContext;
    await enforceWorkspaceInviteRateLimit(ctx, {
      ownerId: rateLimitContext.ownerId,
      email: rateLimitContext.recipientEmail,
    });

    const token = createInviteToken();
    const tokenHash = await hashInviteToken(token);
    const member = (await ctx.runMutation(
      internal.domain.collaborators.invites.addWorkspaceRecord,
      { ...args, tokenHash },
    )) as AddedWorkspaceMemberPayload;

    try {
      await sendInviteEmail({
        email: member.recipientEmail,
        inviterName: member.inviterName,
        projectName: member.projectName,
        inviteUrl: buildWorkspaceInviteUrl(token),
      });

      return {
        inviteId: member.inviteId,
        inviteSent: true,
      };
    } catch (error) {
      console.error("Failed to send workspace invite email", error);
      return {
        inviteId: member.inviteId,
        inviteSent: false,
        inviteError: toInviteErrorMessage(error),
      };
    }
  },
});

export const resend = action({
  args: { inviteId: v.id("workspaceInvites") },
  handler: async (ctx, args): Promise<AddWorkspaceMemberResult> => {
    const rateLimitContext = (await ctx.runQuery(
      internal.domain.collaborators.invites.getResendRateLimitContext,
      args,
    )) as InviteRateLimitContext;
    await enforceWorkspaceInviteRateLimit(ctx, {
      ownerId: rateLimitContext.ownerId,
      email: rateLimitContext.recipientEmail,
    });

    const token = createInviteToken();
    const tokenHash = await hashInviteToken(token);
    const invite = (await ctx.runMutation(
      internal.domain.collaborators.invites.refreshWorkspaceRecord,
      { ...args, tokenHash },
    )) as AddedWorkspaceMemberPayload;

    try {
      await sendInviteEmail({
        email: invite.recipientEmail,
        inviterName: invite.inviterName,
        projectName: invite.projectName,
        inviteUrl: buildWorkspaceInviteUrl(token),
      });
      return { inviteId: invite.inviteId, inviteSent: true };
    } catch (error) {
      console.error("Failed to resend workspace invite email", error);
      return {
        inviteId: invite.inviteId,
        inviteSent: false,
        inviteError: toInviteErrorMessage(error),
      };
    }
  },
});

export const revoke = mutation({
  args: { inviteId: v.id("workspaceInvites") },
  handler: async (ctx, args) => revokeWorkspaceInviteRecord(ctx, args.inviteId),
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
