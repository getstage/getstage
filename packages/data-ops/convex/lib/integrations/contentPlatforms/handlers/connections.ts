import { v } from "convex/values";
import type { Doc } from "../../../../_generated/dataModel";
import type {
  MutationCtx,
  MutationCtx as PublicMutationCtx,
  QueryCtx as PublicQueryCtx,
} from "../../../../_generated/server";
import { requireAuthUser } from "../../../../_helpers";
import { now } from "../../../../helpers/time";
import {
  decryptTokenPayload,
  formatConnectionSummary,
  getConnection,
} from "../domain";

export const disconnectConnectionArgs = {
  provider: v.union(v.literal("notion"), v.literal("figma")),
};

export const getConnectionByOAuthStateArgs = {
  oauthState: v.string(),
};

export const upsertPendingConnectionForOAuthArgs = {
  userId: v.id("users"),
  provider: v.union(v.literal("notion"), v.literal("figma")),
  oauthState: v.string(),
  pkceVerifier: v.optional(v.string()),
  oauthReturnUrl: v.optional(v.string()),
  requestedAt: v.number(),
};

export const completeConnectionFromOAuthArgs = {
  connectionId: v.id("nativeIntegrationConnections"),
  displayName: v.optional(v.string()),
  workspaceId: v.optional(v.string()),
  workspaceName: v.optional(v.string()),
  workspaceIcon: v.optional(v.string()),
  accountId: v.optional(v.string()),
  accountEmail: v.optional(v.string()),
  accountName: v.optional(v.string()),
  accountAvatarUrl: v.optional(v.string()),
  encryptedTokenPayload: v.string(),
  encryptionIv: v.string(),
  accessTokenExpiresAt: v.optional(v.number()),
  scopes: v.optional(v.array(v.string())),
  completedAt: v.number(),
};

export const markConnectionErrorByStateArgs = {
  oauthState: v.string(),
  message: v.string(),
};

export const getConnectionTokenForProviderArgs = {
  userId: v.id("users"),
  provider: v.union(v.literal("notion"), v.literal("figma")),
};

export async function getNativeConnectionStatusHandler(ctx: PublicQueryCtx) {
  const user = await requireAuthUser(ctx);
  const [notion, figma] = await Promise.all([
    getConnection(ctx, user._id, "notion"),
    getConnection(ctx, user._id, "figma"),
  ]);

  return {
    notion: formatConnectionSummary(notion),
    figma: formatConnectionSummary(figma),
  };
}

export async function disconnectConnectionHandler(
  ctx: PublicMutationCtx,
  args: { provider: "notion" | "figma" },
) {
  const user = await requireAuthUser(ctx);
  const existing = await getConnection(ctx, user._id, args.provider);
  if (!existing) {
    return { disconnected: false };
  }

  const timestamp = now();
  await ctx.db.patch(existing._id, {
    status: "disconnected",
    oauthState: undefined,
    pkceVerifier: undefined,
    encryptedTokenPayload: undefined,
    encryptionIv: undefined,
    accessTokenExpiresAt: undefined,
    lastError: undefined,
    updatedAt: timestamp,
  });

  return { disconnected: true, disconnectedAt: timestamp };
}

export async function getConnectionByOAuthStateHandler(
  ctx: PublicQueryCtx,
  args: { oauthState: string },
) {
  return ctx.db
    .query("nativeIntegrationConnections")
    .withIndex("by_oauth_state", (q) => q.eq("oauthState", args.oauthState))
    .unique();
}

export async function upsertPendingConnectionForOAuthHandler(
  ctx: MutationCtx,
  args: {
    userId: Doc<"users">["_id"];
    provider: "notion" | "figma";
    oauthState: string;
    pkceVerifier?: string;
    oauthReturnUrl?: string;
    requestedAt: number;
  },
) {
  const existing = await getConnection(ctx, args.userId, args.provider);

  if (existing) {
    await ctx.db.patch(existing._id, {
      status: "pending",
      oauthState: args.oauthState,
      pkceVerifier: args.pkceVerifier,
      oauthReturnUrl: args.oauthReturnUrl,
      lastError: undefined,
      updatedAt: args.requestedAt,
    });
    return existing._id;
  }

  return ctx.db.insert("nativeIntegrationConnections", {
    userId: args.userId,
    provider: args.provider,
    status: "pending",
    oauthState: args.oauthState,
    pkceVerifier: args.pkceVerifier,
    oauthReturnUrl: args.oauthReturnUrl,
    createdAt: args.requestedAt,
    updatedAt: args.requestedAt,
  });
}

export async function completeConnectionFromOAuthHandler(
  ctx: MutationCtx,
  args: {
    connectionId: Doc<"nativeIntegrationConnections">["_id"];
    displayName?: string;
    workspaceId?: string;
    workspaceName?: string;
    workspaceIcon?: string;
    accountId?: string;
    accountEmail?: string;
    accountName?: string;
    accountAvatarUrl?: string;
    encryptedTokenPayload: string;
    encryptionIv: string;
    accessTokenExpiresAt?: number;
    scopes?: string[];
    completedAt: number;
  },
) {
  await ctx.db.patch(args.connectionId, {
    status: "active",
    displayName: args.displayName,
    workspaceId: args.workspaceId,
    workspaceName: args.workspaceName,
    workspaceIcon: args.workspaceIcon,
    accountId: args.accountId,
    accountEmail: args.accountEmail,
    accountName: args.accountName,
    accountAvatarUrl: args.accountAvatarUrl,
    encryptedTokenPayload: args.encryptedTokenPayload,
    encryptionIv: args.encryptionIv,
    accessTokenExpiresAt: args.accessTokenExpiresAt,
    scopes: args.scopes,
    oauthState: undefined,
    pkceVerifier: undefined,
    oauthReturnUrl: undefined,
    connectedAt: args.completedAt,
    lastError: undefined,
    updatedAt: args.completedAt,
  });
}

export async function markConnectionErrorByStateHandler(
  ctx: MutationCtx,
  args: { oauthState: string; message: string },
) {
  const existing = await ctx.db
    .query("nativeIntegrationConnections")
    .withIndex("by_oauth_state", (q) => q.eq("oauthState", args.oauthState))
    .unique();

  if (!existing) {
    return null;
  }

  await ctx.db.patch(existing._id, {
    status: "error",
    lastError: args.message,
    oauthState: undefined,
    pkceVerifier: undefined,
    oauthReturnUrl: undefined,
    updatedAt: now(),
  });

  return existing._id;
}

export async function getConnectionTokenForProviderHandler(
  ctx: PublicQueryCtx,
  args: { userId: Doc<"users">["_id"]; provider: "notion" | "figma" },
) {
  const record = await getConnection(ctx, args.userId, args.provider);
  if (!record) {
    return null;
  }

  const tokens =
    record.encryptedTokenPayload && record.encryptionIv ? await decryptTokenPayload(record) : null;

  return {
    connectionId: record._id,
    provider: record.provider,
    status: record.status,
    accessToken: tokens?.accessToken ?? null,
    refreshToken: tokens?.refreshToken ?? null,
    accessTokenExpiresAt: record.accessTokenExpiresAt ?? null,
    scopes: record.scopes ?? [],
  };
}
