import { v } from "convex/values";
import type { Id } from "../../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../../_generated/server";
import { upsertContextRecord } from "../domain/contextStore";
import { createArtifactRecord } from "../domain/artifactStore";
import { createRunRecord } from "../domain/runStore";
import {
  getArtifactRecord,
  getContextRecord,
  getRunRecord,
  requireProjectForApi,
} from "../domain/records";
import { normalizeOptional } from "../domain/normalize";
import { now } from "../domain/time";
import {
  aiArtifactStatus,
  aiContentFormat,
  aiModule,
  aiRunStatus,
  exportProvider,
  exportStatus,
  type AiModule,
} from "../domain/validators";
import { resolveAssetUrl } from "../../../r2";

export const getContextForApiArgs = {
  userId: v.id("users"),
  projectId: v.id("projects"),
};

export async function getContextForApiHandler(
  ctx: QueryCtx,
  args: { userId: Id<"users">; projectId: Id<"projects"> },
) {
  await requireProjectForApi(ctx, args.userId, args.projectId);
  const record = await getContextRecord(ctx, args.projectId);
  if (!record) {
    return null;
  }

  return {
    ...record,
    briefAttachmentName: record.briefAttachmentName ?? null,
    briefAttachmentUrl: await resolveAssetUrl(record.briefAttachmentR2ObjectKey ?? null),
  };
}

export const upsertContextForApiArgs = {
  userId: v.id("users"),
  projectId: v.id("projects"),
  clientWebsite: v.optional(v.string()),
  competitorUrls: v.array(v.string()),
  referenceUrls: v.array(v.string()),
  brief: v.optional(v.string()),
  briefAttachmentName: v.optional(v.union(v.string(), v.null())),
  briefAttachmentR2ObjectKey: v.optional(v.union(v.string(), v.null())),
  notes: v.optional(v.string()),
};

export async function upsertContextForApiHandler(
  ctx: MutationCtx,
  args: {
    userId: Id<"users">;
    projectId: Id<"projects">;
    clientWebsite?: string;
    competitorUrls: string[];
    referenceUrls: string[];
    brief?: string;
    briefAttachmentName?: string | null;
    briefAttachmentR2ObjectKey?: string | null;
    notes?: string;
  },
) {
  await requireProjectForApi(ctx, args.userId, args.projectId);
  const contextId = await upsertContextRecord(ctx, args);
  return { contextId };
}

export const listRunsForApiArgs = {
  userId: v.id("users"),
  projectId: v.id("projects"),
  module: v.optional(aiModule),
};

export async function listRunsForApiHandler(
  ctx: QueryCtx,
  args: { userId: Id<"users">; projectId: Id<"projects">; module?: AiModule },
) {
  await requireProjectForApi(ctx, args.userId, args.projectId);
  const runs = await ctx.db
    .query("projectAiRuns")
    .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
    .collect();

  return runs
    .filter((run) => !args.module || run.module === args.module)
    .sort((a, b) => b.startedAt - a.startedAt);
}

export const createRunForApiArgs = {
  userId: v.id("users"),
  projectId: v.id("projects"),
  connectionId: v.optional(v.id("agentConnections")),
  module: aiModule,
  title: v.string(),
  status: aiRunStatus,
  trigger: v.union(v.literal("user"), v.literal("agent")),
  inputSummary: v.optional(v.string()),
  externalRunId: v.optional(v.string()),
};

export async function createRunForApiHandler(
  ctx: MutationCtx,
  args: {
    userId: Id<"users">;
    projectId: Id<"projects">;
    connectionId?: Id<"agentConnections">;
    module: AiModule;
    title: string;
    status: "draft" | "running" | "completed" | "failed" | "needs_input";
    trigger: "user" | "agent";
    inputSummary?: string;
    externalRunId?: string;
  },
) {
  await requireProjectForApi(ctx, args.userId, args.projectId);
  const runId = await createRunRecord(ctx, args);
  return { runId };
}

