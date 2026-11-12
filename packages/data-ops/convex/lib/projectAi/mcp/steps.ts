import { v } from "convex/values";
import type { Id } from "../../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../../_generated/server";
import { upsertContextRecord } from "../domain/contextStore";
import { createArtifactRecord } from "../domain/artifactStore";
import { createRunRecord } from "../domain/runStore";
import { findLatestArtifact } from "../domain/latestArtifact";
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
import { requireProjectAccessForUserId } from "../../../_helpers";
import { saveFlowsResult } from "../flows/handlers";
import { saveResearchResult } from "../research/handlers";
import { saveStrategyResult } from "../strategy/handlers";
import { saveWireframesResult } from "../wireframes/handlers";
import type { ProjectCategory } from "../../../../src/contracts/desktop-api/project";
import { resolveProjectCategory } from "../../projects/domain/projectCategory";
import { flowsArtifactSchema } from "../../../../src/contracts/flows";
import { researchArtifactSchema } from "../../../../src/contracts/research";
import { strategyArtifactSchema } from "../../../../src/contracts/strategy";
import { wireframesArtifactSchema } from "../../../../src/contracts/wireframes";
import { aiStepProblems, assertNoProblems, sanitizeWireframeHtml, staleSteps, uiPatternProvider, type SavedStep } from "../../../../src/domain/aiStepRules";
import { buildUiPatterns, groupPatternInsights, type GroupInsights, type ReferenceGroup } from "../../../../src/domain/researchReferences";
import { CREDIT_COSTS, recordUsage } from "../../credits/service";
import { researchReferenceGroups } from "../research/mcp";

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
    status: "draft" | "running" | "completed" | "failed" | "cancelled" | "needs_input";
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

// Steps an AI tool can save through the MCP, in Stage's order. Moodboard and Delivery need Stage for Mac
// (image search, exports), so a saved Moodboard is used when present but never required.
const UPSTREAM = {
  research: { module: "research", kind: "researchArtifact", label: "Research" },
  strategy: { module: "strategy", kind: "strategyArtifact", label: "Strategy" },
  moodboard: { module: "moodboard", kind: "moodboardArtifact", label: "Moodboard" },
  flows: { module: "flows", kind: "flowsArtifact", label: "Flows" },
  wireframes: { module: "generate", kind: "wireframesArtifact", label: "Wireframes" },
} as const;

const REQUIRES = {
  research: [],
  strategy: ["research"],
  flows: ["research", "strategy"],
  generate: ["strategy", "flows"],
} as const;


export const saveStepForApiArgs = {
  userId: v.id("users"),
  projectId: v.id("projects"),
  step: v.union(v.literal("research"), v.literal("strategy"), v.literal("flows"), v.literal("generate")),
  title: v.string(),
  summary: v.optional(v.string()),
  contentJson: v.string(),
  // Research only: the run from start_research, whose collected screens become the UI patterns.
  // Plain text: an AI can send any string, and it gets a clear answer instead of a validator error.
  runId: v.optional(v.string()),
};

/**
 * Saves a step result made by the user's own AI tool. Research charges like a Mac run (Stage collected
 * its screens); the other steps are free because Stage ran no model.
 * Earlier steps must be saved first; their ids are filled in from the project, never taken from the AI.
 */
