import type { Doc, Id } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";
import { z } from "zod";
import {
  ensurePortalConfig,
  getUserByEmail,
  requireProjectOwner,
  requireWorkspaceOwner,
} from "../../_helpers";
import { getCurrentSubscriptionSnapshot } from "../../billing";

type ReaderCtx = QueryCtx | MutationCtx;

// Server-side email format guard. Validates before any DB lookup so malformed
// input never reaches getUserByEmail. Mirrors the client inviteTeamMemberSchema.
const inviteEmailSchema = z
  .string()
  .trim()
  .min(1, "Enter an email address.")
  .max(254, "Email is too long.")
  .email("Please enter a valid email address.");

// process is a Node global Convex's runtime types do not expose.
const globalProcess = (globalThis as { process?: { env?: Record<string, string | undefined> } })
  .process;
const SITE_URL = globalProcess?.env?.SITE_URL ?? "https://getstage.co";

function getInviterName(name?: string | null, email?: string | null) {
  const trimmedName = name?.trim();
  if (trimmedName) {
    return trimmedName;
  }

  const trimmedEmail = email?.trim().toLowerCase();
  if (!trimmedEmail) {
    return "A Stage collaborator";
  }

  const [localPart] = trimmedEmail.split("@");
  return localPart || "A Stage collaborator";
}

// Insert a workspace membership: one row = one editor on ALL of the owner's
// projects. Requires the owner's active subscription (members are covered by it)
// and dedups per (owner, user).
async function insertWorkspaceMembership(
  ctx: MutationCtx,
  args: { owner: Doc<"users">; email: string },
) {
  const normalizedEmail = inviteEmailSchema.parse(args.email).toLowerCase();
  const ownerSubscription = await getCurrentSubscriptionSnapshot(ctx, String(args.owner._id));
  if (!ownerSubscription || !ownerSubscription.plan) {
    throw new Error("Active Stage subscription required to invite members.");
  }

  const targetUser = await getUserByEmail(ctx, normalizedEmail);
  if (!targetUser) {
    throw new Error("No user found with that email address.");
  }

  if (targetUser._id === args.owner._id) {
    throw new Error("You are already the owner of this workspace.");
  }

  const existing = await ctx.db
    .query("projectCollaborators")
    .withIndex("by_owner_user", (q) =>
      q.eq("ownerUserId", args.owner._id).eq("userId", targetUser._id),
    )
    .first();

  if (existing) {
    throw new Error("This user is already a member of your workspace.");
  }

  const currentMembers = await ctx.db
    .query("projectCollaborators")
    .withIndex("by_owner", (q) => q.eq("ownerUserId", args.owner._id))
    .collect();

  // Owner occupies one seat; reject once the remaining seats are full.
  const seatLimit = ownerSubscription.seats;
  if (currentMembers.length + 1 >= seatLimit) {
    throw new Error(
      `You've reached your plan's seat limit (${seatLimit}). Upgrade to Team to add more members.`,
    );
  }

  const memberId = await ctx.db.insert("projectCollaborators", {
    ownerUserId: args.owner._id,
    userId: targetUser._id,
    role: "editor",
    addedBy: args.owner._id,
    createdAt: Date.now(),
  });

  return { memberId, targetUser, normalizedEmail };
}

// Legacy per-project entry point, kept so the existing project share dialogs
// keep working. Membership is still workspace-wide.
export async function addCollaboratorRecord(
  ctx: MutationCtx,
  args: { projectId: Id<"projects">; email: string },
) {
  const { user: owner, project } = await requireProjectOwner(ctx, args.projectId);
  const { memberId, targetUser, normalizedEmail } = await insertWorkspaceMembership(ctx, {
    owner,
    email: args.email,
  });

  const portalConfig = await ensurePortalConfig(ctx, args.projectId);

  return {
    collaboratorId: memberId,
    ownerId: String(owner._id),
    inviterName: getInviterName(owner.name ?? null, owner.email ?? null),
    recipientEmail: targetUser.email ?? normalizedEmail,
    projectName: project.name,
    portalUrl: portalConfig.shareUrl,
    workspaceUrl: `${SITE_URL}/project/${args.projectId}`,
  };
}

// Workspace-native entry point for Settings → Team (no project context).
export async function addWorkspaceMemberRecord(ctx: MutationCtx, args: { email: string }) {
  const { owner } = await requireWorkspaceOwner(ctx);
  const { memberId, targetUser, normalizedEmail } = await insertWorkspaceMembership(ctx, {
    owner,
    email: args.email,
  });

  return {
    memberId,
    ownerId: String(owner._id),
    inviterName: getInviterName(owner.name ?? null, owner.email ?? null),
    recipientEmail: targetUser.email ?? normalizedEmail,
    workspaceUrl: SITE_URL,
  };
}

// Owner-facing member list, shared by the project and workspace list queries so
// both return the same member shape.
export async function listWorkspaceMembers(ctx: ReaderCtx, ownerId: Id<"users">) {
  const members = await ctx.db
    .query("projectCollaborators")
    .withIndex("by_owner", (q) => q.eq("ownerUserId", ownerId))
    .collect();

  return Promise.all(
    members.map(async (member) => {
      const user = await ctx.db.get(member.userId);
      return {
        _id: member._id,
        userId: member.userId,
        role: member.role,
        name: user?.name ?? null,
        email: user?.email ?? null,
        createdAt: member.createdAt,
      };
    }),
  );
}
