import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getUserByEmail, requireProjectOwner } from "./_helpers";

export const add = mutation({
  args: {
    projectId: v.id("projects"),
    email: v.string(),
  },
  handler: async (ctx, { projectId, email }) => {
    const { user: owner } = await requireProjectOwner(ctx, projectId);

    const targetUser = await getUserByEmail(ctx, email.trim().toLowerCase());
    if (!targetUser) {
      throw new Error("No user found with that email address.");
    }

    if (targetUser._id === owner._id) {
      throw new Error("You are already the owner of this project.");
    }

    const existing = await ctx.db
      .query("projectCollaborators")
      .withIndex("by_project_user", (q) =>
        q.eq("projectId", projectId).eq("userId", targetUser._id),
      )
      .unique();

    if (existing) {
      throw new Error("This user is already a collaborator on this project.");
    }

    return ctx.db.insert("projectCollaborators", {
      projectId,
      userId: targetUser._id,
      role: "editor",
      addedBy: owner._id,
      createdAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: {
    projectId: v.id("projects"),
    collaboratorId: v.id("projectCollaborators"),
  },
  handler: async (ctx, { projectId, collaboratorId }) => {
    await requireProjectOwner(ctx, projectId);

    const record = await ctx.db.get(collaboratorId);
    if (!record || record.projectId !== projectId) {
      throw new Error("Collaborator not found.");
    }

    await ctx.db.delete(collaboratorId);
  },
});

export const listByProject = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, { projectId }) => {
    await requireProjectOwner(ctx, projectId);

    const collaborators = await ctx.db
      .query("projectCollaborators")
      .withIndex("by_project", (q) => q.eq("projectId", projectId))
      .collect();

    return Promise.all(
      collaborators.map(async (collab) => {
        const user = await ctx.db.get(collab.userId);
        return {
          _id: collab._id,
          userId: collab.userId,
          role: collab.role,
          name: user?.name ?? null,
          email: user?.email ?? null,
          createdAt: collab.createdAt,
        };
      }),
    );
  },
});
