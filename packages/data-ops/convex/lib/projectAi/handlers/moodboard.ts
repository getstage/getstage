import { v } from "convex/values";
import type { Id } from "../../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../../_generated/server";
import { requireProjectAccess } from "../../../_helpers";
import { decryptSecret } from "../../../lib/credentialVault";
import { createArtifactRecord } from "../domain/artifactStore";
import { findLatestArtifact } from "../domain/latestArtifact";
import { getRunRecord } from "../domain/records";
import {
  completeRunRecord,
  createRunRecord,
  findRunningRunForProjectModule,
} from "../domain/runStore";
import { normalizeOptional } from "../domain/normalize";
import { now } from "../domain/time";

/**
 * Save the moodboard board structure (references + directions + uploaded files)
 * without a provider run. This is an upsert: it patches the existing moodboard
 * artifact in place when present, otherwise inserts one.
 *
 * It deliberately does NOT run the R2-cleanup path that
 * `deletePreviousMoodboardArtifacts` uses, because the saved references reuse the
 * same R2 object keys — wiping them on every save would delete images still in use.
 * Full replace + R2 cleanup happens only on an explicit moodboard re-run.
 */
export const saveMoodboardArtifactArgs = {
  projectId: v.id("projects"),
  title: v.string(),
  contentJson: v.string(),
  summary: v.optional(v.string()),
};

export async function saveMoodboardArtifactHandler(
  ctx: MutationCtx,
  args: {
    projectId: Id<"projects">;
    title: string;
    contentJson: string;
    summary?: string;
  },
) {
  const { user } = await requireProjectAccess(ctx, args.projectId);

  // Validate JSON before persisting; keep the contract honest at the boundary.
  JSON.parse(args.contentJson);

  const timestamp = now();
  const existing = await findLatestArtifact(
    ctx,
    args.projectId,
    "moodboard",
    "moodboardArtifact",
  );

  if (existing) {
    await ctx.db.patch(existing._id, {
      title: args.title.trim(),
      summary: normalizeOptional(args.summary),
      contentJson: args.contentJson,
      status: "ready",
      updatedAt: timestamp,
    });

    return { artifactId: String(existing._id), savedAt: timestamp };
  }

  const artifactId = await createArtifactRecord(ctx, {
    userId: user._id,
    projectId: args.projectId,
    module: "moodboard",
    kind: "moodboardArtifact",
    title: args.title,
    summary: args.summary,
    status: "ready",
    contentFormat: "json",
    contentJson: args.contentJson,
  });

  return { artifactId: String(artifactId), savedAt: timestamp };
}

/**
 * Persist a moodboard import as a "running" run so the tab can restore the
 * generating state after it unmounts (leaving/returning to the tab). The engine
 * owns the lifecycle: it marks the run completed/failed when the import ends.
 */
export const createMoodboardRunArgs = {
  projectId: v.id("projects"),
  title: v.string(),
  externalRunId: v.optional(v.string()),
};

export async function createMoodboardRunHandler(
  ctx: MutationCtx,
  args: {
    projectId: Id<"projects">;
    title: string;
    externalRunId?: string;
  },
) {
  const { user } = await requireProjectAccess(ctx, args.projectId);
  const existingRunning = await findRunningRunForProjectModule(ctx, args.projectId, "moodboard");

  if (existingRunning) {
    const externalRunId = normalizeOptional(args.externalRunId);
    if (externalRunId && existingRunning.externalRunId === externalRunId) {
      return { runId: String(existingRunning._id), startedAt: existingRunning.startedAt };
    }

    const timestamp = now();
    await ctx.db.patch(existingRunning._id, {
      status: "failed",
      errorMessage: "Run was replaced after Stage restarted before a final status.",
      completedAt: timestamp,
      updatedAt: timestamp,
    });
  }

  const runId = await createRunRecord(ctx, {
    userId: user._id,
    projectId: args.projectId,
    module: "moodboard",
    title: args.title,
    status: "running",
    trigger: "user",
    externalRunId: args.externalRunId,
  });

  return { runId: String(runId), startedAt: now() };
}

export const completeMoodboardRunArgs = {
  projectId: v.id("projects"),
  runId: v.id("projectAiRuns"),
};

export async function completeMoodboardRunHandler(
  ctx: MutationCtx,
  args: { projectId: Id<"projects">; runId: Id<"projectAiRuns"> },
) {
  await requireProjectAccess(ctx, args.projectId);
  const run = await getRunRecord(ctx, args.runId);
  if (run.projectId !== args.projectId) {
    throw new Error("Run not found.");
  }

  const completedAt = await completeRunRecord(ctx, args.runId);
  return { completedAt };
}

export const failMoodboardRunArgs = {
  projectId: v.id("projects"),
  runId: v.id("projectAiRuns"),
  errorMessage: v.string(),
};

export async function failMoodboardRunHandler(
  ctx: MutationCtx,
  args: { projectId: Id<"projects">; runId: Id<"projectAiRuns">; errorMessage: string },
) {
  await requireProjectAccess(ctx, args.projectId);
  const run = await getRunRecord(ctx, args.runId);
  if (run.projectId !== args.projectId) {
    throw new Error("Run not found.");
  }

  const timestamp = now();
  await ctx.db.patch(args.runId, {
    status: "failed",
    errorMessage: args.errorMessage.trim() || "Moodboard import failed.",
    completedAt: timestamp,
    updatedAt: timestamp,
  });

  return { failedAt: timestamp };
}

export const getConnectedFigmaAccessTokenArgs = {
  projectId: v.id("projects"),
};

export async function getConnectedFigmaAccessTokenHandler(
  ctx: QueryCtx,
  args: { projectId: Id<"projects"> },
) {
  const { user } = await requireProjectAccess(ctx, args.projectId);
  const connection = await ctx.db
    .query("nativeIntegrationConnections")
    .withIndex("by_user_provider", (q) => q.eq("userId", user._id).eq("provider", "figma"))
    .unique();

  if (!connection || connection.status !== "active") {
    return null;
  }

  if (!connection.encryptedTokenPayload || !connection.encryptionIv) {
    return null;
  }

  const raw = await decryptSecret(connection.encryptedTokenPayload, connection.encryptionIv);
  const tokens = JSON.parse(raw) as { accessToken?: string | null };
  const accessToken = tokens.accessToken?.trim();

  if (!accessToken) {
    return null;
  }

  return {
    connectionId: String(connection._id),
    accessToken,
    accessTokenExpiresAt: connection.accessTokenExpiresAt ?? null,
    scopes: connection.scopes ?? [],
  };
}
