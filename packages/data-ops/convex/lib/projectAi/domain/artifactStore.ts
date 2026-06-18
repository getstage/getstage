import type { Id } from "../../../_generated/dataModel";
import type { MutationCtx } from "../../../_generated/server";
import { deleteOldR2Asset } from "../../../r2";
import type { AiModule } from "./validators";
import { collectR2KeysFromJson } from "./r2Keys";
import { normalizeOptional } from "./normalize";
import { now } from "./time";

export async function createArtifactRecord(
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
  const timestamp = now();
  const artifactId = await ctx.db.insert("projectAiArtifacts", {
    userId: args.userId,
    projectId: args.projectId,
    runId: args.status === "failed" ? args.runId : undefined,
    module: args.module,
    kind: args.kind.trim(),
    title: args.title.trim(),
    summary: normalizeOptional(args.summary),
    status: args.status,
    contentFormat: args.contentFormat,
    contentMarkdown: normalizeOptional(args.contentMarkdown),
    contentJson: normalizeOptional(args.contentJson),
    externalUrl: normalizeOptional(args.externalUrl),
    createdAt: timestamp,
    updatedAt: timestamp,
    approvedAt: args.status === "approved" ? timestamp : undefined,
  });

  if (args.runId) {
    if (args.status === "failed") {
      await ctx.db.patch(args.runId, {
        status: "failed",
        errorMessage: normalizeOptional(args.summary),
        completedAt: timestamp,
        updatedAt: timestamp,
      });
    }
  }

  return artifactId;
}

export async function deletePreviousArtifactsByKind(
  ctx: MutationCtx,
  projectId: Id<"projects">,
  module: AiModule,
  kind: string,
  options?: { cleanupR2FromContentJson?: boolean },
) {
  const artifacts = await ctx.db
    .query("projectAiArtifacts")
    .withIndex("by_project", (q) => q.eq("projectId", projectId))
    .collect();

  const previous = artifacts.filter(
    (artifact) => artifact.module === module && artifact.kind === kind,
  );

  for (const artifact of previous) {
    if (options?.cleanupR2FromContentJson && artifact.contentJson) {
      try {
        const parsed = JSON.parse(artifact.contentJson);
        const keys = new Set<string>();
        collectR2KeysFromJson(parsed, keys);
        for (const key of keys) {
          await deleteOldR2Asset(ctx, key);
        }
      } catch {
        // Keep going even if old JSON is invalid.
      }
    }

    await ctx.db.delete(artifact._id);
  }
}

export async function deletePreviousResearchArtifacts(
  ctx: MutationCtx,
  projectId: Id<"projects">,
) {
  await deletePreviousArtifactsByKind(ctx, projectId, "research", "researchArtifact", {
    cleanupR2FromContentJson: true,
  });
}

export async function deletePreviousStrategyArtifacts(
  ctx: MutationCtx,
  projectId: Id<"projects">,
) {
  await deletePreviousArtifactsByKind(ctx, projectId, "strategy", "strategyArtifact");
}

export async function deletePreviousMoodboardArtifacts(
  ctx: MutationCtx,
  projectId: Id<"projects">,
) {
  await deletePreviousArtifactsByKind(ctx, projectId, "moodboard", "moodboardArtifact", {
    cleanupR2FromContentJson: true,
  });
}

export async function deletePreviousFlowsArtifacts(
  ctx: MutationCtx,
  projectId: Id<"projects">,
) {
  await deletePreviousArtifactsByKind(ctx, projectId, "flows", "flowsArtifact");
}

export async function deletePreviousWireframesArtifacts(
  ctx: MutationCtx,
  projectId: Id<"projects">,
) {
  await deletePreviousArtifactsByKind(ctx, projectId, "generate", "wireframesArtifact");
}

/** Moodboard, flows, wireframes — only via explicit user mutation after upstream re-run. */
export async function deleteDownstreamArtifacts(
  ctx: MutationCtx,
  projectId: Id<"projects">,
) {
  await deletePreviousMoodboardArtifacts(ctx, projectId);
  await deletePreviousFlowsArtifacts(ctx, projectId);
  await deletePreviousWireframesArtifacts(ctx, projectId);
}
