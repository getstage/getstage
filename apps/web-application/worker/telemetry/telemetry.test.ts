import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { build } from "esbuild";
import { exportJWK, generateKeyPair, SignJWT } from "jose";
import { Miniflare, Request as MFRequest, Response as MFResponse } from "miniflare";
import { z } from "zod";
import { accumulate, logPayload, metricKey, metricPayload, observations } from "./otlp";
import { authOrigin } from "./auth";
import { collectorOrigin } from "./state";
import { telemetryEventSchema } from "@stage/data-ops/contracts/telemetry";

const issuer = "https://reliable-bullfrog-917.convex.site";
const userId = "j1234567890123456789012345678901";
const sessionId = "44a9023e-8f22-4cee-8be7-fec93ca586be";
const runId = "cb572955-559b-4c7f-bf8c-9827da761a09";
const run = (patch = {}) => ({
  event: "run", ts: Date.now(), appVersion: "0.2.46", channel: "testing", os: "macOS 26.0", sessionId, runId,
  module: "research", provider: "claude", model: "claude-sonnet-5", outcome: "succeeded", durationMs: 1250, ...patch,
});
const attributes = z.array(z.object({ key: z.string(), value: z.object({ stringValue: z.string() }) }));
const point = z.object({
  attributes, startTimeUnixNano: z.string(), timeUnixNano: z.string(),
  asDouble: z.number().optional(), count: z.string().optional(), sum: z.number().optional(),
  explicitBounds: z.array(z.number()).optional(), bucketCounts: z.array(z.string()).optional(),
});
const metricsSchema = z.object({ resourceMetrics: z.array(z.object({ resource: z.object({ attributes }), scopeMetrics: z.array(z.object({
  metrics: z.array(z.object({ name: z.string(), sum: z.object({ aggregationTemporality: z.number(), isMonotonic: z.boolean(), dataPoints: z.array(point) }).optional(),
    histogram: z.object({ aggregationTemporality: z.number(), dataPoints: z.array(point) }).optional() })),
})) })) });
const logsSchema = z.object({ resourceLogs: z.array(z.object({ resource: z.object({ attributes }), scopeLogs: z.array(z.object({
  logRecords: z.array(z.object({ body: z.object({ stringValue: z.string() }) })),
})) })) });

