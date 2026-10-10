import { describe, expect, test } from "vitest";
import engineFixtures from "./fixtures/telemetry-engine.json";
import {
  cloudTelemetryEventSchema,
  TELEMETRY_MAX_BYTES,
  TELEMETRY_MAX_EVENTS,
  telemetryBatchSchema,
  telemetryEventSchema,
} from "../src/contracts/telemetry";

const base = {
  ts: 1_791_288_000_000,
  appVersion: "0.2.46",
  channel: "testing",
  os: "macOS 26.0",
  sessionId: "44a9023e-8f22-4cee-8be7-fec93ca586be",
};
const runId = "cb572955-559b-4c7f-bf8c-9827da761a09";
const run = {
  ...base, event: "run", runId, module: "research", provider: "claude",
  model: "claude-sonnet-5", outcome: "failed", durationMs: 1250,
  errorCode: "invalid_request", errorKind: "details_unauthorized", failedStep: "details-context",
};
const brief = {
  ...base, event: "brief_files", runId, uploaded: 2, loaded: 1,
  byType: {
    pdf: { uploaded: 2, loaded: 1 }, docx: { uploaded: 0, loaded: 0 },
    doc: { uploaded: 0, loaded: 0 }, txt: { uploaded: 0, loaded: 0 },
    md: { uploaded: 0, loaded: 0 }, image: { uploaded: 0, loaded: 0 },
  },
  failedKinds: ["pdf_unreadable"],
};
const clientFixtures = [
  run,
  { ...base, event: "step", runId, module: "research", step: "brief-files", outcome: "succeeded", durationMs: 500 },
  { ...base, event: "dependency", dependency: "details_mcp", operation: "search_inspirations", outcome: "failed", durationMs: 90, httpStatus: 401, errorKind: "details_unauthorized" },
  brief,
  { ...base, event: "provider_status", provider: "codex", status: "not_authenticated" },
  { ...base, event: "provider_update", provider: "codex", installSource: "npm", outcome: "updated", durationMs: 140_000, versionBefore: "0.1.0", versionAfter: "0.2.0" },
  { ...base, event: "export", target: "figjam", outcome: "succeeded", durationMs: 900 },
  { ...base, event: "sidecar", kind: "crash", durationMs: 10, exitCode: 1, signal: "SIGKILL" },
  { ...base, event: "desktop_update", phase: "download", outcome: "failed", durationMs: 30_000, errorKind: "network_error" },
  { ...base, event: "renderer_error", route: "/projects/$id/research", kind: "error_boundary", errorKind: "unknown" },
  { ...base, event: "auth", phase: "refresh", outcome: "failed", durationMs: 100, errorKind: "session_expired" },
  { ...base, event: "heartbeat" },
];
const cloudBase = { ts: base.ts, channel: "testing" };
const cloudFixtures = [
  { ...cloudBase, event: "worker", route: "/auth/desktop", statusClass: "5xx", durationMs: 600 },
  { ...cloudBase, event: "convex", function: "billing:createCheckoutSession", outcome: "failed", errorKind: "convex_function_error" },
  { ...cloudBase, event: "stripe_webhook", eventType: "invoice.paid", outcome: "succeeded", creditOutcome: "granted" },
  { ...cloudBase, event: "rewards", result: "unavailable" },
];

