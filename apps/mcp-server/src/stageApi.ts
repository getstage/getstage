import { env } from "cloudflare:workers";
import { getMcpAuthContext } from "agents/mcp/server";
import type { Env } from "./env";

export class StageApiError extends Error {}

/** Calls the Stage API (`/api/v1`) as the connected user. */
export async function stageApi(path: string): Promise<unknown> {
  const apiKey = getMcpAuthContext()?.props.apiKey;
  if (typeof apiKey !== "string") throw new StageApiError("Not connected to Stage. Connect Stage again from your AI tool.");
  const response = await fetch(new URL(`/api/v1${path}`, (env as unknown as Env).CONVEX_SITE_ORIGIN), {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  const body: unknown = await response.json().catch(() => undefined);
  if (response.status === 401) {
    throw new StageApiError("Stage no longer accepts this connection: it was removed, or the plan doesn't include AI tools. Connect Stage again.");
  }
  if (!response.ok) {
    const message = typeof body === "object" && body && "error" in body && typeof body.error === "object" && body.error && "message" in body.error
      ? String(body.error.message)
      : `Stage API error ${response.status}.`;
    throw new StageApiError(message);
  }
  return body;
}
