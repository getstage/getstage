import { getAuthUserId } from "@convex-dev/auth/server";
import { httpAction } from "../_generated/server";
import { DESIGN_LIBRARY_MCP } from "../helpers/integrations/designLibraryOAuth";
import type { DesignLibrary } from "../models/integrations/contentPlatforms";
import { designLibraryToken } from "../lib/references/designLibraries";

// Stage for Mac's engine reaches the design libraries through these routes, so no token ever leaves the backend.
// Mobbin and Details: the signed-in user's own account (connected in Integrations). Refero: Stage's key, only
// for Mac builds from before Mobbin. The caller authenticates with their Stage session; only MCP tool traffic is forwarded.

const REFERO = { url: "https://api.refero.design/mcp", tokenEnv: "REFERO_MCP_TOKEN", urlEnv: "REFERO_MCP_URL" } as const;

const FORWARDED_METHODS = new Set(["initialize", "notifications/initialized", "tools/list", "tools/call"]);

function env(name: string) {
  return (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.[name]?.trim();
}

function referoUpstream() {
  const token = env(REFERO.tokenEnv);
  return token ? { url: env(REFERO.urlEnv) || REFERO.url, token } : null;
}

function forwardedHeaders(request: Request, names: string[]) {
  return Object.fromEntries(names.flatMap((name) => {
    const value = request.headers.get(name);
    return value ? [[name, value]] : [];
  }));
}

function jsonRpcError(status: number, message: string) {
  return new Response(JSON.stringify({ jsonrpc: "2.0", id: null, error: { code: -32000, message } }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function referenceProxy(source: DesignLibrary | "refero") {
  return httpAction(async (ctx, request) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return jsonRpcError(401, "Sign in to Stage first.");
    let upstream: { url: string; token: string } | null;
    if (source === "refero") {
      upstream = referoUpstream();
      if (!upstream) return jsonRpcError(503, "Refero is not configured for this Stage deployment.");
    } else {
      const token = await designLibraryToken(ctx, userId, source);
      // 428: the engine then runs Research without UI pattern references.
      if (!token) return jsonRpcError(428, `Connect ${DESIGN_LIBRARY_MCP[source].label} in Stage → Integrations for UI pattern references.`);
      upstream = { url: DESIGN_LIBRARY_MCP[source].url, token };
    }

    const body = await request.text();
    let method: unknown;
    try {
      method = (JSON.parse(body) as { method?: unknown }).method;
    } catch {
      return jsonRpcError(400, "Expected a JSON-RPC request.");
    }
    if (typeof method !== "string" || !FORWARDED_METHODS.has(method)) return jsonRpcError(400, "This MCP method isn't forwarded.");

    const response = await fetch(upstream.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${upstream.token}`,
        "Content-Type": "application/json",
        Accept: request.headers.get("Accept") ?? "application/json, text/event-stream",
        ...forwardedHeaders(request, ["Mcp-Session-Id", "MCP-Protocol-Version"]),
      },
      body,
    });
    const headers = new Headers({ "Content-Type": response.headers.get("Content-Type") ?? "application/json" });
    const session = response.headers.get("Mcp-Session-Id");
    if (session) headers.set("Mcp-Session-Id", session);
    return new Response(response.body, { status: response.status, headers });
  });
}

export const referoProxy = referenceProxy("refero");
export const detailsProxy = referenceProxy("details");
export const mobbinProxy = referenceProxy("mobbin");
