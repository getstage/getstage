import type { Doc, Id } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";
import { getCurrentSubscriptionSnapshot } from "../../billing";
import { requireAuthUser } from "../auth/requireAuthUser";

type ReaderCtx = QueryCtx | MutationCtx;
type ProjectAccessResult = { user: Doc<"users">; project: Doc<"projects">; role: "owner" | "editor" };

async function requireExistingUser(ctx: ReaderCtx, userId: Id<"users">) {
  const user = await ctx.db.get(userId);
  if (!user) {
    throw new Error("User not found.");
  }

  return user;
}

async function resolveProjectAccess(
  ctx: ReaderCtx,
  args: {
    user: Doc<"users">;
    projectId: Id<"projects">;
    returnNullOnMissingProject?: boolean;
  },
): Promise<ProjectAccessResult | null> {
  const project = await ctx.db.get(args.projectId);
  if (!project) {
    if (args.returnNullOnMissingProject) {
      return null;
    }
    throw new Error("Project not found.");
  }

  if (project.userId === args.user._id) {
    return { user: args.user, project, role: "owner" };
  }

  const collaborator = await ctx.db
    .query("projectCollaborators")
    .withIndex("by_project_user", (q) =>
      q.eq("projectId", args.projectId).eq("userId", args.user._id),
    )
    .unique();

  if (!collaborator) {
    throw new Error("Not authorized.");
  }

  const ownerSubscription = await getCurrentSubscriptionSnapshot(ctx, String(project.userId));
  if (!ownerSubscription) {
    throw new Error("Not authorized. Project owner needs an active subscription.");
  }

  const subscription = await getCurrentSubscriptionSnapshot(ctx, String(args.user._id));
  if (!subscription) {
    throw new Error("Not authorized. Active subscription required.");
  }

  return { user: args.user, project, role: "editor" };
}

export async function requireProjectAccess(
  ctx: ReaderCtx,
  projectId: Id<"projects">,
): Promise<ProjectAccessResult> {
  const user = await requireAuthUser(ctx);
  const result = await resolveProjectAccess(ctx, { user, projectId });
  if (!result) {
    throw new Error("Project not found.");
  }
  return result;
}

export async function requireProjectAccessOrNull(
  ctx: ReaderCtx,
  projectId: Id<"projects">,
): Promise<ProjectAccessResult | null> {
  const user = await requireAuthUser(ctx);
  return resolveProjectAccess(ctx, { user, projectId, returnNullOnMissingProject: true });
}

export async function requireProjectAccessForUserId(
  ctx: ReaderCtx,
  args: {
    userId: Id<"users">;
    projectId: Id<"projects">;
  },
): Promise<ProjectAccessResult> {
  const user = await requireExistingUser(ctx, args.userId);
  const result = await resolveProjectAccess(ctx, { user, projectId: args.projectId });
  if (!result) {
    throw new Error("Project not found.");
  }
  return result;
}

export async function requirePhaseAccess(ctx: ReaderCtx, phaseId: Id<"phases">) {
  const phase = await ctx.db.get(phaseId);
  if (!phase) {
    throw new Error("Phase not found.");
  }

  const { user, project, role } = await requireProjectAccess(ctx, phase.projectId);
  return { user, project, phase, role };
}

export async function requireTaskAccess(ctx: ReaderCtx, taskId: Id<"tasks">) {
  const task = await ctx.db.get(taskId);
  if (!task) {
    throw new Error("Task not found.");
  }

  const phase = await ctx.db.get(task.phaseId);
  if (!phase) {
    throw new Error("Phase not found.");
  }

  const { user, project, role } = await requireProjectAccess(ctx, phase.projectId);
  return { user, project, phase, task, role };
}
