import { z } from "zod";
import type { TelemetryEvent } from "@stage/data-ops/contracts/telemetry";

export type Labels = Record<string, string>;
export type Observation = { name: string; labels: Labels; value: number; bounds?: readonly number[] };
export const metricStateSchema = z.object({
  name: z.string(), labels: z.record(z.string(), z.string()), startNano: z.string(), timeNano: z.string(),
  count: z.number().nonnegative(), sum: z.number().nonnegative(),
  bounds: z.array(z.number()), buckets: z.array(z.number().int().nonnegative()),
});
export type MetricState = z.infer<typeof metricStateSchema>;
const runBounds = [5, 15, 30, 60, 120, 300, 600, 1200];
const stepBounds = [0.1, 0.5, 1, 5, 15, 30, 60, 120, 300];
const dependencyBounds = [0.05, 0.1, 0.5, 1, 5, 15, 30, 60, 120, 300];
const updateBounds = [30, 60, 120, 300, 600, 1200, 1800];
const attributes = (labels: Labels) => Object.entries(labels).map(([key, value]) => ({ key, value: { stringValue: value } }));

export function observations(event: TelemetryEvent, versionLabel = "other"): Observation[] {
  const results: Observation[] = [];
  const counter = (name: string, labels: Labels, value = 1) => {
    if (value > 0) results.push({ name, labels: { ...labels, channel: event.channel }, value });
  };
  const histogram = (name: string, labels: Labels, duration: number, bounds: readonly number[]) => {
    results.push({ name, labels: { ...labels, channel: event.channel }, value: duration / 1000, bounds });
  };
  const error = "errorKind" in event && event.errorKind ? event.errorKind
    : "outcome" in event && event.outcome === "failed" ? "unknown" : "none";
  switch (event.event) {
    case "run": {
      const labels = { module: event.module, provider: event.provider, outcome: event.outcome };
      counter("stage_runs_total", { ...labels, model: event.model ?? "other", error_kind: error, app_version: versionLabel, project_category: event.projectCategory ?? "other" });
      histogram("stage_run_duration_seconds", labels, event.durationMs, runBounds);
      for (const [direction, value] of [["in", event.tokensIn], ["out", event.tokensOut]] as const) {
        counter("stage_tokens_total", { provider: event.provider, model: event.model ?? "other", module: event.module, direction }, value ?? 0);
      }
      break;
    }
    case "step":
      counter("stage_run_steps_total", { module: event.module, step: event.step, outcome: event.outcome, error_kind: error });
      histogram("stage_run_step_duration_seconds", { module: event.module, step: event.step }, event.durationMs, stepBounds);
      break;
    case "dependency":
      counter("stage_dependency_calls_total", { dependency: event.dependency, operation: event.operation, outcome: event.outcome, error_kind: error });
      histogram("stage_dependency_duration_seconds", { dependency: event.dependency }, event.durationMs, dependencyBounds);
      break;
    case "brief_files":
      for (const [type, counts] of Object.entries(event.byType)) {
        counter("stage_brief_files_total", { type, result: "uploaded" }, counts.uploaded);
        counter("stage_brief_files_total", { type, result: "loaded" }, counts.loaded);
        counter("stage_brief_files_total", { type, result: "failed" }, counts.uploaded - counts.loaded);
      }
      break;
    case "provider_status":
      counter("stage_provider_status_total", { provider: event.provider, status: event.status });
      break;
    case "provider_update":
      counter("stage_provider_updates_total", { provider: event.provider, install_source: event.installSource, outcome: event.outcome, error_kind: error });
      histogram("stage_provider_update_duration_seconds", { provider: event.provider, install_source: event.installSource }, event.durationMs, updateBounds);
      break;
    case "export":
      counter("stage_exports_total", { target: event.target, outcome: event.outcome, error_kind: error });
      break;
    case "sidecar":
      counter("stage_sidecar_events_total", { kind: event.kind, app_version: versionLabel });
      if (event.kind === "start") histogram("stage_sidecar_start_duration_seconds", { app_version: versionLabel }, event.durationMs, stepBounds);
      break;
    case "desktop_update":
      counter("stage_desktop_update_total", { phase: event.phase, outcome: event.outcome, app_version: versionLabel });
      break;
    case "renderer_error":
      counter("stage_renderer_errors_total", { app_version: versionLabel, route: event.route });
      break;
    case "auth":
      counter("stage_auth_total", { phase: event.phase, outcome: event.outcome, error_kind: error });
      break;
    case "heartbeat": break; // Active-session expiry/aggregation is a separate phase-5 gate.
  }
  return results;
}

