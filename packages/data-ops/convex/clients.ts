import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuthUser } from "./_helpers";
import { resolveAssetUrl } from "./r2";
import { now } from "./helpers/time";
import { deleteClientAvatarIfUnused } from "./helpers/portal/clientSync";

function normalizeClientKey(value: string) {
  return value.trim().toLowerCase();
}

export const listForCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuthUser(ctx);
    const [clients, projects] = await Promise.all([
      ctx.db
        .query("clients")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .collect(),
      ctx.db
        .query("projects")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .collect(),
    ]);

    const projectCounts = new Map<string, number>();
    for (const project of projects) {
      projectCounts.set(project.clientName, (projectCounts.get(project.clientName) ?? 0) + 1);
    }

    const sortedClients = [...clients].sort((a, b) => a.name.localeCompare(b.name));

    return Promise.all(
      sortedClients.map(async (client) => ({
        id: String(client._id),
        name: client.name,
        email: client.email,
        avatarUrl: (await resolveAssetUrl(client.avatarUrl ?? null)) ?? undefined,
        projectCount: projectCounts.get(client.name) ?? 0,
      })),
    );
  },
});

// Renaming a client renames it everywhere: projects link to clients by name, so we
// rewrite `clientName` on every attached project in the same transaction. This keeps
// the client record and its project history as a single, consistent identity.
export const renameForCurrentUser = mutation({
  args: {
    clientId: v.id("clients"),
    name: v.string(),
  },
  handler: async (ctx, { clientId, name }) => {
    const user = await requireAuthUser(ctx);

    const client = await ctx.db.get(clientId);
    if (!client || client.userId !== user._id) {
      throw new Error("Client not found.");
    }

    const nextName = name.trim();
    if (!nextName) {
      throw new Error("Client name can't be empty.");
    }

    const previousKey = normalizeClientKey(client.name);
    const nextKey = normalizeClientKey(nextName);

    // No-op rename (only casing/whitespace unchanged) — nothing to do.
    if (nextName === client.name) {
      return { clientId: String(client._id), renamedProjects: 0 };
    }

    const clients = await ctx.db
      .query("clients")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    const collides = clients.some(
      (other) => other._id !== client._id && normalizeClientKey(other.name) === nextKey,
    );
    if (collides) {
      throw new Error("Another client already uses that name.");
    }

    const timestamp = now();
    await ctx.db.patch(client._id, { name: nextName, updatedAt: timestamp });

    const projects = await ctx.db
      .query("projects")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    const attached = projects.filter(
      (project) => normalizeClientKey(project.clientName) === previousKey,
    );
    await Promise.all(
      attached.map((project) =>
        ctx.db.patch(project._id, { clientName: nextName, updatedAt: timestamp }),
      ),
    );

    return { clientId: String(client._id), renamedProjects: attached.length };
  },
});

// Fail-closed: a client can only be deleted when no project references it. Deleting a
// client that still has projects would orphan that history, so we refuse instead.
export const deleteForCurrentUser = mutation({
  args: {
    clientId: v.id("clients"),
  },
  handler: async (ctx, { clientId }) => {
    const user = await requireAuthUser(ctx);

    const client = await ctx.db.get(clientId);
    if (!client || client.userId !== user._id) {
      throw new Error("Client not found.");
    }

    const targetKey = normalizeClientKey(client.name);
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    const attachedCount = projects.filter(
      (project) => normalizeClientKey(project.clientName) === targetKey,
    ).length;
    if (attachedCount > 0) {
      throw new Error(
        "This client is still attached to a project. Remove or reassign those projects before deleting the client.",
      );
    }

    const avatarUrl = client.avatarUrl ?? null;
    await ctx.db.delete(client._id);
    await deleteClientAvatarIfUnused(ctx, { userId: user._id, avatarUrl });

    return { deleted: true };
  },
});
