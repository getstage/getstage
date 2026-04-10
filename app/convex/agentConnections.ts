import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { requireAuthUser } from "./_helpers";
import type { Id } from "./_generated/dataModel";

const claudeSource = v.union(
  v.literal("onboarding"),
  v.literal("settings"),
);

const claudeClient = v.literal("claude_code");

function now() {
  return Date.now();
}

async function getClaudeConnectionRecord(
  ctx: Parameters<typeof query>[0] extends never ? never : any,
  userId: Id<"users">,
) {
  return ctx.db
    .query("agentConnections")
    .withIndex("by_user_provider_client", (q: any) =>
      q.eq("userId", userId).eq("provider", "claude").eq("client", "claude_code"),
    )
    .unique();
}

async function getLatestDestinationForProvider(
  ctx: Parameters<typeof query>[0] extends never ? never : any,
  userId: Id<"users">,
  provider: "figma" | "notion",
) {
  const destinations = await ctx.db
    .query("artifactDestinations")
    .withIndex("by_user_provider", (q: any) => q.eq("userId", userId).eq("provider", provider))
    .collect();

  return destinations.sort((a: any, b: any) => b.updatedAt - a.updatedAt)[0] ?? null;
}

function toToolSummary(
  availability: "unknown" | "claimed",
  destination: {
    status: "requested" | "in_progress" | "completed" | "failed";
    updatedAt: number;
    destinationUrl?: string;
    destinationLabel?: string;
    errorMessage?: string;
  } | null,
) {
  return {
    availability,
    lastExportAt: destination?.updatedAt ?? null,
    lastExportStatus: destination?.status ?? null,
    lastExportUrl: destination?.destinationUrl ?? null,
    destinationLabel: destination?.destinationLabel ?? null,
    lastError: destination?.errorMessage ?? null,
  };
}

export const getClaudeConnectionSummary = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuthUser(ctx);
    const connection = await getClaudeConnectionRecord(ctx, user._id);
    const [figmaDestination, notionDestination] = await Promise.all([
      getLatestDestinationForProvider(ctx, user._id, "figma"),
      getLatestDestinationForProvider(ctx, user._id, "notion"),
    ]);

    return {
      connection: connection
        ? {
            id: String(connection._id),
            provider: connection.provider,
            client: connection.client,
            mode: connection.mode,
            status: connection.status,
            displayName: connection.displayName ?? "Claude Code",
            source: connection.source,
            stageApiVerified: connection.stageApiVerified,
            notionInClaude: connection.notionInClaude,
            figmaInClaude: connection.figmaInClaude,
            connectedAt: connection.connectedAt ?? null,
            lastSeenAt: connection.lastSeenAt ?? null,
            lastHandshakeAt: connection.lastHandshakeAt ?? null,
            lastError: connection.lastError ?? null,
          }
        : null,
      tools: {
        figma: toToolSummary(connection?.figmaInClaude ?? "unknown", figmaDestination),
        notion: toToolSummary(connection?.notionInClaude ?? "unknown", notionDestination),
      },
    };
  },
});

export const listForCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuthUser(ctx);
    return ctx.db
      .query("agentConnections")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
  },
});

export const createPendingClaudeConnection = mutation({
  args: {
    source: claudeSource,
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);
    const timestamp = now();
    const existing = await getClaudeConnectionRecord(ctx, user._id);

    if (existing) {
      await ctx.db.patch(existing._id, {
        source: args.source,
        status: existing.status === "connected" ? existing.status : "pending",
        displayName: existing.displayName ?? "Claude Code",
        updatedAt: timestamp,
        lastError: existing.status === "connected" ? existing.lastError : undefined,
      });

      return {
        connectionId: String(existing._id),
        status: existing.status === "connected" ? existing.status : "pending",
      };
    }

    const connectionId = await ctx.db.insert("agentConnections", {
      userId: user._id,
      provider: "claude",
      client: "claude_code",
      mode: "skill",
      status: "pending",
      displayName: "Claude Code",
      source: args.source,
      stageApiVerified: false,
      notionInClaude: "unknown",
      figmaInClaude: "unknown",
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    return {
      connectionId: String(connectionId),
      status: "pending" as const,
    };
  },
});

export const disconnectClaude = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuthUser(ctx);
    const existing = await getClaudeConnectionRecord(ctx, user._id);
    if (!existing) {
      return { disconnected: false };
    }

    const timestamp = now();
    await ctx.db.patch(existing._id, {
      status: "disconnected",
      stageApiVerified: false,
      lastError: undefined,
      updatedAt: timestamp,
    });

    return { disconnected: true, disconnectedAt: timestamp };
  },
});

export const handshakeClaudeConnectionForApi = internalMutation({
  args: {
    userId: v.id("users"),
    apiKeyId: v.id("apiKeys"),
    connectionId: v.optional(v.id("agentConnections")),
    client: claudeClient,
    capabilities: v.optional(
      v.object({
        notionMcp: v.optional(v.boolean()),
        figmaMcp: v.optional(v.boolean()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const timestamp = now();
    const connectionById = args.connectionId ? await ctx.db.get(args.connectionId) : null;
    const current =
      connectionById && connectionById.userId === args.userId
        ? connectionById
        : await getClaudeConnectionRecord(ctx, args.userId);

    const patch = {
      provider: "claude" as const,
      client: "claude_code" as const,
      mode: "skill" as const,
      displayName: "Claude Code",
      apiKeyId: args.apiKeyId,
      status: "connected" as const,
      stageApiVerified: true,
      notionInClaude: args.capabilities?.notionMcp ? ("claimed" as const) : ("unknown" as const),
      figmaInClaude: args.capabilities?.figmaMcp ? ("claimed" as const) : ("unknown" as const),
      connectedAt: current?.connectedAt ?? timestamp,
      lastSeenAt: timestamp,
      lastHandshakeAt: timestamp,
      lastError: undefined,
      updatedAt: timestamp,
    };

    if (current) {
      await ctx.db.patch(current._id, patch);
      return {
        connectionId: current._id,
        status: "connected" as const,
      };
    }

    const connectionId = await ctx.db.insert("agentConnections", {
      userId: args.userId,
      source: "settings",
      createdAt: timestamp,
      ...patch,
    });

    return {
      connectionId,
      status: "connected" as const,
    };
  },
});
