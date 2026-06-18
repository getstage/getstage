import { v } from "convex/values";
import type { Id } from "../../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../../_generated/server";
import { requireProjectAccess, requireProjectAccessOrNull } from "../../../_helpers";
import { deleteOldR2Asset } from "../../../r2";
import {
  createArtifactRecord,
  deletePreviousResearchArtifacts,
  deletePreviousStrategyArtifacts,
} from "../domain/artifactStore";
import { setLastProviderId } from "../domain/contextStore";
import {
  findLatestArtifact,
  mapLatestArtifactResponse,
} from "../domain/latestArtifact";
import { getArtifactRecord, getRunRecord } from "../domain/records";
import { resolveResearchContentJson } from "../domain/researchContent";
import {
  completeRunRecord,
  createRunRecord,
  findRunningRunForProjectModule,
} from "../domain/runStore";
import { normalizeOptional } from "../domain/normalize";
import { now } from "../domain/time";
import { projectAiProviderId } from "../domain/validators";

export const createResearchRunArgs = {
  projectId: v.id("projects"),
  title: v.string(),
  inputSummary: v.optional(v.string()),
  externalRunId: v.optional(v.string()),
};

export async function createResearchRunHandler(
  ctx: MutationCtx,
  args: {
    projectId: Id<"projects">;
    title: string;
    inputSummary?: string;
    externalRunId?: string;
  },
) {
  const { user } = await requireProjectAccess(ctx, args.projectId);
  const existingRunning = await findRunningRunForProjectModule(ctx, args.projectId, "research");

  if (existingRunning) {
    const externalRunId = normalizeOptional(args.externalRunId);
    if (externalRunId && existingRunning.externalRunId === externalRunId) {
      return {
        runId: String(existingRunning._id),
        startedAt: existingRunning.startedAt,
      };
    }

    if (externalRunId) {
      const timestamp = now();
      await ctx.db.patch(existingRunning._id, {
        status: "failed",
        errorMessage: "Run was replaced after Stage restarted before a final status.",
        completedAt: timestamp,
        updatedAt: timestamp,
      });
    } else {
      throw new Error("A research run is already in progress for this project.");
    }
  }

  await deletePreviousResearchArtifacts(ctx, args.projectId);
  await deletePreviousStrategyArtifacts(ctx, args.projectId);

  const runId = await createRunRecord(ctx, {
    userId: user._id,
    projectId: args.projectId,
    module: "research",
    title: args.title,
    status: "running",
    trigger: "user",
    inputSummary: args.inputSummary,
    externalRunId: args.externalRunId,
  });

  return {
    runId: String(runId),
    startedAt: now(),
  };
}

export const clearResearchAndStrategyForRerunArgs = {
  projectId: v.id("projects"),
};

/** Clears saved research + strategy before a full re-run (UI calls this immediately on confirm). */
export async function clearResearchAndStrategyForRerunHandler(
  ctx: MutationCtx,
  args: { projectId: Id<"projects"> },
) {
  await requireProjectAccess(ctx, args.projectId);
  await deletePreviousResearchArtifacts(ctx, args.projectId);
  await deletePreviousStrategyArtifacts(ctx, args.projectId);
  return { clearedAt: now() };
}

export const completeResearchRunArgs = {
  projectId: v.id("projects"),
  runId: v.optional(v.id("projectAiRuns")),
  title: v.string(),
  summary: v.optional(v.string()),
  contentJson: v.string(),
  providerId: v.optional(projectAiProviderId),
};

export async function completeResearchRunHandler(
  ctx: MutationCtx,
  args: {
    projectId: Id<"projects">;
    runId?: Id<"projectAiRuns">;
    title: string;
    summary?: string;
    contentJson: string;
    providerId?: "claude" | "codex";
  },
) {
  const { user } = await requireProjectAccess(ctx, args.projectId);

  if (args.runId) {
    const run = await getRunRecord(ctx, args.runId);
    if (run.projectId !== args.projectId) {
      throw new Error("Run not found.");
    }
  }

  assertCompleteResearchArtifact(args.contentJson);

  await deletePreviousResearchArtifacts(ctx, args.projectId);
  await deletePreviousStrategyArtifacts(ctx, args.projectId);

  const artifactId = await createArtifactRecord(ctx, {
    userId: user._id,
    projectId: args.projectId,
    runId: args.runId,
    module: "research",
    kind: "researchArtifact",
    title: args.title,
    summary: args.summary,
    status: "ready",
    contentFormat: "json",
    contentJson: args.contentJson,
  });

  if (args.providerId) {
    await setLastProviderId(ctx, {
      userId: user._id,
      projectId: args.projectId,
      providerId: args.providerId,
    });
  }

  const completedAt = args.runId ? await completeRunRecord(ctx, args.runId) : now();

  return {
    artifactId: String(artifactId),
    completedAt,
  };
}

