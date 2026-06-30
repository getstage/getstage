import type { Doc } from "../../../_generated/dataModel";
import type { MutationCtx } from "../../../_generated/server";
import {
  deleteProjectMarkerImageIfUnused,
} from "../../../_helpers";
import { deleteGeneratedDesignsForProject } from "../../../integrations/stitch";
import {
  deleteAllProjectAiData,
  deleteProjectCollaboratorsForProject,
} from "../../../lib/projectAi/domain/projectCleanup";
import { now } from "../../../helpers/time";
import { deleteOldR2Asset } from "../../../r2";

export async function deleteProjectWithDependents(
  ctx: MutationCtx,
  project: Doc<"projects">,
) {
  const projectId = project._id;

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

  const financeEntries = await ctx.db
    .query("financeEntries")
    .withIndex("by_user", (q) => q.eq("userId", project.userId))
    .collect();

  for (const financeEntry of financeEntries) {
    if (financeEntry.projectId === projectId) {
      await ctx.db.patch(financeEntry._id, {
        projectId: undefined,
        updatedAt: now(),
      });
    }
  }

  await deleteGeneratedDesignsForProject(ctx, projectId);
  await deleteAllProjectAiData(ctx, projectId);
  await deleteProjectCollaboratorsForProject(ctx, projectId);

  await ctx.db.delete(project._id);

  // Deleting a project must NOT delete its client. Clients are standalone records
  // managed in Settings → Clients; they persist (with their avatar) so history and
  // future projects keep them. Project-specific marker images are still cleaned up below.

  await deleteProjectMarkerImageIfUnused(ctx, {
    userId: project.userId,
    imageUrl: project.projectImageUrl,
  });

  await deleteProjectMarkerImageIfUnused(ctx, {
    userId: project.userId,
    imageUrl: project.startMarkerImageUrl,
  });

  await deleteProjectMarkerImageIfUnused(ctx, {
    userId: project.userId,
    imageUrl: project.endMarkerImageUrl,
  });
}
