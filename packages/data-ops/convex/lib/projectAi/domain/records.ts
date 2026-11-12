import type { Doc, Id } from "../../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../../_generated/server";

type ReaderCtx = QueryCtx | MutationCtx;

export async function getContextRecord(ctx: ReaderCtx, projectId: Id<"projects">) {
  return ctx.db
    .query("projectAiContexts")
    .withIndex("by_project", (q) => q.eq("projectId", projectId))
    .unique();
}

export async function getArtifactRecord(ctx: ReaderCtx, artifactId: Id<"projectAiArtifacts">) {
  const artifact = await ctx.db.get(artifactId);
  if (!artifact) {
    throw new Error("Artifact not found.");
  }
  return artifact;
}

export async function getRunRecord(ctx: ReaderCtx, runId: Id<"projectAiRuns">) {
  const run = await ctx.db.get(runId);
  if (!run) {
    throw new Error("Run not found.");
  }
  return run;
}

export async function listDestinationsForArtifacts(
  ctx: ReaderCtx,
  artifactIds: Id<"projectAiArtifacts">[],
) {
  const results = new Map<string, Doc<"artifactDestinations">[]>();

  await Promise.all(
    artifactIds.map(async (artifactId) => {
      const destinations = await ctx.db
        .query("artifactDestinations")
        .withIndex("by_artifact", (q) => q.eq("artifactId", artifactId))
        .collect();
      results.set(
        String(artifactId),
        destinations.sort((left, right) => right.updatedAt - left.updatedAt),
      );
    }),
  );

  return results;
}
