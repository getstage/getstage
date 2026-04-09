import { Stitch, StitchToolClient } from "@google/stitch-sdk";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import {
  action,
  internalAction,
  internalMutation,
  internalQuery,
  query,
  type ActionCtx,
  type MutationCtx,
  type QueryCtx,
} from "../_generated/server";
import { requireProjectAccess } from "../_helpers";
import { requirePhaseAccessForUserId, requireProjectAccessForUserId } from "../domain/projects/service";
import { attachTrackedR2Asset, deleteOldR2Asset, r2 } from "../r2";

type ReaderCtx = QueryCtx | MutationCtx;

export const stitchDeviceTypeValidator = v.union(
  v.literal("DEVICE_TYPE_UNSPECIFIED"),
  v.literal("MOBILE"),
  v.literal("DESKTOP"),
  v.literal("TABLET"),
  v.literal("AGNOSTIC"),
);

export const stitchModelIdValidator = v.union(
  v.literal("MODEL_ID_UNSPECIFIED"),
  v.literal("GEMINI_3_PRO"),
  v.literal("GEMINI_3_FLASH"),
);

type StitchDeviceType =
  | "DEVICE_TYPE_UNSPECIFIED"
  | "MOBILE"
  | "DESKTOP"
  | "TABLET"
  | "AGNOSTIC";

type StitchModelId =
  | "MODEL_ID_UNSPECIFIED"
  | "GEMINI_3_PRO"
  | "GEMINI_3_FLASH";

type DesignConnectionStatus = "active" | "error" | "archived";
type GeneratedDesignSource = "stage_proxy" | "user_sync";
type GeneratedDesignStatus = "ready" | "error";

type SavedGeneratedDesign = Awaited<ReturnType<typeof formatGeneratedDesign>>;
type GeneratedDesignResult = SavedGeneratedDesign & {
  htmlUrl: string;
  sourceImageUrl: string;
};

type ViewerContext = {
  userId: Id<"users">;
};

function now() {
  return Date.now();
}