describe("telemetry contract", () => {
  test.each(engineFixtures)("accepts the Rust-serialized $event/$outcome fixture without stripping fields", (fixture) => {
    expect(telemetryEventSchema.parse(fixture)).toEqual(fixture);
  });
  test.each(clientFixtures)("accepts the $event client event", (fixture) => {
    expect(telemetryEventSchema.parse(fixture)).toEqual(fixture);
  });
  test.each(cloudFixtures)("accepts the server-only $event event", (fixture) => {
    expect(cloudTelemetryEventSchema.parse(fixture)).toEqual(fixture);
    expect(telemetryEventSchema.safeParse({ ...base, ...fixture }).success).toBe(false);
  });
  test.each(clientFixtures)("strips private/unknown fields and spoofed identity from $event", (fixture) => {
    expect(telemetryEventSchema.parse({
      ...fixture, userId: "another-user", source: "convex", prompt: "private prompt",
      output: "private answer", email: "private@example.com", projectName: "private name",
      url: "https://private.example.com", fileName: "secret.pdf", message: "raw error with private text",
      componentStack: "private props", authorization: "secret", futureField: { nested: "private" },
    })).toEqual(fixture);
  });
  test.each(cloudFixtures)("strips sensitive fields from $event cloud records", (fixture) => {
    expect(cloudTelemetryEventSchema.parse({
      ...fixture, userId: "spoofed", message: "private", email: "private@example.com", payload: { secret: true },
    })).toEqual(fixture);
  });
  test("strips nested unknown brief fields", () => {
    expect(telemetryEventSchema.parse({
      ...brief, byType: { ...brief.byType, pdf: { ...brief.byType.pdf, filename: "secret.pdf" }, privateType: { uploaded: 1, loaded: 1 } },
    })).toEqual(brief);
  });
  test.each([
    { module: "custom project name" }, { provider: "unknown" }, { model: "custom private model" },
    { failedStep: "https://example.com" }, { errorKind: "token=secret" },
    { errorCode: "InvalidRequest" }, { channel: "staging" },
    { os: "Werner's Mac" }, { appVersion: "0.2.46-my-client-name" },
    { sessionId: "email@example.com" }, { runId: "private name" },
    { projectId: "project@example.com" }, { durationMs: -1 }, { durationMs: 1.5 },
    { durationMs: Infinity }, { durationMs: 86_400_001 }, { ts: 0 },
    { ts: Number.MAX_SAFE_INTEGER + 1 }, { tokensIn: 100_000_001 },
    { tokensOut: NaN }, { wireframeKind: "custom" }, { projectCategory: "web-apps" },
  ])("rejects invalid/unbounded run metadata: %j", (patch) => {
    expect(telemetryEventSchema.safeParse({ ...run, ...patch }).success).toBe(false);
  });
  test("requires a run id on run, step and brief events", () => {
    for (const fixture of [clientFixtures[0], clientFixtures[1], brief]) {
      expect(telemetryEventSchema.safeParse({ ...fixture, runId: undefined }).success).toBe(false);
    }
  });
  test("accepts opaque project ids in event bodies", () => {
    const event = telemetryEventSchema.parse({ ...run, projectId: "jd7avhgbh36gpt3rj6k54d6dj17s9zm0" });
    expect(event.projectId).toBe("jd7avhgbh36gpt3rj6k54d6dj17s9zm0");
  });
  test("dependency operations are finite and match the dependency", () => {
    const dependency = clientFixtures[2];
    for (const patch of [{ operation: "secret-function" }, { dependency: "provider_cli" }, { httpStatus: 600 }]) {
      expect(telemetryEventSchema.safeParse({ ...dependency, ...patch }).success).toBe(false);
    }
  });
  test("routes are templates, never raw paths or URLs", () => {
    const renderer = clientFixtures[9];
    for (const route of ["/projects/private-id/research", "https://private.example.com", "/auth?token=secret"]) {
      expect(telemetryEventSchema.safeParse({ ...renderer, route }).success).toBe(false);
    }
  });
  test("brief counts reconcile and loaded never exceeds uploaded", () => {
    for (const patch of [
      { uploaded: 3 }, { loaded: 2 },
      { byType: { ...brief.byType, pdf: { uploaded: 1, loaded: 2 } } },
      { failedKinds: Array(13).fill("pdf_unreadable") },
    ]) {
      expect(telemetryEventSchema.safeParse({ ...brief, ...patch }).success).toBe(false);
    }
  });
  test("batches are bounded and allow individual invalid records to be filtered", () => {
    expect(TELEMETRY_MAX_BYTES).toBe(262_144);
    expect(telemetryBatchSchema.parse({ events: [run, { event: "unknown" }], secret: "drop" }))
      .toEqual({ events: [run, { event: "unknown" }] });
    expect(telemetryBatchSchema.safeParse({ events: Array(TELEMETRY_MAX_EVENTS).fill(run) }).success).toBe(true);
    for (const events of [[], Array(101).fill(run), "not an array", undefined]) {
      expect(telemetryBatchSchema.safeParse({ events }).success).toBe(false);
    }
  });
  test("terminal outcomes preserve cancellation separately from failure", () => {
    expect(telemetryEventSchema.safeParse({ ...run, outcome: "cancelled", errorCode: "run_cancelled", errorKind: "cancelled_by_user" }).success).toBe(true);
  });
});
