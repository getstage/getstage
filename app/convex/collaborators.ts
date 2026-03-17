import { action, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireProjectOwner } from "./_helpers";
import { internal } from "./_generated/api";
import { enforceProjectInviteRateLimit } from "./rateLimits";
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

function getEnv(name: string) {
  return (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.[
    name
  ];
}

function getProjectInviteTransactionalId() {
  const transactionalId =
    getEnv("LOOPS_INVITE_TRANSACTIONAL_ID") ??
    getEnv("LOOPS_PROJECT_INVITE_TRANSACTIONAL_ID") ??
    getEnv("AUTH_LOOPS_PROJECT_INVITE_TRANSACTIONAL_ID") ??
    null;

  if (!transactionalId) {
    throw new Error("LOOPS_INVITE_TRANSACTIONAL_ID is not set");
  }

  return transactionalId;
}

function getLoopsApiKey() {
  const apiKey = getEnv("AUTH_LOOPS_API_KEY") ?? getEnv("LOOPS_API_KEY");

  if (!apiKey) {
    throw new Error("AUTH_LOOPS_API_KEY is not set");
  }

  return apiKey;
}

function toInviteErrorMessage(error: unknown) {
  if (!(error instanceof Error) || !error.message) {
    return "Team member added, but the invite email could not be sent.";
  }

  const message = error.message.trim();
  if (
    message.startsWith("Too many project invites") ||
    message.startsWith("You've sent too many project invites") ||
    message.startsWith("An invite was already sent")
  ) {
    return message;
  }

  return "Team member added, but the invite email could not be sent.";
}

async function sendProjectInviteEmail(args: {
  email: string;
  inviterName: string;
  projectName: string;
  workspaceUrl: string;
}) {
  const response = await fetch("https://app.loops.so/api/v1/transactional", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getLoopsApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      transactionalId: getProjectInviteTransactionalId(),
      email: args.email,
      dataVariables: {
        inviterName: args.inviterName,
        projectName: args.projectName,
        portalUrl: args.workspaceUrl,
        workspaceUrl: args.workspaceUrl,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to send project invite email: ${response.status} ${errorText}`);
  }
}

export const add = action({
  args: {
    projectId: v.id("projects"),
    email: v.string(),
  },
  handler: async (ctx, args): Promise<AddCollaboratorResult> => {
    const collaborator = (await ctx.runMutation(
      internal.collaboratorInvites.addRecord,
      args,
    )) as AddedCollaboratorPayload;

    try {
      await enforceProjectInviteRateLimit(ctx, {
        ownerId: collaborator.ownerId,
        projectId: String(args.projectId),
        email: collaborator.recipientEmail,
      });

      await sendProjectInviteEmail({
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
    await requireProjectOwner(ctx, projectId);

    const record = await ctx.db.get(collaboratorId);
    if (!record || record.projectId !== projectId) {
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
    await requireProjectOwner(ctx, projectId);

    const collaborators = await ctx.db
      .query("projectCollaborators")
      .withIndex("by_project", (q) => q.eq("projectId", projectId))
      .collect();

    return Promise.all(
      collaborators.map(async (collab) => {
        const user = await ctx.db.get(collab.userId);
        return {
          _id: collab._id,
          userId: collab.userId,
          role: collab.role,
          name: user?.name ?? null,
          email: user?.email ?? null,
          createdAt: collab.createdAt,
        };
      }),
    );
  },
});
