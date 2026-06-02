import { v } from "convex/values";
import {
  action,
  httpAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "../_generated/server";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { requireAuthUser } from "../_helpers";
import { requireProjectAccessForUserId } from "../domain/projects/service";
import { decryptSecret, encryptSecret } from "../lib/credentialVault";
import { parseResearchArtifactContent } from "../../src/contracts/parseResearchArtifact";
import {
  buildNotionBlocksFromResearchArtifact,
  createNotionChildPage,
  parseNotionPageIdFromInput,
} from "./notionResearchExport";

type Provider = "notion" | "figma";

type ViewerContext = {
  userId: Id<"users">;
  userIdString: string;
  email: string;
  name: string;
};

type TokenPayload = {
  accessToken: string;
  refreshToken?: string | null;
};

const internalApi = internal as any;
const FIGMA_OAUTH_SCOPES = [
  "current_user:read",
  "file_content:read",
  "file_metadata:read",
  "file_dev_resources:read",
  "file_dev_resources:write",
] as const;
const FIGMA_OAUTH_SCOPE_STRING = FIGMA_OAUTH_SCOPES.join(" ");

function now() {
  return Date.now();
}

function getEnv(name: string) {
  return (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.[
    name
  ];
}

function requireEnv(name: string) {
  const value = getEnv(name);
  if (!value) {
    throw new Error(`${name} is not configured.`);
  }
  return value;
}

function getSiteUrl() {
  return (getEnv("SITE_URL") ?? getEnv("CONVEX_SITE_URL") ?? "").replace(/\/$/, "");
}

function requireSiteUrl() {
  const value = getSiteUrl();
  if (!value) {
    throw new Error("SITE_URL or CONVEX_SITE_URL must be configured.");
  }
  return value;
}

function getProviderLabel(provider: Provider) {
  return provider === "notion" ? "Notion" : "Figma";
}

function generateOAuthState() {
  return crypto.randomUUID().replace(/-/g, "");
}

function encodeBasicAuth(username: string, password: string) {
  return btoa(`${username}:${password}`);
}

function toBase64Url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

async function sha256(value: string) {
  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return new Uint8Array(digest);
}

async function generatePkcePair() {
  const randomBytes = crypto.getRandomValues(new Uint8Array(32));
  const verifier = toBase64Url(randomBytes);
  const challenge = toBase64Url(await sha256(verifier));
  return {
    verifier,
    challenge,
  };
}

function buildSettingsRedirect(
  provider: Provider,
  status: "connected" | "error",
  reason?: string,
) {
  const url = new URL("/settings", requireSiteUrl());
  url.searchParams.set("tab", "integrations");
  url.searchParams.set("integration", provider);
  url.searchParams.set("integration_status", status);
  if (reason) {
    url.searchParams.set("reason", reason);
  }
  return url.toString();
}

function getCallbackUrl(provider: Provider) {
  return `${requireEnv("CONVEX_SITE_URL")}/integrations/${provider}/callback`;
}

async function getConnection(
  ctx: Parameters<typeof query>[0] extends never ? never : any,
  userId: Id<"users">,
  provider: Provider,
) {
  return ctx.db
    .query("nativeIntegrationConnections")
    .withIndex("by_user_provider", (q: any) => q.eq("userId", userId).eq("provider", provider))
    .unique();
}

async function decryptTokenPayload(record: Doc<"nativeIntegrationConnections">) {
  if (!record.encryptedTokenPayload || !record.encryptionIv) {
    return null;
  }
  const raw = await decryptSecret(record.encryptedTokenPayload, record.encryptionIv);
  return JSON.parse(raw) as TokenPayload;
}

function formatConnectionSummary(record: Doc<"nativeIntegrationConnections"> | null) {
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

async function exchangeNotionCodeForToken(code: string) {
  const response = await fetch("https://api.notion.com/v1/oauth/token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Basic ${encodeBasicAuth(
        requireEnv("NOTION_CLIENT_ID"),
        requireEnv("NOTION_CLIENT_SECRET"),
      )}`,
      "Notion-Version": "2026-03-11",
    },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code,
      redirect_uri: getCallbackUrl("notion"),
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Notion token exchange failed: ${response.status} ${errorBody}`);
  }

  return (await response.json()) as {
    access_token: string;
    refresh_token?: string | null;
    workspace_id?: string;
    workspace_name?: string | null;
    workspace_icon?: string | null;
    owner?:
      | {
          type?: "user";
          user?: {
            name?: string | null;
            person?: {
              email?: string | null;
            };
          };
        }
      | {
          type?: "workspace";
          workspace?: {
            name?: string | null;
          };
        };
    bot_id?: string;
  };
}

