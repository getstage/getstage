import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { deleteOldR2Asset } from "../r2";
import { deleteGeneratedDesignsForProject } from "../integrations/stitch";
import {
  deleteAllProjectAiData,
  deleteCollaboratorMembershipsForUser,
  deleteWorkspaceMembershipsForOwner,
} from "../lib/projectAi/domain/projectCleanup";

async function deleteAttachmentTreeForProject(
  ctx: MutationCtx,
  projectId: Id<"projects">,
) {
  const phases = await ctx.db
    .query("phases")
    .withIndex("by_project", (q) => q.eq("projectId", projectId))
    .collect();

  for (const phase of phases) {
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_phase", (q) => q.eq("phaseId", phase._id))
      .collect();

    for (const task of tasks) {
      const attachments = await ctx.db
        .query("attachments")
        .withIndex("by_task", (q) => q.eq("taskId", task._id))
        .collect();

      for (const attachment of attachments) {
        if (attachment.storageId) {
          await ctx.storage.delete(attachment.storageId);
        }
        if (attachment.r2ObjectKey) {
          await deleteOldR2Asset(ctx, attachment.r2ObjectKey);
        }
        await ctx.db.delete(attachment._id);
      }

      await ctx.db.delete(task._id);
    }

    await ctx.db.delete(phase._id);
  }

  const portalConfig = await ctx.db
    .query("portalConfigs")
    .withIndex("by_project", (q) => q.eq("projectId", projectId))
    .unique();

  if (portalConfig) {
    await ctx.db.delete(portalConfig._id);
  }

  await deleteGeneratedDesignsForProject(ctx, projectId);
}

export async function deleteAccountDataForUser(
  ctx: MutationCtx,
  userId: Id<"users">,
) {
  const user = await ctx.db.get(userId);
  if (!user) {
    return { deleted: false };
  }

  await deleteWorkspaceDataForUser(ctx, userId);

  const refreshedUser = await ctx.db.get(userId);
  if (!refreshedUser) {
    return { deleted: false };
  }

  const authSessions = await ctx.db
    .query("authSessions")
    .withIndex("userId", (q) => q.eq("userId", userId))
    .collect();
  for (const authSession of authSessions) {
    const refreshTokens = await ctx.db
      .query("authRefreshTokens")
      .withIndex("sessionId", (q) => q.eq("sessionId", authSession._id))
      .collect();
    for (const refreshToken of refreshTokens) {
      await ctx.db.delete(refreshToken._id);
    }

    const verifiers = await ctx.db
      .query("authVerifiers")
      .filter((q) => q.eq(q.field("sessionId"), authSession._id))
      .collect();
    for (const verifier of verifiers) {
      await ctx.db.delete(verifier._id);
    }

    await ctx.db.delete(authSession._id);
  }

  const authAccounts = await ctx.db
    .query("authAccounts")
    .filter((q) => q.eq(q.field("userId"), userId))
    .collect();
  for (const authAccount of authAccounts) {
    const verificationCodes = await ctx.db
      .query("authVerificationCodes")
      .withIndex("accountId", (q) => q.eq("accountId", authAccount._id))
      .collect();
    for (const verificationCode of verificationCodes) {
      await ctx.db.delete(verificationCode._id);
    }

    await ctx.db.delete(authAccount._id);
  }

  const userEmail = refreshedUser.email ?? null;
  if (userEmail) {
    const emailRateLimit = await ctx.db
      .query("authRateLimits")
      .withIndex("identifier", (q) => q.eq("identifier", userEmail))
      .unique();
    if (emailRateLimit) {
      await ctx.db.delete(emailRateLimit._id);
    }
  }

  const userPhone = refreshedUser.phone ?? null;
  if (userPhone) {
    const phoneRateLimit = await ctx.db
      .query("authRateLimits")
      .withIndex("identifier", (q) => q.eq("identifier", userPhone))
      .unique();
    if (phoneRateLimit) {
      await ctx.db.delete(phoneRateLimit._id);
    }
  }

  await ctx.db.delete(userId);

  return { deleted: true };
}

export async function deleteWorkspaceDataForUser(
  ctx: MutationCtx,
  userId: Id<"users">,
) {
  const user = await ctx.db.get(userId);
  if (!user) {
    return { deleted: false };
  }

  const projectAvatarKeys = new Set<string>();
  const clientAvatarKeys = new Set<string>();

  const financeEntries = await ctx.db
    .query("financeEntries")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  for (const financeEntry of financeEntries) {
    await ctx.db.delete(financeEntry._id);
  }

  const payments = await ctx.db
    .query("payments")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  for (const payment of payments) {
    await ctx.db.delete(payment._id);
  }

  const invoices = await ctx.db
    .query("invoices")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  for (const invoice of invoices) {
    await ctx.db.delete(invoice._id);
  }

  const sheetImportRuns = await ctx.db
    .query("sheetImportRuns")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  for (const importRun of sheetImportRuns) {
    await ctx.db.delete(importRun._id);
  }

  const sheetConnections = await ctx.db
    .query("sheetConnections")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  for (const sheetConnection of sheetConnections) {
    if (sheetConnection.storageId) {
      await ctx.storage.delete(sheetConnection.storageId);
    }
    if (sheetConnection.r2ObjectKey) {
      await deleteOldR2Asset(ctx, sheetConnection.r2ObjectKey);
    }
    await ctx.db.delete(sheetConnection._id);
  }

  const paymentConnections = await ctx.db
    .query("paymentConnections")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  for (const paymentConnection of paymentConnections) {
    await ctx.db.delete(paymentConnection._id);
  }

  const subscriptions = await ctx.db
    .query("subscriptions")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  for (const subscription of subscriptions) {
    await ctx.db.delete(subscription._id);
  }

  const projects = await ctx.db
    .query("projects")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  for (const project of projects) {
    if (project.clientAvatarUrl) {
      projectAvatarKeys.add(project.clientAvatarUrl);
    }
    await deleteAttachmentTreeForProject(ctx, project._id);
    await deleteAllProjectAiData(ctx, project._id);
    await ctx.db.delete(project._id);
  }

  // Remove the workspace this user owned (their members) plus any workspaces
  // they were a member of.
  await deleteWorkspaceMembershipsForOwner(ctx, userId);
  await deleteCollaboratorMembershipsForUser(ctx, userId);

  const clients = await ctx.db
    .query("clients")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  for (const client of clients) {
    if (client.avatarUrl) {
      clientAvatarKeys.add(client.avatarUrl);
    }
    await ctx.db.delete(client._id);
  }

  for (const avatarKey of projectAvatarKeys) {
    await deleteOldR2Asset(ctx, avatarKey);
  }
  for (const avatarKey of clientAvatarKeys) {
    await deleteOldR2Asset(ctx, avatarKey);
  }
  await deleteOldR2Asset(ctx, user.avatarUrl);
  await deleteOldR2Asset(ctx, user.defaultPortalLogoUrl);

  return { deleted: true };
}
