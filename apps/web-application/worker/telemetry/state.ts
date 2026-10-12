import type { DurableObjectState } from "@cloudflare/workers-types";
import { z } from "zod";
import { TELEMETRY_EVENTS_PER_HOUR, TELEMETRY_MAX_EVENTS, telemetryEventSchema } from "@stage/data-ops/contracts/telemetry";
import { accumulate, logPayload, metricKey, metricPayload, metricStateSchema, observations, type MetricState, type Observation } from "./otlp";
import type { TelemetryEnv } from "./index";

const intakeSchema = z.object({
  userId: z.string().regex(/^[a-z0-9]{16,64}$/),
  receivedCount: z.number().int().min(1).max(TELEMETRY_MAX_EVENTS),
  events: z.array(telemetryEventSchema).max(TELEMETRY_MAX_EVENTS),
  dropped: z.object({ invalid: z.number().int().nonnegative(), channel_mismatch: z.number().int().nonnegative(), stale: z.number().int().nonnegative() }),
}).refine(data => data.events.length + Object.values(data.dropped).reduce((sum, count) => sum + count, 0) === data.receivedCount);

export function collectorOrigin(value: string | undefined): string | undefined {
  try {
    const url = new URL(value ?? "");
    if (url.protocol !== "https:" || !/(?:^|[-.])testing(?:[-.]|$)/.test(url.hostname)
      || url.username || url.password || url.search || url.hash || url.pathname !== "/") return;
    return url.origin;
  } catch { return; }
}

async function postSignal(origin: string, token: string, signal: "metrics" | "logs", body: unknown) {
  const response = await fetch(`${origin}/v1/${signal}`, {
    method: "POST", redirect: "manual", signal: AbortSignal.timeout(5000),
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(body),
  });
  if (response.status !== 200) { await response.body?.cancel(); throw new Error("Collector rejected signal."); }
  const result: unknown = await response.json();
  if (!result || typeof result !== "object") throw new Error("Invalid collector response.");
  if ("partialSuccess" in result && result.partialSuccess && typeof result.partialSuccess === "object") {
    const partial = result.partialSuccess;
    if (("rejectedDataPoints" in partial && Number(partial.rejectedDataPoints) > 0)
      || ("rejectedLogRecords" in partial && Number(partial.rejectedLogRecords) > 0)
      || ("errorMessage" in partial && partial.errorMessage)) throw new Error("Collector partially rejected signal.");
  }
}

