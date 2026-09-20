import type { Doc, Id } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";
import { z } from "zod";
import {
  getUserByEmail,
  requireAuthUser,
  requireProjectOwner,
  requireWorkspaceOwner,
} from "../../_helpers";
import { getCurrentSubscriptionSnapshot } from "../../billing";

type ReaderCtx = QueryCtx | MutationCtx;

export const WORKSPACE_INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const inviteEmailSchema = z
  .string()
  .trim()
  .min(1, "Enter an email address.")
  .max(254, "Email is too long.")
  .email("Please enter a valid email address.");

function normalizeInviteEmail(email: string) {
  return inviteEmailSchema.parse(email).toLowerCase();
}

function getInviterName(name?: string | null, email?: string | null) {
  const trimmedName = name?.trim();
  if (trimmedName) return trimmedName;

  const trimmedEmail = email?.trim().toLowerCase();
  if (!trimmedEmail) return "A Stage collaborator";

  const [localPart] = trimmedEmail.split("@");
  return localPart || "A Stage collaborator";
}

function maskEmail(email: string) {
  const [localPart, domain] = email.split("@");
  if (!localPart || !domain) return email;

  const visible = localPart.slice(0, Math.min(2, localPart.length));
  return `${visible}${"*".repeat(Math.max(1, localPart.length - visible.length))}@${domain}`;
}

async function requireInviteSubscription(ctx: ReaderCtx, ownerUserId: Id<"users">) {
  const subscription = await getCurrentSubscriptionSnapshot(ctx, String(ownerUserId));
  if (!subscription || !subscription.plan) {
    throw new Error("Active Stage subscription required to invite members.");
  }
  return subscription;
}

async function assertInviteSeatAvailable(
  ctx: ReaderCtx,
  ownerUserId: Id<"users">,
  seatLimit: number,
  excludeInviteId?: Id<"workspaceInvites">,
) {
  const now = Date.now();
  const [members, pendingInvites] = await Promise.all([
    ctx.db
      .query("projectCollaborators")
      .withIndex("by_owner", (q) => q.eq("ownerUserId", ownerUserId))
      .collect(),
    ctx.db
      .query("workspaceInvites")
      .withIndex("by_owner_status_expiresAt", (q) =>
        q.eq("ownerUserId", ownerUserId).eq("status", "pending").gt("expiresAt", now),
      )
      .collect(),
  ]);

  const reservedInvites = pendingInvites.filter((invite) => invite._id !== excludeInviteId).length;
  if (1 + members.length + reservedInvites >= seatLimit) {
    throw new Error(
      `You've reached your plan's seat limit (${seatLimit}). Upgrade your plan to add more members.`,
    );
  }
}

