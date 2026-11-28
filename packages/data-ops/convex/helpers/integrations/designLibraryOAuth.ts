import type { ActionCtx } from "../../_generated/server";
import { libraryFetch } from "../../lib/references/libraryFetch";
import type { DesignLibrary } from "../../models/integrations/contentPlatforms";
import { getCallbackUrl } from "./oauth";

type Ctx = Pick<ActionCtx, "runAction">;

// Mobbin and Details are MCP servers that each user signs in to with their own account (standard MCP
// authorization): Stage finds their sign-in server, registers itself there (no approval needed), and
// signs the user in with PKCE. Tested against both servers on 2026-11-26.

export const DESIGN_LIBRARY_MCP: Record<DesignLibrary, { label: string; url: string; scope: string }> = {
  mobbin: { label: "Mobbin", url: "https://api.mobbin.com/mcp", scope: "openid" },
  refero: { label: "Refero", url: "https://api.refero.design/mcp", scope: "read files:read" },
  details: { label: "Details", url: "https://api.details.so/mcp", scope: "openid" },
};

type Endpoints = { authorizationEndpoint: string; tokenEndpoint: string; registrationEndpoint: string };

/** The library rejected the login (e.g. an invalid or revoked refresh token): the user has to connect again. */
export class SignInRejectedError extends Error {}

export type DesignLibraryTokens = { accessToken: string; refreshToken?: string; expiresAt?: number };

async function getJson(ctx: Ctx, url: string): Promise<Record<string, unknown> | null> {
  const response = await libraryFetch(ctx, url, { headers: { Accept: "application/json" } });
  return response.ok ? ((await response.json()) as Record<string, unknown>) : null;
}

/** The first metadata document found at the well-known paths (path-specific first, as the MCP spec says). */
async function firstJson(ctx: Ctx, urls: string[]) {
  for (const url of urls) {
    const json = await getJson(ctx, url);
    if (json) return json;
  }
  return null;
}

/** The library's sign-in endpoints, read from its own metadata. */
export async function designLibraryEndpoints(ctx: Ctx, library: DesignLibrary): Promise<Endpoints> {
  const { label, url } = DESIGN_LIBRARY_MCP[library];
  const server = new URL(url);
  const resource = await firstJson(ctx, [
    `${server.origin}/.well-known/oauth-protected-resource${server.pathname}`,
    `${server.origin}/.well-known/oauth-protected-resource`,
  ]);
  const issuer = Array.isArray(resource?.authorization_servers) ? String(resource.authorization_servers[0] ?? "") : "";
  if (!issuer) throw new Error(`${label} didn't say where to sign in.`);
  const issuerUrl = new URL(issuer);
  const path = issuerUrl.pathname.replace(/\/$/, "");
  const metadata = await firstJson(ctx, [
    `${issuerUrl.origin}/.well-known/oauth-authorization-server${path}`,
    `${issuerUrl.origin}/.well-known/openid-configuration${path}`,
    `${issuer.replace(/\/$/, "")}/.well-known/oauth-authorization-server`,
  ]);
  const authorizationEndpoint = metadata?.authorization_endpoint;
  const tokenEndpoint = metadata?.token_endpoint;
  const registrationEndpoint = metadata?.registration_endpoint;
  if (typeof authorizationEndpoint !== "string" || typeof tokenEndpoint !== "string" || typeof registrationEndpoint !== "string") {
    throw new Error(`${label}'s sign-in server is missing an endpoint Stage needs.`);
  }
  return { authorizationEndpoint, tokenEndpoint, registrationEndpoint };
}

/** Registers Stage with the library's sign-in server; returns Stage's client id there. */
export async function registerDesignLibraryClient(ctx: Ctx, library: DesignLibrary, endpoints: Endpoints) {
  const response = await libraryFetch(ctx, endpoints.registrationEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_name: "Stage",
      client_uri: "https://getstage.co",
      redirect_uris: [getCallbackUrl(library)],
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
    }),
  });
  const body = (await response.json().catch(() => null)) as { client_id?: unknown } | null;
  if (!response.ok || typeof body?.client_id !== "string") {
    throw new Error(`${DESIGN_LIBRARY_MCP[library].label} refused to register Stage (status ${response.status}).`);
  }
  return body.client_id;
}

export function designLibraryAuthorizeUrl(library: DesignLibrary, endpoints: Endpoints, args: { clientId: string; state: string; codeChallenge: string }) {
  const url = new URL(endpoints.authorizationEndpoint);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", args.clientId);
  url.searchParams.set("redirect_uri", getCallbackUrl(library));
  url.searchParams.set("scope", DESIGN_LIBRARY_MCP[library].scope);
  url.searchParams.set("state", args.state);
  url.searchParams.set("code_challenge", args.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("resource", DESIGN_LIBRARY_MCP[library].url);
  return url.toString();
}

async function requestTokens(ctx: Ctx, library: DesignLibrary, tokenEndpoint: string, params: Record<string, string>): Promise<DesignLibraryTokens> {
  const response = await libraryFetch(ctx, tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({ ...params, resource: DESIGN_LIBRARY_MCP[library].url }).toString(),
  });
  const body = (await response.json().catch(() => null)) as { access_token?: unknown; refresh_token?: unknown; expires_in?: unknown; error?: unknown } | null;
  if (!response.ok || typeof body?.access_token !== "string") {
    const reason = typeof body?.error === "string" ? body.error : `status ${response.status}`;
    // The server said no to this login (as opposed to being unreachable or failing for a moment).
    if (response.status === 400 || response.status === 401) throw new SignInRejectedError(`${DESIGN_LIBRARY_MCP[library].label} sign-in was rejected (${reason}).`);
    throw new Error(`${DESIGN_LIBRARY_MCP[library].label} sign-in failed (${reason}).`);
  }
  return {
    accessToken: body.access_token,
    refreshToken: typeof body.refresh_token === "string" ? body.refresh_token : undefined,
    expiresAt: typeof body.expires_in === "number" ? Date.now() + body.expires_in * 1000 : undefined,
  };
}

export function exchangeDesignLibraryCode(ctx: Ctx, library: DesignLibrary, endpoints: Endpoints, args: { clientId: string; code: string; codeVerifier: string }) {
  return requestTokens(ctx, library, endpoints.tokenEndpoint, {
    grant_type: "authorization_code",
    code: args.code,
    redirect_uri: getCallbackUrl(library),
    client_id: args.clientId,
    code_verifier: args.codeVerifier,
  });
}

export async function refreshDesignLibraryTokens(ctx: Ctx, library: DesignLibrary, args: { clientId: string; refreshToken: string }) {
  const { tokenEndpoint } = await designLibraryEndpoints(ctx, library);
  const tokens = await requestTokens(ctx, library, tokenEndpoint, { grant_type: "refresh_token", refresh_token: args.refreshToken, client_id: args.clientId });
  // Some servers keep the refresh token unchanged and don't send it again.
  return { ...tokens, refreshToken: tokens.refreshToken ?? args.refreshToken };
}
