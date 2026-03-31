import { Stitch, StitchToolClient } from "@google/stitch-sdk";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
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
import { deleteOldR2Asset, r2 } from "../r2";

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

async function formatGeneratedDesign(
  design: {
    _id: Id<"projectGeneratedDesigns">;
    userId: Id<"users">;
    projectId: Id<"projects">;
    phaseId?: Id<"phases">;
    prompt: string;
    deviceType: StitchDeviceType;
    modelId?: StitchModelId;
    stitchProjectId: string;
    stitchScreenId: string;
    r2ObjectKey: string;
    status: "ready" | "error";
    errorMessage?: string;
    createdAt: number;
    updatedAt: number;
  },
) {
  return {
    id: String(design._id),
    userId: String(design.userId),
    projectId: String(design.projectId),
    phaseId: design.phaseId ? String(design.phaseId) : undefined,
    prompt: design.prompt,
    deviceType: design.deviceType,
    modelId: design.modelId,
    stitchProjectId: design.stitchProjectId,
    stitchScreenId: design.stitchScreenId,
    imageUrl: await r2.getUrl(design.r2ObjectKey),
    r2ObjectKey: design.r2ObjectKey,
    status: design.status,
    errorMessage: design.errorMessage,
    createdAt: design.createdAt,
    updatedAt: design.updatedAt,
  };
}

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

    return Promise.all(designs.map((design) => formatGeneratedDesign(design)));
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

    return Promise.all(designs.map((design) => formatGeneratedDesign(design)));
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
