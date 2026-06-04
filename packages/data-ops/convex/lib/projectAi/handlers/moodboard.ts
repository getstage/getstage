import { v } from "convex/values";
import type { Id } from "../../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../../_generated/server";
import { requireProjectAccess } from "../../../_helpers";
import { decryptSecret } from "../../../lib/credentialVault";
import { createArtifactRecord } from "../domain/artifactStore";
import { findLatestArtifact } from "../domain/latestArtifact";
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
