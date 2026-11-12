import { v } from "convex/values";
import type { Id } from "../../../_generated/dataModel";
import type { QueryCtx } from "../../../_generated/server";
import { requireProjectAccessForUserId } from "../../../_helpers";

// Where an AI tool's background job is (Research reference collection, moodboard import). Every answer says
// what to do next, so the AI waits, looks at the screens, or stops with the reason.

export const runStatusForApiArgs = { userId: v.id("users"), projectId: v.id("projects"), runId: v.string() };

export async function runStatusForApiHandler(ctx: QueryCtx, args: { userId: Id<"users">; projectId: Id<"projects">; runId: string }) {
  await requireProjectAccessForUserId(ctx, args);
  const runId = ctx.db.normalizeId("projectAiRuns", args.runId);
  const run = runId ? await ctx.db.get(runId) : null;
  if (!run || run.projectId !== args.projectId) {
    throw new Error("No run with this id in this project. Use the runId that start_research or add_to_moodboard returned.");
  }
  const id = String(run._id);
  if (run.status === "failed" || run.status === "cancelled") return { runId: id, status: "failed" as const, reason: run.errorMessage ?? "The run failed." };

  const checkpoint = (kind: "research-references" | "moodboard-import") =>
    ctx.db.query("projectAiRunCheckpoints").withIndex("by_run_kind_screen", (q) => q.eq("runId", run._id).eq("kind", kind)).first();

  if (run.module === "research") {
    if (run.status === "completed") return { runId: id, status: "done" as const, next: "Research is saved." };
    const references = await checkpoint("research-references");
    return references
      ? { runId: id, status: "ready" as const, next: "Look at every screenshot, then call save_research with this runId.", groups: JSON.parse(references.contentJson) as unknown }
      : { runId: id, status: "running" as const, next: "Stage is collecting the screens. Check again in a few seconds." };
  }
  const outcome = await checkpoint("moodboard-import");
  return outcome
    ? { runId: id, status: "done" as const, ...(JSON.parse(outcome.contentJson) as Record<string, unknown>) }
    : { runId: id, status: "running" as const, next: "Stage is importing the images. Check again in a few seconds." };
}
