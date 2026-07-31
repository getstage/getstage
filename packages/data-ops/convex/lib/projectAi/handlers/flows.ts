import { v } from "convex/values";
import type { Id } from "../../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../../_generated/server";
import { requireProjectAccess } from "../../../_helpers";
import {
  createArtifactRecord,
  deletePreviousFlowsArtifacts,
} from "../domain/artifactStore";
import { setLastProviderId } from "../domain/contextStore";
import { findLatestArtifact } from "../domain/latestArtifact";
import { getArtifactRecord, getRunRecord } from "../domain/records";
import {
  completeRunRecord,
  createRunRecord,
  findRunningRunForProjectModule,
} from "../domain/runStore";
import { normalizeOptional } from "../domain/normalize";
import { resolveAssetContentJson } from "../domain/researchContent";
import { now } from "../domain/time";
import { projectAiProviderId } from "../domain/validators";

export const getFlowsInputArgs = {
  projectId: v.id("projects"),
};

export async function getFlowsInputHandler(
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

  if (!latestResearch?.contentJson) {
    throw new Error("Run Research before generating Flows.");
  }

  if (!latestStrategy?.contentJson) {
    throw new Error("Run Strategy before generating Flows.");
  }

  if (!latestMoodboard?.contentJson) {
    throw new Error("Create a Moodboard before generating Flows.");
  }

  return {
    projectId: String(project._id),
    projectName: project.name,
    // Flows owns the authoritative screen list, so the project type has to reach it:
    // a "web-app" project needs dashboard/auth/settings screens, not a marketing funnel.
    projectType: project.type,
    projectTypeLabel: project.typeOtherLabel,
    researchArtifactId: String(latestResearch._id),
    researchArtifactJson: latestResearch.contentJson,
    strategyArtifactId: String(latestStrategy._id),
    strategyArtifactJson: latestStrategy.contentJson,
    moodboardArtifactId: String(latestMoodboard._id),
    moodboardArtifactJson:
      (await resolveAssetContentJson(latestMoodboard.contentJson)) ?? latestMoodboard.contentJson,
    existingFlowsArtifactId: latestFlows ? String(latestFlows._id) : undefined,
    existingFlowsArtifactJson: latestFlows?.contentJson ?? undefined,
  };
}

export const createFlowsRunArgs = {
  projectId: v.id("projects"),
  title: v.string(),
  inputSummary: v.optional(v.string()),
  externalRunId: v.optional(v.string()),
};