export const failResearchRunArgs = {
  projectId: v.id("projects"),
  runId: v.id("projectAiRuns"),
  errorMessage: v.string(),
};

export async function failResearchRunHandler(
  ctx: MutationCtx,
  args: { projectId: Id<"projects">; runId: Id<"projectAiRuns">; errorMessage: string },
) {
  await requireProjectAccess(ctx, args.projectId);
  const run = await getRunRecord(ctx, args.runId);
  if (run.projectId !== args.projectId) {
    throw new Error("Run not found.");
  }

  const timestamp = now();
  await ctx.db.patch(args.runId, {
    status: "failed",
    errorMessage: normalizeOptional(args.errorMessage),
    completedAt: timestamp,
    updatedAt: timestamp,
  });

  return {
    runId: String(args.runId),
    failedAt: timestamp,
  };
}

export const cleanupResearchRunAssetArgs = {
  projectId: v.id("projects"),
  key: v.string(),
};

export async function cleanupResearchRunAssetHandler(
  ctx: MutationCtx,
  args: { projectId: Id<"projects">; key: string },
) {
  const { user } = await requireProjectAccess(ctx, args.projectId);
  const expectedPrefix = `research/projects/${String(args.projectId)}/users/${String(user._id)}/refero/`;

  if (!args.key.startsWith(expectedPrefix)) {
    return { deleted: false };
  }

  const upload = await ctx.db
    .query("uploadedAssets")
    .withIndex("by_key", (q) => q.eq("key", args.key))
    .unique();

  if (!upload || upload.userId !== user._id || upload.purpose !== "research-refero") {
    return { deleted: false };
  }

  await deleteOldR2Asset(ctx, args.key);
  return { deleted: true };
}

export const getLatestResearchArtifactArgs = {
  projectId: v.id("projects"),
};

export async function getLatestResearchArtifactHandler(
  ctx: QueryCtx,
  args: { projectId: Id<"projects"> },
) {
  const access = await requireProjectAccessOrNull(ctx, args.projectId);
  if (!access) {
    return null;
  }

  const latest = await findLatestArtifact(ctx, args.projectId, "research", "researchArtifact");

  if (!latest) {
    return null;
  }

  return mapLatestArtifactResponse(
    latest,
    await resolveResearchContentJson(latest.contentJson ?? null),
  );
}

export const updateResearchArtifactArgs = {
  projectId: v.id("projects"),
  artifactId: v.id("projectAiArtifacts"),
  contentJson: v.string(),
  summary: v.optional(v.string()),
};

export async function updateResearchArtifactHandler(
  ctx: MutationCtx,
  args: {
    projectId: Id<"projects">;
    artifactId: Id<"projectAiArtifacts">;
    contentJson: string;
    summary?: string;
  },
) {
  await requireProjectAccess(ctx, args.projectId);
  const artifact = await getArtifactRecord(ctx, args.artifactId);

  if (artifact.projectId !== args.projectId) {
    throw new Error("Artifact not found.");
  }

  if (artifact.module !== "research" || artifact.kind !== "researchArtifact") {
    throw new Error("Artifact is not a research artifact.");
  }

  assertCompleteResearchArtifact(args.contentJson);

  const timestamp = now();
  await ctx.db.patch(args.artifactId, {
    contentJson: args.contentJson,
    summary: normalizeOptional(args.summary),
    updatedAt: timestamp,
  });

  return {
    artifactId: String(args.artifactId),
    updatedAt: timestamp,
  };
}

function assertCompleteResearchArtifact(contentJson: string) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(contentJson);
  } catch {
    throw new Error("Research artifact contentJson is not valid JSON.");
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Research artifact must be a JSON object.");
  }

  const artifact = parsed as Record<string, unknown>;
  const missing: string[] = [];

  if (!nonEmptyArray(artifact.summary)) missing.push("summary");
  if (!nonEmptyArray(artifact.companySnapshot)) missing.push("companySnapshot");
  if (!nonEmptyArray(artifact.targetUsers)) missing.push("targetUsers");
  if (!nonEmptyArray(artifact.opportunities)) missing.push("opportunities");

  const competitiveAnalysis = artifact.competitiveAnalysis;
  if (
    !competitiveAnalysis ||
    typeof competitiveAnalysis !== "object" ||
    Array.isArray(competitiveAnalysis)
  ) {
    missing.push("competitiveAnalysis");
  }

  if (missing.length > 0) {
    throw new Error(`Research artifact is incomplete: ${missing.join(", ")}.`);
  }
}

function nonEmptyArray(value: unknown) {
  return Array.isArray(value) && value.length > 0;
}