export async function saveStepForApiHandler(
  ctx: MutationCtx,
  args: {
    userId: Id<"users">;
    projectId: Id<"projects">;
    step: keyof typeof REQUIRES;
    title: string;
    summary?: string;
    contentJson: string;
    runId?: string;
  },
) {
  const access = await requireProjectAccessForUserId(ctx, { userId: args.userId, projectId: args.projectId });
  const runId = args.runId ? ctx.db.normalizeId("projectAiRuns", args.runId) : null;
  if (args.step === "research" && !runId) {
    throw new Error("Call start_research first and pass the exact runId it returned; don't make one up.");
  }
  const before = await loadSteps(ctx, args.projectId);
  for (const key of REQUIRES[args.step]) {
    if (!before[key]) throw new Error(`Save ${UPSTREAM[key].label} first: ${UPSTREAM[key].label} comes before this step.`);
  }

  const contentJson = checkedContent(args.step, args.contentJson, {
    flows: before.flows,
    category: resolveProjectCategory(access.project.type),
    references: runId ? await researchReferenceGroups(ctx, runId) : [],
  });
  const base = { projectId: args.projectId, title: args.title, summary: args.summary, contentJson };
  const upstream = {
    researchArtifactId: before.research?.id,
    strategyArtifactId: before.strategy?.id,
    moodboardArtifactId: before.moodboard?.id,
  };
  const { artifactId } = await (() => {
    switch (args.step) {
      case "research":
        return saveResearchResult(ctx, access, { ...base, runId: runId ?? undefined, keepLaterSteps: true });
      case "strategy":
        return saveStrategyResult(ctx, access, { ...base, researchArtifactId: upstream.researchArtifactId });
      case "flows":
        return saveFlowsResult(ctx, access, { ...base, ...upstream });
      case "generate":
        return saveWireframesResult(ctx, access, { ...base, ...upstream, flowsArtifactId: before.flows?.id });
    }
  })();
  if (args.step === "research") {
    // Same charge as a Mac Research run, once per run.
    await recordUsage(ctx, { ownerUserId: access.project.userId, kind: "reference", credits: CREDIT_COSTS.researchFallback, userId: args.userId, runId: String(runId) });
  }
  return {
    artifactId,
    // Later steps now built on a replaced result; the AI should redo them (get_build_brief lists them too).
    stale: staleSteps(await loadSteps(ctx, args.projectId)),
  };
}

/** The latest saved result of every step, each read once. */
async function loadSteps(ctx: MutationCtx, projectId: Id<"projects">) {
  const load = async (key: keyof typeof UPSTREAM): Promise<SavedStep> => {
    const artifact = await findLatestArtifact(ctx, projectId, UPSTREAM[key].module, UPSTREAM[key].kind);
    return artifact?.contentJson ? { id: String(artifact._id), content: JSON.parse(artifact.contentJson) } : null;
  };
  const [research, strategy, moodboard, flows, wireframes] = await Promise.all([
    load("research"), load("strategy"), load("moodboard"), load("flows"), load("wireframes"),
  ]);
  return { research, strategy, moodboard, flows, wireframes };
}

/**
 * Refuses an AI-written result with every problem named (the Mac engine gets the same quality from its prompts),
 * and strips anything executable from wireframe HTML. Returns the JSON to save.
 */
function checkedContent(
  step: keyof typeof REQUIRES,
  contentJson: string,
  { flows, category, references }: { flows: SavedStep; category: ProjectCategory; references: ReferenceGroup[] },
) {
  const json: unknown = JSON.parse(contentJson);
  switch (step) {
    case "research": {
      // UI patterns are the screens Stage collected plus the AI's recognized patterns, as on Mac; the label is Stage's.
      const { uiPatternInsights = [], ...result } = json as { uiPatternInsights?: GroupInsights[] };
      const { insights, problems } = groupPatternInsights(references, uiPatternInsights);
      const content = { ...result, uiPatterns: buildUiPatterns(references, insights), uiPatternProvider: uiPatternProvider(category) };
      assertNoProblems("Research", [...problems, ...aiStepProblems({ step, artifact: researchArtifactSchema.parse(content) })]);
      return JSON.stringify(content);
    }
    case "strategy":
      assertNoProblems("Strategy", aiStepProblems({ step, artifact: strategyArtifactSchema.parse(json) }));
      return contentJson;
    case "flows":
      assertNoProblems("Flows", aiStepProblems({ step, artifact: flowsArtifactSchema.parse(json) }));
      return contentJson;
    case "generate": {
      const artifact = wireframesArtifactSchema.parse(json);
      const flowsScreenIds = new Set(flowsArtifactSchema.parse(flows?.content).screens.map((screen) => screen.id));
      assertNoProblems("Wireframes", aiStepProblems({ step, artifact, flowsScreenIds }));
      const generatedScreens = artifact.generatedScreens.map((screen) => (screen.html ? { ...screen, html: sanitizeWireframeHtml(screen.html) } : screen));
      return JSON.stringify({ ...(json as object), generatedScreens });
    }
  }
}