function getEnv(name: string) {
  return (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.[
    name
  ];
}

function requireEnv(name: string) {
  const value = getEnv(name);
  if (!value) {
    throw new Error(`${name} is not configured.`);
  }
  return value;
}

function getExtensionFromContentType(contentType: string | null) {
  switch ((contentType ?? "").toLowerCase()) {
    case "image/jpeg":
      return "jpg";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    default:
      return "png";
  }
}

function buildGeneratedDesignKey(args: {
  userId: string;
  projectId: string;
  screenId: string;
  contentType: string | null;
}) {
  const extension = getExtensionFromContentType(args.contentType);
  return `users/${args.userId}/projects/${args.projectId}/generated-designs/${args.screenId}.${extension}`;
}

function buildStitchProjectUrl(projectId: string) {
  return `https://stitch.withgoogle.com/projects/${projectId}`;
}

function extractStitchProjectIdFromUrl(url: string) {
  const match = url.match(/\/projects\/([^/?#]+)/i);
  return match?.[1];
}

async function verifyStitchProjectAccess(externalProjectUrl: string) {
  const apiKey = requireEnv("STITCH_API_KEY");
  const projectId = extractStitchProjectIdFromUrl(externalProjectUrl);

  if (!projectId) {
    throw new Error("Stitch project URL must include /projects/{projectId}.");
  }

  const client = new StitchToolClient({ apiKey });
  const stitch = new Stitch(client);

  try {
    const project = stitch.project(projectId);
    await project.screens();
    return {
      externalProjectId: project.id,
      externalProjectUrl: buildStitchProjectUrl(project.id),
    };
  } finally {
    await client.close().catch(() => undefined);
  }
}

async function verifyStitchProjectSyncAccess(args: {
  externalProjectUrl: string;
  externalProjectId?: string;
  screens: Array<{
    stitchScreenId: string;
  }>;
}) {
  const apiKey = requireEnv("STITCH_API_KEY");
  const projectId = extractStitchProjectIdFromUrl(args.externalProjectUrl);

  if (!projectId) {
    throw new Error("Stitch project URL must include /projects/{projectId}.");
  }

  const client = new StitchToolClient({ apiKey });
  const stitch = new Stitch(client);

  try {
    const project = stitch.project(projectId);
    const screens = await project.screens();

    if (args.externalProjectId && args.externalProjectId !== project.id) {
      throw new Error("Provided Stitch project ID does not match the Stitch project URL.");
    }

    const screenIds = new Set(screens.map((screen) => screen.id));
    for (const screen of args.screens) {
      if (!screenIds.has(screen.stitchScreenId)) {
        throw new Error(
          `Stitch screen ${screen.stitchScreenId} was not found in project ${project.id}.`,
        );
      }
    }

    return {
      externalProjectId: project.id,
      externalProjectUrl: buildStitchProjectUrl(project.id),
    };
  } finally {
    await client.close().catch(() => undefined);
  }
}

async function formatGeneratedDesign(
  design: {
    _id: Id<"projectGeneratedDesigns">;
    userId: Id<"users">;
    projectId: Id<"projects">;
    phaseId?: Id<"phases">;
    source: GeneratedDesignSource;
    title?: string;
    prompt?: string;
    deviceType?: StitchDeviceType;
    modelId?: StitchModelId;
    stitchProjectId?: string;
    stitchScreenId?: string;
    stitchScreenUrl?: string;
    r2ObjectKey: string;
    sortOrder?: number;
    status: GeneratedDesignStatus;
    errorMessage?: string;
    lastSyncedAt?: number;
    createdAt: number;
    updatedAt: number;
  },
) {
  return {
    id: String(design._id),
    userId: String(design.userId),
    projectId: String(design.projectId),
    phaseId: design.phaseId ? String(design.phaseId) : undefined,
    provider: "stitch" as const,
    source: design.source,
    title: design.title,
    prompt: design.prompt,
    deviceType: design.deviceType,
    modelId: design.modelId,
    stitchProjectId: design.stitchProjectId,
    stitchScreenId: design.stitchScreenId,
    stitchScreenUrl: design.stitchScreenUrl,
    imageUrl: await r2.getUrl(design.r2ObjectKey),
    r2ObjectKey: design.r2ObjectKey,
    sortOrder: design.sortOrder,
    status: design.status,
    errorMessage: design.errorMessage,
    lastSyncedAt: design.lastSyncedAt,
    createdAt: design.createdAt,
    updatedAt: design.updatedAt,
  };
}

async function formatProjectDesignConnection(
  connection: {
    _id: Id<"projectDesignConnections">;
    projectId: Id<"projects">;
    provider: "stitch";
    externalProjectId?: string;
    externalProjectUrl: string;
    title?: string;
    status: DesignConnectionStatus;
    lastSyncedAt?: number;
    createdAt: number;
    updatedAt: number;
  },
) {
  return {
    id: String(connection._id),
    projectId: String(connection.projectId),
    provider: connection.provider,
    externalProjectId: connection.externalProjectId,
    externalProjectUrl: connection.externalProjectUrl,
    title: connection.title,
    status: connection.status,
    lastSyncedAt: connection.lastSyncedAt,
    createdAt: connection.createdAt,
    updatedAt: connection.updatedAt,
  };
}

type FormattedProjectDesignConnection = Awaited<
  ReturnType<typeof formatProjectDesignConnection>
>;

async function normalizeProjectId(ctx: ReaderCtx, projectId: string) {
  const normalized = await ctx.db.normalizeId("projects", projectId);
  if (!normalized) {
    throw new Error("Project not found.");
  }
  return normalized;
}

async function normalizePhaseId(ctx: ReaderCtx, phaseId: string) {
  const normalized = await ctx.db.normalizeId("phases", phaseId);
  if (!normalized) {
    throw new Error("Phase not found.");
  }
  return normalized;
}

export async function deleteGeneratedDesignsForProject(
  ctx: MutationCtx,
  projectId: Id<"projects">,
) {
  const designs = await ctx.db
    .query("projectGeneratedDesigns")
    .withIndex("by_project", (q) => q.eq("projectId", projectId))
    .collect();

  for (const design of designs) {
    await deleteOldR2Asset(ctx, design.r2ObjectKey);
    await ctx.db.delete(design._id);
  }

  const connections = await ctx.db
    .query("projectDesignConnections")
    .withIndex("by_project", (q) => q.eq("projectId", projectId))
    .collect();

  for (const connection of connections) {
    await ctx.db.delete(connection._id);
  }
}

function sortGeneratedDesigns(
  designs: Array<Doc<"projectGeneratedDesigns">>,
) {
  return [...designs].sort((a, b) => {
    const aOrder = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
    const bOrder = b.sortOrder ?? Number.MAX_SAFE_INTEGER;
    if (aOrder !== bOrder) {
      return aOrder - bOrder;
    }

    const aSyncedAt = a.lastSyncedAt ?? 0;
    const bSyncedAt = b.lastSyncedAt ?? 0;
    if (aSyncedAt !== bSyncedAt) {
      return bSyncedAt - aSyncedAt;
    }

    return b.createdAt - a.createdAt;
  });
}

export const listByProject = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    await requireProjectAccess(ctx, args.projectId);
    const designs = await ctx.db
      .query("projectGeneratedDesigns")
      .withIndex("by_project_createdAt", (q) => q.eq("projectId", args.projectId))
      .collect();

    return Promise.all(sortGeneratedDesigns(designs).map((design) => formatGeneratedDesign(design)));
  },
});

export const listByProjectForApi = internalQuery({
  args: {
    userId: v.id("users"),
    projectId: v.string(),
  },
  handler: async (ctx, args) => {
    const projectId = await normalizeProjectId(ctx, args.projectId);
    await requireProjectAccessForUserId(ctx, {
      userId: args.userId,
      projectId,
    });

    const designs = await ctx.db
      .query("projectGeneratedDesigns")
      .withIndex("by_project_createdAt", (q) => q.eq("projectId", projectId))
      .collect();

    return Promise.all(sortGeneratedDesigns(designs).map((design) => formatGeneratedDesign(design)));
  },
});

export const listDesignConnectionsForApi = internalQuery({
  args: {
    userId: v.id("users"),
    projectId: v.string(),
  },
  handler: async (ctx, args) => {
    const projectId = await normalizeProjectId(ctx, args.projectId);
    await requireProjectAccessForUserId(ctx, {
      userId: args.userId,
      projectId,
    });

    const connections = await ctx.db
      .query("projectDesignConnections")
      .withIndex("by_project", (q) => q.eq("projectId", projectId))
      .collect();

    return Promise.all(connections.map((connection) => formatProjectDesignConnection(connection)));
  },
});

export const saveGeneratedDesign = internalMutation({
  args: {
    userId: v.id("users"),
    projectId: v.id("projects"),
    phaseId: v.optional(v.id("phases")),
    prompt: v.string(),
    deviceType: stitchDeviceTypeValidator,
    modelId: v.optional(stitchModelIdValidator),
    stitchProjectId: v.string(),
    stitchScreenId: v.string(),
    r2ObjectKey: v.string(),
    status: v.union(v.literal("ready"), v.literal("error")),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const timestamp = now();
    const designId = await ctx.db.insert("projectGeneratedDesigns", {
      ...args,
      provider: "stitch",
      source: "stage_proxy",
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    const design = await ctx.db.get(designId);
    if (!design) {
      throw new Error("Failed to save generated design.");
    }

    return formatGeneratedDesign(design);
  },
});

export const upsertDesignConnectionForApi = internalMutation({
  args: {
    userId: v.id("users"),
    projectId: v.string(),
    provider: v.literal("stitch"),
    externalProjectUrl: v.string(),
    externalProjectId: v.optional(v.string()),
    title: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const projectId = await normalizeProjectId(ctx, args.projectId);
    await requireProjectAccessForUserId(ctx, {
      userId: args.userId,
      projectId,
    });

    const timestamp = now();
    const existingConnection = await ctx.db
      .query("projectDesignConnections")
      .withIndex("by_project_provider", (q) =>
        q.eq("projectId", projectId).eq("provider", args.provider),
      )
      .unique();

    if (existingConnection) {
      await ctx.db.patch(existingConnection._id, {
        externalProjectId: args.externalProjectId,
        externalProjectUrl: args.externalProjectUrl,
        title: args.title,
        status: "active",
        updatedAt: timestamp,
      });

      const updatedConnection = await ctx.db.get(existingConnection._id);
      if (!updatedConnection) {
        throw new Error("Failed to update design connection.");
      }

      return formatProjectDesignConnection(updatedConnection);
    }

    const connectionId = await ctx.db.insert("projectDesignConnections", {
      projectId,
      provider: args.provider,
      externalProjectId: args.externalProjectId,
      externalProjectUrl: args.externalProjectUrl,
      title: args.title,
      status: "active",
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    const connection = await ctx.db.get(connectionId);
    if (!connection) {
      throw new Error("Failed to create design connection.");
    }

    return formatProjectDesignConnection(connection);
  },
});

export const verifyAndUpsertDesignConnectionForApi = internalAction({
  args: {
    userId: v.id("users"),
    projectId: v.string(),
    externalProjectUrl: v.string(),
    title: v.optional(v.string()),
  },
  handler: async (
    ctx,
    args,
  ): Promise<FormattedProjectDesignConnection> => {
    await ctx.runQuery(internal.domain.projects.service.getProjectReferenceForApi, {
      userId: args.userId,
      projectId: args.projectId,
    });

    const verified = await verifyStitchProjectAccess(args.externalProjectUrl);

    return ctx.runMutation(internal.integrations.stitch.upsertDesignConnectionForApi, {
      userId: args.userId,
      projectId: args.projectId,
      provider: "stitch",
      externalProjectUrl: verified.externalProjectUrl,
      externalProjectId: verified.externalProjectId,
      title: args.title,
    });
  },
});

async function generateDesignForUser(
  ctx: ActionCtx,
  args: {
    userId: Id<"users">;
    projectId: string;
    prompt: string;
    phaseId?: string;
    deviceType?: StitchDeviceType;
    modelId?: StitchModelId;
  },
): Promise<GeneratedDesignResult> {
  const project = await ctx.runQuery(internal.domain.projects.service.getProjectReferenceForApi, {
    userId: args.userId,
    projectId: args.projectId,
  });

  let resolvedPhaseId: Id<"phases"> | undefined;
  if (args.phaseId) {
    const phaseId: Id<"phases"> = await ctx.runQuery(
      internal.integrations.stitch.resolvePhaseIdForApi,
      {
        userId: args.userId,
        phaseId: args.phaseId,
        projectId: args.projectId,
      },
    );
    resolvedPhaseId = phaseId;
  }

  const apiKey = requireEnv("STITCH_API_KEY");
  const client = new StitchToolClient({ apiKey });
  const stitch = new Stitch(client);

  try {
    const stitchProject = await stitch.createProject(`${project.name} concepts`);
    const screen = await stitchProject.generate(
      args.prompt,
      args.deviceType ?? "DESKTOP",
      args.modelId,
    );

    const [htmlUrl, sourceImageUrl] = await Promise.all([
      screen.getHtml(),
      screen.getImage(),
    ]);

    await ctx.runMutation(internal.integrations.stitch.upsertDesignConnectionForApi, {
      userId: args.userId,
      projectId: args.projectId,
      provider: "stitch",
      externalProjectId: stitchProject.id,
      externalProjectUrl: buildStitchProjectUrl(stitchProject.id),
      title: `${project.name} Stitch workspace`,
    });

    const imageResponse = await fetch(sourceImageUrl);
    if (!imageResponse.ok) {
      throw new Error(
        `Failed to download generated design image: ${imageResponse.status} ${imageResponse.statusText}`,
      );
    }

    const contentType = imageResponse.headers.get("content-type");
    const imageBlob = await imageResponse.blob();
    const r2ObjectKey = await r2.store(ctx, imageBlob, {
      key: buildGeneratedDesignKey({
        userId: String(args.userId),
        projectId: project.id,
        screenId: screen.id,
        contentType,
      }),
      type: contentType ?? "image/png",
      cacheControl: "public, max-age=31536000, immutable",
    });

    const design: SavedGeneratedDesign = await ctx.runMutation(
      internal.integrations.stitch.saveGeneratedDesign,
      {
        userId: args.userId,
        projectId: project.projectId,
        phaseId: resolvedPhaseId,
        prompt: args.prompt,
        deviceType: args.deviceType ?? "DESKTOP",
        modelId: args.modelId,
        stitchProjectId: stitchProject.id,
        stitchScreenId: screen.id,
        r2ObjectKey,
        status: "ready",
      },
    );

    return {
      ...design,
      htmlUrl,
      sourceImageUrl,
    };
  } finally {
    await client.close().catch(() => undefined);
  }
}

const syncProjectDesignScreenValidator = v.object({
  stitchScreenId: v.string(),
  stitchScreenUrl: v.optional(v.string()),
  r2ObjectKey: v.string(),
  title: v.optional(v.string()),
  prompt: v.optional(v.string()),
  phaseId: v.optional(v.string()),
  deviceType: v.optional(stitchDeviceTypeValidator),
  modelId: v.optional(stitchModelIdValidator),
  sortOrder: v.optional(v.number()),
});

async function resolveSyncPhaseIds(
  ctx: MutationCtx,
  args: {
    userId: Id<"users">;
    projectId: Id<"projects">;
    screens: Array<{
      phaseId?: string;
    }>;
  },
) {
  const resolvedPhaseIds = new Map<string, Id<"phases">>();

  for (const screen of args.screens) {
    if (!screen.phaseId || resolvedPhaseIds.has(screen.phaseId)) {
      continue;
    }

    const phaseId = await normalizePhaseId(ctx, screen.phaseId);
    const { phase } = await requirePhaseAccessForUserId(ctx, {
      userId: args.userId,
      phaseId,
    });

    if (phase.projectId !== args.projectId) {
      throw new Error("Phase does not belong to the specified project.");
    }

    resolvedPhaseIds.set(screen.phaseId, phaseId);
  }

  return resolvedPhaseIds;
}

async function resolveTrackedGeneratedDesignUploads(
  ctx: MutationCtx,
  args: {
    userId: Id<"users">;
    keys: string[];
  },
) {
  const uploads = await Promise.all(
    args.keys.map((key) =>
      ctx.db
        .query("uploadedAssets")
        .withIndex("by_key", (q) => q.eq("key", key))
        .unique(),
    ),
  );

  const uploadMap = new Map<string, Doc<"uploadedAssets">>();

  uploads.forEach((upload, index) => {
    const key = args.keys[index];
    if (!upload) {
      return;
    }

    if (!key) {
      return;
    }

    if (upload.userId !== args.userId || upload.purpose !== "generated-design") {
      throw new Error("Generated design upload does not belong to the authenticated user.");
    }

    uploadMap.set(key, upload);
  });

  return uploadMap;
}

export const syncProjectDesignsForApi = internalMutation({
  args: {
    userId: v.id("users"),
    projectId: v.string(),
    externalProjectUrl: v.string(),
    externalProjectId: v.optional(v.string()),
    title: v.optional(v.string()),
    screens: v.array(syncProjectDesignScreenValidator),
  },
  handler: async (ctx, args) => {
    const projectId = await normalizeProjectId(ctx, args.projectId);
    await requireProjectAccessForUserId(ctx, {
      userId: args.userId,
      projectId,
    });

    const timestamp = now();
    const existingConnection = await ctx.db
      .query("projectDesignConnections")
      .withIndex("by_project_provider", (q) => q.eq("projectId", projectId).eq("provider", "stitch"))
      .unique();

    const resolvedPhaseIds = await resolveSyncPhaseIds(ctx, {
      userId: args.userId,
      projectId,
      screens: args.screens,
    });

    const existingDesigns = await ctx.db
      .query("projectGeneratedDesigns")
      .withIndex("by_project", (q) => q.eq("projectId", projectId))
      .collect();

    const existingSyncedDesigns = existingDesigns.filter((design) => design.source === "user_sync");
    const existingDesignByScreenId = new Map(
      existingSyncedDesigns
        .filter((design): design is Doc<"projectGeneratedDesigns"> & { stitchScreenId: string } =>
          typeof design.stitchScreenId === "string",
        )
        .map((design) => [design.stitchScreenId, design]),
    );
    const existingDesignByKey = new Map(existingDesigns.map((design) => [design.r2ObjectKey, design]));
    const uploadMap = await resolveTrackedGeneratedDesignUploads(ctx, {
      userId: args.userId,
      keys: [...new Set(args.screens.map((screen) => screen.r2ObjectKey))],
    });

    let connectionId = existingConnection?._id;
    if (existingConnection) {
      await ctx.db.patch(existingConnection._id, {
        externalProjectId: args.externalProjectId,
        externalProjectUrl: args.externalProjectUrl,
        title: args.title,
        status: "active",
        lastSyncedAt: timestamp,
        updatedAt: timestamp,
      });
    } else {
      connectionId = await ctx.db.insert("projectDesignConnections", {
        projectId,
        provider: "stitch",
        externalProjectId: args.externalProjectId,
        externalProjectUrl: args.externalProjectUrl,
        title: args.title,
        status: "active",
        lastSyncedAt: timestamp,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    }

    const syncedDesignIds = new Set<Id<"projectGeneratedDesigns">>();
    const staleKeys = new Set<string>();

    for (const [index, screen] of args.screens.entries()) {
      const existingDesign = existingDesignByScreenId.get(screen.stitchScreenId);
      const trackedUpload = uploadMap.get(screen.r2ObjectKey);
      const reusingExistingKey = existingDesignByKey.get(screen.r2ObjectKey);

      if (!trackedUpload && !reusingExistingKey) {
        throw new Error("Generated design upload not found or already unavailable.");
      }

      const patch = {
        phaseId: screen.phaseId ? resolvedPhaseIds.get(screen.phaseId) : undefined,
        provider: "stitch" as const,
        source: "user_sync" as const,
        title: screen.title,
        prompt: screen.prompt,
        deviceType: screen.deviceType,
        modelId: screen.modelId,
        stitchProjectId: args.externalProjectId,
        stitchScreenId: screen.stitchScreenId,
        stitchScreenUrl: screen.stitchScreenUrl,
        r2ObjectKey: screen.r2ObjectKey,
        sortOrder: screen.sortOrder ?? index,
        status: "ready" as const,
        errorMessage: undefined,
        lastSyncedAt: timestamp,
        updatedAt: timestamp,
      };

      if (existingDesign) {
        if (existingDesign.r2ObjectKey !== screen.r2ObjectKey) {
          staleKeys.add(existingDesign.r2ObjectKey);
        }
        await ctx.db.patch(existingDesign._id, patch);
        syncedDesignIds.add(existingDesign._id);
      } else {
        const designId = await ctx.db.insert("projectGeneratedDesigns", {
          userId: args.userId,
          projectId,
          createdAt: timestamp,
          ...patch,
        });
        syncedDesignIds.add(designId);
      }

      if (trackedUpload) {
        await attachTrackedR2Asset(ctx, { key: screen.r2ObjectKey });
      }
    }

    for (const design of existingSyncedDesigns) {
      if (syncedDesignIds.has(design._id)) {
        continue;
      }

      staleKeys.add(design.r2ObjectKey);
      await ctx.db.delete(design._id);
    }

    const latestConnection = connectionId ? await ctx.db.get(connectionId) : null;
    const latestDesigns = await ctx.db
      .query("projectGeneratedDesigns")
      .withIndex("by_project", (q) => q.eq("projectId", projectId))
      .collect();

    const latestKeys = new Set(latestDesigns.map((design) => design.r2ObjectKey));

    for (const key of staleKeys) {
      if (latestKeys.has(key)) {
        continue;
      }

      await deleteOldR2Asset(ctx, key);
    }

    return {
      connection: latestConnection
        ? await formatProjectDesignConnection(latestConnection)
        : null,
      designs: await Promise.all(
        sortGeneratedDesigns(latestDesigns).map((design) => formatGeneratedDesign(design)),
      ),
    };
  },
});

export const verifyAndSyncProjectDesignsForApi = internalAction({
  args: {
    userId: v.id("users"),
    projectId: v.string(),
    externalProjectUrl: v.string(),
    externalProjectId: v.optional(v.string()),
    title: v.optional(v.string()),
    screens: v.array(syncProjectDesignScreenValidator),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{
    connection: FormattedProjectDesignConnection | null;
    designs: SavedGeneratedDesign[];
  }> => {
    await ctx.runQuery(internal.domain.projects.service.getProjectReferenceForApi, {
      userId: args.userId,
      projectId: args.projectId,
    });

    const verified = await verifyStitchProjectSyncAccess({
      externalProjectUrl: args.externalProjectUrl,
      externalProjectId: args.externalProjectId,
      screens: args.screens,
    });

    return ctx.runMutation(internal.integrations.stitch.syncProjectDesignsForApi, {
      userId: args.userId,
      projectId: args.projectId,
      externalProjectUrl: verified.externalProjectUrl,
      externalProjectId: verified.externalProjectId,
      title: args.title,
      screens: args.screens,
    });
  },
});

export const resolvePhaseIdForApi = internalQuery({
  args: {
    userId: v.id("users"),
    projectId: v.string(),
    phaseId: v.string(),
  },
  handler: async (ctx, args) => {
    const projectId = await normalizeProjectId(ctx, args.projectId);
    const phaseId = await normalizePhaseId(ctx, args.phaseId);
    const { phase } = await requirePhaseAccessForUserId(ctx, {
      userId: args.userId,
      phaseId,
    });

    if (phase.projectId !== projectId) {
      throw new Error("Phase does not belong to the specified project.");
    }

    return phaseId;
  },
});

export const generateDesign = action({
  args: {
    projectId: v.id("projects"),
    prompt: v.string(),
    phaseId: v.optional(v.id("phases")),
    deviceType: v.optional(stitchDeviceTypeValidator),
    modelId: v.optional(stitchModelIdValidator),
  },
  handler: async (ctx, args): Promise<GeneratedDesignResult> => {
    const viewer: ViewerContext = await ctx.runQuery(internal.onboarding.getViewerContext, {});

    return generateDesignForUser(ctx, {
      userId: viewer.userId,
      projectId: String(args.projectId),
      prompt: args.prompt,
      phaseId: args.phaseId ? String(args.phaseId) : undefined,
      deviceType: args.deviceType,
      modelId: args.modelId,
    });
  },
});

export const generateDesignForApi = internalAction({
  args: {
    userId: v.id("users"),
    projectId: v.string(),
    prompt: v.string(),
    phaseId: v.optional(v.string()),
    deviceType: v.optional(stitchDeviceTypeValidator),
    modelId: v.optional(stitchModelIdValidator),
  },
  handler: async (ctx, args): Promise<GeneratedDesignResult> => {
    return generateDesignForUser(ctx, args);
  },
});
