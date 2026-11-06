import { env } from "cloudflare:workers";
import { getMcpAuthContext } from "agents/mcp/server";
import type { Env } from "./env";

export class StageApiError extends Error {}

function errorMessage(body: unknown, status: number) {
  if (typeof body === "object" && body && "error" in body && typeof body.error === "object" && body.error && "message" in body.error) {
    return String(body.error.message);
  }
  return `Stage API error ${status}.`;
}

/** Calls the Stage API (`/api/v1`) as the connected user. A body makes it a POST. */
export async function stageApi(path: string, body?: object): Promise<unknown> {
  const apiKey = getMcpAuthContext()?.props.apiKey;
  if (typeof apiKey !== "string") throw new StageApiError("Not connected to Stage. Connect Stage again from your AI tool.");
  const response = await fetch(new URL(`/api/v1${path}`, (env as unknown as Env).CONVEX_SITE_ORIGIN), {
    method: body ? "POST" : "GET",
    headers: body ? { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" } : { Authorization: `Bearer ${apiKey}` },
    body: body && JSON.stringify(body),
  });
  const result: unknown = await response.json().catch(() => undefined);
  if (response.status === 401) {
    throw new StageApiError("Stage no longer accepts this connection: it was removed, or the plan doesn't include AI tools. Connect Stage again.");
  }
  if (!response.ok) throw new StageApiError(errorMessage(result, response.status));
  return result;
}
