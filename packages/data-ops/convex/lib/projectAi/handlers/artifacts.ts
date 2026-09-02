import { v } from "convex/values";
import type { Id } from "../../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../../_generated/server";
import { requireProjectAccess, requireProjectAccessOrNull } from "../../../_helpers";
import { deleteDownstreamArtifacts } from "../domain/artifactStore";
import {
  findLatestArtifact,
  mapLatestArtifactResponse,
} from "../domain/latestArtifact";
import { getArtifactRecord, listDestinationsForArtifacts } from "../domain/records";
import { resolveAssetContentJson, resolveResearchContentJson } from "../domain/researchContent";
import { now } from "../domain/time";
import {
  aiArtifactStatus,
  aiModule,
  exportProvider,
  type AiModule,
} from "../domain/validators";

const latestArtifactArgs = { projectId: v.id("projects") };

async function latestArtifactHandler(
  ctx: QueryCtx,
  args: { projectId: Id<"projects"> },
  module: AiModule,
  kind: string,
  resolveContentJson?: (contentJson: string | null | undefined) => Promise<string | null>,
) {
  const access = await requireProjectAccessOrNull(ctx, args.projectId);
  if (!access) {
    return null;
  }
  const latest = await findLatestArtifact(ctx, args.projectId, module, kind);
  if (!latest) {
    return null;
  }
  const contentJson = resolveContentJson
    ? await resolveContentJson(latest.contentJson)
    : (latest.contentJson ?? null);
  return mapLatestArtifactResponse(latest, contentJson);
}

export const getLatestMoodboardArtifactArgs = latestArtifactArgs;
export const getLatestMoodboardArtifactHandler = (
  ctx: QueryCtx,
  args: { projectId: Id<"projects"> },
) => latestArtifactHandler(ctx, args, "moodboard", "moodboardArtifact", resolveAssetContentJson);

export const getLatestFlowsArtifactArgs = latestArtifactArgs;
export const getLatestFlowsArtifactHandler = (
  ctx: QueryCtx,
  args: { projectId: Id<"projects"> },
) => latestArtifactHandler(ctx, args, "flows", "flowsArtifact");

export const getLatestWireframesArtifactArgs = latestArtifactArgs;
export const getLatestWireframesArtifactHandler = (
  ctx: QueryCtx,
  args: { projectId: Id<"projects"> },
) => latestArtifactHandler(ctx, args, "generate", "wireframesArtifact", resolveAssetContentJson);

export const getLatestAssetsArtifactArgs = latestArtifactArgs;
export const getLatestAssetsArtifactHandler = (
  ctx: QueryCtx,
  args: { projectId: Id<"projects"> },
) => latestArtifactHandler(ctx, args, "delivery", "assetsArtifact");

export const listArtifactsArgs = {
  projectId: v.id("projects"),
  module: v.optional(aiModule),
};

export async function listArtifactsHandler(
  ctx: QueryCtx,
  args: { projectId: Id<"projects">; module?: AiModule },
) {
  await requireProjectAccess(ctx, args.projectId);
  const artifacts = await ctx.db
    .query("projectAiArtifacts")
    .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
    .collect();
  const filtered = artifacts
    .filter((artifact) => !args.module || artifact.module === args.module)
    .sort((a, b) => b.createdAt - a.createdAt);
  const destinationsByArtifact = await listDestinationsForArtifacts(
    ctx,
    filtered.map((artifact) => artifact._id),
  );

  return Promise.all(
    filtered.map(async (artifact) => ({
      id: String(artifact._id),
      projectId: String(artifact.projectId),
      runId: artifact.runId ? String(artifact.runId) : null,
      module: artifact.module,
      kind: artifact.kind,
      title: artifact.title,
      summary: artifact.summary ?? null,
      status: artifact.status,
      contentFormat: artifact.contentFormat,
      contentMarkdown: artifact.contentMarkdown ?? null,
      contentJson:
        artifact.module === "research" && artifact.kind === "researchArtifact"
          ? await resolveResearchContentJson(artifact.contentJson ?? null)
          : (artifact.contentJson ?? null),
      externalUrl: artifact.externalUrl ?? null,
      createdAt: artifact.createdAt,
      updatedAt: artifact.updatedAt,
      approvedAt: artifact.approvedAt ?? null,
      destinations: (destinationsByArtifact.get(String(artifact._id)) ?? []).map((destination) => ({
        id: String(destination._id),
        provider: destination.provider,
        action: destination.action,
        status: destination.status,
        destinationLabel: destination.destinationLabel ?? null,
        destinationUrl: destination.destinationUrl ?? null,
        errorMessage: destination.errorMessage ?? null,
        lastSyncedAt: destination.lastSyncedAt ?? null,
        createdAt: destination.createdAt,
        updatedAt: destination.updatedAt,
      })),
    })),
  );
}

export const clearDownstreamArtifactsArgs = {
  projectId: v.id("projects"),
};

export async function clearDownstreamArtifactsHandler(
  ctx: MutationCtx,
  args: { projectId: Id<"projects"> },
) {
  await requireProjectAccess(ctx, args.projectId);
  await deleteDownstreamArtifacts(ctx, args.projectId);
  return { cleared: true as const };
}

export const setArtifactStatusArgs = {
  artifactId: v.id("projectAiArtifacts"),
  status: aiArtifactStatus,
};

export async function setArtifactStatusHandler(
  ctx: MutationCtx,
  args: { artifactId: Id<"projectAiArtifacts">; status: "draft" | "ready" | "approved" | "superseded" | "failed" },
) {
  const artifact = await getArtifactRecord(ctx, args.artifactId);
  await requireProjectAccess(ctx, artifact.projectId);
  const timestamp = now();

  await ctx.db.patch(args.artifactId, {
    status: args.status,
    approvedAt: args.status === "approved" ? timestamp : undefined,
    updatedAt: timestamp,
  });

  return {
    artifactId: String(args.artifactId),
    status: args.status,
    updatedAt: timestamp,
  };
}

export const requestArtifactDestinationArgs = {
  artifactId: v.id("projectAiArtifacts"),
  provider: exportProvider,
  action: v.string(),
};

export async function requestArtifactDestinationHandler(
  ctx: MutationCtx,
  args: { artifactId: Id<"projectAiArtifacts">; provider: "notion" | "figma"; action: string },
) {
  const artifact = await getArtifactRecord(ctx, args.artifactId);
  const { user } = await requireProjectAccess(ctx, artifact.projectId);
  const timestamp = now();
  const destinationId = await ctx.db.insert("artifactDestinations", {
    userId: user._id,
    artifactId: artifact._id,
    projectId: artifact.projectId,
    provider: args.provider,
    action: args.action.trim(),
    status: "requested",
    requestedVia: "claude",
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  return {
    destinationId: String(destinationId),
    requestedAt: timestamp,
  };
}
