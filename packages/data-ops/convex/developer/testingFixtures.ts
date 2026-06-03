import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { requireAuthUser } from "../_helpers";
import { cleanupOrphanedProjectAiDataForUser } from "../lib/projectAi/domain/projectCleanup";
import { deleteProjectWithDependents } from "../projects";

const SMOKE_PROJECT_PREFIXES = ["Stitch smoke project", "REST smoke project"];

export const cleanupSmokeProjects = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, { userId }) => {
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const smokeProjects = projects.filter((project) =>
      SMOKE_PROJECT_PREFIXES.some((prefix) => project.name.startsWith(prefix)),
    );

    const deleted = [];
    for (const project of smokeProjects) {
      deleted.push({
        projectId: String(project._id),
        name: project.name,
      });
      await deleteProjectWithDependents(ctx, project);
    }

    return {
      deletedCount: deleted.length,
      deleted,
    };
  },
});

export const cleanupOrphanedProjectAiData = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuthUser(ctx);
    return cleanupOrphanedProjectAiDataForUser(ctx, user._id);
  },
});
