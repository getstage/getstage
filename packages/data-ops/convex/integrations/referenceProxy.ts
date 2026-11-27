import { getAuthUserId } from "@convex-dev/auth/server";
import { httpAction } from "../_generated/server";
import { DESIGN_LIBRARY_MCP } from "../helpers/integrations/designLibraryOAuth";
import type { DesignLibrary } from "../models/integrations/contentPlatforms";
import { designLibraryToken } from "../lib/references/designLibraries";
import { libraryFetch } from "../lib/references/libraryFetch";
import { sharedReferoToken } from "../lib/references/sharedRefero";

// Stage for Mac's engine reaches the design libraries through these routes, so no token ever leaves the backend:
// the signed-in user's own account (connected in Integrations); Refero falls back to Stage's shared key during
// the grace period (STA-78). The caller authenticates with their Stage session; only MCP tool traffic is forwarded.

const FORWARDED_METHODS = new Set(["initialize", "notifications/initialized", "tools/list", "tools/call"]);

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

function referenceProxy(source: DesignLibrary) {
  return httpAction(async (ctx, request) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return jsonRpcError(401, "Sign in to Stage first.");
    const token = (await designLibraryToken(ctx, userId, source)) ?? (source === "refero" ? await sharedReferoToken(ctx, userId) : null);
    // 428: the engine then runs Research without UI pattern references.
    if (!token) return jsonRpcError(428, `Connect ${DESIGN_LIBRARY_MCP[source].label} in Stage → Integrations for UI pattern references.`);
    const upstream = { url: DESIGN_LIBRARY_MCP[source].url, token };

    const body = await request.text();
    let method: unknown;
    try {
      method = (JSON.parse(body) as { method?: unknown }).method;
    } catch {
      return jsonRpcError(400, "Expected a JSON-RPC request.");
    }
    if (typeof method !== "string" || !FORWARDED_METHODS.has(method)) return jsonRpcError(400, "This MCP method isn't forwarded.");

    const init = {
      method: "POST",
      headers: {
        Authorization: `Bearer ${upstream.token}`,
        "Content-Type": "application/json",
        Accept: request.headers.get("Accept") ?? "application/json, text/event-stream",
        ...forwardedHeaders(request, ["Mcp-Session-Id", "MCP-Protocol-Version"]),
      },
      body,
    };
    // The libraries go through the Node.js runtime (Convex's default runtime can't reach Mobbin).
    const response = await libraryFetch(ctx, upstream.url, init);
    const headers = new Headers({ "Content-Type": response.headers.get("Content-Type") ?? "application/json" });
    const session = response.headers.get("Mcp-Session-Id");
    if (session) headers.set("Mcp-Session-Id", session);
    return new Response(response.body, { status: response.status, headers });
  });
}

export const referoProxy = referenceProxy("refero");
export const detailsProxy = referenceProxy("details");
export const mobbinProxy = referenceProxy("mobbin");
