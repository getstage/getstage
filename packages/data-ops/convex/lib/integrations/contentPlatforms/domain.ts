import type { Doc, Id } from "../../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../../_generated/server";
import { decryptSecret } from "../../../lib/credentialVault";
import type {
  NativeProvider,
  TokenPayload,
} from "../../../models/integrations/contentPlatforms";

type ConnectionCtx = QueryCtx | MutationCtx;

export async function getConnection(
  ctx: ConnectionCtx,
  userId: Id<"users">,
  provider: NativeProvider,
) {
  return ctx.db
    .query("nativeIntegrationConnections")
    .withIndex("by_user_provider", (q) => q.eq("userId", userId).eq("provider", provider))
    .unique();
}

export function formatConnectionSummary(record: Doc<"nativeIntegrationConnections"> | null) {
  return record
    ? {
        id: String(record._id),
        provider: record.provider,
        status: record.status,
        displayName: record.displayName ?? null,
        workspaceName: record.workspaceName ?? null,
        workspaceIcon: record.workspaceIcon ?? null,
        accountEmail: record.accountEmail ?? null,
        accountName: record.accountName ?? null,
        connectedAt: record.connectedAt ?? null,
        lastSyncedAt: record.lastSyncedAt ?? null,
        lastError: record.lastError ?? null,
        defaultParentPageId: record.defaultParentPageId ?? null,
        defaultParentPageUrl: record.defaultParentPageUrl ?? null,
      }
    : null;
}

export async function decryptTokenPayload(record: Doc<"nativeIntegrationConnections">) {
  if (!record.encryptedTokenPayload || !record.encryptionIv) {
    return null;
  }
  const raw = await decryptSecret(record.encryptedTokenPayload, record.encryptionIv);
  return JSON.parse(raw) as TokenPayload;
}

export async function upsertNotionArtifactDestination(
  ctx: MutationCtx,
  args: {
    userId: Id<"users">;
    projectId: Id<"projects">;
    artifactId: Id<"projectAiArtifacts">;
    action: string;
    destinationLabel: string;
    destinationUrl: string;
    completedAt: number;
  },
) {
  const existing = (
    await ctx.db
      .query("artifactDestinations")
      .withIndex("by_artifact", (q) => q.eq("artifactId", args.artifactId))
      .collect()
  ).find(
    (destination) => destination.provider === "notion" && destination.action === args.action,
  );
  const patch = {
    status: "completed" as const,
    destinationLabel: args.destinationLabel,
    destinationUrl: args.destinationUrl,
    requestedVia: "native" as const,
    errorMessage: undefined,
    lastSyncedAt: args.completedAt,
    updatedAt: args.completedAt,
  };

  if (existing) {
    await ctx.db.patch(existing._id, patch);
    return;
  }
  await ctx.db.insert("artifactDestinations", {
    userId: args.userId,
    projectId: args.projectId,
    artifactId: args.artifactId,
    provider: "notion",
    action: args.action,
    createdAt: args.completedAt,
    ...patch,
  });
}
