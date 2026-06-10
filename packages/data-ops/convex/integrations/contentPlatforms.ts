import { v } from "convex/values";
import {
  action,
  httpAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
  type MutationCtx,
} from "../_generated/server";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { requireAuthUser } from "../_helpers";
import { requireProjectAccessForUserId } from "../domain/projects/service";
import { decryptSecret, encryptSecret } from "../lib/credentialVault";
import { parseResearchArtifactContent } from "../../src/contracts/parseResearchArtifact";
import { resolveResearchContentJson } from "../lib/projectAi/domain/researchContent";
import {
  buildNotionBlocksFromResearchArtifact,
  createNotionChildPage,
  parseNotionPageIdFromInput,
} from "./notionResearchExport";
import {
  buildNotionBlocksFromStrategyArtifact,
  createNotionChildPage as createStrategyNotionChildPage,
  parseStrategyArtifactContent,
} from "./notionStrategyExport";

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

async function upsertNotionArtifactDestination(
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
    (destination) =>
      destination.provider === "notion" && destination.action === args.action,
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

function isAllowedDesktopOAuthReturnUrl(returnUrl: string, provider: Provider) {
  let parsed: URL;

  try {
    parsed = new URL(returnUrl);
  } catch {
    return false;
  }

  const expectedPath = `/integrations/${provider}`;

  if (parsed.protocol === "stage:" && parsed.hostname === "integrations") {
    return parsed.pathname === `/${provider}`;
  }

  if (
    parsed.protocol === "http:" &&
    parsed.hostname === "127.0.0.1" &&
    parsed.port === "48224"
  ) {
    return parsed.pathname === expectedPath;
  }

  return false;
}

function buildOAuthCompleteRedirect(
  provider: Provider,
  status: "connected" | "error",
  reason?: string,
  returnUrl?: string | null,
) {
  if (returnUrl && isAllowedDesktopOAuthReturnUrl(returnUrl, provider)) {
    const url = new URL(returnUrl);
    url.searchParams.set("integration", provider);
    url.searchParams.set("integration_status", status);
    if (reason) {
      url.searchParams.set("reason", reason);
    }
    return url.toString();
  }

  return buildSettingsRedirect(provider, status, reason);
}

function getCallbackUrl(provider: Provider) {
  return `${requireSiteUrl()}/integrations/${provider}/callback`;
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
    returnUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const viewer = (await ctx.runQuery(internal.onboarding.getViewerContext, {})) as ViewerContext;
    const oauthState = generateOAuthState();
    const timestamp = now();
    const oauthReturnUrl =
      args.returnUrl && isAllowedDesktopOAuthReturnUrl(args.returnUrl, args.provider)
        ? args.returnUrl
        : undefined;

    if (args.provider === "notion") {
      requireEnv("NOTION_CLIENT_ID");
      requireEnv("NOTION_CLIENT_SECRET");
      requireSiteUrl();

      await ctx.runMutation(internalApi.integrations.contentPlatforms.upsertPendingConnectionForOAuth, {
        userId: viewer.userId,
        provider: "notion",
        oauthState,
        pkceVerifier: undefined,
        oauthReturnUrl,
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
    requireSiteUrl();
    const pkce = await generatePkcePair();

    await ctx.runMutation(internalApi.integrations.contentPlatforms.upsertPendingConnectionForOAuth, {
      userId: viewer.userId,
      provider: "figma",
      oauthState,
      pkceVerifier: pkce.verifier,
      oauthReturnUrl,
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
    oauthReturnUrl: v.optional(v.string()),
    requestedAt: v.number(),
  },
  handler: async (ctx, args) => {
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
      oauthReturnUrl: undefined,
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
      oauthReturnUrl: undefined,
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

  const connection = oauthState
    ? ((await ctx.runQuery(internalApi.integrations.contentPlatforms.getConnectionByOAuthState, {
        oauthState,
      })) as Doc<"nativeIntegrationConnections"> | null)
    : null;
  const oauthReturnUrl = connection?.oauthReturnUrl;

  const redirect = (status: "connected" | "error", reason?: string) =>
    Response.redirect(
      buildOAuthCompleteRedirect(provider, status, reason, oauthReturnUrl),
      302,
    );

  if (!oauthState) {
    return Response.redirect(buildSettingsRedirect(provider, "error", "missing_state"), 302);
  }

  if (error) {
    await ctx.runMutation(internalApi.integrations.contentPlatforms.markConnectionErrorByState, {
      oauthState,
      message: `${getProviderLabel(provider)} authorization was cancelled or rejected.`,
    });
    return redirect("error", "oauth_denied");
  }

  if (!code) {
    await ctx.runMutation(internalApi.integrations.contentPlatforms.markConnectionErrorByState, {
      oauthState,
      message: `No authorization code received from ${getProviderLabel(provider)}.`,
    });
    return redirect("error", "missing_code");
  }

  if (!connection) {
    return redirect("error", "unknown_state");
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

    return redirect("connected");
  } catch (callbackError) {
    const message =
      callbackError instanceof Error ? callbackError.message : `Could not complete ${getProviderLabel(provider)} setup.`;
    await ctx.runMutation(internalApi.integrations.contentPlatforms.markConnectionErrorByState, {
      oauthState,
      message,
    });
    return redirect("error", "callback_failed");
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

    await ctx.db.patch(args.connectionId, {
      defaultParentPageId: args.parentPageId,
      defaultParentPageUrl: args.parentPageUrl ?? args.destinationUrl,
      lastSyncedAt: timestamp,
      updatedAt: timestamp,
    });
    await upsertNotionArtifactDestination(ctx, {
      userId: args.userId,
      projectId: args.projectId,
      artifactId: args.artifactId,
      action: "research_notion_export",
      destinationLabel: args.destinationLabel,
      destinationUrl: args.destinationUrl,
      completedAt: timestamp,
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

    const resolvedContentJson =
      (await resolveResearchContentJson(bundle.contentJson ?? null)) ?? bundle.contentJson ?? "";
    const parsedArtifact = parseResearchArtifactContent(resolvedContentJson);
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

export const getStrategyArtifactForNotionExport = internalQuery({
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

    if (artifact.module !== "strategy" || artifact.kind !== "strategyArtifact") {
      throw new Error("Artifact is not a strategy artifact.");
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

export const completeNotionStrategyExport = internalMutation({
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

    await ctx.db.patch(args.connectionId, {
      defaultParentPageId: args.parentPageId,
      defaultParentPageUrl: args.parentPageUrl ?? args.destinationUrl,
      lastSyncedAt: timestamp,
      updatedAt: timestamp,
    });
    await upsertNotionArtifactDestination(ctx, {
      userId: args.userId,
      projectId: args.projectId,
      artifactId: args.artifactId,
      action: "strategy_notion_export",
      destinationLabel: args.destinationLabel,
      destinationUrl: args.destinationUrl,
      completedAt: timestamp,
    });
  },
});

export const exportStrategyArtifactToNotion = action({
  args: {
    artifactId: v.id("projectAiArtifacts"),
    parentPageUrlOrId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const viewer = (await ctx.runQuery(internal.onboarding.getViewerContext, {})) as ViewerContext;
    const bundle = (await ctx.runQuery(
      internalApi.integrations.contentPlatforms.getStrategyArtifactForNotionExport,
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

    const parsedArtifact = parseStrategyArtifactContent(bundle.contentJson ?? "");
    if (!parsedArtifact) {
      throw new Error("Strategy artifact content could not be parsed.");
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
    const children = buildNotionBlocksFromStrategyArtifact(parsedArtifact);
    const pageTitle = `${bundle.projectName} Strategy`;
    const { destinationUrl } = await createStrategyNotionChildPage({
      accessToken: tokenRecord.accessToken,
      parentPageId,
      title: pageTitle,
      children,
    });

    const completedAt = now();
    await ctx.runMutation(internalApi.integrations.contentPlatforms.completeNotionStrategyExport, {
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

export const createFigmaCanvasExportJob = mutation({
  args: {
    projectId: v.id("projects"),
    artifactId: v.id("projectAiArtifacts"),
    screenId: v.string(),
    exportKind: v.union(v.literal("wireframe"), v.literal("figjam_flow_map")),
    writePlanJson: v.string(),
    pairingCodeHash: v.string(),
    pairingExpiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);
    await requireProjectAccessForUserId(ctx, {
      userId: user._id,
      projectId: args.projectId,
    });

    const artifact = await ctx.db.get(args.artifactId);
    if (!artifact || artifact.projectId !== args.projectId) {
      throw new Error("Export artifact not found.");
    }
    if (
      args.exportKind === "wireframe" &&
      (artifact.module !== "generate" || artifact.kind !== "wireframesArtifact")
    ) {
      throw new Error("Wireframes artifact not found.");
    }
    if (
      args.exportKind === "figjam_flow_map" &&
      (artifact.module !== "flows" || artifact.kind !== "flowsArtifact")
    ) {
      throw new Error("Flows artifact not found.");
    }

    const connection = await getConnection(ctx, user._id, "figma");
    if (!connection || connection.status !== "active" || !connection.accountId) {
      throw new Error("Connect Figma in Settings before exporting.");
    }

    const timestamp = now();
    const existing = (
      await ctx.db
        .query("figmaExportJobs")
        .withIndex("by_artifact_screen", (q) =>
          q.eq("artifactId", args.artifactId).eq("screenId", args.screenId),
        )
        .collect()
    ).sort((a, b) => b.updatedAt - a.updatedAt)[0];

    if (existing && existing.status !== "completed") {
      await ctx.db.patch(existing._id, {
        figmaAccountId: connection.accountId,
        exportKind: args.exportKind,
        status: "requested",
        writePlanJson: args.writePlanJson,
        pairingCodeHash: args.pairingCodeHash,
        pairingExpiresAt: args.pairingExpiresAt,
        claimedFigmaUserId: undefined,
        claimTokenHash: undefined,
        claimExpiresAt: undefined,
        errorMessage: undefined,
        updatedAt: timestamp,
      });
      return {
        jobId: String(existing._id),
        status: "requested" as const,
      };
    }

    if (existing) {
      return {
        jobId: String(existing._id),
        status: "completed" as const,
      };
    }

    const jobId = await ctx.db.insert("figmaExportJobs", {
      userId: user._id,
      projectId: args.projectId,
      artifactId: args.artifactId,
      screenId: args.screenId,
      exportKind: args.exportKind,
      figmaAccountId: connection.accountId,
      status: "requested",
      writePlanJson: args.writePlanJson,
      pairingCodeHash: args.pairingCodeHash,
      pairingExpiresAt: args.pairingExpiresAt,
      attemptCount: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    return {
      jobId: String(jobId),
      status: "requested" as const,
    };
  },
});

export const claimFigmaExportJob = internalMutation({
  args: {
    pairingCodeHash: v.string(),
    figmaUserId: v.string(),
    documentName: v.string(),
    editorType: v.union(v.literal("figma"), v.literal("figjam")),
    claimTokenHash: v.string(),
    claimExpiresAt: v.number(),
    claimedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db
      .query("figmaExportJobs")
      .withIndex("by_pairing_hash", (q) => q.eq("pairingCodeHash", args.pairingCodeHash))
      .unique();

    if (!job || job.pairingExpiresAt < args.claimedAt) {
      throw new Error("Export pairing code is invalid or expired.");
    }
    if (job.figmaAccountId !== args.figmaUserId) {
      throw new Error("Open Figma with the same account connected to Stage.");
    }
    if (job.status === "completed") {
      throw new Error("This export is already completed.");
    }
    const expectedEditor = job.exportKind === "figjam_flow_map" ? "figjam" : "figma";
    if (args.editorType !== expectedEditor) {
      throw new Error(
        expectedEditor === "figjam"
          ? "Open a FigJam board before running this export."
          : "Open a Figma Design file before running this export.",
      );
    }

    await ctx.db.patch(job._id, {
      status: "claimed",
      claimedFigmaUserId: args.figmaUserId,
      claimTokenHash: args.claimTokenHash,
      claimExpiresAt: args.claimExpiresAt,
      destinationFileName: args.documentName.trim(),
      attemptCount: job.attemptCount + 1,
      errorMessage: undefined,
      updatedAt: args.claimedAt,
    });

    return {
      jobId: String(job._id),
      writePlanJson: job.writePlanJson,
      claimExpiresAt: args.claimExpiresAt,
    };
  },
});

export const heartbeatFigmaExportJob = internalMutation({
  args: {
    claimTokenHash: v.string(),
    claimExpiresAt: v.number(),
    heartbeatAt: v.number(),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db
      .query("figmaExportJobs")
      .withIndex("by_claim_hash", (q) => q.eq("claimTokenHash", args.claimTokenHash))
      .unique();
    if (!job || !job.claimExpiresAt || job.claimExpiresAt < args.heartbeatAt) {
      throw new Error("Export claim is invalid or expired.");
    }
    if (job.status !== "claimed") {
      throw new Error("Export job is not actively claimed.");
    }
    await ctx.db.patch(job._id, {
      claimExpiresAt: args.claimExpiresAt,
      updatedAt: args.heartbeatAt,
    });
    return { jobId: String(job._id), claimExpiresAt: args.claimExpiresAt };
  },
});

export const completeFigmaExportJob = internalMutation({
  args: {
    claimTokenHash: v.string(),
    destinationNodeId: v.string(),
    destinationUrl: v.optional(v.string()),
    completedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db
      .query("figmaExportJobs")
      .withIndex("by_claim_hash", (q) => q.eq("claimTokenHash", args.claimTokenHash))
      .unique();

    if (!job || !job.claimExpiresAt || job.claimExpiresAt < args.completedAt) {
      throw new Error("Export claim is invalid or expired.");
    }

    await ctx.db.patch(job._id, {
      status: "completed",
      destinationNodeId: args.destinationNodeId,
      destinationUrl: args.destinationUrl,
      errorMessage: undefined,
      completedAt: args.completedAt,
      updatedAt: args.completedAt,
    });

    const exportKind = job.exportKind ?? "wireframe";
    if (args.destinationUrl && exportKind === "wireframe") {
      const artifact = await ctx.db.get(job.artifactId);
      if (artifact?.contentJson) {
        try {
          const content = JSON.parse(artifact.contentJson) as {
            generatedScreens?: Array<Record<string, unknown>>;
          };
          const screens = content.generatedScreens ?? [];
          content.generatedScreens = screens.map((screen) =>
            screen.id === job.screenId ? { ...screen, figmaUrl: args.destinationUrl } : screen,
          );
          await ctx.db.patch(job.artifactId, {
            contentJson: JSON.stringify(content),
            updatedAt: args.completedAt,
          });
        } catch {
          // The completed export remains valid even when legacy artifact JSON cannot be patched.
        }
      }
    }

    if (args.destinationUrl && exportKind === "figjam_flow_map") {
      const artifact = await ctx.db.get(job.artifactId);
      if (artifact?.contentJson) {
        try {
          const content = JSON.parse(artifact.contentJson) as Record<string, unknown>;
          content.figjamUrl = args.destinationUrl;
          content.figjamExportedAt = args.completedAt;
          await ctx.db.patch(job.artifactId, {
            contentJson: JSON.stringify(content),
            updatedAt: args.completedAt,
          });
        } catch {
          // The completed export remains valid even when legacy artifact JSON cannot be patched.
        }
      }
    }

    const action =
      exportKind === "figjam_flow_map"
        ? "flows_figjam_export"
        : `wireframe_figma_export:${job.screenId}`;
    const existingDestination = (
      await ctx.db
        .query("artifactDestinations")
        .withIndex("by_artifact", (q) => q.eq("artifactId", job.artifactId))
        .collect()
    ).find((destination) => destination.provider === "figma" && destination.action === action);
    const destinationPatch = {
      status: "completed" as const,
      destinationLabel:
        job.destinationFileName ??
        (exportKind === "figjam_flow_map" ? "FigJam flow map" : "Figma wireframe"),
      destinationUrl: args.destinationUrl,
      requestedVia: "native" as const,
      errorMessage: undefined,
      lastSyncedAt: args.completedAt,
      updatedAt: args.completedAt,
    };
    if (existingDestination) {
      await ctx.db.patch(existingDestination._id, destinationPatch);
    } else {
      await ctx.db.insert("artifactDestinations", {
        userId: job.userId,
        projectId: job.projectId,
        artifactId: job.artifactId,
        provider: "figma",
        action,
        createdAt: args.completedAt,
        ...destinationPatch,
      });
    }

    return { jobId: String(job._id), status: "completed" as const };
  },
});

export const failFigmaExportJob = internalMutation({
  args: {
    claimTokenHash: v.string(),
    errorMessage: v.string(),
    failedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db
      .query("figmaExportJobs")
      .withIndex("by_claim_hash", (q) => q.eq("claimTokenHash", args.claimTokenHash))
      .unique();
    if (!job) {
      return null;
    }

    await ctx.db.patch(job._id, {
      status: "failed",
      errorMessage: args.errorMessage.slice(0, 1000),
      updatedAt: args.failedAt,
    });
    return { jobId: String(job._id), status: "failed" as const };
  },
});

export const getFigmaExportJob = query({
  args: { jobId: v.id("figmaExportJobs") },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);
    const job = await ctx.db.get(args.jobId);
    if (!job || job.userId !== user._id) {
      return null;
    }
    return {
      id: String(job._id),
      status: job.status,
      destinationFileName: job.destinationFileName ?? null,
      destinationNodeId: job.destinationNodeId ?? null,
      destinationUrl: job.destinationUrl ?? null,
      errorMessage: job.errorMessage ?? null,
      exportKind: job.exportKind ?? "wireframe",
      updatedAt: job.updatedAt,
    };
  },
});
