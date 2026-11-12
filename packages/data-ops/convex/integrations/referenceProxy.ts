import { httpAction } from "../_generated/server";

// Refero and Details are MCP servers paid with Stage's keys. Stage for Mac's engine (and the backend's own
// reference search) reach them through these routes, so the keys never leave the backend.
// The caller authenticates with their own Stage session; only MCP tool traffic is forwarded.

const UPSTREAM = {
  refero: { url: "https://api.refero.design/mcp", tokenEnv: "REFERO_MCP_TOKEN", urlEnv: "REFERO_MCP_URL" },
  details: { url: "https://api.details.so/mcp", tokenEnv: "DETAILS_MCP_TOKEN", urlEnv: "DETAILS_MCP_URL" },
} as const;

export type ReferenceSource = keyof typeof UPSTREAM;

const FORWARDED_METHODS = new Set(["initialize", "notifications/initialized", "tools/list", "tools/call"]);

function env(name: string) {
  return (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.[name]?.trim();
}

export function referenceUpstream(source: ReferenceSource) {
  const { url, tokenEnv, urlEnv } = UPSTREAM[source];
  const token = env(tokenEnv);
  return token ? { url: env(urlEnv) || url, token } : null;
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

function referenceProxy(source: ReferenceSource) {
  return httpAction(async (ctx, request) => {
    if (!(await ctx.auth.getUserIdentity())) return jsonRpcError(401, "Sign in to Stage first.");
    const upstream = referenceUpstream(source);
    if (!upstream) return jsonRpcError(503, `${source === "refero" ? "Refero" : "Details"} is not configured for this Stage deployment.`);

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
