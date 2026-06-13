import { v } from "convex/values";
import type { Id } from "../../../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../../../_generated/server";
import { requireAuthUser } from "../../../../_helpers";
import { requireProjectAccessForUserId } from "../../../../domain/projects/service";
import { getConnection } from "../domain";

export const createFigmaCanvasExportJobArgs = {
  projectId: v.id("projects"),
  artifactId: v.id("projectAiArtifacts"),
  screenId: v.string(),
  exportKind: v.union(v.literal("wireframe"), v.literal("figjam_flow_map")),
  writePlanJson: v.string(),
  pairingCodeHash: v.string(),
  pairingExpiresAt: v.number(),
};

export const claimFigmaExportJobArgs = {
  pairingCodeHash: v.string(),
  figmaUserId: v.string(),
  documentName: v.string(),
  editorType: v.union(v.literal("figma"), v.literal("figjam")),
  claimTokenHash: v.string(),
  claimExpiresAt: v.number(),
  claimedAt: v.number(),
};

export const heartbeatFigmaExportJobArgs = {
  claimTokenHash: v.string(),
  claimExpiresAt: v.number(),
  heartbeatAt: v.number(),
};

export const completeFigmaExportJobArgs = {
  claimTokenHash: v.string(),
  destinationNodeId: v.string(),
  destinationUrl: v.optional(v.string()),
  completedAt: v.number(),
};

export const failFigmaExportJobArgs = {
  claimTokenHash: v.string(),
  errorMessage: v.string(),
  failedAt: v.number(),
};

export const getFigmaExportJobArgs = { jobId: v.id("figmaExportJobs") };

