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
import { resolveAssetUrl } from "./helpers/r2/resolve";

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
  args: { ownerUserId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);
    const ownerUserId = await resolveReadableSpaceOwner(ctx, user._id, args.ownerUserId);
    return listWorkspaceMembers(ctx, ownerUserId);
  },
});

export const listPending = query({
  args: { ownerUserId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);
    const ownerUserId = await resolveReadableSpaceOwner(ctx, user._id, args.ownerUserId);
    return listPendingWorkspaceInvites(ctx, ownerUserId);
  },
});

async function resolveReadableSpaceOwner(
  ctx: Parameters<typeof requireAuthUser>[0],
  userId: Id<"users">,
  ownerUserId?: Id<"users">,
) {
  if (!ownerUserId) {
    const workspace = await resolveWorkspaceContext(ctx, userId);
    return workspace.ownerUserId;
  }
  if (ownerUserId === userId) return ownerUserId;
  const memberships = await ctx.db
    .query("projectCollaborators")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  if (!memberships.some((membership) => membership.ownerUserId === ownerUserId)) {
    throw new Error("You do not have access to that workspace.");
  }
  return ownerUserId;
}

export const listSpaces = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuthUser(ctx);
    const memberships = await ctx.db
      .query("projectCollaborators")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    const spaces: Array<{
      ownerUserId: string;
      name: string;
      email: string;
      avatarUrl?: string;
      role: "owner" | "member";
    }> = [];
    const seen = new Set<string>([String(user._id)]);
    for (const membership of memberships) {
      const ownerUserId = String(membership.ownerUserId);
      if (seen.has(ownerUserId)) continue;
      seen.add(ownerUserId);
      const owner = await ctx.db.get(membership.ownerUserId);
      spaces.push({
        ownerUserId,
        name: owner?.name?.trim() || owner?.email || "Team",
        email: owner?.email ?? "",
        avatarUrl: (await resolveAssetUrl(owner?.avatarUrl || owner?.image)) ?? undefined,
        role: "member" as const,
      });
    }
    spaces.push({
      ownerUserId: String(user._id),
      name: user.name?.trim() || user.email || "Personal",
      email: user.email ?? "",
      avatarUrl: (await resolveAssetUrl(user.avatarUrl || user.image)) ?? undefined,
      role: "owner" as const,
    });
    return spaces.sort((left, right) => Number(left.role === "owner") - Number(right.role === "owner"));
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
