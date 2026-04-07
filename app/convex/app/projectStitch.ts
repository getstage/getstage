import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import { action, mutation, query } from "../_generated/server";
import { internal } from "../_generated/api";
import { requireProjectAccess } from "../_helpers";
import { resolveAssetUrl } from "../r2";

type ViewerContext = {
  userId: Id<"users">;
};

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

type FormattedConnection = ReturnType<typeof formatConnection>;

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

export const linkProject = action({
  args: {
    projectId: v.id("projects"),
    externalProjectUrl: v.string(),
    title: v.optional(v.string()),
  },
  handler: async (
    ctx,
    { projectId, externalProjectUrl, title },
  ): Promise<FormattedConnection> => {
    const viewer: ViewerContext = await ctx.runQuery(internal.onboarding.getViewerContext, {});

    const connection = await ctx.runAction(
      internal.integrations.stitch.verifyAndUpsertDesignConnectionForApi,
      {
      userId: viewer.userId,
      projectId: String(projectId),
      externalProjectUrl: normalizeStitchProjectUrl(externalProjectUrl),
      title: title?.trim() || undefined,
      },
    );

    return {
      _id: connection.id,
      provider: connection.provider,
      externalProjectUrl: connection.externalProjectUrl,
      externalProjectId: connection.externalProjectId,
      title: connection.title,
      status: connection.status,
      lastSyncedAt: connection.lastSyncedAt,
    };
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
