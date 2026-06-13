import type { Id } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";
import { now } from "../time";
import { deleteOldR2Asset } from "../../r2";
import {
  buildNameFromEmail,
  getCanonicalUserByEmail,
  normalizeEmailAddress,
} from "../../userEmails";

type ReaderCtx = QueryCtx | MutationCtx;

function normalizeClientKey(value: string) {
  return value.trim().toLowerCase();
}

export async function getUserByEmail(ctx: ReaderCtx, email: string) {
  return getCanonicalUserByEmail(ctx, email);
}

export async function ensureUserByEmail(
  ctx: MutationCtx,
  args: { email: string; name?: string },
) {
  const normalizedEmail = normalizeEmailAddress(args.email);
  const existing = await getUserByEmail(ctx, normalizedEmail);
  if (existing) {
    return existing;
  }

  const timestamp = now();
  const userId = await ctx.db.insert("users", {
    email: normalizedEmail,
    name: args.name?.trim() || buildNameFromEmail(normalizedEmail),
    role: "freelancer",
    plan: "free",
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  const created = await ctx.db.get(userId);
  if (!created) {
    throw new Error("Failed to create user.");
  }

  return created;
}

export async function upsertClient(
  ctx: MutationCtx,
  args: {
    userId: Id<"users">;
    name: string;
    email?: string | null;
    avatarUrl?: string | null;
  },
) {
  const existing = await ctx.db
    .query("clients")
    .withIndex("by_user_name", (q) => q.eq("userId", args.userId).eq("name", args.name))
    .unique();

  const timestamp = now();
  const hasAvatarUpdate = Object.prototype.hasOwnProperty.call(args, "avatarUrl");
  const hasEmailUpdate = Object.prototype.hasOwnProperty.call(args, "email");

  if (existing) {
    const nextAvatarUrl = hasAvatarUpdate ? (args.avatarUrl ?? undefined) : existing.avatarUrl;
    const nextEmail = hasEmailUpdate ? (args.email ?? undefined) : existing.email;
    if (nextAvatarUrl !== existing.avatarUrl || nextEmail !== existing.email) {
      await ctx.db.patch(existing._id, {
        avatarUrl: nextAvatarUrl,
        email: nextEmail,
        updatedAt: timestamp,
      });
    }
    return existing._id;
  }

  return ctx.db.insert("clients", {
    userId: args.userId,
    name: args.name,
    email: args.email ?? undefined,
    avatarUrl: args.avatarUrl ?? undefined,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}

export async function getClientByUserAndName(
  ctx: ReaderCtx,
  args: {
    userId: Id<"users">;
    name: string;
  },
) {
  return ctx.db
    .query("clients")
    .withIndex("by_user_name", (q) => q.eq("userId", args.userId).eq("name", args.name))
    .unique();
}

export async function syncClientAvatarAcrossProjects(
  ctx: MutationCtx,
  args: {
    userId: Id<"users">;
    clientName: string;
    avatarUrl?: string | null;
  },
) {
  const targetKey = normalizeClientKey(args.clientName);
  const nextAvatarUrl = args.avatarUrl ?? undefined;
  const projects = await ctx.db
    .query("projects")
    .withIndex("by_user", (q) => q.eq("userId", args.userId))
    .collect();

  const matchingProjects = projects.filter(
    (project) =>
      normalizeClientKey(project.clientName) === targetKey &&
      project.clientAvatarUrl !== nextAvatarUrl,
  );

  if (matchingProjects.length === 0) {
    return [] as string[];
  }

  const previousAvatarUrls = Array.from(
    new Set(
      matchingProjects
        .map((project) => project.clientAvatarUrl)
        .filter((value): value is string => Boolean(value)),
    ),
  );
  const timestamp = now();

  await Promise.all(
    matchingProjects.map((project) =>
      ctx.db.patch(project._id, {
        clientAvatarUrl: nextAvatarUrl,
        updatedAt: timestamp,
      }),
    ),
  );

  return previousAvatarUrls;
}

export async function deleteClientAvatarIfUnused(
  ctx: MutationCtx,
  args: {
    userId: Id<"users">;
    avatarUrl: string | null | undefined;
  },
) {
  if (!args.avatarUrl) {
    return;
  }

  const projects = await ctx.db
    .query("projects")
    .withIndex("by_user", (q) => q.eq("userId", args.userId))
    .collect();
  const stillReferencedByProject = projects.some((project) => project.clientAvatarUrl === args.avatarUrl);
  if (stillReferencedByProject) {
    return;
  }

  const clients = await ctx.db
    .query("clients")
    .withIndex("by_user", (q) => q.eq("userId", args.userId))
    .collect();
  const stillReferencedByClient = clients.some((client) => client.avatarUrl === args.avatarUrl);
  if (stillReferencedByClient) {
    return;
  }

  await deleteOldR2Asset(ctx, args.avatarUrl);
}

export async function deleteProjectMarkerImageIfUnused(
  ctx: MutationCtx,
  args: {
    userId: Id<"users">;
    imageUrl: string | null | undefined;
  },
) {
  if (!args.imageUrl) {
    return;
  }

  const projects = await ctx.db
    .query("projects")
    .withIndex("by_user", (q) => q.eq("userId", args.userId))
    .collect();

  const isStillUsed = projects.some(
    (project) =>
      project.projectImageUrl === args.imageUrl ||
      project.startMarkerImageUrl === args.imageUrl ||
      project.endMarkerImageUrl === args.imageUrl,
  );
  if (isStillUsed) {
    return;
  }

  await deleteOldR2Asset(ctx, args.imageUrl);
}

export async function deleteClientIfUnused(
  ctx: MutationCtx,
  args: {
    userId: Id<"users">;
    name: string;
  },
) {
  const targetKey = normalizeClientKey(args.name);
  if (!targetKey) {
    return 0;
  }

  const projects = await ctx.db
    .query("projects")
    .withIndex("by_user", (q) => q.eq("userId", args.userId))
    .collect();

  const isStillUsed = projects.some((project) => normalizeClientKey(project.clientName) === targetKey);
  if (isStillUsed) {
    return 0;
  }

  const clients = await ctx.db
    .query("clients")
    .withIndex("by_user", (q) => q.eq("userId", args.userId))
    .collect();

  const matchingClients = clients.filter((client) => normalizeClientKey(client.name) === targetKey);
  const deletedAvatarUrls = Array.from(
    new Set(
      matchingClients
        .map((client) => client.avatarUrl)
        .filter((value): value is string => Boolean(value)),
    ),
  );
  for (const client of matchingClients) {
    await ctx.db.delete(client._id);
  }

  await Promise.all(
    deletedAvatarUrls.map((avatarUrl) =>
      deleteClientAvatarIfUnused(ctx, {
        userId: args.userId,
        avatarUrl,
      }),
    ),
  );

  return matchingClients.length;
}

export async function pruneOrphanClientsForUser(
  ctx: MutationCtx,
  userId: Id<"users">,
) {
  const projects = await ctx.db
    .query("projects")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  const clients = await ctx.db
    .query("clients")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();

  const usedClientKeys = new Set(projects.map((project) => normalizeClientKey(project.clientName)));
  const orphanClients = clients.filter((client) => !usedClientKeys.has(normalizeClientKey(client.name)));
  const deletedAvatarUrls = Array.from(
    new Set(
      orphanClients
        .map((client) => client.avatarUrl)
        .filter((value): value is string => Boolean(value)),
    ),
  );

  for (const client of orphanClients) {
    await ctx.db.delete(client._id);
  }

  await Promise.all(
    deletedAvatarUrls.map((avatarUrl) =>
      deleteClientAvatarIfUnused(ctx, {
        userId,
        avatarUrl,
      }),
    ),
  );

  return {
    deletedCount: orphanClients.length,
    deletedNames: orphanClients.map((client) => client.name),
  };
}
