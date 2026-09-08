import { v } from "convex/values";
import type { Id } from "../../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../../_generated/server";
import { requireProjectAccess } from "../../../_helpers";
import {
  createArtifactRecord,
  deletePreviousWireframesArtifacts,
} from "../domain/artifactStore";
import { setLastProviderId } from "../domain/contextStore";
import { findLatestArtifact } from "../domain/latestArtifact";
import { getArtifactRecord, getRunRecord } from "../domain/records";
import {
  completeRunRecord,
  createRunRecord,
  findRunningRunForProjectModule,
} from "../domain/runStore";
import { deleteOldR2Asset } from "../../../r2";
import { normalizeOptional } from "../domain/normalize";
import { collectR2KeysFromJson } from "../domain/r2Keys";
import { resolveAssetContentJson } from "../domain/researchContent";
import { now } from "../domain/time";
import { projectAiProviderId } from "../domain/validators";

export const getWireframesInputArgs = {
  projectId: v.id("projects"),
};

export async function getWireframesInputHandler(
  ctx: QueryCtx,
  args: { projectId: Id<"projects"> },
) {
  const { project } = await requireProjectAccess(ctx, args.projectId);

  const latestResearch = await findLatestArtifact(
    ctx,
    args.projectId,
    "research",
    "researchArtifact",
  );
  const latestStrategy = await findLatestArtifact(
    ctx,
    args.projectId,
    "strategy",
    "strategyArtifact",
  );
  const latestMoodboard = await findLatestArtifact(
    ctx,
    args.projectId,
    "moodboard",
    "moodboardArtifact",
  );
  const latestFlows = await findLatestArtifact(ctx, args.projectId, "flows", "flowsArtifact");
  const latestWireframes = await findLatestArtifact(
    ctx,
    args.projectId,
    "generate",
    "wireframesArtifact",
  );

  if (!latestStrategy?.contentJson) {
    throw new Error("Run Strategy before generating Wireframes.");
  }

  return {
    projectId: String(project._id),
    projectName: project.name,
    strategyArtifactId: String(latestStrategy._id),
    strategyArtifactJson: latestStrategy.contentJson,
    researchArtifactId: latestResearch ? String(latestResearch._id) : undefined,
    researchArtifactJson: latestResearch?.contentJson ?? undefined,
    moodboardArtifactId: latestMoodboard ? String(latestMoodboard._id) : undefined,
    moodboardArtifactJson: latestMoodboard
      ? ((await resolveAssetContentJson(latestMoodboard.contentJson)) ??
        latestMoodboard.contentJson ??
        undefined)
      : undefined,
    flowsArtifactId: latestFlows ? String(latestFlows._id) : undefined,
    flowsArtifactJson: latestFlows?.contentJson ?? undefined,
    existingWireframesArtifactId: latestWireframes ? String(latestWireframes._id) : undefined,
    existingWireframesArtifactJson: latestWireframes?.contentJson ?? undefined,
  };
}

export const createWireframesRunArgs = {
  projectId: v.id("projects"),
  title: v.string(),
  inputSummary: v.optional(v.string()),
  externalRunId: v.optional(v.string()),
};

