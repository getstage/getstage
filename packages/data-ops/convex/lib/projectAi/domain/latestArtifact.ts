import type { Doc, Id } from "../../../_generated/dataModel";
import type { QueryCtx } from "../../../_generated/server";
import type { AiModule } from "./validators";

export async function findLatestArtifact(
  ctx: QueryCtx,
  projectId: Id<"projects">,
  module: AiModule,
  kind: string,
): Promise<Doc<"projectAiArtifacts"> | null> {
  const artifacts = await ctx.db
    .query("projectAiArtifacts")
    .withIndex("by_project", (q) => q.eq("projectId", projectId))
    .collect();

  return (
    artifacts
      .filter((artifact) => artifact.module === module && artifact.kind === kind)
      .sort((left, right) => right.createdAt - left.createdAt)[0] ?? null
  );
}

export function mapLatestArtifactResponse(
  latest: Doc<"projectAiArtifacts">,
  contentJson: string | null,
) {
  return {
    id: String(latest._id),
    projectId: String(latest.projectId),
    runId: latest.runId ? String(latest.runId) : null,
    title: latest.title,
    summary: latest.summary ?? null,
    status: latest.status,
    contentJson,
    createdAt: latest.createdAt,
    updatedAt: latest.updatedAt,
  };
}
