import { v } from "convex/values";
import { mutation } from "../_generated/server";
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