// One SQLite-backed object per channel owns cumulative metrics and durable limits.
// No user/session/run ids are persisted in metric series or resource attributes.
export class TelemetryState {
  private publishing: Promise<void> = Promise.resolve();
  private queuedEvents = 0;
  private queuedBatches = 0;
  constructor(private readonly ctx: DurableObjectState, private readonly env: TelemetryEnv) {
    ctx.storage.sql.exec("CREATE TABLE IF NOT EXISTS rate_limits (user_hash TEXT PRIMARY KEY, count INTEGER NOT NULL, reset_ms INTEGER NOT NULL)");
    ctx.storage.sql.exec("CREATE TABLE IF NOT EXISTS metrics (key TEXT PRIMARY KEY, snapshot TEXT NOT NULL)");
    ctx.storage.sql.exec("CREATE TABLE IF NOT EXISTS clock (id INTEGER PRIMARY KEY CHECK(id=1), nano TEXT NOT NULL)");
  }
  async fetch(request: Request): Promise<Response> {
    if (request.method !== "POST" || new URL(request.url).pathname !== "/ingest") return new Response(null, { status: 404 });
    const origin = collectorOrigin(this.env.OTEL_COLLECTOR_URL);
    const token = this.env.OTEL_COLLECTOR_TOKEN;
    if (this.env.TELEMETRY_CHANNEL !== "testing" || !origin || !token || token.length < 32) return new Response(null, { status: 503 });
    const input = intakeSchema.safeParse(await request.json().catch(() => undefined));
    if (!input.success || input.data.events.some(event => event.channel !== "testing")) return new Response(null, { status: 400 });
    if (this.queuedEvents + input.data.events.length > 500 || this.queuedBatches >= 20) return new Response(null, { status: 503 });
    const { userId, events, receivedCount, dropped } = input.data;
    const userHash = [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(userId)))]
      .map(byte => byte.toString(16).padStart(2, "0")).join("");
    if (this.queuedEvents + events.length > 500 || this.queuedBatches >= 20) return new Response(null, { status: 503 });
    const now = Date.now();
    const allowedVersions = (this.env.TELEMETRY_APP_VERSIONS ?? "").split(",").slice(0, 10)
      .filter(value => /^\d{1,4}\.\d{1,4}\.\d{1,4}(?:-(?:alpha|beta|rc)\.\d{1,4})?$/.test(value));
    const updates: Observation[] = events.flatMap(event => observations(event, allowedVersions.includes(event.appVersion) ? event.appVersion : "other"));
    for (const [result, value] of Object.entries({ accepted: events.length, ...dropped })) {
      if (value > 0) updates.push({ name: "stage_telemetry_ingestion_events_total", labels: { channel: "testing", result }, value });
    }
    const states = new Map<string, MetricState>();
    const sql = this.ctx.storage.sql;
    let retryAfter: string | undefined;
    try {
      this.ctx.storage.transactionSync(() => {
        sql.exec("DELETE FROM rate_limits WHERE reset_ms <= ?", now);
        const rate = sql.exec<{ count: number; reset_ms: number }>("SELECT count, reset_ms FROM rate_limits WHERE user_hash = ?", userHash).toArray()[0];
        if ((rate?.count ?? 0) + receivedCount > TELEMETRY_EVENTS_PER_HOUR) {
          retryAfter = String(Math.max(1, Math.ceil(((rate?.reset_ms ?? now + 3_600_000) - now) / 1000)));
          return;
        }
        const previousNano = sql.exec<{ nano: string }>("SELECT nano FROM clock WHERE id=1").toArray()[0]?.nano ?? "0";
        const nano = BigInt(now) * 1_000_000n > BigInt(previousNano) ? BigInt(now) * 1_000_000n : BigInt(previousNano) + 1n;
        let newSeries = 0;
        for (const update of updates) {
          const key = metricKey(update);
          let previous = states.get(key);
          if (!previous) {
            const row = sql.exec<{ snapshot: string }>("SELECT snapshot FROM metrics WHERE key = ?", key).toArray()[0];
            if (row) previous = metricStateSchema.parse(JSON.parse(row.snapshot));
            else newSeries++;
          }
          states.set(key, accumulate(previous, update, String(nano)));
        }
        const seriesCount = sql.exec<{ count: number }>("SELECT COUNT(*) AS count FROM metrics").toArray()[0]?.count ?? 0;
        if (seriesCount + newSeries > 20_000) throw new Error("Metric capacity reached.");
        for (const [key, state] of states) sql.exec("INSERT OR REPLACE INTO metrics (key, snapshot) VALUES (?, ?)", key, JSON.stringify(state));
        sql.exec("INSERT OR REPLACE INTO clock (id, nano) VALUES (1, ?)", String(nano));
        sql.exec("INSERT OR REPLACE INTO rate_limits (user_hash, count, reset_ms) VALUES (?, ?, ?)", userHash,
          (rate?.count ?? 0) + receivedCount, rate?.reset_ms ?? now + 3_600_000);
      });
    } catch { return new Response(null, { status: 503 }); }
    if (retryAfter) return new Response(null, { status: 429, headers: { "Retry-After": retryAfter } });
    const metrics = metricPayload([...states.values()]);
    const logs = logPayload(events, userId, now);
    this.queuedBatches++;
    this.queuedEvents += events.length;
    // Serialize outgoing snapshots so concurrent requests cannot send older counters
    // after newer ones. Persistent state survives Worker/DO and Collector restarts.
    this.publishing = this.publishing.then(async () => {
      if (Date.now() - now > 15_000) { console.warn("stage_telemetry_export_queue_expired"); return; }
      const results = await Promise.allSettled([
        postSignal(origin, token, "metrics", metrics),
        ...(events.length ? [postSignal(origin, token, "logs", logs)] : []),
      ]);
      if (results.some(result => result.status === "rejected")) console.warn("stage_telemetry_export_failed");
    }).catch(() => { console.warn("stage_telemetry_export_failed"); }).finally(() => {
      this.queuedBatches--; this.queuedEvents -= events.length;
    });
    this.ctx.waitUntil(this.publishing);
    return new Response(null, { status: events.length ? 204 : 400 });
  }
}
