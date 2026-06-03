import { v } from "convex/values";
import type { Id } from "../../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../../_generated/server";
import { requireProjectAccess, requireProjectAccessOrNull } from "../../../_helpers";
import {
  createArtifactRecord,
  deletePreviousStrategyArtifacts,
} from "../domain/artifactStore";
import { setLastProviderId } from "../domain/contextStore";
import {
  findLatestArtifact,
  mapLatestArtifactResponse,
} from "../domain/latestArtifact";
import { getArtifactRecord, getContextRecord, getRunRecord } from "../domain/records";
import { createRunRecord, findRunningRunForProjectModule } from "../domain/runStore";
import { normalizeList, normalizeOptional } from "../domain/normalize";
import { now } from "../domain/time";
import { projectAiProviderId } from "../domain/validators";

export const upsertStrategyGenerateInputArgs = {
  projectId: v.id("projects"),
  focusAreas: v.array(v.string()),
  additionalNotes: v.optional(v.string()),
};

export async function upsertStrategyGenerateInputHandler(
  ctx: MutationCtx,
  args: { projectId: Id<"projects">; focusAreas: string[]; additionalNotes?: string },
) {
  const { user } = await requireProjectAccess(ctx, args.projectId);
  const existing = await getContextRecord(ctx, args.projectId);
  const timestamp = now();
  const payload = {
    strategyFocusAreas: normalizeList(args.focusAreas),
    strategyGenerateNotes: normalizeOptional(args.additionalNotes),
    updatedAt: timestamp,
  };

  if (existing) {
    await ctx.db.patch(existing._id, payload);
    return { saved: true, updatedAt: timestamp };
  }

  await ctx.db.insert("projectAiContexts", {
    userId: user._id,
    projectId: args.projectId,
    competitorUrls: [],
    referenceUrls: [],
    createdAt: timestamp,
    ...payload,
  });

  return { saved: true, updatedAt: timestamp };
}

export const getStrategyInputArgs = {
  projectId: v.id("projects"),
};

export async function getStrategyInputHandler(
  ctx: QueryCtx,
  args: { projectId: Id<"projects"> },
) {
  const { project } = await requireProjectAccess(ctx, args.projectId);
  const record = await getContextRecord(ctx, args.projectId);
  const latestResearch = await findLatestArtifact(
    ctx,
    args.projectId,
    "research",
    "researchArtifact",
  );

  if (!latestResearch?.contentJson) {
    throw new Error("Run Research before generating Strategy.");
  }

  return {
    projectId: String(project._id),
    projectName: project.name,
    researchArtifactId: String(latestResearch._id),
    researchArtifactJson: latestResearch.contentJson,
    focusAreas: record?.strategyFocusAreas ?? [],
    additionalNotes: record?.strategyGenerateNotes ?? null,
  };
}

export const createStrategyRunArgs = {
  projectId: v.id("projects"),
  title: v.string(),
  inputSummary: v.optional(v.string()),
  externalRunId: v.optional(v.string()),
};

export async function createStrategyRunHandler(
  ctx: MutationCtx,
  args: {
    projectId: Id<"projects">;
    title: string;
    inputSummary?: string;
    externalRunId?: string;
  },
) {
  const { user } = await requireProjectAccess(ctx, args.projectId);
  const existingRunning = await findRunningRunForProjectModule(ctx, args.projectId, "strategy");

  if (existingRunning) {
    const externalRunId = normalizeOptional(args.externalRunId);
    if (externalRunId && existingRunning.externalRunId === externalRunId) {
      return {
        runId: String(existingRunning._id),
        startedAt: existingRunning.startedAt,
      };
    }

    throw new Error("A strategy run is already in progress for this project.");
  }

  const runId = await createRunRecord(ctx, {
    userId: user._id,
    projectId: args.projectId,
    module: "strategy",
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

export const completeStrategyRunArgs = {
  projectId: v.id("projects"),
  runId: v.optional(v.id("projectAiRuns")),
  title: v.string(),
  summary: v.optional(v.string()),
  contentJson: v.string(),
  researchArtifactId: v.optional(v.string()),
  providerId: v.optional(projectAiProviderId),
};

export async function completeStrategyRunHandler(
  ctx: MutationCtx,
  args: {
    projectId: Id<"projects">;
    runId?: Id<"projectAiRuns">;
    title: string;
    summary?: string;
    contentJson: string;
    researchArtifactId?: string;
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

  await deletePreviousStrategyArtifacts(ctx, args.projectId);

  let contentJson = args.contentJson;
  if (args.researchArtifactId) {
    try {
      const parsed = JSON.parse(contentJson) as Record<string, unknown>;
      parsed.researchArtifactId = args.researchArtifactId;
      contentJson = JSON.stringify(parsed);
    } catch {
      // Keep original contentJson if parsing fails.
    }
  }

  const artifactId = await createArtifactRecord(ctx, {
    userId: user._id,
    projectId: args.projectId,
    runId: args.runId,
    module: "strategy",
    kind: "strategyArtifact",
    title: args.title,
    summary: args.summary,
    status: "ready",
    contentFormat: "json",
    contentJson,
  });

  if (args.providerId) {
    await setLastProviderId(ctx, {
      userId: user._id,
      projectId: args.projectId,
      providerId: args.providerId,
    });
  }

  return {
    artifactId: String(artifactId),
    completedAt: now(),
  };
}

export const failStrategyRunArgs = {
  projectId: v.id("projects"),
  runId: v.id("projectAiRuns"),
  errorMessage: v.string(),
};

export async function failStrategyRunHandler(
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

export const updateStrategyArtifactArgs = {
  projectId: v.id("projects"),
  artifactId: v.id("projectAiArtifacts"),
  contentJson: v.string(),
  summary: v.optional(v.string()),
};

export async function updateStrategyArtifactHandler(
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

  if (artifact.module !== "strategy" || artifact.kind !== "strategyArtifact") {
    throw new Error("Artifact is not a strategy artifact.");
  }

  JSON.parse(args.contentJson);

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

export const getLatestStrategyArtifactArgs = {
  projectId: v.id("projects"),
};

export async function getLatestStrategyArtifactHandler(
  ctx: QueryCtx,
  args: { projectId: Id<"projects"> },
) {
  const access = await requireProjectAccessOrNull(ctx, args.projectId);
  if (!access) {
    return null;
  }

  const latest = await findLatestArtifact(ctx, args.projectId, "strategy", "strategyArtifact");

  if (!latest) {
    return null;
  }

  return mapLatestArtifactResponse(latest, latest.contentJson ?? null);
}