export async function createFigmaCanvasExportJobHandler(
  ctx: MutationCtx,
  args: {
    projectId: Id<"projects">;
    artifactId: Id<"projectAiArtifacts">;
    screenId: string;
    exportKind: "wireframe" | "figjam_flow_map";
    writePlanJson: string;
    pairingCodeHash: string;
    pairingExpiresAt: number;
  },
) {
  const user = await requireAuthUser(ctx);
  await requireProjectAccessForUserId(ctx, {
    userId: user._id,
    projectId: args.projectId,
  });

  const artifact = await ctx.db.get(args.artifactId);
  if (!artifact || artifact.projectId !== args.projectId) {
    throw new Error("Export artifact not found.");
  }
  if (
    args.exportKind === "wireframe" &&
    (artifact.module !== "generate" || artifact.kind !== "wireframesArtifact")
  ) {
    throw new Error("Wireframes artifact not found.");
  }
  if (
    args.exportKind === "figjam_flow_map" &&
    (artifact.module !== "flows" || artifact.kind !== "flowsArtifact")
  ) {
    throw new Error("Flows artifact not found.");
  }

  const connection = await getConnection(ctx, user._id, "figma");
  if (!connection || connection.status !== "active" || !connection.accountId) {
    throw new Error("Connect Figma in Settings before exporting.");
  }

  const timestamp = Date.now();
  const existing = (
    await ctx.db
      .query("figmaExportJobs")
      .withIndex("by_artifact_screen", (q) =>
        q.eq("artifactId", args.artifactId).eq("screenId", args.screenId),
      )
      .collect()
  ).sort((a, b) => b.updatedAt - a.updatedAt)[0];

  if (existing && existing.status !== "completed") {
    await ctx.db.patch(existing._id, {
      figmaAccountId: connection.accountId,
      exportKind: args.exportKind,
      status: "requested",
      writePlanJson: args.writePlanJson,
      pairingCodeHash: args.pairingCodeHash,
      pairingExpiresAt: args.pairingExpiresAt,
      claimedFigmaUserId: undefined,
      claimTokenHash: undefined,
      claimExpiresAt: undefined,
      errorMessage: undefined,
      updatedAt: timestamp,
    });
    return {
      jobId: String(existing._id),
      status: "requested" as const,
    };
  }

  if (existing) {
    return {
      jobId: String(existing._id),
      status: "completed" as const,
    };
  }

  const jobId = await ctx.db.insert("figmaExportJobs", {
    userId: user._id,
    projectId: args.projectId,
    artifactId: args.artifactId,
    screenId: args.screenId,
    exportKind: args.exportKind,
    figmaAccountId: connection.accountId,
    status: "requested",
    writePlanJson: args.writePlanJson,
    pairingCodeHash: args.pairingCodeHash,
    pairingExpiresAt: args.pairingExpiresAt,
    attemptCount: 0,
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  return {
    jobId: String(jobId),
    status: "requested" as const,
  };
}

export async function claimFigmaExportJobHandler(
  ctx: MutationCtx,
  args: {
    pairingCodeHash: string;
    figmaUserId: string;
    documentName: string;
    editorType: "figma" | "figjam";
    claimTokenHash: string;
    claimExpiresAt: number;
    claimedAt: number;
  },
) {
  const job = await ctx.db
    .query("figmaExportJobs")
    .withIndex("by_pairing_hash", (q) => q.eq("pairingCodeHash", args.pairingCodeHash))
    .unique();

  if (!job || job.pairingExpiresAt < args.claimedAt) {
    throw new Error("Export pairing code is invalid or expired.");
  }
  if (job.figmaAccountId !== args.figmaUserId) {
    throw new Error("Open Figma with the same account connected to Stage.");
  }
  if (job.status === "completed") {
    throw new Error("This export is already completed.");
  }
  const expectedEditor = job.exportKind === "figjam_flow_map" ? "figjam" : "figma";
  if (args.editorType !== expectedEditor) {
    throw new Error(
      expectedEditor === "figjam"
        ? "Open a FigJam board before running this export."
        : "Open a Figma Design file before running this export.",
    );
  }

  await ctx.db.patch(job._id, {
    status: "claimed",
    claimedFigmaUserId: args.figmaUserId,
    claimTokenHash: args.claimTokenHash,
    claimExpiresAt: args.claimExpiresAt,
    destinationFileName: args.documentName.trim(),
    attemptCount: job.attemptCount + 1,
    errorMessage: undefined,
    updatedAt: args.claimedAt,
  });

  return {
    jobId: String(job._id),
    writePlanJson: job.writePlanJson,
    claimExpiresAt: args.claimExpiresAt,
  };
}

export async function heartbeatFigmaExportJobHandler(
  ctx: MutationCtx,
  args: { claimTokenHash: string; claimExpiresAt: number; heartbeatAt: number },
) {
  const job = await ctx.db
    .query("figmaExportJobs")
    .withIndex("by_claim_hash", (q) => q.eq("claimTokenHash", args.claimTokenHash))
    .unique();
  if (!job || !job.claimExpiresAt || job.claimExpiresAt < args.heartbeatAt) {
    throw new Error("Export claim is invalid or expired.");
  }
  if (job.status !== "claimed") {
    throw new Error("Export job is not actively claimed.");
  }
  await ctx.db.patch(job._id, {
    claimExpiresAt: args.claimExpiresAt,
    updatedAt: args.heartbeatAt,
  });
  return { jobId: String(job._id), claimExpiresAt: args.claimExpiresAt };
}

export async function completeFigmaExportJobHandler(
  ctx: MutationCtx,
  args: {
    claimTokenHash: string;
    destinationNodeId: string;
    destinationUrl?: string;
    completedAt: number;
  },
) {
  const job = await ctx.db
    .query("figmaExportJobs")
    .withIndex("by_claim_hash", (q) => q.eq("claimTokenHash", args.claimTokenHash))
    .unique();

  if (!job || !job.claimExpiresAt || job.claimExpiresAt < args.completedAt) {
    throw new Error("Export claim is invalid or expired.");
  }

  await ctx.db.patch(job._id, {
    status: "completed",
    destinationNodeId: args.destinationNodeId,
    destinationUrl: args.destinationUrl,
    errorMessage: undefined,
    completedAt: args.completedAt,
    updatedAt: args.completedAt,
  });

  const exportKind = job.exportKind ?? "wireframe";
  if (args.destinationUrl && exportKind === "wireframe") {
    const artifact = await ctx.db.get(job.artifactId);
    if (artifact?.contentJson) {
      try {
        const content = JSON.parse(artifact.contentJson) as {
          generatedScreens?: Array<Record<string, unknown>>;
        };
        const screens = content.generatedScreens ?? [];
        content.generatedScreens = screens.map((screen) =>
          screen.id === job.screenId ? { ...screen, figmaUrl: args.destinationUrl } : screen,
        );
        await ctx.db.patch(job.artifactId, {
          contentJson: JSON.stringify(content),
          updatedAt: args.completedAt,
        });
      } catch {
        // The completed export remains valid even when legacy artifact JSON cannot be patched.
      }
    }
  }

  if (args.destinationUrl && exportKind === "figjam_flow_map") {
    const artifact = await ctx.db.get(job.artifactId);
    if (artifact?.contentJson) {
      try {
        const content = JSON.parse(artifact.contentJson) as Record<string, unknown>;
        content.figjamUrl = args.destinationUrl;
        content.figjamExportedAt = args.completedAt;
        await ctx.db.patch(job.artifactId, {
          contentJson: JSON.stringify(content),
          updatedAt: args.completedAt,
        });
      } catch {
        // The completed export remains valid even when legacy artifact JSON cannot be patched.
      }
    }
  }

  const action =
    exportKind === "figjam_flow_map" ? "flows_figjam_export" : `wireframe_figma_export:${job.screenId}`;
  const existingDestination = (
    await ctx.db
      .query("artifactDestinations")
      .withIndex("by_artifact", (q) => q.eq("artifactId", job.artifactId))
      .collect()
  ).find((destination) => destination.provider === "figma" && destination.action === action);
  const destinationPatch = {
    status: "completed" as const,
    destinationLabel:
      job.destinationFileName ??
      (exportKind === "figjam_flow_map" ? "FigJam flow map" : "Figma wireframe"),
    destinationUrl: args.destinationUrl,
    requestedVia: "native" as const,
    errorMessage: undefined,
    lastSyncedAt: args.completedAt,
    updatedAt: args.completedAt,
  };
  if (existingDestination) {
    await ctx.db.patch(existingDestination._id, destinationPatch);
  } else {
    await ctx.db.insert("artifactDestinations", {
      userId: job.userId,
      projectId: job.projectId,
      artifactId: job.artifactId,
      provider: "figma",
      action,
      createdAt: args.completedAt,
      ...destinationPatch,
    });
  }

  return { jobId: String(job._id), status: "completed" as const };
}

export async function failFigmaExportJobHandler(
  ctx: MutationCtx,
  args: { claimTokenHash: string; errorMessage: string; failedAt: number },
) {
  const job = await ctx.db
    .query("figmaExportJobs")
    .withIndex("by_claim_hash", (q) => q.eq("claimTokenHash", args.claimTokenHash))
    .unique();
  if (!job) {
    return null;
  }

  await ctx.db.patch(job._id, {
    status: "failed",
    errorMessage: args.errorMessage.slice(0, 1000),
    updatedAt: args.failedAt,
  });
  return { jobId: String(job._id), status: "failed" as const };
}

export async function getFigmaExportJobHandler(
  ctx: QueryCtx,
  args: { jobId: Id<"figmaExportJobs"> },
) {
  const user = await requireAuthUser(ctx);
  const job = await ctx.db.get(args.jobId);
  if (!job || job.userId !== user._id) {
    return null;
  }
  return {
    id: String(job._id),
    status: job.status,
    destinationFileName: job.destinationFileName ?? null,
    destinationNodeId: job.destinationNodeId ?? null,
    destinationUrl: job.destinationUrl ?? null,
    errorMessage: job.errorMessage ?? null,
    exportKind: job.exportKind ?? "wireframe",
    updatedAt: job.updatedAt,
  };
}
