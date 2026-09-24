import { v } from "convex/values";
import { internalMutation, internalQuery } from "../../_generated/server";
import {
  acceptWorkspaceInviteRecord,
  createProjectInviteRecord,
  createWorkspaceInviteRecord,
  getProjectInviteRateLimitContext,
  getResendInviteRateLimitContext,
  getWorkspaceInviteRateLimitContext,
  getWorkspaceInvitePreview,
  refreshWorkspaceInviteRecord,
} from "./service";

export const addRecord = internalMutation({
  args: {
    projectId: v.id("projects"),
    email: v.string(),
    tokenHash: v.string(),
  },
  handler: async (ctx, args) => createProjectInviteRecord(ctx, args),
});

export const getProjectRateLimitContext = internalQuery({
  args: {
    projectId: v.id("projects"),
    email: v.string(),
  },
  handler: async (ctx, args) => getProjectInviteRateLimitContext(ctx, args),
});

export const addWorkspaceRecord = internalMutation({
  args: {
    email: v.string(),
    tokenHash: v.string(),
  },
  handler: async (ctx, args) => createWorkspaceInviteRecord(ctx, args),
});

export const getWorkspaceRateLimitContext = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, args) => getWorkspaceInviteRateLimitContext(ctx, args.email),
});

export const getResendRateLimitContext = internalQuery({
  args: { inviteId: v.id("workspaceInvites") },
  handler: async (ctx, args) => getResendInviteRateLimitContext(ctx, args.inviteId),
});

export const refreshWorkspaceRecord = internalMutation({
  args: {
    inviteId: v.id("workspaceInvites"),
    tokenHash: v.string(),
  },
  handler: async (ctx, args) => refreshWorkspaceInviteRecord(ctx, args),
});

export const previewByTokenHash = internalQuery({
  args: { tokenHash: v.string() },
  handler: async (ctx, args) => getWorkspaceInvitePreview(ctx, args.tokenHash),
});

export const acceptByTokenHash = internalMutation({
  args: { tokenHash: v.string() },
  handler: async (ctx, args) => acceptWorkspaceInviteRecord(ctx, args.tokenHash),
});