export const listArtifactsForApiArgs = {
  userId: v.id("users"),
  projectId: v.id("projects"),
  module: v.optional(aiModule),
};

export async function listArtifactsForApiHandler(
  ctx: QueryCtx,
  args: { userId: Id<"users">; projectId: Id<"projects">; module?: AiModule },
) {
  await requireProjectForApi(ctx, args.userId, args.projectId);
  const artifacts = await ctx.db
    .query("projectAiArtifacts")
    .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
    .collect();

  return artifacts
    .filter((artifact) => !args.module || artifact.module === args.module)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export const createArtifactForApiArgs = {
  userId: v.id("users"),
  projectId: v.id("projects"),
  runId: v.optional(v.id("projectAiRuns")),
  module: aiModule,
  kind: v.string(),
  title: v.string(),
  summary: v.optional(v.string()),
  status: aiArtifactStatus,
  contentFormat: aiContentFormat,
  contentMarkdown: v.optional(v.string()),
  contentJson: v.optional(v.string()),
  externalUrl: v.optional(v.string()),
};

export async function createArtifactForApiHandler(
  ctx: MutationCtx,
  args: {
    userId: Id<"users">;
    projectId: Id<"projects">;
    runId?: Id<"projectAiRuns">;
    module: AiModule;
    kind: string;
    title: string;
    summary?: string;
    status: "draft" | "ready" | "approved" | "superseded" | "failed";
    contentFormat: "markdown" | "json" | "link_set";
    contentMarkdown?: string;
    contentJson?: string;
    externalUrl?: string;
  },
) {
  await requireProjectForApi(ctx, args.userId, args.projectId);
  if (args.runId) {
    const run = await getRunRecord(ctx, args.runId);
    if (run.projectId !== args.projectId) {
      throw new Error("Run not found.");
    }
  }

  const artifactId = await createArtifactRecord(ctx, args);
  return { artifactId };
}

export const upsertArtifactExportForApiArgs = {
  userId: v.id("users"),
  artifactId: v.id("projectAiArtifacts"),
  provider: exportProvider,
  action: v.string(),
  status: exportStatus,
  destinationLabel: v.optional(v.string()),
  destinationUrl: v.optional(v.string()),
  errorMessage: v.optional(v.string()),
  lastSyncedAt: v.optional(v.number()),
};

export async function upsertArtifactExportForApiHandler(
  ctx: MutationCtx,
  args: {
    userId: Id<"users">;
    artifactId: Id<"projectAiArtifacts">;
    provider: "notion" | "figma";
    action: string;
    status: "requested" | "in_progress" | "completed" | "failed";
    destinationLabel?: string;
    destinationUrl?: string;
    errorMessage?: string;
    lastSyncedAt?: number;
  },
) {
  const artifact = await getArtifactRecord(ctx, args.artifactId);
  await requireProjectForApi(ctx, args.userId, artifact.projectId);
  const timestamp = now();
  const existing = (
    await ctx.db
      .query("artifactDestinations")
      .withIndex("by_artifact", (q) => q.eq("artifactId", args.artifactId))
      .collect()
  )
    .filter(
      (destination) =>
        destination.provider === args.provider && destination.action === args.action,
    )
    .sort((a, b) => b.updatedAt - a.updatedAt)[0];

  const patch = {
    destinationLabel: normalizeOptional(args.destinationLabel),
    destinationUrl: normalizeOptional(args.destinationUrl),
    errorMessage: normalizeOptional(args.errorMessage),
    lastSyncedAt: args.lastSyncedAt ?? timestamp,
    status: args.status,
    updatedAt: timestamp,
  };

  if (existing) {
    await ctx.db.patch(existing._id, patch);
    return { destinationId: existing._id };
  }

  const destinationId = await ctx.db.insert("artifactDestinations", {
    userId: args.userId,
    artifactId: artifact._id,
    projectId: artifact.projectId,
    provider: args.provider,
    action: args.action.trim(),
    requestedVia: "claude",
    createdAt: timestamp,
    ...patch,
  });

  return { destinationId };
}