async function exchangeFigmaCodeForToken(code: string, codeVerifier?: string) {
  const body = new URLSearchParams();
  body.set("redirect_uri", getCallbackUrl("figma"));
  body.set("code", code);
  body.set("grant_type", "authorization_code");
  if (codeVerifier) {
    body.set("code_verifier", codeVerifier);
  }

  const response = await fetch("https://api.figma.com/v1/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${encodeBasicAuth(
        requireEnv("FIGMA_CLIENT_ID"),
        requireEnv("FIGMA_CLIENT_SECRET"),
      )}`,
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Figma token exchange failed: ${response.status} ${errorBody}`);
  }

  return (await response.json()) as {
    access_token: string;
    refresh_token?: string | null;
    expires_in?: number;
    user_id_string?: string;
  };
}

async function fetchFigmaMe(accessToken: string) {
  const response = await fetch("https://api.figma.com/v1/me", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Figma profile fetch failed: ${response.status} ${errorBody}`);
  }

  return (await response.json()) as {
    handle?: string;
    email?: string;
    img_url?: string;
    id?: string;
  };
}

export const getNativeConnectionStatus = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuthUser(ctx);
    const [notion, figma] = await Promise.all([
      getConnection(ctx, user._id, "notion"),
      getConnection(ctx, user._id, "figma"),
    ]);

    return {
      notion: formatConnectionSummary(notion),
      figma: formatConnectionSummary(figma),
    };
  },
});

export const disconnectConnection = mutation({
  args: {
    provider: v.union(v.literal("notion"), v.literal("figma")),
  },
  handler: async (ctx, args) => {
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
  },
});

export const startOAuthConnect = action({
  args: {
    provider: v.union(v.literal("notion"), v.literal("figma")),
  },
  handler: async (ctx, args) => {
    const viewer = (await ctx.runQuery(internal.onboarding.getViewerContext, {})) as ViewerContext;
    const oauthState = generateOAuthState();
    const timestamp = now();

    if (args.provider === "notion") {
      requireEnv("NOTION_CLIENT_ID");
      requireEnv("NOTION_CLIENT_SECRET");
      requireEnv("CONVEX_SITE_URL");

      await ctx.runMutation(internalApi.integrations.contentPlatforms.upsertPendingConnectionForOAuth, {
        userId: viewer.userId,
        provider: "notion",
        oauthState,
        pkceVerifier: undefined,
        requestedAt: timestamp,
      });

      const url = new URL("https://api.notion.com/v1/oauth/authorize");
      url.searchParams.set("client_id", requireEnv("NOTION_CLIENT_ID"));
      url.searchParams.set("response_type", "code");
      url.searchParams.set("owner", "user");
      url.searchParams.set("redirect_uri", getCallbackUrl("notion"));
      url.searchParams.set("state", oauthState);

      return { url: url.toString() };
    }

    requireEnv("FIGMA_CLIENT_ID");
    requireEnv("FIGMA_CLIENT_SECRET");
    requireEnv("CONVEX_SITE_URL");
    const pkce = await generatePkcePair();

    await ctx.runMutation(internalApi.integrations.contentPlatforms.upsertPendingConnectionForOAuth, {
      userId: viewer.userId,
      provider: "figma",
      oauthState,
      pkceVerifier: pkce.verifier,
      requestedAt: timestamp,
    });

    const url = new URL("https://www.figma.com/oauth");
    url.searchParams.set("client_id", requireEnv("FIGMA_CLIENT_ID"));
    url.searchParams.set("redirect_uri", getCallbackUrl("figma"));
    url.searchParams.set("scope", FIGMA_OAUTH_SCOPE_STRING);
    url.searchParams.set("state", oauthState);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("code_challenge", pkce.challenge);
    url.searchParams.set("code_challenge_method", "S256");

    return { url: url.toString() };
  },
});

export const getConnectionByOAuthState = internalQuery({
  args: {
    oauthState: v.string(),
  },
  handler: async (ctx, args) => {
    return ctx.db
      .query("nativeIntegrationConnections")
      .withIndex("by_oauth_state", (q) => q.eq("oauthState", args.oauthState))
      .unique();
  },
});

export const upsertPendingConnectionForOAuth = internalMutation({
  args: {
    userId: v.id("users"),
    provider: v.union(v.literal("notion"), v.literal("figma")),
    oauthState: v.string(),
    pkceVerifier: v.optional(v.string()),
    requestedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await getConnection(ctx, args.userId, args.provider);

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: "pending",
        oauthState: args.oauthState,
        pkceVerifier: args.pkceVerifier,
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
      createdAt: args.requestedAt,
      updatedAt: args.requestedAt,
    });
  },
});

export const completeConnectionFromOAuth = internalMutation({
  args: {
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
  },
  handler: async (ctx, args) => {
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
      connectedAt: args.completedAt,
      lastError: undefined,
      updatedAt: args.completedAt,
    });
  },
});

export const markConnectionErrorByState = internalMutation({
  args: {
    oauthState: v.string(),
    message: v.string(),
  },
  handler: async (ctx, args) => {
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
      updatedAt: now(),
    });

    return existing._id;
  },
});

export const getConnectionTokenForProvider = internalQuery({
  args: {
    userId: v.id("users"),
    provider: v.union(v.literal("notion"), v.literal("figma")),
  },
  handler: async (ctx, args) => {
    const record = await getConnection(ctx, args.userId, args.provider);
    if (!record) {
      return null;
    }

    const tokens = record.encryptedTokenPayload && record.encryptionIv
      ? await decryptTokenPayload(record)
      : null;

    return {
      connectionId: record._id,
      provider: record.provider,
      status: record.status,
      accessToken: tokens?.accessToken ?? null,
      refreshToken: tokens?.refreshToken ?? null,
      accessTokenExpiresAt: record.accessTokenExpiresAt ?? null,
      scopes: record.scopes ?? [],
    };
  },
});

async function handleProviderCallback(
  ctx: Parameters<typeof httpAction>[0] extends never ? never : any,
  provider: Provider,
  req: Request,
) {
  const url = new URL(req.url);
  const error = url.searchParams.get("error");
  const code = url.searchParams.get("code");
  const oauthState = url.searchParams.get("state");

  if (!oauthState) {
    return Response.redirect(buildSettingsRedirect(provider, "error", "missing_state"), 302);
  }

  if (error) {
    await ctx.runMutation(internalApi.integrations.contentPlatforms.markConnectionErrorByState, {
      oauthState,
      message: `${getProviderLabel(provider)} authorization was cancelled or rejected.`,
    });
    return Response.redirect(buildSettingsRedirect(provider, "error", "oauth_denied"), 302);
  }

  if (!code) {
    await ctx.runMutation(internalApi.integrations.contentPlatforms.markConnectionErrorByState, {
      oauthState,
      message: `No authorization code received from ${getProviderLabel(provider)}.`,
    });
    return Response.redirect(buildSettingsRedirect(provider, "error", "missing_code"), 302);
  }

  const connection = (await ctx.runQuery(
    internalApi.integrations.contentPlatforms.getConnectionByOAuthState,
    { oauthState },
  )) as Doc<"nativeIntegrationConnections"> | null;

  if (!connection) {
    return Response.redirect(buildSettingsRedirect(provider, "error", "unknown_state"), 302);
  }

  try {
    const completedAt = now();

    if (provider === "notion") {
      const tokenResponse = await exchangeNotionCodeForToken(code);
      const encrypted = await encryptSecret(
        JSON.stringify({
          accessToken: tokenResponse.access_token,
          refreshToken: tokenResponse.refresh_token ?? null,
        } satisfies TokenPayload),
      );
      const owner =
        tokenResponse.owner && "user" in tokenResponse.owner ? tokenResponse.owner.user : undefined;

      await ctx.runMutation(internalApi.integrations.contentPlatforms.completeConnectionFromOAuth, {
        connectionId: connection._id,
        displayName: tokenResponse.workspace_name ?? "Notion",
        workspaceId: tokenResponse.workspace_id,
        workspaceName: tokenResponse.workspace_name ?? undefined,
        workspaceIcon: tokenResponse.workspace_icon ?? undefined,
        accountId: tokenResponse.bot_id,
        accountEmail: owner?.person?.email ?? undefined,
        accountName: owner?.name ?? undefined,
        accountAvatarUrl: undefined,
        encryptedTokenPayload: encrypted.encryptedValue,
        encryptionIv: encrypted.encryptionIv,
        accessTokenExpiresAt: undefined,
        scopes: undefined,
        completedAt,
      });
    } else {
      const tokenResponse = await exchangeFigmaCodeForToken(code, connection.pkceVerifier);
      const me = await fetchFigmaMe(tokenResponse.access_token);
      const encrypted = await encryptSecret(
        JSON.stringify({
          accessToken: tokenResponse.access_token,
          refreshToken: tokenResponse.refresh_token ?? null,
        } satisfies TokenPayload),
      );

      await ctx.runMutation(internalApi.integrations.contentPlatforms.completeConnectionFromOAuth, {
        connectionId: connection._id,
        displayName: me.handle ?? "Figma",
        workspaceId: undefined,
        workspaceName: undefined,
        workspaceIcon: undefined,
        accountId: me.id ?? tokenResponse.user_id_string,
        accountEmail: me.email ?? undefined,
        accountName: me.handle ?? undefined,
        accountAvatarUrl: me.img_url ?? undefined,
        encryptedTokenPayload: encrypted.encryptedValue,
        encryptionIv: encrypted.encryptionIv,
        accessTokenExpiresAt: tokenResponse.expires_in
          ? completedAt + tokenResponse.expires_in * 1000
          : undefined,
        scopes: [...FIGMA_OAUTH_SCOPES],
        completedAt,
      });
    }

    return Response.redirect(buildSettingsRedirect(provider, "connected"), 302);
  } catch (callbackError) {
    const message =
      callbackError instanceof Error ? callbackError.message : `Could not complete ${getProviderLabel(provider)} setup.`;
    await ctx.runMutation(internalApi.integrations.contentPlatforms.markConnectionErrorByState, {
      oauthState,
      message,
    });
    return Response.redirect(buildSettingsRedirect(provider, "error", "callback_failed"), 302);
  }
}

export const getResearchArtifactForNotionExport = internalQuery({
  args: {
    userId: v.id("users"),
    artifactId: v.id("projectAiArtifacts"),
  },
  handler: async (ctx, args) => {
    const artifact = await ctx.db.get(args.artifactId);
    if (!artifact) {
      throw new Error("Artifact not found.");
    }

    await requireProjectAccessForUserId(ctx, {
      userId: args.userId,
      projectId: artifact.projectId,
    });

    if (artifact.module !== "research" || artifact.kind !== "researchArtifact") {
      throw new Error("Artifact is not a research artifact.");
    }

    const project = await ctx.db.get(artifact.projectId);
    const connection = await getConnection(ctx, args.userId, "notion");

    return {
      artifactId: artifact._id,
      projectId: artifact.projectId,
      contentJson: artifact.contentJson ?? null,
      projectName: project?.name ?? "Project",
      connection: connection
        ? {
            id: connection._id,
            status: connection.status,
            defaultParentPageId: connection.defaultParentPageId ?? null,
            defaultParentPageUrl: connection.defaultParentPageUrl ?? null,
          }
        : null,
    };
  },
});

export const completeNotionResearchExport = internalMutation({
  args: {
    userId: v.id("users"),
    artifactId: v.id("projectAiArtifacts"),
    projectId: v.id("projects"),
    connectionId: v.id("nativeIntegrationConnections"),
    destinationUrl: v.string(),
    destinationLabel: v.string(),
    parentPageId: v.string(),
    parentPageUrl: v.optional(v.string()),
    completedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const timestamp = args.completedAt;
    await ctx.db.insert("artifactDestinations", {
      userId: args.userId,
      artifactId: args.artifactId,
      projectId: args.projectId,
      provider: "notion",
      action: "export_to_notion",
      status: "completed",
      destinationLabel: args.destinationLabel,
      destinationUrl: args.destinationUrl,
      requestedVia: "native",
      lastSyncedAt: timestamp,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    await ctx.db.patch(args.connectionId, {
      defaultParentPageId: args.parentPageId,
      defaultParentPageUrl: args.parentPageUrl ?? args.destinationUrl,
      lastSyncedAt: timestamp,
      updatedAt: timestamp,
    });
  },
});

export const exportResearchArtifactToNotion = action({
  args: {
    artifactId: v.id("projectAiArtifacts"),
    parentPageUrlOrId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const viewer = (await ctx.runQuery(internal.onboarding.getViewerContext, {})) as ViewerContext;
    const bundle = (await ctx.runQuery(
      internalApi.integrations.contentPlatforms.getResearchArtifactForNotionExport,
      {
        userId: viewer.userId,
        artifactId: args.artifactId,
      },
    )) as {
      artifactId: Id<"projectAiArtifacts">;
      projectId: Id<"projects">;
      contentJson: string | null;
      projectName: string;
      connection: {
        id: Id<"nativeIntegrationConnections">;
        status: string;
        defaultParentPageId: string | null;
        defaultParentPageUrl: string | null;
      } | null;
    };

    if (!bundle.connection || bundle.connection.status !== "active") {
      throw new Error("Connect Notion in Settings before exporting.");
    }

    const tokenRecord = (await ctx.runQuery(
      internalApi.integrations.contentPlatforms.getConnectionTokenForProvider,
      { userId: viewer.userId, provider: "notion" },
    )) as { accessToken: string | null } | null;

    if (!tokenRecord?.accessToken) {
      throw new Error("Notion access token is unavailable. Reconnect Notion in Settings.");
    }

    const parsedArtifact = parseResearchArtifactContent(bundle.contentJson ?? "");
    if (!parsedArtifact) {
      throw new Error("Research artifact content could not be parsed.");
    }

    const parentInput =
      args.parentPageUrlOrId?.trim() ||
      bundle.connection.defaultParentPageUrl?.trim() ||
      bundle.connection.defaultParentPageId?.trim() ||
      "";

    if (!parentInput) {
      throw new Error("NOTION_PARENT_REQUIRED");
    }

    const parentPageId = parseNotionPageIdFromInput(parentInput);
    const parentPageUrl =
      args.parentPageUrlOrId?.trim() || bundle.connection.defaultParentPageUrl || undefined;
    const children = buildNotionBlocksFromResearchArtifact(parsedArtifact);
    const pageTitle = `${bundle.projectName} Research`;
    const { destinationUrl } = await createNotionChildPage({
      accessToken: tokenRecord.accessToken,
      parentPageId,
      title: pageTitle,
      children,
    });

    const completedAt = now();
    await ctx.runMutation(internalApi.integrations.contentPlatforms.completeNotionResearchExport, {
      userId: viewer.userId,
      artifactId: bundle.artifactId,
      projectId: bundle.projectId,
      connectionId: bundle.connection.id,
      destinationUrl,
      destinationLabel: pageTitle,
      parentPageId,
      parentPageUrl,
      completedAt,
    });

    return {
      destinationUrl,
      parentPageId,
      parentPageUrl: parentPageUrl ?? null,
      exportedAt: completedAt,
    };
  },
});

export const notionConnectCallback = httpAction(async (ctx, req) => {
  return handleProviderCallback(ctx, "notion", req);
});

export const figmaConnectCallback = httpAction(async (ctx, req) => {
  return handleProviderCallback(ctx, "figma", req);
});
