import { v } from "convex/values";
import { internal } from "../../../../_generated/api";
import type { Doc } from "../../../../_generated/dataModel";
import type { ActionCtx } from "../../../../_generated/server";
import { requireEnv, requireSiteUrl } from "../../../../helpers/env";
import { now } from "../../../../helpers/time";
import {
  FIGMA_OAUTH_SCOPE_STRING,
  buildOAuthCompleteRedirect,
  buildSettingsRedirect,
  exchangeFigmaCodeForToken,
  exchangeNotionCodeForToken,
  fetchFigmaMe,
  generateOAuthState,
  generatePkcePair,
  getCallbackUrl,
  getProviderLabel,
  isAllowedDesktopOAuthReturnUrl,
} from "../../../../helpers/integrations/oauth";
import {
  DESIGN_LIBRARY_MCP,
  designLibraryAuthorizeUrl,
  designLibraryEndpoints,
  exchangeDesignLibraryCode,
  registerDesignLibraryClient,
} from "../../../../helpers/integrations/designLibraryOAuth";
import { encryptSecret } from "../../../credentialVault";
import type {
  DesignLibrary,
  NativeProvider,
  ViewerContext,
} from "../../../../models/integrations/contentPlatforms";
import { FIGMA_OAUTH_SCOPES, nativeProviderValidator } from "../../../../models/integrations/contentPlatforms";

export const startOAuthConnectArgs = {
  provider: nativeProviderValidator,
  returnUrl: v.optional(v.string()),
};

function isDesignLibrary(provider: NativeProvider): provider is DesignLibrary {
  return provider === "mobbin" || provider === "details";
}

export async function startOAuthConnectHandler(
  ctx: ActionCtx,
  args: { provider: NativeProvider; returnUrl?: string },
) {
  const viewer = (await ctx.runQuery(internal.onboarding.getViewerContext, {})) as ViewerContext;
  const oauthState = generateOAuthState();
  const timestamp = now();
  const oauthReturnUrl =
    args.returnUrl && isAllowedDesktopOAuthReturnUrl(args.returnUrl, args.provider)
      ? args.returnUrl
      : undefined;

  if (isDesignLibrary(args.provider)) {
    requireSiteUrl();
    const endpoints = await designLibraryEndpoints(ctx, args.provider);
    const clientId = await registerDesignLibraryClient(ctx, args.provider, endpoints);
    const pkce = await generatePkcePair();
    await ctx.runMutation(internal.integrations.contentPlatforms.upsertPendingConnectionForOAuth, {
      userId: viewer.userId,
      provider: args.provider,
      oauthState,
      pkceVerifier: pkce.verifier,
      oauthReturnUrl,
      oauthClientId: clientId,
      requestedAt: timestamp,
    });
    return { url: designLibraryAuthorizeUrl(args.provider, endpoints, { clientId, state: oauthState, codeChallenge: pkce.challenge }) };
  }

  if (args.provider === "notion") {
    requireEnv("NOTION_CLIENT_ID");
    requireEnv("NOTION_CLIENT_SECRET");
    requireSiteUrl();

    await ctx.runMutation(internal.integrations.contentPlatforms.upsertPendingConnectionForOAuth, {
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

  await ctx.runMutation(internal.integrations.contentPlatforms.upsertPendingConnectionForOAuth, {
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
}

export async function handleProviderCallback(ctx: ActionCtx, provider: NativeProvider, req: Request) {
  const url = new URL(req.url);
  const error = url.searchParams.get("error");
  const code = url.searchParams.get("code");
  const oauthState = url.searchParams.get("state");

  const connection = oauthState
    ? ((await ctx.runQuery(internal.integrations.contentPlatforms.getConnectionByOAuthState, {
        oauthState,
      })) as Doc<"nativeIntegrationConnections"> | null)
    : null;
  const oauthReturnUrl = connection?.oauthReturnUrl;

  const redirect = (status: "connected" | "error", reason?: string) =>
    Response.redirect(buildOAuthCompleteRedirect(provider, status, reason, oauthReturnUrl), 302);

  if (!oauthState) {
    return Response.redirect(buildSettingsRedirect(provider, "error", "missing_state"), 302);
  }

  if (error) {
    await ctx.runMutation(internal.integrations.contentPlatforms.markConnectionErrorByState, {
      oauthState,
      message: `${getProviderLabel(provider)} authorization was cancelled or rejected.`,
    });
    return redirect("error", "oauth_denied");
  }

  if (!code) {
    await ctx.runMutation(internal.integrations.contentPlatforms.markConnectionErrorByState, {
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

    if (isDesignLibrary(provider)) {
      if (!connection.oauthClientId || !connection.pkceVerifier) throw new Error("Start connecting again from Integrations.");
      const tokens = await exchangeDesignLibraryCode(ctx, provider, await designLibraryEndpoints(ctx, provider), {
        clientId: connection.oauthClientId,
        code,
        codeVerifier: connection.pkceVerifier,
      });
      const encrypted = await encryptSecret(JSON.stringify({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken ?? null }));
      await ctx.runMutation(internal.integrations.contentPlatforms.completeConnectionFromOAuth, {
        connectionId: connection._id,
        displayName: DESIGN_LIBRARY_MCP[provider].label,
        encryptedTokenPayload: encrypted.encryptedValue,
        encryptionIv: encrypted.encryptionIv,
        accessTokenExpiresAt: tokens.expiresAt,
        completedAt,
      });
    } else if (provider === "notion") {
      const tokenResponse = await exchangeNotionCodeForToken(code);
      const encrypted = await encryptSecret(
        JSON.stringify({
          accessToken: tokenResponse.access_token,
          refreshToken: tokenResponse.refresh_token ?? null,
        }),
      );
      const owner =
        tokenResponse.owner && "user" in tokenResponse.owner ? tokenResponse.owner.user : undefined;

      await ctx.runMutation(internal.integrations.contentPlatforms.completeConnectionFromOAuth, {
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
        }),
      );

      await ctx.runMutation(internal.integrations.contentPlatforms.completeConnectionFromOAuth, {
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
      callbackError instanceof Error
        ? callbackError.message
        : `Could not complete ${getProviderLabel(provider)} setup.`;
    await ctx.runMutation(internal.integrations.contentPlatforms.markConnectionErrorByState, {
      oauthState,
      message,
    });
    return redirect("error", "callback_failed");
  }
}

export async function notionConnectCallbackHandler(ctx: ActionCtx, req: Request) {
  return handleProviderCallback(ctx, "notion", req);
}

export async function figmaConnectCallbackHandler(ctx: ActionCtx, req: Request) {
  return handleProviderCallback(ctx, "figma", req);
}

export async function mobbinConnectCallbackHandler(ctx: ActionCtx, req: Request) {
  return handleProviderCallback(ctx, "mobbin", req);
}

export async function detailsConnectCallbackHandler(ctx: ActionCtx, req: Request) {
  return handleProviderCallback(ctx, "details", req);
}
