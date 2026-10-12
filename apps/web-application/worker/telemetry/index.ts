import type { DurableObjectNamespace } from "@cloudflare/workers-types";
import {
  TELEMETRY_MAX_BYTES, TELEMETRY_MAX_EVENTS, telemetryBatchSchema, telemetryEventSchema,
  type TelemetryEvent,
} from "@stage/data-ops/contracts/telemetry";
import { authOrigin, verifySession } from "./auth";
import { collectorOrigin } from "./state";

export { TelemetryState } from "./state";
export interface TelemetryEnv {
  CONVEX_HTTP_ORIGIN?: string;
  TELEMETRY_CHANNEL?: string;
  TELEMETRY_STATE?: DurableObjectNamespace;
  OTEL_COLLECTOR_URL?: string;
  OTEL_COLLECTOR_TOKEN?: string;
  TELEMETRY_APP_VERSIONS?: string;
}
export function reply(status: number, code?: string, retryAfter?: string) {
  return new Response(code ? JSON.stringify({ code }) : null, {
    status, headers: { "Cache-Control": "no-store", ...(code ? { "Content-Type": "application/json" } : {}),
      ...(retryAfter ? { "Retry-After": retryAfter } : {}) },
  });
}
async function boundedBody(request: Request): Promise<string> {
  const length = request.headers.get("Content-Length");
  if (length && (!/^\d+$/.test(length) || Number(length) > TELEMETRY_MAX_BYTES)) throw new Error("413");
  if (!request.body) throw new Error("400");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  let timedOut = false;
  const timeout = setTimeout(() => { timedOut = true; void reader.cancel().catch(() => undefined); }, 5000);
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (timedOut) throw new Error("408");
      if (done) break;
      bytes += value.byteLength;
      if (bytes > TELEMETRY_MAX_BYTES) throw new Error("413");
      chunks.push(value);
    }
    const body = new Uint8Array(bytes);
    let offset = 0;
    for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
    return new TextDecoder("utf-8", { fatal: true }).decode(body);
  } finally {
    clearTimeout(timeout);
    void reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}

export async function handleTelemetry(request: Request, env: TelemetryEnv): Promise<Response> {
  if (request.method !== "POST") return new Response(null, { status: 405, headers: { Allow: "POST", "Cache-Control": "no-store" } });
  const issuer = authOrigin(env.CONVEX_HTTP_ORIGIN);
  // Production collection is deliberately disabled until the remaining release gates pass.
  if (env.TELEMETRY_CHANNEL !== "testing" || !issuer || !env.TELEMETRY_STATE
    || !collectorOrigin(env.OTEL_COLLECTOR_URL) || (env.OTEL_COLLECTOR_TOKEN?.length ?? 0) < 32) {
    return reply(503, "telemetry_not_configured");
  }
  const token = /^Bearer ([A-Za-z0-9_.-]{1,8192})$/.exec(request.headers.get("Authorization") ?? "")?.[1];
  if (!token) return reply(401, "unauthorized");
  let userId: string;
  try { userId = await verifySession(token, issuer); }
  catch { return reply(401, "unauthorized"); }
  if (request.headers.get("Content-Type")?.split(";")[0]?.trim().toLowerCase() !== "application/json"
    || ![null, "identity"].includes(request.headers.get("Content-Encoding"))) return reply(415, "json_required");

  let raw: unknown;
  try { raw = JSON.parse(await boundedBody(request)); }
  catch (error) {
    const status = error instanceof Error && ["413", "408"].includes(error.message) ? Number(error.message) : 400;
    return reply(status, status === 413 ? "batch_too_large" : status === 408 ? "request_timeout" : "invalid_json");
  }
  const batch = telemetryBatchSchema.safeParse(raw);
  if (!batch.success) {
    const oversized = typeof raw === "object" && raw !== null && "events" in raw && Array.isArray(raw.events) && raw.events.length > TELEMETRY_MAX_EVENTS;
    return reply(oversized ? 413 : 400, oversized ? "batch_too_large" : "invalid_batch");
  }
  const events: TelemetryEvent[] = [];
  const dropped = { invalid: 0, channel_mismatch: 0, stale: 0 };
  const now = Date.now();
  for (const input of batch.data.events) {
    const parsed = telemetryEventSchema.safeParse(input);
    if (!parsed.success) dropped.invalid++;
    else if (parsed.data.channel !== env.TELEMETRY_CHANNEL) dropped.channel_mismatch++;
    else if (parsed.data.ts < now - 3_600_000 || parsed.data.ts > now + 300_000) dropped.stale++;
    else events.push(parsed.data);
  }
  try {
    const state = env.TELEMETRY_STATE.get(env.TELEMETRY_STATE.idFromName("testing"));
    const response = await state.fetch("https://telemetry.internal/ingest", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events, userId, receivedCount: batch.data.events.length, dropped }),
    });
    return reply(response.status, response.status === 204 ? undefined
      : response.status === 429 ? "rate_limited" : response.status === 400 ? "no_valid_events" : "telemetry_unavailable",
      response.headers.get("Retry-After") ?? undefined);
  } catch { return reply(503, "telemetry_unavailable"); }
}

// Standalone testing entrypoint avoids replacing the shared website's assets.
export default {
  async fetch(request: Request, env: TelemetryEnv): Promise<Response> {
    return new URL(request.url).pathname === "/api/telemetry" ? handleTelemetry(request, env) : reply(404, "not_found");
  },
};
