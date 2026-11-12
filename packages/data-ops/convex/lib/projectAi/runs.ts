import { v } from "convex/values";
import type { Id } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";
import { requireProjectAccess, requireProjectAccessOrNull } from "../../_helpers";
import { createRunRecord } from "./domain/runStore";
import { now } from "./domain/time";
import { aiModule, type AiModule } from "./domain/validators";

export const listRunsArgs = {
  projectId: v.id("projects"),
  module: v.optional(aiModule),
};

export async function listRunsHandler(
  ctx: QueryCtx,
  args: { projectId: Id<"projects">; module?: AiModule },
) {
  const access = await requireProjectAccessOrNull(ctx, args.projectId);
  if (!access) {
    return [];
  }
  const moduleFilter = args.module;
  // When a module is requested, read only that module's recent runs via the
  // by_project_module index instead of loading the project's entire run history.
  const runs = moduleFilter
    ? await ctx.db
        .query("projectAiRuns")
        .withIndex("by_project_module", (q) =>
          q.eq("projectId", args.projectId).eq("module", moduleFilter),
        )
        .order("desc")
        .take(50)
    : await ctx.db
        .query("projectAiRuns")
        .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
        .collect();

  return runs
    .sort((a, b) => b.startedAt - a.startedAt)
    .map((run) => ({
      id: String(run._id),
      projectId: String(run.projectId),
      connectionId: run.connectionId ? String(run.connectionId) : null,
      module: run.module,
      title: run.title,
      status: run.status,
      trigger: run.trigger,
      externalRunId: run.externalRunId ?? null,
      inputSummary: run.inputSummary ?? null,
      errorMessage: run.errorMessage ?? null,
      startedAt: run.startedAt,
      completedAt: run.completedAt ?? null,
      updatedAt: run.updatedAt,
    }));
}

export const createRunArgs = {
  projectId: v.id("projects"),
  connectionId: v.optional(v.id("agentConnections")),
  module: aiModule,
  title: v.string(),
  inputSummary: v.optional(v.string()),
};

export async function createRunHandler(
  ctx: MutationCtx,
  args: {
    projectId: Id<"projects">;
    connectionId?: Id<"agentConnections">;
    module: "research" | "strategy" | "flows" | "moodboard" | "generate" | "delivery";
    title: string;
    inputSummary?: string;
  },
) {
  const { user } = await requireProjectAccess(ctx, args.projectId);
  const runId = await createRunRecord(ctx, {
    userId: user._id,
    projectId: args.projectId,
    connectionId: args.connectionId,
    module: args.module,
    title: args.title,
    status: "draft",
    trigger: "user",
    inputSummary: args.inputSummary,
  });

  return {
    runId: String(runId),
    startedAt: now(),
  };
}

export const cancelRunArgs = {
  runId: v.string(),
  projectId: v.id("projects"),
};

export async function cancelRunHandler(
  ctx: MutationCtx,
  args: { runId: string; projectId: Id<"projects"> },
) {
  await requireProjectAccess(ctx, args.projectId);
  const runId = args.runId as Id<"projectAiRuns">;
  const run = await ctx.db.get(runId);
  if (!run || run.projectId !== args.projectId) {
    throw new Error("Run not found");
  }
  if (run.status === "completed" || run.status === "failed" || run.status === "cancelled") {
    return;
  }
  await ctx.db.patch(runId, {
    status: "cancelled",
    errorMessage: "Cancelled by user",
    completedAt: now(),
    updatedAt: now(),
  });
}

// A Mac Research run takes at most ~25 minutes (AI, one repair pass, skills); an AI tool's run waits for its save.
const ABANDONED_AFTER_MS = { user: 60 * 60 * 1000, agent: 24 * 60 * 60 * 1000 } as const;

export const closeAbandonedResearchRunsArgs = { limit: v.number() };

/**
 * Closes Research runs still "running" long after they could be (Stage for Mac quit or restarted mid-run, or an
 * AI tool never saved), so they don't stay open forever or count as failures.
 */
export async function closeAbandonedResearchRunsHandler(ctx: MutationCtx, args: { limit: number }) {
  const timestamp = now();
  const stale = await ctx.db
    .query("projectAiRuns")
    .withIndex("by_module_status_startedAt", (q) => q.eq("module", "research").eq("status", "running").lt("startedAt", timestamp - ABANDONED_AFTER_MS.user))
    .take(args.limit);
  let closed = 0;
  for (const run of stale) {
    const isAgent = run.trigger === "agent";
    if (isAgent && run.startedAt > timestamp - ABANDONED_AFTER_MS.agent) continue;
    await ctx.db.patch(run._id, {
      status: "cancelled",
      errorMessage: isAgent
        ? "Stopped: the AI tool never saved this Research run."
        : "Stopped: Stage for Mac was closed or restarted before Research finished.",
      completedAt: timestamp,
      updatedAt: timestamp,
    });
    closed += 1;
  }
  return { closed };
}
