import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { build } from "esbuild";
import { exportJWK, generateKeyPair, SignJWT } from "jose";
import { Miniflare, Response as MFResponse, type Request as MFRequest } from "miniflare";
import { z } from "zod";

function testingOrigin(value: string | undefined): string {
  const url = new URL(value ?? "");
  assert.ok(url.protocol === "https:" && /(?:^|[-.])testing(?:[-.]|$)/.test(url.hostname)
    && !url.username && !url.password && url.pathname === "/" && !url.search && !url.hash,
  "Only explicit HTTPS testing origins are permitted.");
  return url.origin;
}
const request = (url: string, init: RequestInit = {}) => fetch(url, { ...init, redirect: "error", signal: AbortSignal.timeout(10_000) });
const queryResult = z.object({ status: z.literal("success"), data: z.object({ result: z.array(z.unknown()) }) });
const metricResult = z.object({ value: z.tuple([z.number(), z.string()]) });

async function main() {
  const collector = testingOrigin(process.env.OTEL_COLLECTOR_URL);
  const grafana = testingOrigin(process.env.GRAFANA_URL);
  const worker = testingOrigin(process.env.STAGE_TELEMETRY_URL ?? "https://testing.getstage.co");
  const password = process.env.GF_SECURITY_ADMIN_PASSWORD;
  assert.ok(password && password.length >= 16, "Grafana testing credentials are required.");
  const headers = { Authorization: `Basic ${Buffer.from(`${process.env.GF_SECURITY_ADMIN_USER ?? "werner"}:${password}`).toString("base64")}` };
  const query = async (uid: string, suffix: string) => {
    const response = await request(`${grafana}/api/datasources/proxy/uid/${uid}${suffix}`, { headers });
    assert.equal(response.status, 200, "Grafana query failed.");
    return queryResult.parse(await response.json()).data.result;
  };
  const metric = async (expression: string, expected?: number) => {
    for (let attempt = 0; attempt < 15; attempt++) {
      const results = await query("stage-prometheus", `/api/v1/query?query=${encodeURIComponent(expression)}`);
      const first = results[0] ? Number(metricResult.parse(results[0]).value[1]) : undefined;
      if (first !== undefined && (expected === undefined ? first >= 1 : first === expected)) return;
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    throw new Error("Expected metric value was not visible in Prometheus.");
  };
  const marker = randomUUID();
  const started = BigInt(Date.now()) * 1_000_000n;
  const eventBase = { ts: Date.now(), appVersion: "0.2.46", channel: "testing", os: "macOS 26.0", sessionId: randomUUID(), runId: marker };
  const bridge = process.argv.includes("--local-bridge");
  let logQuery: string;
  if (bridge) {
    const collectorToken = process.env.OTEL_COLLECTOR_TOKEN;
    assert.ok(collectorToken && collectorToken.length >= 32, "Collector testing credentials are required for the local bridge.");
    const built = await build({ entryPoints: [path.resolve("worker/telemetry/index.ts")], bundle: true, write: false,
      platform: "browser", format: "esm", target: "es2022", conditions: ["browser"] });
    const script = built.outputFiles[0]?.text;
    assert.ok(script);
    const issuer = "https://reliable-bullfrog-917.convex.site";
    const keys = await generateKeyPair("RS256");
    const jwk = { ...await exportJWK(keys.publicKey), alg: "RS256", use: "sig", kid: "local-smoke-only" };
    const token = await new SignJWT({}).setProtectedHeader({ alg: "RS256", kid: jwk.kid })
      .setIssuer(issuer).setAudience("convex").setSubject("jsmoke123456789012345678901234567|ssmoke123456789012345678901234567")
      .setIssuedAt().setExpirationTime("10m").sign(keys.privateKey);
    const metricsSchema = z.object({ resourceMetrics: z.array(z.object({ scopeMetrics: z.array(z.object({
      metrics: z.array(z.object({ name: z.string() }).passthrough()),
    }).passthrough()) }).passthrough()) }).passthrough();
    const logsSchema = z.object({ resourceLogs: z.array(z.object({
      resource: z.object({ attributes: z.array(z.object({ key: z.string(), value: z.object({ stringValue: z.string() }) })) }),
      scopeLogs: z.array(z.object({ logRecords: z.array(z.object({ body: z.object({ stringValue: z.string() }) }).passthrough()) }).passthrough()),
    }).passthrough()) }).passthrough();
    let forwarded = 0;
    const persist = await mkdtemp(path.join(tmpdir(), "stage-telemetry-smoke-"));
    const create = () => new Miniflare({ modules: true, script, compatibilityDate: "2025-02-20", compatibilityFlags: ["nodejs_compat"],
      durableObjects: { TELEMETRY_STATE: { className: "TelemetryState", useSQLite: true } }, durableObjectsPersist: persist,
      bindings: { CONVEX_HTTP_ORIGIN: issuer, TELEMETRY_CHANNEL: "testing", TELEMETRY_APP_VERSIONS: "0.2.46",
        OTEL_COLLECTOR_URL: collector, OTEL_COLLECTOR_TOKEN: collectorToken },
      outboundService: async (incoming: MFRequest) => {
        const url = new URL(incoming.url);
        if (url.origin === issuer && url.pathname === "/.well-known/jwks.json") return MFResponse.json({ keys: [jwk] });
        assert.equal(url.origin, collector, "Unexpected outbound request.");
        const raw: unknown = await incoming.json();
        let body: unknown;
        // Explicit synthetic names: never populate real Stage module-health panels.
        if (url.pathname === "/v1/metrics") {
          const data = metricsSchema.parse(raw);
          for (const resource of data.resourceMetrics) for (const scope of resource.scopeMetrics) for (const entry of scope.metrics) {
            entry.name = entry.name.replace(/^stage_/, "stage_ingestion_smoke_");
          }
          body = data;
        } else {
          const data = logsSchema.parse(raw);
          for (const resource of data.resourceLogs) {
            resource.resource.attributes = [
              { key: "source", value: { stringValue: "worker" } }, { key: "channel", value: { stringValue: "testing" } },
              { key: "event", value: { stringValue: "ingestion_smoke" } }, { key: "level", value: { stringValue: "info" } },
            ];
            for (const scope of resource.scopeLogs) for (const record of scope.logRecords) {
              const line = z.record(z.string(), z.unknown()).parse(JSON.parse(record.body.stringValue));
              delete line.userId; delete line.projectId;
              record.body.stringValue = JSON.stringify({ ...line, event: "ingestion_smoke", source: "worker", marker, smoke: true });
            }
          }
          body = data;
        }
        const response = await request(incoming.url, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${collectorToken}` }, body: JSON.stringify(body) });
        const result: unknown = await response.json();
        assert.equal(response.status, 200, "Collector ingest failed.");
        const accepted = z.object({ partialSuccess: z.object({
          rejectedDataPoints: z.coerce.number().max(0).optional(), rejectedLogRecords: z.coerce.number().max(0).optional(),
          errorMessage: z.literal("").optional(),
        }).optional() }).safeParse(result);
        assert.ok(accepted.success, "Collector did not fully accept the synthetic signal.");
        forwarded++;
        return MFResponse.json(result);
      },
    });
    let mf = create();
    const send = async (durationMs: number) => {
      const response = await mf.dispatchFetch("https://local-testing.example.com/api/telemetry", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ events: [{ ...eventBase, ts: Date.now(), event: "run", module: "research", provider: "claude", outcome: "succeeded", durationMs }] }),
      });
      assert.equal(response.status, 204, "Local intake failed.");
    };
    const waitForExports = async (expected: number) => {
      for (let i = 0; i < 200 && forwarded < expected; i++) await new Promise(resolve => setTimeout(resolve, 50));
      assert.equal(forwarded, expected, "Synthetic exports did not complete.");
    };
    try {
      await send(1000); await waitForExports(2);
      await Promise.all([send(6000), send(16_000)]); await waitForExports(6);
      await mf.dispose(); mf = create();
      await send(2000); await waitForExports(8);
      await metric('stage_ingestion_smoke_runs_total{channel="testing"}', 4);
      await metric('stage_ingestion_smoke_run_duration_seconds_count{channel="testing"}', 4);
      await metric('stage_ingestion_smoke_run_duration_seconds_sum{channel="testing"}', 25);
      await metric('stage_ingestion_smoke_run_duration_seconds_bucket{channel="testing",le="5"}', 2);
      console.log("PASS: local workerd → real Railway Collector → Prometheus: concurrent and restart-safe count=4, duration sum=25s, ≤5s bucket=2. Names are synthetic only.");
    } finally { await mf.dispose(); await rm(persist, { recursive: true, force: true }); }
    logQuery = `{source="worker",channel="testing",event="ingestion_smoke"} | json | marker="${marker}"`;
  } else {
    const token = process.env.STAGE_TESTING_AUTH_TOKEN;
    assert.ok(token, "Set a short-lived Stage TESTING session token in STAGE_TESTING_AUTH_TOKEN locally. Never paste it in chat.");
    const event = { ...eventBase, event: "heartbeat", userId: "spoofed", message: "must be dropped", prompt: "must be dropped" };
    const send = (events: unknown[], auth?: string) => request(`${worker}/api/telemetry`, { method: "POST",
      headers: { "Content-Type": "application/json", ...(auth ? { Authorization: `Bearer ${auth}` } : {}) }, body: JSON.stringify({ events }) });
    for (const invalid of [undefined, "invalid-testing-token"]) assert.equal((await send([event], invalid)).status, 401);
    assert.equal((await send(Array(101).fill(event), token)).status, 413);
    assert.equal((await send([event], token)).status, 204);
    await metric('stage_telemetry_ingestion_events_total{channel="testing",result="accepted"}');
    console.log("PASS: deployed testing intake returns 204/401/413 and accepted-event metric is visible in Prometheus.");
    logQuery = `{source="desktop",channel="testing",event="heartbeat"} | json | runId="${marker}"`;
  }
  let found = false;
  for (let attempt = 0; attempt < 15 && !found; attempt++) {
    const results = await query("stage-loki", `/loki/api/v1/query_range?query=${encodeURIComponent(logQuery)}&start=${started - 1_000_000_000n}&end=${BigInt(Date.now() + 30_000) * 1_000_000n}&limit=20`);
    if (results.length) {
      const streams = z.array(z.object({ values: z.array(z.tuple([z.string(), z.string()])) })).parse(results);
      for (const stream of streams) for (const [, line] of stream.values) {
        const event = z.record(z.string(), z.unknown()).parse(JSON.parse(line));
        assert.equal(event.prompt, undefined); assert.equal(event.message, undefined); assert.notEqual(event.userId, "spoofed");
      }
      found = true;
    } else await new Promise(resolve => setTimeout(resolve, 2000));
  }
  assert.ok(found, "Matching sanitized log was not visible in Loki.");
  console.log(`PASS: sanitized ${bridge ? "synthetic bridge" : "deployed heartbeat"} log is visible in Loki. ${bridge ? "Deployed positive auth still requires a real Stage Testing session." : "Deployed intake acceptance passed."}`);
}
main().catch(error => {
  const safeMessages = ["Synthetic exports did not complete.", "Expected metric value was not visible in Prometheus.", "Grafana query failed.", "Matching sanitized log was not visible in Loki.", "Local intake failed."];
  console.error(`FAIL: ${error instanceof Error && safeMessages.includes(error.message) ? error.message : "Telemetry smoke did not pass. Check testing endpoints and local credentials; secrets are not printed."}`);
  process.exitCode = 1;
});
