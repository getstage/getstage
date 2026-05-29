import { query } from "./_generated/server";
import { requireAuthUser } from "./_helpers";
import { resolveAssetUrl } from "./r2";

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