async function prepareInvite(
  ctx: MutationCtx,
  args: {
    owner: Doc<"users">;
    email: string;
    tokenHash: string;
    projectName: string;
  },
) {
  const normalizedEmail = normalizeInviteEmail(args.email);
  if (args.owner.email?.trim().toLowerCase() === normalizedEmail) {
    throw new Error("You are already the owner of this workspace.");
  }

  const targetUser = await getUserByEmail(ctx, normalizedEmail);
  if (targetUser) {
    const existingMember = await ctx.db
      .query("projectCollaborators")
      .withIndex("by_owner_user", (q) =>
        q.eq("ownerUserId", args.owner._id).eq("userId", targetUser._id),
      )
      .first();
    if (existingMember) {
      throw new Error("This user is already a member of your workspace.");
    }
  }

  const existingInvite = await ctx.db
    .query("workspaceInvites")
    .withIndex("by_owner_email", (q) =>
      q.eq("ownerUserId", args.owner._id).eq("email", normalizedEmail),
    )
    .unique();
  const subscription = await requireInviteSubscription(ctx, args.owner._id);
  await assertInviteSeatAvailable(ctx, args.owner._id, subscription.seats, existingInvite?._id);

  const timestamp = Date.now();
  const values = {
    ownerUserId: args.owner._id,
    email: normalizedEmail,
    role: "editor" as const,
    tokenHash: args.tokenHash,
    status: "pending" as const,
    expiresAt: timestamp + WORKSPACE_INVITE_TTL_MS,
    acceptedBy: undefined,
    acceptedAt: undefined,
    revokedAt: undefined,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  let inviteId: Id<"workspaceInvites">;
  if (existingInvite) {
    await ctx.db.patch(existingInvite._id, values);
    inviteId = existingInvite._id;
  } else {
    inviteId = await ctx.db.insert("workspaceInvites", values);
  }

  return {
    inviteId,
    ownerId: String(args.owner._id),
    inviterName: getInviterName(args.owner.name ?? null, args.owner.email ?? null),
    recipientEmail: normalizedEmail,
    projectName: args.projectName,
  };
}

export async function createProjectInviteRecord(
  ctx: MutationCtx,
  args: { projectId: Id<"projects">; email: string; tokenHash: string },
) {
  const { user: owner, project } = await requireProjectOwner(ctx, args.projectId);
  return prepareInvite(ctx, {
    owner,
    email: args.email,
    tokenHash: args.tokenHash,
    projectName: project.name,
  });
}

export async function getProjectInviteRateLimitContext(
  ctx: ReaderCtx,
  args: { projectId: Id<"projects">; email: string },
) {
  const { user: owner } = await requireProjectOwner(ctx, args.projectId);
  return {
    ownerId: String(owner._id),
    recipientEmail: normalizeInviteEmail(args.email),
  };
}

export async function createWorkspaceInviteRecord(
  ctx: MutationCtx,
  args: { email: string; tokenHash: string },
) {
  const { owner } = await requireWorkspaceOwner(ctx);
  return prepareInvite(ctx, {
    owner,
    email: args.email,
    tokenHash: args.tokenHash,
    projectName: "your workspace",
  });
}

export async function getWorkspaceInviteRateLimitContext(ctx: ReaderCtx, email: string) {
  const { owner } = await requireWorkspaceOwner(ctx);
  return {
    ownerId: String(owner._id),
    recipientEmail: normalizeInviteEmail(email),
  };
}

export async function getResendInviteRateLimitContext(
  ctx: ReaderCtx,
  inviteId: Id<"workspaceInvites">,
) {
  const { owner } = await requireWorkspaceOwner(ctx);
  const invite = await ctx.db.get(inviteId);
  if (!invite || invite.ownerUserId !== owner._id || invite.status !== "pending") {
    throw new Error("Pending invitation not found.");
  }
  return { ownerId: String(owner._id), recipientEmail: invite.email };
}

export async function refreshWorkspaceInviteRecord(
  ctx: MutationCtx,
  args: { inviteId: Id<"workspaceInvites">; tokenHash: string },
) {
  const { owner } = await requireWorkspaceOwner(ctx);
  const invite = await ctx.db.get(args.inviteId);
  if (!invite || invite.ownerUserId !== owner._id || invite.status !== "pending") {
    throw new Error("Pending invitation not found.");
  }

  const subscription = await requireInviteSubscription(ctx, owner._id);
  await assertInviteSeatAvailable(ctx, owner._id, subscription.seats, invite._id);
  const timestamp = Date.now();
  await ctx.db.patch(invite._id, {
    tokenHash: args.tokenHash,
    expiresAt: timestamp + WORKSPACE_INVITE_TTL_MS,
    updatedAt: timestamp,
  });

  return {
    inviteId: invite._id,
    ownerId: String(owner._id),
    inviterName: getInviterName(owner.name ?? null, owner.email ?? null),
    recipientEmail: invite.email,
    projectName: "your workspace",
  };
}

export async function revokeWorkspaceInviteRecord(
  ctx: MutationCtx,
  inviteId: Id<"workspaceInvites">,
) {
  const { owner } = await requireWorkspaceOwner(ctx);
  const invite = await ctx.db.get(inviteId);
  if (!invite || invite.ownerUserId !== owner._id || invite.status !== "pending") {
    throw new Error("Pending invitation not found.");
  }

  const timestamp = Date.now();
  await ctx.db.patch(invite._id, {
    status: "revoked",
    revokedAt: timestamp,
    updatedAt: timestamp,
  });
}

export async function getWorkspaceInvitePreview(ctx: ReaderCtx, tokenHash: string) {
  const invite = await ctx.db
    .query("workspaceInvites")
    .withIndex("by_token_hash", (q) => q.eq("tokenHash", tokenHash))
    .unique();
  if (!invite) return { status: "invalid" as const };

  const status =
    invite.status === "pending" && invite.expiresAt <= Date.now() ? "expired" : invite.status;
  const owner = await ctx.db.get(invite.ownerUserId);
  return {
    status,
    inviterName: getInviterName(owner?.name ?? null, owner?.email ?? null),
    invitedEmail: maskEmail(invite.email),
    expiresAt: invite.expiresAt,
  };
}

export async function acceptWorkspaceInviteRecord(ctx: MutationCtx, tokenHash: string) {
  const user = await requireAuthUser(ctx);
  const invite = await ctx.db
    .query("workspaceInvites")
    .withIndex("by_token_hash", (q) => q.eq("tokenHash", tokenHash))
    .unique();
  if (!invite) throw new Error("This invitation link is invalid.");

  if (invite.status === "accepted") {
    if (invite.acceptedBy !== user._id) {
      throw new Error("This invitation has already been accepted.");
    }
    return { ownerUserId: invite.ownerUserId, alreadyAccepted: true };
  }
  if (invite.status === "revoked") {
    throw new Error("This invitation has been revoked.");
  }
  if (invite.status === "expired" || invite.expiresAt <= Date.now()) {
    if (invite.status !== "expired") {
      await ctx.db.patch(invite._id, { status: "expired", updatedAt: Date.now() });
    }
    throw new Error("This invitation has expired. Ask the workspace owner to resend it.");
  }

  const userEmail = user.email?.trim().toLowerCase();
  if (!userEmail || userEmail !== invite.email) {
    throw new Error(`Sign in with the invited email address (${maskEmail(invite.email)}).`);
  }

  const existingMember = await ctx.db
    .query("projectCollaborators")
    .withIndex("by_owner_user", (q) =>
      q.eq("ownerUserId", invite.ownerUserId).eq("userId", user._id),
    )
    .first();
  if (!existingMember) {
    const subscription = await requireInviteSubscription(ctx, invite.ownerUserId);
    const members = await ctx.db
      .query("projectCollaborators")
      .withIndex("by_owner", (q) => q.eq("ownerUserId", invite.ownerUserId))
      .collect();
    if (1 + members.length >= subscription.seats) {
      throw new Error("This workspace no longer has an available seat.");
    }
    await ctx.db.insert("projectCollaborators", {
      ownerUserId: invite.ownerUserId,
      userId: user._id,
      role: "editor",
      addedBy: invite.ownerUserId,
      createdAt: Date.now(),
    });
  }

  const timestamp = Date.now();
  await ctx.db.patch(invite._id, {
    status: "accepted",
    acceptedBy: user._id,
    acceptedAt: timestamp,
    updatedAt: timestamp,
  });
  return { ownerUserId: invite.ownerUserId, alreadyAccepted: Boolean(existingMember) };
}

export async function listPendingWorkspaceInvites(ctx: ReaderCtx, ownerId: Id<"users">) {
  const timestamp = Date.now();
  const invites = await ctx.db
    .query("workspaceInvites")
    .withIndex("by_owner_status_expiresAt", (q) =>
      q.eq("ownerUserId", ownerId).eq("status", "pending").gt("expiresAt", timestamp),
    )
    .collect();

  return invites.map((invite) => ({
    _id: invite._id,
    email: invite.email,
    expiresAt: invite.expiresAt,
    createdAt: invite.createdAt,
  }));
}

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