export async function createWireframesRunHandler(
  ctx: MutationCtx,
  args: {
    projectId: Id<"projects">;
    title: string;
    inputSummary?: string;
    externalRunId?: string;
  },
) {
  const { user } = await requireProjectAccess(ctx, args.projectId);
  const existingRunning = await findRunningRunForProjectModule(ctx, args.projectId, "generate");

  if (existingRunning) {
    const externalRunId = normalizeOptional(args.externalRunId);
    if (externalRunId && existingRunning.externalRunId === externalRunId) {
      return {
        runId: String(existingRunning._id),
        startedAt: existingRunning.startedAt,
      };
    }

    throw new Error("A wireframes run is already in progress for this project.");
  }

  const runId = await createRunRecord(ctx, {
    userId: user._id,
    projectId: args.projectId,
    module: "generate",
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

export const completeWireframesRunArgs = {
  projectId: v.id("projects"),
  runId: v.optional(v.id("projectAiRuns")),
  title: v.string(),
  summary: v.optional(v.string()),
  contentJson: v.string(),
  researchArtifactId: v.optional(v.string()),
  strategyArtifactId: v.optional(v.string()),
  moodboardArtifactId: v.optional(v.string()),
  flowsArtifactId: v.optional(v.string()),
  providerId: v.optional(projectAiProviderId),
};

export async function completeWireframesRunHandler(
  ctx: MutationCtx,
  args: {
    projectId: Id<"projects">;
    runId?: Id<"projectAiRuns">;
    title: string;
    summary?: string;
    contentJson: string;
    researchArtifactId?: string;
    strategyArtifactId?: string;
    moodboardArtifactId?: string;
    flowsArtifactId?: string;
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

  await deletePreviousWireframesArtifacts(ctx, args.projectId);

  const parsed = parseWireframesContentJson(args.contentJson, args.projectId);
  if (args.researchArtifactId) parsed.researchArtifactId = args.researchArtifactId;
  if (args.strategyArtifactId) parsed.strategyArtifactId = args.strategyArtifactId;
  if (args.moodboardArtifactId) parsed.moodboardArtifactId = args.moodboardArtifactId;
  if (args.flowsArtifactId) parsed.flowsArtifactId = args.flowsArtifactId;
  const contentJson = JSON.stringify(parsed);

  const artifactId = await createArtifactRecord(ctx, {
    userId: user._id,
    projectId: args.projectId,
    runId: args.runId,
    module: "generate",
    kind: "wireframesArtifact",
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

  const completedAt = args.runId ? await completeRunRecord(ctx, args.runId) : now();

  return {
    artifactId: String(artifactId),
    completedAt,
  };
}

export const failWireframesRunArgs = {
  projectId: v.id("projects"),
  runId: v.id("projectAiRuns"),
  errorMessage: v.string(),
};

export async function failWireframesRunHandler(
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

export const updateWireframesArtifactArgs = {
  projectId: v.id("projects"),
  artifactId: v.id("projectAiArtifacts"),
  contentJson: v.string(),
  summary: v.optional(v.string()),
};

export async function updateWireframesArtifactHandler(
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

  if (artifact.module !== "generate" || artifact.kind !== "wireframesArtifact") {
    throw new Error("Artifact is not a wireframes artifact.");
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

export const clearWireframeScreensArgs = {
  projectId: v.id("projects"),
  screenIds: v.array(v.string()),
};

export async function clearWireframeScreensHandler(
  ctx: MutationCtx,
  args: { projectId: Id<"projects">; screenIds: string[] },
) {
  await requireProjectAccess(ctx, args.projectId);
  const artifact = await findLatestArtifact(
    ctx,
    args.projectId,
    "generate",
    "wireframesArtifact",
  );
  if (!artifact?.contentJson || args.screenIds.length === 0) {
    return { cleared: false as const, screensRemoved: 0 };
  }

  const content = parseWireframesContentJson(artifact.contentJson, args.projectId);
  const generated = Array.isArray(content.generatedScreens) ? content.generatedScreens : [];
  const removeIds = new Set(args.screenIds);
  const isRemoved = (screen: unknown) =>
    isRecord(screen) && typeof screen.id === "string" && removeIds.has(screen.id);
  const removed = generated.filter(isRemoved);
  if (removed.length === 0) {
    return { cleared: false as const, screensRemoved: 0 };
  }

  const kept = generated.filter((screen) => !isRemoved(screen));
  const r2Keys = new Set<string>();
  for (const screen of removed) {
    collectR2KeysFromJson(screen, r2Keys);
  }

  const nextContent: Record<string, unknown> = { ...content, generatedScreens: kept };
  if (Array.isArray(content.configureScreens)) {
    nextContent.configureScreens = content.configureScreens.map((screen) =>
      isRemoved(screen) ? { ...screen, selected: false } : screen,
    );
  }
  if (kept.length === 0) {
    collectR2KeysFromJson(content.cssUrl, r2Keys);
    delete nextContent.cssUrl;
    nextContent.wireframeKind = "lofi";
  }

  for (const key of r2Keys) {
    await deleteOldR2Asset(ctx, key);
  }

  await ctx.db.patch(artifact._id, {
    contentJson: JSON.stringify(nextContent),
    updatedAt: now(),
  });

  return { cleared: true as const, screensRemoved: removed.length };
}

function parseWireframesContentJson(contentJson: string, projectId: Id<"projects">) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(contentJson);
  } catch {
    throw new Error("Wireframes artifact content must be valid JSON.");
  }

  if (!isRecord(parsed)) {
    throw new Error("Wireframes artifact content must be a JSON object.");
  }

  if (parsed.apiVersion !== "v1" || parsed.artifactKind !== "wireframesArtifact") {
    throw new Error("Wireframes artifact content has an invalid artifact header.");
  }

  if (parsed.projectId !== String(projectId)) {
    throw new Error("Wireframes artifact projectId does not match the project.");
  }

  requireNonEmptyString(parsed.title, "Wireframes artifact title");
  requireNonNegativeNumber(parsed.generatedAt, "Wireframes artifact generatedAt");

  return parsed;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireNonEmptyString(value: unknown, label: string) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string.`);
  }
}

function requireNonNegativeNumber(value: unknown, label: string) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(`${label} must be a non-negative number.`);
  }
}
