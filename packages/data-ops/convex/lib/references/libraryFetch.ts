import { internal } from "../../_generated/api";
import type { ActionCtx } from "../../_generated/server";

type Init = { method?: string; headers?: Record<string, string>; body?: string };

/** fetch() for the design libraries, run in the Node.js runtime (see integrations/libraryFetch.ts). */
export async function libraryFetch(ctx: Pick<ActionCtx, "runAction">, url: string, init: Init = {}): Promise<Response> {
  const result = await ctx.runAction(internal.integrations.libraryFetch.send, { url, method: init.method ?? "GET", headers: init.headers ?? {}, body: init.body });
  const headers = new Headers();
  if (result.contentType) headers.set("Content-Type", result.contentType);
  if (result.mcpSessionId) headers.set("Mcp-Session-Id", result.mcpSessionId);
  return new Response(result.body, { status: result.status, headers });
}