async function until(check: () => boolean) {
  for (let i = 0; i < 300; i++) {
    if (check()) return;
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  assert.ok(check(), "Timed out waiting for asynchronous export.");
}

test("OTLP mapping and privacy", () => {
  const event = telemetryEventSchema.parse(run({ projectId: "j1234567890123456789012345678902", tokensIn: 100, tokensOut: 20 }));
  const samples = observations(event);
  assert.equal(samples.find(sample => sample.name === "stage_runs_total")?.labels.app_version, "other");
  for (const sample of samples) {
    assert.ok(!Object.keys(sample.labels).some(key => /user|project_id|session|run_id/.test(key)));
    assert.ok(!Object.values(sample.labels).some(value => [userId, runId, sessionId, event.projectId].includes(value)));
  }
  const logs = logsSchema.parse(logPayload([event], userId, Date.now()));
  assert.deepEqual(logs.resourceLogs[0]?.resource.attributes.map(attr => attr.key), ["source", "channel", "event", "level"]);
  assert.equal(JSON.parse(logs.resourceLogs[0]?.scopeLogs[0]?.logRecords[0]?.body.stringValue ?? "{}").userId, userId);
  const observation = samples.find(sample => sample.name === "stage_runs_total");
  assert.ok(observation);
  assert.equal(metricKey(observation), metricKey({ ...observation, labels: Object.fromEntries(Object.entries(observation.labels).reverse()) }));
  let state = accumulate(undefined, observation, "1000000000");
  state = accumulate(state, observation, "2000000000");
  const metric = metricsSchema.parse(metricPayload([state])).resourceMetrics[0]?.scopeMetrics[0]?.metrics[0];
  assert.equal(metric?.sum?.aggregationTemporality, 2);
  assert.equal(metric?.sum?.dataPoints[0]?.asDouble, 2);
  const histogram = { name: "duration_seconds", labels: { channel: "testing" }, value: 1, bounds: [1, 2] };
  let duration = accumulate(undefined, histogram, "1000000000");
  duration = accumulate(duration, { ...histogram, value: 1.5 }, "2000000000");
  duration = accumulate(duration, { ...histogram, value: 3 }, "3000000000");
  assert.deepEqual(duration.buckets, [1, 1, 1]);
  assert.equal(duration.count, 3);
  assert.equal(duration.sum, 5.5);
  assert.equal(observations(telemetryEventSchema.parse({ ...run(), event: "heartbeat" })).length, 0);
});

test("endpoint origins fail closed", () => {
  assert.equal(authOrigin(issuer), issuer);
  assert.equal(collectorOrigin("https://otel-testing.example.com"), "https://otel-testing.example.com");
  for (const invalid of ["http://reliable-bullfrog-917.convex.site", "https://private.example.com", `${issuer}/private`, `${issuer}?secret=1`, `https://secret@reliable-bullfrog-917.convex.site`]) assert.equal(authOrigin(invalid), undefined);
  for (const invalid of ["http://otel-testing.example.com", "https://otel.example.com", "https://otel-testing.example.com/private", "https://secret@otel-testing.example.com", "https://otel-testing.example.com?secret=1"]) assert.equal(collectorOrigin(invalid), undefined);
});

test("real workerd intake, JWT verification, SQLite limits and cumulative export", async t => {
  const result = await build({ entryPoints: [path.resolve("worker/telemetry/index.ts")], bundle: true, write: false,
    platform: "browser", format: "esm", target: "es2022", conditions: ["browser"] });
  const script = result.outputFiles[0]?.text;
  assert.ok(script);
  const keys = await generateKeyPair("RS256");
  const jwk = { ...await exportJWK(keys.publicKey), alg: "RS256", use: "sig", kid: "local-test-only" };
  const sign = (patch: { issuer?: string; audience?: string; subject?: string; expiry?: number; issued?: number } = {}) => new SignJWT({})
    .setProtectedHeader({ alg: "RS256", kid: jwk.kid }).setIssuer(patch.issuer ?? issuer).setAudience(patch.audience ?? "convex")
    .setSubject(patch.subject ?? `${userId}|s1234567890123456789012345678901`)
    .setIssuedAt(patch.issued ?? Math.floor(Date.now() / 1000)).setExpirationTime(patch.expiry ?? Math.floor(Date.now() / 1000) + 3600).sign(keys.privateKey);
  const token = await sign();
  const persist = await mkdtemp(path.join(tmpdir(), "stage-telemetry-test-"));
  const captured: { path: string; body: unknown; authorization: string | null }[] = [];
  let collectorStatus = 200;
  let collectorReply: unknown = {};
  let holdExports: (() => Promise<void>) | undefined;
  const options = {
    modules: true, script, compatibilityDate: "2025-02-20", compatibilityFlags: ["nodejs_compat"],
    durableObjects: { TELEMETRY_STATE: { className: "TelemetryState", useSQLite: true } }, durableObjectsPersist: persist,
    bindings: { CONVEX_HTTP_ORIGIN: issuer, TELEMETRY_CHANNEL: "testing", TELEMETRY_APP_VERSIONS: "0.2.46",
      OTEL_COLLECTOR_URL: "https://otel-testing.example.com", OTEL_COLLECTOR_TOKEN: "local-test-secret-never-used-remotely" },
  };
  const create = () => new Miniflare({ ...options, outboundService: async (request: MFRequest) => {
    const url = new URL(request.url);
    if (url.origin === issuer && url.pathname === "/.well-known/jwks.json") return MFResponse.json({ keys: [jwk] });
    assert.equal(url.origin, "https://otel-testing.example.com", "Unexpected outbound request.");
    captured.push({ path: url.pathname, body: await request.json(), authorization: request.headers.get("Authorization") });
    if (holdExports) await holdExports();
    return MFResponse.json(collectorReply, { status: collectorStatus });
  } });
  let mf = create();
  t.after(async () => { await mf.dispose(); await rm(persist, { recursive: true, force: true }); });
  const send = (events: unknown[], auth = token) => mf.dispatchFetch("https://stage-telemetry-testing.example.com/api/telemetry", {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth}` }, body: JSON.stringify({ events }),
  });
  const metricPoints = (name: string) => captured.filter(entry => entry.path === "/v1/metrics")
    .flatMap(entry => metricsSchema.parse(entry.body).resourceMetrics.flatMap(resource => resource.scopeMetrics.flatMap(scope => scope.metrics)))
    .filter(metric => metric.name === name).flatMap(metric => metric.sum?.dataPoints ?? metric.histogram?.dataPoints ?? []);

  await t.test("method/path guards, absent and invalid authentication", async () => {
    assert.equal((await mf.dispatchFetch("https://stage-telemetry-testing.example.com/api/telemetry")).status, 405);
    assert.equal((await mf.dispatchFetch("https://stage-telemetry-testing.example.com/not-found")).status, 404);
    for (const invalid of ["", "not-a-token", token.slice(0, -8) + "tampered"]) assert.equal((await send([run()], invalid)).status, 401);
    for (const invalid of [await sign({ issuer: "https://wrong.convex.site" }), await sign({ audience: "wrong" }),
      await sign({ expiry: Math.floor(Date.now() / 1000) - 60 }), await sign({ subject: "private@example.com" })]) {
      assert.equal((await send([run()], invalid)).status, 401);
    }
    const missingExpiry = await new SignJWT({}).setProtectedHeader({ alg: "RS256", kid: jwk.kid })
      .setIssuer(issuer).setAudience("convex").setSubject(`${userId}|s1234567890123456789012345678901`).setIssuedAt().sign(keys.privateKey);
    const forgedKeys = await generateKeyPair("RS256");
    const forged = await new SignJWT({}).setProtectedHeader({ alg: "RS256", kid: jwk.kid })
      .setIssuer(issuer).setAudience("convex").setSubject(`${userId}|s1234567890123456789012345678901`)
      .setIssuedAt().setExpirationTime("1h").sign(forgedKeys.privateKey);
    const wrongAlgorithm = await new SignJWT({}).setProtectedHeader({ alg: "HS256" }).setIssuer(issuer).setAudience("convex")
      .setSubject(`${userId}|s1234567890123456789012345678901`).setIssuedAt().setExpirationTime("1h").sign(new Uint8Array(32).fill(7));
    for (const invalid of [missingExpiry, forged, wrongAlgorithm]) assert.equal((await send([run()], invalid)).status, 401);
    assert.equal(captured.length, 0);
  });
  await t.test("body/count/type limits reject without export", async () => {
    assert.equal((await send(Array(101).fill(run()))).status, 413);
    assert.equal((await send([])).status, 400);
    const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
    assert.equal((await mf.dispatchFetch("https://stage-telemetry-testing.example.com/api/telemetry", { method: "POST", headers, body: "invalid json" })).status, 400);
    const oversized = JSON.stringify({ events: [run()], private: "🌍".repeat(70_000) });
    assert.equal((await mf.dispatchFetch("https://stage-telemetry-testing.example.com/api/telemetry", { method: "POST", headers, body: oversized })).status, 413);
    assert.equal((await mf.dispatchFetch("https://stage-telemetry-testing.example.com/api/telemetry", { method: "POST", headers: { ...headers, "Content-Type": "text/plain" }, body: "{}" })).status, 415);
    assert.equal(captured.length, 0);
  });
  await t.test("204 before slow export; sanitized log and authenticated collector requests", async () => {
    let release: (() => void) | undefined;
    const held = new Promise<void>(resolve => { release = resolve; });
    holdExports = () => held;
    const response = await Promise.race([send([run({ userId: "spoofed-user", prompt: "private prompt", message: "private error" })]),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Intake blocked on exporter.")), 2000))]);
    assert.equal(response.status, 204);
    assert.equal(response.headers.get("Cache-Control"), "no-store");
    release?.(); holdExports = undefined;
    await until(() => captured.some(entry => entry.path === "/v1/logs"));
    const exported = captured.find(entry => entry.path === "/v1/logs");
    const logs = logsSchema.parse(exported?.body);
    const body = JSON.parse(logs.resourceLogs[0]?.scopeLogs[0]?.logRecords[0]?.body.stringValue ?? "{}");
    assert.equal(body.userId, userId);
    for (const field of ["prompt", "message"]) assert.equal(body[field], undefined);
    assert.ok(captured.every(entry => entry.authorization === "Bearer local-test-secret-never-used-remotely"));
    assert.equal(metricPoints("stage_runs_total").at(-1)?.asDouble, 1);
  });
  await t.test("drops invalid, wrong-channel, stale and cloud events; valid records still export", async () => {
    const before = captured.filter(entry => entry.path === "/v1/logs").length;
    assert.equal((await send([run(), { ...run(), event: "unknown" }, run({ channel: "production" }), run({ ts: Date.now() - 3_600_001 }),
      run({ ts: Date.now() + 301_000 }), { ...run(), event: "worker" }])).status, 204);
    await until(() => captured.filter(entry => entry.path === "/v1/logs").length > before);
    const logs = logsSchema.parse(captured.filter(entry => entry.path === "/v1/logs").at(-1)?.body);
    assert.equal(logs.resourceLogs.flatMap(resource => resource.scopeLogs.flatMap(scope => scope.logRecords)).length, 1);
    assert.equal((await send([{ event: "unknown" }])).status, 400);
  });
  await t.test("concurrent requests aggregate without resets; exact histogram buckets", async () => {
    const before = metricPoints("stage_runs_total").at(-1)?.asDouble ?? 0;
    const responses = await Promise.all([1000, 6000, 16_000, 2_000, 1_500].map(durationMs => send([run({ durationMs })])));
    assert.ok(responses.every(response => response.status === 204));
    await until(() => metricPoints("stage_runs_total").at(-1)?.asDouble === before + 5);
    const points = metricPoints("stage_runs_total");
    for (let i = 1; i < points.length; i++) {
      assert.equal(points[i]?.startTimeUnixNano, points[0]?.startTimeUnixNano);
      assert.ok(BigInt(points[i]?.timeUnixNano ?? "0") > BigInt(points[i - 1]?.timeUnixNano ?? "0"));
      assert.ok((points[i]?.asDouble ?? 0) >= (points[i - 1]?.asDouble ?? 0));
    }
    const hist = metricPoints("stage_run_duration_seconds").at(-1);
    assert.equal(hist?.count, "7");
    assert.equal(hist?.sum, 29);
    assert.deepEqual(hist?.bucketCounts, ["5", "1", "1", "0", "0", "0", "0", "0", "0"]);
  });
  await t.test("export failure/partial rejection never fails intake; next snapshot recovers counts", async () => {
    const before = metricPoints("stage_runs_total").at(-1)?.asDouble ?? 0;
    collectorStatus = 503;
    assert.equal((await send([run()])).status, 204);
    await until(() => metricPoints("stage_runs_total").at(-1)?.asDouble === before + 1);
    collectorStatus = 200; collectorReply = { partialSuccess: { rejectedDataPoints: "1", errorMessage: "test-only" } };
    assert.equal((await send([run()])).status, 204);
    await until(() => metricPoints("stage_runs_total").at(-1)?.asDouble === before + 2);
    collectorReply = {};
    assert.equal((await send([run()])).status, 204);
    await until(() => metricPoints("stage_runs_total").at(-1)?.asDouble === before + 3);
  });
  await t.test("600-event durable limit and user isolation", async () => {
    const limitedToken = await sign({ subject: `jlimited1234567890123456789012345|s1234567890123456789012345678901` });
    const heartbeat = { ...run(), event: "heartbeat" };
    for (let i = 0; i < 6; i++) {
      const before = captured.length;
      assert.equal((await send(Array(100).fill(heartbeat), limitedToken)).status, 204);
      await until(() => captured.length >= before + 2);
    }
    const response = await send([heartbeat], limitedToken);
    assert.equal(response.status, 429);
    assert.ok(Number(response.headers.get("Retry-After")) > 0);
    assert.equal((await send([heartbeat])).status, 204);
    await until(() => captured.filter(entry => entry.path === "/v1/logs").length >= 17);
    await mf.dispose(); mf = create();
    assert.equal((await send([heartbeat], limitedToken)).status, 429);
  });
  await t.test("concurrent batches cannot exceed the hourly budget", async () => {
    const concurrentToken = await sign({ subject: "jconcurrent1234567890123456789012|s1234567890123456789012345678901" });
    for (const size of [100, 100, 100, 100, 100, 95]) {
      const before = captured.length;
      assert.equal((await send(Array(size).fill({ ...run(), event: "heartbeat" }), concurrentToken)).status, 204);
      await until(() => captured.length >= before + 2);
    }
    const replies = await Promise.all(Array.from({ length: 7 }, () => send([{ ...run(), event: "heartbeat" }], concurrentToken)));
    assert.equal(replies.filter(response => response.status === 204).length, 5);
    assert.equal(replies.filter(response => response.status === 429).length, 2);
  });
  await t.test("SQLite restart preserves totals, timestamps and histogram start time", async () => {
    const previous = metricPoints("stage_runs_total").at(-1);
    assert.ok(previous);
    assert.equal((await send([run()])).status, 204);
    await until(() => metricPoints("stage_runs_total").at(-1)?.asDouble === (previous.asDouble ?? 0) + 1);
    assert.equal(metricPoints("stage_runs_total").at(-1)?.startTimeUnixNano, previous.startTimeUnixNano);
  });
});
