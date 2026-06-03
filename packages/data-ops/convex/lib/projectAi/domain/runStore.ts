import type { Id } from "../../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../../_generated/server";
import type { AiModule } from "./validators";
import { normalizeOptional } from "./normalize";
import { now } from "./time";

export async function findRunningRunForProjectModule(
  ctx: QueryCtx | MutationCtx,
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

  return runs.find((run) => run.status === "running") ?? null;
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
