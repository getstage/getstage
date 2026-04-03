import { v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import { mutation, query } from "../_generated/server";
import { requireProjectAccess } from "../_helpers";
import { resolveAssetUrl } from "../r2";

function now() {
  return Date.now();
}

function normalizeStitchProjectUrl(value: string) {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error("Stitch project URL is required.");
  }

  let url: URL;
  try {
    url = new URL(normalized);
  } catch {
    throw new Error("Stitch project URL must be a valid URL.");
  }

  if (!/^https?:$/.test(url.protocol)) {
    throw new Error("Stitch project URL must use http or https.");
  }

  return url.toString();
}

function extractStitchProjectId(url: string) {
  const match = url.match(/\/projects\/([^/?#]+)/i);
  return match?.[1];
}

function formatConnection(connection: {
  _id: string;
  provider: "stitch";
  externalProjectUrl: string;
  externalProjectId?: string;
  title?: string;
  status: "active" | "error" | "archived";
  lastSyncedAt?: number;
}) {
  return {
    _id: String(connection._id),
    provider: connection.provider,
    externalProjectUrl: connection.externalProjectUrl,
    externalProjectId: connection.externalProjectId,
    title: connection.title,
    status: connection.status,
    lastSyncedAt: connection.lastSyncedAt,
  };
}

function sortSyncedDesigns(designs: Array<Doc<"projectGeneratedDesigns">>) {
  return [...designs].sort((a, b) => {
    const aOrder = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
    const bOrder = b.sortOrder ?? Number.MAX_SAFE_INTEGER;
    if (aOrder !== bOrder) {
      return aOrder - bOrder;
    }

    const aSyncedAt = a.lastSyncedAt ?? a.updatedAt;
    const bSyncedAt = b.lastSyncedAt ?? b.updatedAt;
    if (aSyncedAt !== bSyncedAt) {
      return bSyncedAt - aSyncedAt;
    }

    return b.createdAt - a.createdAt;
  });
}

export const getForProject = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, { projectId }) => {
    await requireProjectAccess(ctx, projectId);

    const connection = await ctx.db
      .query("projectDesignConnections")
      .withIndex("by_project_provider", (q) =>
        q.eq("projectId", projectId).eq("provider", "stitch"),
      )
      .unique();

    return connection ? formatConnection(connection as never) : null;
  },
});

export const linkProject = mutation({
  args: {
    projectId: v.id("projects"),
    externalProjectUrl: v.string(),
    title: v.optional(v.string()),
  },
  handler: async (ctx, { projectId, externalProjectUrl, title }) => {
    await requireProjectAccess(ctx, projectId);

    const normalizedUrl = normalizeStitchProjectUrl(externalProjectUrl);
    const normalizedTitle = title?.trim() || undefined;
    const externalProjectId = extractStitchProjectId(normalizedUrl);
    const timestamp = now();

    const existingConnection = await ctx.db
      .query("projectDesignConnections")
      .withIndex("by_project_provider", (q) =>
        q.eq("projectId", projectId).eq("provider", "stitch"),
      )
      .unique();

    if (existingConnection) {
      await ctx.db.patch(existingConnection._id, {
        externalProjectUrl: normalizedUrl,
        externalProjectId,
        title: normalizedTitle,
        status: "active",
        updatedAt: timestamp,
      });

      const updatedConnection = await ctx.db.get(existingConnection._id);
      if (!updatedConnection) {
        throw new Error("Failed to update Stitch connection.");
      }

      return formatConnection(updatedConnection as never);
    }

    const connectionId = await ctx.db.insert("projectDesignConnections", {
      projectId,
      provider: "stitch",
      externalProjectUrl: normalizedUrl,
      externalProjectId,
      title: normalizedTitle,
      status: "active",
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    const connection = await ctx.db.get(connectionId);
    if (!connection) {
      throw new Error("Failed to create Stitch connection.");
    }

    return formatConnection(connection as never);
  },
});

export const listPreviews = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, { projectId }) => {
    await requireProjectAccess(ctx, projectId);

    const syncedDesigns = (
      await ctx.db
        .query("projectGeneratedDesigns")
        .withIndex("by_project", (q) => q.eq("projectId", projectId))
        .collect()
    ).filter((design) => design.source === "user_sync");

    const phaseIds = [
      ...new Set(
        syncedDesigns.flatMap((design) => (design.phaseId ? [design.phaseId] : [])),
      ),
    ];
    const phases = await Promise.all(phaseIds.map((phaseId) => ctx.db.get(phaseId)));
    const phaseNameById = new Map(
      phases
        .filter((phase): phase is NonNullable<typeof phase> => phase !== null)
        .map((phase) => [String(phase._id), phase.name]),
    );

    return Promise.all(
      sortSyncedDesigns(syncedDesigns).map(async (design) => ({
        _id: String(design._id),
        imageUrl: (await resolveAssetUrl(design.r2ObjectKey)) ?? "",
        title: design.title,
        phaseName: design.phaseId
          ? phaseNameById.get(String(design.phaseId)) ?? undefined
          : undefined,
        syncedAt: design.lastSyncedAt ?? design.updatedAt,
      })),
    );
  },
});

export const syncLatest = mutation({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, { projectId }) => {
    await requireProjectAccess(ctx, projectId);
    throw new Error(
      "Sync latest from the Stage app is not wired yet. Use your agent or the Stitch sync API flow for now.",
    );
  },
});