export async function createFlowsRunHandler(
  ctx: MutationCtx,
  args: {
    projectId: Id<"projects">;
    title: string;
    inputSummary?: string;
    externalRunId?: string;
  },
) {
  const { user } = await requireProjectAccess(ctx, args.projectId);
  const existingRunning = await findRunningRunForProjectModule(ctx, args.projectId, "flows");

  if (existingRunning) {
    const externalRunId = normalizeOptional(args.externalRunId);
    if (externalRunId && existingRunning.externalRunId === externalRunId) {
      return {
        runId: String(existingRunning._id),
        startedAt: existingRunning.startedAt,
      };
    }

    throw new Error("A flows run is already in progress for this project.");
  }

  const runId = await createRunRecord(ctx, {
    userId: user._id,
    projectId: args.projectId,
    module: "flows",
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

export const completeFlowsRunArgs = {
  projectId: v.id("projects"),
  runId: v.optional(v.id("projectAiRuns")),
  title: v.string(),
  summary: v.optional(v.string()),
  contentJson: v.string(),
  researchArtifactId: v.optional(v.string()),
  strategyArtifactId: v.optional(v.string()),
  moodboardArtifactId: v.optional(v.string()),
  providerId: v.optional(projectAiProviderId),
};

export async function completeFlowsRunHandler(
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

  await deletePreviousFlowsArtifacts(ctx, args.projectId);

  const parsed = parseFlowsContentJson(args.contentJson, args.projectId);
  if (args.researchArtifactId) parsed.researchArtifactId = args.researchArtifactId;
  if (args.strategyArtifactId) parsed.strategyArtifactId = args.strategyArtifactId;
  if (args.moodboardArtifactId) parsed.moodboardArtifactId = args.moodboardArtifactId;
  validateFlowsArtifactShape(parsed, args.projectId);
  const contentJson = JSON.stringify(parsed);

  const artifactId = await createArtifactRecord(ctx, {
    userId: user._id,
    projectId: args.projectId,
    runId: args.runId,
    module: "flows",
    kind: "flowsArtifact",
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

export const failFlowsRunArgs = {
  projectId: v.id("projects"),
  runId: v.id("projectAiRuns"),
  errorMessage: v.string(),
};

export async function failFlowsRunHandler(
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

export const updateFlowsArtifactArgs = {
  projectId: v.id("projects"),
  artifactId: v.id("projectAiArtifacts"),
  contentJson: v.string(),
  summary: v.optional(v.string()),
};

export async function updateFlowsArtifactHandler(
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

  if (artifact.module !== "flows" || artifact.kind !== "flowsArtifact") {
    throw new Error("Artifact is not a flows artifact.");
  }

  parseFlowsContentJson(args.contentJson, args.projectId);

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

function parseFlowsContentJson(contentJson: string, projectId: Id<"projects">) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(contentJson);
  } catch {
    throw new Error("Flows artifact content must be valid JSON.");
  }

  if (!isRecord(parsed)) {
    throw new Error("Flows artifact content must be a JSON object.");
  }

  validateFlowsArtifactShape(parsed, projectId);
  return parsed;
}

function validateFlowsArtifactShape(artifact: Record<string, unknown>, projectId: Id<"projects">) {
  if (artifact.apiVersion !== "v1" || artifact.artifactKind !== "flowsArtifact") {
    throw new Error("Flows artifact content has an invalid artifact header.");
  }

  if (artifact.projectId !== String(projectId)) {
    throw new Error("Flows artifact projectId does not match the project.");
  }

  requireNonEmptyString(artifact.title, "Flows artifact title");
  requireNonNegativeNumber(artifact.generatedAt, "Flows artifact generatedAt");

  for (const key of [
    "researchArtifactId",
    "strategyArtifactId",
    "moodboardArtifactId",
    "figjamUrl",
    "figjamExportedAt",
    "updatedAt",
  ]) {
    if (artifact[key] === null) {
      throw new Error(`Flows artifact optional field ${key} must be omitted, not null.`);
    }
  }

  if (!Array.isArray(artifact.flows)) {
    throw new Error("Flows artifact must include a flows array.");
  }

  if (!Array.isArray(artifact.screens)) {
    throw new Error("Flows artifact must include a screens array.");
  }

  artifact.flows.forEach((flow, index) => validateFlow(flow, index));
  artifact.screens.forEach((screen, index) => validateScreen(screen, index));
}

function validateFlow(flow: unknown, index: number) {
  if (!isRecord(flow)) {
    throw new Error(`Flow ${index + 1} must be an object.`);
  }

  requireNonEmptyString(flow.id, `Flow ${index + 1} id`);
  requireNonEmptyString(flow.title, `Flow ${index + 1} title`);
  requireNonEmptyString(flow.description, `Flow ${index + 1} description`);
  requireNonEmptyString(flow.category, `Flow ${index + 1} category`);
  requireNonNegativeNumber(flow.screenCount, `Flow ${index + 1} screenCount`);

  if (flow.status !== "Draft" && flow.status !== "In Review" && flow.status !== "Approved") {
    throw new Error(`Flow ${index + 1} has an invalid status.`);
  }

  if (!Array.isArray(flow.steps)) {
    throw new Error(`Flow ${index + 1} must include a steps array.`);
  }

  flow.steps.forEach((step, stepIndex) => {
    if (!isRecord(step)) {
      throw new Error(`Flow ${index + 1} step ${stepIndex + 1} must be an object.`);
    }

    requireNonEmptyString(step.id, `Flow ${index + 1} step ${stepIndex + 1} id`);
    requireNonEmptyString(step.label, `Flow ${index + 1} step ${stepIndex + 1} label`);
    requireNonNegativeNumber(step.order, `Flow ${index + 1} step ${stepIndex + 1} order`);

    if (step.screenId !== undefined) {
      requireNonEmptyString(step.screenId, `Flow ${index + 1} step ${stepIndex + 1} screenId`);
    }
  });
}

function validateScreen(screen: unknown, index: number) {
  if (!isRecord(screen)) {
    throw new Error(`Screen ${index + 1} must be an object.`);
  }

  requireNonEmptyString(screen.id, `Screen ${index + 1} id`);
  requireNonEmptyString(screen.title, `Screen ${index + 1} title`);
  requireNonEmptyString(screen.description, `Screen ${index + 1} description`);
  requireNonNegativeNumber(screen.flowCount, `Screen ${index + 1} flowCount`);

  if (!Array.isArray(screen.keyElements)) {
    throw new Error(`Screen ${index + 1} must include a keyElements array.`);
  }

  screen.keyElements.forEach((element, elementIndex) =>
    requireNonEmptyString(element, `Screen ${index + 1} key element ${elementIndex + 1}`),
  );
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
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer.`);
  }
}
