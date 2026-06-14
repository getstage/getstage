import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { buildProjectSearchText } from "./lib/projects/domain/projectService";

export const backfillProjectSearchText = internalMutation({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.object({
    updated: v.number(),
  }),
  handler: async (ctx, args) => {
    const limit = Math.max(1, Math.min(args.limit ?? 200, 500));
    const projects = await ctx.db
      .query("projects")
      .filter((query) => query.eq(query.field("searchText"), undefined))
      .take(limit);

    await Promise.all(projects.map((project) =>
      ctx.db.patch(project._id, {
        searchText: buildProjectSearchText(project.name, project.clientName),
      }),
    ));

    return { updated: projects.length };
  },
});