export function metricKey(observation: Observation): string {
  return JSON.stringify([observation.name, Object.entries(observation.labels).sort(([a], [b]) => a.localeCompare(b))]);
}

export function accumulate(previous: MetricState | undefined, observation: Observation, timeNano: string): MetricState {
  const bounds = [...(observation.bounds ?? [])];
  const next: MetricState = previous ?? {
    name: observation.name, labels: observation.labels, startNano: String(BigInt(timeNano) - 1_000_000n),
    timeNano, count: 0, sum: 0, bounds, buckets: bounds.length ? Array<number>(bounds.length + 1).fill(0) : [],
  };
  next.timeNano = timeNano;
  if (observation.bounds) {
    next.count += 1;
    next.sum += observation.value;
    const index = bounds.findIndex(bound => observation.value <= bound);
    const bucket = index === -1 ? bounds.length : index;
    next.buckets[bucket] = (next.buckets[bucket] ?? 0) + 1;
  } else next.sum += observation.value;
  return next;
}

export function metricPayload(states: MetricState[]) {
  const metrics = new Map<string, { name: string; unit: string; sum?: { aggregationTemporality: number; isMonotonic: boolean; dataPoints: unknown[] }; histogram?: { aggregationTemporality: number; dataPoints: unknown[] } }>();
  for (const state of states) {
    let metric = metrics.get(state.name);
    if (!metric) {
      metric = state.bounds.length
        ? { name: state.name, unit: "s", histogram: { aggregationTemporality: 2, dataPoints: [] } }
        : { name: state.name, unit: "1", sum: { aggregationTemporality: 2, isMonotonic: true, dataPoints: [] } };
      metrics.set(state.name, metric);
    }
    const common = { attributes: attributes(state.labels), startTimeUnixNano: state.startNano, timeUnixNano: state.timeNano };
    if (metric.histogram) metric.histogram.dataPoints.push({ ...common, count: String(state.count), sum: state.sum, explicitBounds: state.bounds, bucketCounts: state.buckets.map(String) });
    else metric.sum?.dataPoints.push({ ...common, asDouble: state.sum });
  }
  return { resourceMetrics: [{ resource: { attributes: [] }, scopeMetrics: [{ scope: { name: "stage-telemetry" }, metrics: [...metrics.values()] }] }] };
}

export function logPayload(events: TelemetryEvent[], userId: string, now: number) {
  type LogRecord = { timeUnixNano: string; observedTimeUnixNano: string; severityNumber: number; severityText: string; body: { stringValue: string } };
  const groups = new Map<string, { labels: Labels; records: LogRecord[] }>();
  for (const event of events) {
    const source = ["sidecar", "desktop_update", "renderer_error", "auth", "heartbeat"].includes(event.event) ? "desktop" : "engine";
    const failed = ("outcome" in event && event.outcome === "failed") || event.event === "renderer_error"
      || (event.event === "sidecar" && ["crash", "port_conflict"].includes(event.kind));
    const labels = { source, channel: event.channel, event: event.event, level: failed ? "error" : "info" };
    const key = JSON.stringify(labels);
    let group = groups.get(key);
    if (!group) { group = { labels, records: [] }; groups.set(key, group); }
    group.records.push({
      timeUnixNano: String(BigInt(event.ts) * 1_000_000n), observedTimeUnixNano: String(BigInt(now) * 1_000_000n),
      severityNumber: failed ? 17 : 9, severityText: failed ? "ERROR" : "INFO",
      body: { stringValue: JSON.stringify({ ...event, userId, source }) },
    });
  }
  return { resourceLogs: [...groups.values()].map(group => ({
    resource: { attributes: attributes(group.labels) },
    scopeLogs: [{ scope: { name: "stage-telemetry" }, logRecords: group.records }],
  })) };
}
