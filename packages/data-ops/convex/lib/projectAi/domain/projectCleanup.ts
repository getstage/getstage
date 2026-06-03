import type { Id } from "../../../_generated/dataModel";
import type { MutationCtx } from "../../../_generated/server";
import { deleteOldR2Asset } from "../../../r2";
import { collectR2KeysFromJson } from "./r2Keys";

async function deleteArtifactWithR2Cleanup(
  ctx: MutationCtx,
  artifact: {
    _id: Id<"projectAiArtifacts">;
    contentJson?: string;
  },
) {
  if (artifact.contentJson) {
    try {
      const parsed = JSON.parse(artifact.contentJson);
      const keys = new Set<string>();
      collectR2KeysFromJson(parsed, keys);
      for (const key of keys) {
        await deleteOldR2Asset(ctx, key);
      }
    } catch {
      // Keep going even if old JSON is invalid.
    }
  }

  await ctx.db.delete(artifact._id);
}

export async function deleteAllProjectAiData(
  ctx: MutationCtx,
  projectId: Id<"projects">,
) {
  const artifacts = await ctx.db
    .query("projectAiArtifacts")
    .withIndex("by_project", (q) => q.eq("projectId", projectId))
    .collect();

  for (const artifact of artifacts) {
    await deleteArtifactWithR2Cleanup(ctx, artifact);
  }

  const runs = await ctx.db
    .query("projectAiRuns")
    .withIndex("by_project", (q) => q.eq("projectId", projectId))
    .collect();

  for (const run of runs) {
    await ctx.db.delete(run._id);
  }

  const context = await ctx.db
    .query("projectAiContexts")
    .withIndex("by_project", (q) => q.eq("projectId", projectId))
    .unique();

  if (context) {
    if (context.briefAttachmentR2ObjectKey) {
      await deleteOldR2Asset(ctx, context.briefAttachmentR2ObjectKey);
    }
    await ctx.db.delete(context._id);
  }

  const destinations = await ctx.db
    .query("artifactDestinations")
    .withIndex("by_project", (q) => q.eq("projectId", projectId))
    .collect();

  for (const destination of destinations) {
    await ctx.db.delete(destination._id);
  }
}

export async function deleteProjectCollaboratorsForProject(
  ctx: MutationCtx,
  projectId: Id<"projects">,
) {
  const collaborators = await ctx.db
    .query("projectCollaborators")
    .withIndex("by_project", (q) => q.eq("projectId", projectId))
    .collect();

  for (const collaborator of collaborators) {
    await ctx.db.delete(collaborator._id);
  }
}

export async function deleteCollaboratorMembershipsForUser(
  ctx: MutationCtx,
  userId: Id<"users">,
) {
  const memberships = await ctx.db
    .query("projectCollaborators")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();

  for (const membership of memberships) {
    await ctx.db.delete(membership._id);
  }
}

export async function cleanupOrphanedProjectAiDataForUser(
  ctx: MutationCtx,
  userId: Id<"users">,
) {
  let deletedArtifacts = 0;
  let deletedRuns = 0;
  let deletedContexts = 0;
  let deletedDestinations = 0;
  let deletedCompletedDestinations = 0;

  const projectExists = async (projectId: Id<"projects">) => {
    const project = await ctx.db.get(projectId);
    return project !== null;
  };

  const artifacts = await ctx.db
    .query("projectAiArtifacts")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();

  for (const artifact of artifacts) {
    if (!(await projectExists(artifact.projectId))) {
      await deleteArtifactWithR2Cleanup(ctx, artifact);
      deletedArtifacts += 1;
    }
  }

  const runs = await ctx.db
    .query("projectAiRuns")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();

  for (const run of runs) {
    if (!(await projectExists(run.projectId))) {
      await ctx.db.delete(run._id);
      deletedRuns += 1;
    }
  }

  const contexts = await ctx.db
    .query("projectAiContexts")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();

  for (const context of contexts) {
    if (!(await projectExists(context.projectId))) {
      if (context.briefAttachmentR2ObjectKey) {
        await deleteOldR2Asset(ctx, context.briefAttachmentR2ObjectKey);
      }
      await ctx.db.delete(context._id);
      deletedContexts += 1;
    }
  }

  const destinations = await ctx.db
    .query("artifactDestinations")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();

  for (const destination of destinations) {
    if (!(await projectExists(destination.projectId))) {
      await ctx.db.delete(destination._id);
      deletedDestinations += 1;
      continue;
    }

    if (destination.status === "completed") {
      await ctx.db.delete(destination._id);
      deletedCompletedDestinations += 1;
    }
  }

  return {
    deletedArtifacts,
    deletedRuns,
    deletedContexts,
    deletedDestinations,
    deletedCompletedDestinations,
  };
}
