import { v } from "convex/values";
import type { Id } from "../../../_generated/dataModel";
import type { MutationCtx } from "../../../_generated/server";
import { requireProjectAccess } from "../../../_helpers";
import { flowsArtifactSchema } from "../../../../src/contracts/flows";
import { flowsCanvasEditSchema } from "../../../../src/contracts/flows-canvas";
import { applyFlowsCanvasEdit } from "../../../../src/domain/flows-canvas";
import { getArtifactRecord } from "../domain/records";
import { findLatestArtifact } from "../domain/latestArtifact";
import { findRunningRunForProjectModule } from "../domain/runStore";

export const editFlowsCanvasArgs = {
  projectId: v.id("projects"),
  artifactId: v.id("projectAiArtifacts"),
  editJson: v.string(),
};

export async function editFlowsCanvasHandler(
  ctx: MutationCtx,
  args: { projectId: Id<"projects">; artifactId: Id<"projectAiArtifacts">; editJson: string },
) {
  await requireProjectAccess(ctx, args.projectId);
  if (args.editJson.length > 10000) throw new Error("Canvas edit is too large.");
  const record = await getArtifactRecord(ctx, args.artifactId);
  const latest = await findLatestArtifact(ctx, args.projectId, "flows", "flowsArtifact");
  if (record.projectId !== args.projectId || latest?._id !== record._id || record.module !== "flows" || record.kind !== "flowsArtifact") {
    throw new Error("This diagram has been replaced. Reload and try again.");
  }
  if (await findRunningRunForProjectModule(ctx, args.projectId, "flows")) {
    throw new Error("Wait for generation to finish before editing the diagram.");
  }
  if (!record.contentJson) throw new Error("Diagram data is missing.");
  const artifact = flowsArtifactSchema.parse(JSON.parse(record.contentJson));
  if (artifact.projectId !== String(args.projectId)) throw new Error("Diagram belongs to a different project.");
  const edit = flowsCanvasEditSchema.parse(JSON.parse(args.editJson));
  const result = applyFlowsCanvasEdit(artifact, edit);
  if (result === artifact) return { updatedAt: record.updatedAt, contentJson: record.contentJson };
  const updatedAt = Math.max(Date.now(), record.updatedAt + 1);
  const next = flowsArtifactSchema.parse({ ...result, updatedAt });
  const contentJson = JSON.stringify(next);
  await ctx.db.patch(record._id, { contentJson, updatedAt });
  return { updatedAt, contentJson };
}
