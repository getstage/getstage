import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { ensurePortalConfig, getUserByEmail, requireProjectOwner } from "../../_helpers";
import { getCurrentSubscriptionSnapshot } from "../../billing";

function getEnv(name: string) {
  return (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.[
    name
  ];
}

const SITE_URL = getEnv("SITE_URL") ?? "https://getstage.co";

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

export async function addCollaboratorRecord(
  ctx: MutationCtx,
  args: {
    projectId: Id<"projects">;
    email: string;
  },
) {
  const normalizedEmail = args.email.trim().toLowerCase();
  const { user: owner, project } = await requireProjectOwner(ctx, args.projectId);
  const ownerSubscription = await getCurrentSubscriptionSnapshot(ctx, String(owner._id));

  if (!ownerSubscription) {
    throw new Error("Active Stage subscription required to invite collaborators.");
  }

  const targetUser = await getUserByEmail(ctx, normalizedEmail);
  if (!targetUser) {
    throw new Error("No user found with that email address.");
  }

  if (targetUser._id === owner._id) {
    throw new Error("You are already the owner of this project.");
  }

  const targetSubscription = await getCurrentSubscriptionSnapshot(ctx, String(targetUser._id));
  if (!targetSubscription) {
    throw new Error("This user needs an active Stage subscription before they can collaborate.");
  }

  const existing = await ctx.db
    .query("projectCollaborators")
    .withIndex("by_project_user", (q) =>
      q.eq("projectId", args.projectId).eq("userId", targetUser._id),
    )
    .unique();

  if (existing) {
    throw new Error("This user is already a collaborator on this project.");
  }

  const collaboratorId = await ctx.db.insert("projectCollaborators", {
    projectId: args.projectId,
    userId: targetUser._id,
    role: "editor",
    addedBy: owner._id,
    createdAt: Date.now(),
  });

  const portalConfig = await ensurePortalConfig(ctx, args.projectId);

  return {
    collaboratorId,
    ownerId: String(owner._id),
    inviterName: getInviterName(owner.name ?? null, owner.email ?? null),
    recipientEmail: targetUser.email ?? normalizedEmail,
    projectName: project.name,
    portalUrl: portalConfig.shareUrl,
    workspaceUrl: `${SITE_URL}/project/${args.projectId}`,
  };
}
