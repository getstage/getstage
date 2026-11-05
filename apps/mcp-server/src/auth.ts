import { AuthorizationError, CimdFetchError, authorizationErrorRedirect } from "@cloudflare/workers-oauth-provider";
import type { Env, StageProps } from "./env";

// Sign-in: Stage itself is the "upstream provider". /authorize sends the browser to the
// web app's connect page, where the signed-in user sees which tool asks for access and
// approves it. The page returns a one-time code to /callback, which this server redeems
// with its PKCE verifier for the user's MCP key.

type Upstream = { verifier: string };

function base64Url(bytes: ArrayBuffer | Uint8Array) {
  const array = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  return btoa(String.fromCharCode(...array)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function pkcePair() {
  const verifier = base64Url(crypto.getRandomValues(new Uint8Array(32)));
  const challenge = base64Url(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)));
  return { verifier, challenge };
}

function errorPage(message: string, status = 400) {
  const escaped = message.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
  return new Response(`<!doctype html><meta charset="utf-8"><title>Stage</title><p style="font:14px system-ui;margin:48px auto;max-width:420px">${escaped}</p>`, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

async function authorize(request: Request, env: Env) {
  const oauth = env.OAUTH_PROVIDER;
  const authRequest = await oauth.parseAuthRequest(request);
  const details = await oauth.describeConsent(authRequest);
  const { verifier, challenge } = await pkcePair();
  const { state, headers } = await oauth.beginUpstream(authRequest, { data: { verifier } satisfies Upstream });
  const connect = new URL("/connect-ai", env.STAGE_APP_ORIGIN);
  connect.searchParams.set("state", state);
  connect.searchParams.set("challenge", challenge);
  connect.searchParams.set("client", details.clientName);
  if (details.clientDomain) connect.searchParams.set("domain", details.clientDomain);
  connect.searchParams.set("redirect_host", details.redirectHost);
  if (details.redirectIsLoopback) connect.searchParams.set("local", "1");
  headers.set("Location", connect.toString());
  return new Response(null, { status: 302, headers });
}

async function callback(request: Request, env: Env) {
  const oauth = env.OAUTH_PROVIDER;
  const { request: authRequest, data, headers } = await oauth.finishUpstream<Upstream>(request);
  const code = new URL(request.url).searchParams.get("code");
  if (!code) {
    headers.set("Location", authorizationErrorRedirect(authRequest, "access_denied"));
    return new Response(null, { status: 302, headers });
  }
  const exchange = await fetch(new URL("/mcp/connect/token", env.CONVEX_SITE_ORIGIN), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, verifier: data.verifier }),
  });
  if (!exchange.ok) return errorPage("This connection expired. Start connecting Stage again from your AI tool.");
  const { apiKey, userId } = await exchange.json<StageProps>();
  const { redirectTo } = await oauth.completeAuthorization({
    request: authRequest,
    userId,
    metadata: {},
    scope: authRequest.scope,
    props: { userId, apiKey } satisfies StageProps,
  });
  headers.set("Location", redirectTo);
  return new Response(null, { status: 302, headers });
}

export const authHandler = {
  async fetch(request: Request, env: Env) {
    const { pathname } = new URL(request.url);
    try {
      if (request.method === "GET" && pathname === "/authorize") return await authorize(request, env);
      if (request.method === "GET" && pathname === "/callback") return await callback(request, env);
      if (pathname === "/") return Response.redirect(new URL("/connect-ai", env.STAGE_APP_ORIGIN).toString(), 302);
      return new Response("Not found", { status: 404 });
    } catch (error) {
      if (error instanceof AuthorizationError && error.redirectTo) return Response.redirect(error.redirectTo, 302);
      if (error instanceof AuthorizationError) return errorPage(error.description);
      if (error instanceof CimdFetchError) return errorPage("This app could not be verified.");
      throw error;
    }
  },
};
