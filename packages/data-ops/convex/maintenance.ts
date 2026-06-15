import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { buildProjectSearchText } from "./lib/projects/domain/projectService";

export const backfillProjectSearchText = internalMutation({
  args: {
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  returns: v.object({
    updated: v.number(),
    scanned: v.number(),
    cursor: v.union(v.string(), v.null()),
    isDone: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const limit = Math.max(1, Math.min(args.limit ?? 200, 500));
    const page = await ctx.db
      .query("projects")
      .paginate({ numItems: limit, cursor: args.cursor ?? null });
    const projects = page.page.filter((project) => project.searchText === undefined);

    await Promise.all(projects.map((project) =>
      ctx.db.patch(project._id, {
        searchText: buildProjectSearchText(project.name, project.clientName),
      }),
    ));

    return {
      updated: projects.length,
      scanned: page.page.length,
      cursor: page.isDone ? null : page.continueCursor,
      isDone: page.isDone,
    };
  },
});
