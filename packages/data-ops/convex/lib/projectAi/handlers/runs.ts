import { v } from "convex/values";
import type { Id } from "../../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../../_generated/server";
import { requireProjectAccess } from "../../../_helpers";
import { createRunRecord } from "../domain/runStore";
import { now } from "../domain/time";
import { aiModule, type AiModule } from "../domain/validators";

export const listRunsArgs = {
  projectId: v.id("projects"),
  module: v.optional(aiModule),
};

export async function listRunsHandler(
  ctx: QueryCtx,
  args: { projectId: Id<"projects">; module?: AiModule },
) {
  await requireProjectAccess(ctx, args.projectId);
  const runs = await ctx.db
    .query("projectAiRuns")
    .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
    .collect();

  return runs
    .filter((run) => !args.module || run.module === args.module)
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
  if (!run) {
    throw new Error("Run not found");
  }
  if (run.status === "completed" || run.status === "failed") {
    return;
  }
  await ctx.db.patch(runId, {
    status: "failed",
    errorMessage: "Cancelled by user",
    completedAt: now(),
    updatedAt: now(),
  });
}
