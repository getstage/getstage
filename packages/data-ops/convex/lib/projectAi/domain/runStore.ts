import type { Id } from "../../../_generated/dataModel";
import type { MutationCtx } from "../../../_generated/server";
import type { AiModule } from "./validators";
import { normalizeOptional } from "./normalize";
import { now } from "./time";

const STALE_RUNNING_RUN_MS = 60 * 60 * 1000;

export async function findRunningRunForProjectModule(
  ctx: MutationCtx,
  projectId: Id<"projects">,
  module: AiModule,
) {
  const runs = await ctx.db
    .query("projectAiRuns")
    .withIndex("by_project_module", (query) =>
      query.eq("projectId", projectId).eq("module", module),
    )
    .order("desc")
    .take(8);

  const runningRun = runs.find((run) => run.status === "running") ?? null;
  if (!runningRun) {
    return null;
  }

  const timestamp = now();
  if (timestamp - runningRun.startedAt <= STALE_RUNNING_RUN_MS) {
    return runningRun;
  }

  await ctx.db.patch(runningRun._id, {
    status: "failed",
    errorMessage: "Run expired after Stage lost connection before a final status.",
    completedAt: timestamp,
    updatedAt: timestamp,
  });

  return null;
}

export async function createRunRecord(
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
  const timestamp = now();
  return ctx.db.insert("projectAiRuns", {
    userId: args.userId,
    projectId: args.projectId,
    connectionId: args.connectionId,
    module: args.module,
    title: args.title.trim(),
    status: args.status,
    trigger: args.trigger,
    inputSummary: normalizeOptional(args.inputSummary),
    externalRunId: normalizeOptional(args.externalRunId),
    startedAt: timestamp,
    updatedAt: timestamp,
  });
}

export async function completeRunRecord(
  ctx: MutationCtx,
  runId: Id<"projectAiRuns">,
) {
  const timestamp = now();
  await ctx.db.patch(runId, {
    status: "completed",
    completedAt: timestamp,
    updatedAt: timestamp,
  });

  return timestamp;
}
