import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { test } from "node:test";
import { parse } from "yaml";
import { rolloutSchema } from "../src/schema.ts";

const root = new URL("../../../", import.meta.url);
const read = (path: string) => readFileSync(new URL(path, root), "utf8");
const raw = JSON.parse(read("apps/monitoring/src/data/rollout.json"));

test("canonical audit is valid, with evidence and all seven phases", () => {
  const result = rolloutSchema.parse(raw);
  assert.equal(result.phases.length, 7);
  assert.ok(result.audit.length > 0);
  assert.ok(result.audit.every(item => item.verification && item.evidence));
});
test("unknown fields, invalid statuses, missing evidence and duplicates fail closed", () => {
  for (const mutate of [
    (data: typeof raw) => { data.unreviewed = true; },
    (data: typeof raw) => { data.audit[0].status = "done-ish"; },
    (data: typeof raw) => { data.audit[0].evidence = ""; },
    (data: typeof raw) => { data.audit[0].phase = 8; },
    (data: typeof raw) => { data.audit[1].id = data.audit[0].id; },
    (data: typeof raw) => { data.phases[1].id = data.phases[0].id; },
  ]) {
    const data = structuredClone(raw);
    mutate(data);
    assert.equal(rolloutSchema.safeParse(data).success, false);
  }
});
test("internal app has no collector token or remote data connection", () => {
  for (const file of ["App.tsx", "Audit.tsx", "Plan.tsx", "data.ts"]) {
    const source = read(`apps/monitoring/src/${file}`);
    assert.doesNotMatch(source, /OTEL_COLLECTOR_TOKEN|GF_SECURITY_ADMIN_PASSWORD|fetch\s*\(/);
  }
});
test("only authenticated Collector and Grafana are published, on loopback", () => {
  const { services } = parse(read("infra/compose.yaml"));
  assert.equal(Object.keys(services).length, 4);
  assert.equal(services.prometheus.ports, undefined);
  assert.equal(services.loki.ports, undefined);
  for (const service of [services["otel-collector"], services.grafana]) {
    assert.ok(service.ports.every((port: string) => port.startsWith("127.0.0.1:")));
  }
  assert.equal(services.grafana.environment.GF_AUTH_ANONYMOUS_ENABLED, "false");
  assert.equal(services.grafana.environment.GF_USERS_AUTO_ASSIGN_ORG, "false");
  assert.match(services["otel-collector"].environment.OTEL_COLLECTOR_TOKEN, /:\?/);
  assert.match(services.grafana.environment.GF_SECURITY_ADMIN_PASSWORD, /:\?/);
  assert.ok(services.prometheus.command.includes("--storage.tsdb.retention.time=90d"));
});
test("Collector auth, logs index allow-list and retention remain enforced", () => {
  const collector = parse(read("infra/otel/collector.yaml"));
  assert.equal(collector.receivers.otlp.protocols.http.auth.authenticator, "bearertokenauth");
  assert.ok(collector.service.extensions.includes("bearertokenauth"));
  assert.ok(collector.service.pipelines.metrics.processors.includes("deltatocumulative"));
  assert.equal(collector.exporters.prometheusremotewrite.resource_to_telemetry_conversion.enabled, false);
  const loki = parse(read("infra/loki/config.yaml"));
  assert.equal(loki.limits_config.retention_period, "720h");
  assert.equal(loki.compactor.retention_enabled, true);
  assert.equal(loki.limits_config.otlp_config.resource_attributes.ignore_defaults, true);
  assert.deepEqual(loki.limits_config.otlp_config.resource_attributes.attributes_config[0].attributes, ["source", "channel", "event", "level"]);
});
test("Grafana dashboard datasource references and grid positions are valid", () => {
  const datasourceConfig = parse(read("infra/grafana/provisioning/datasources/default.yaml"));
  const uids = new Set(datasourceConfig.datasources.map((source: { uid: string }) => source.uid));
  const dashboardUids = new Set();
  for (const file of readdirSync(new URL("infra/grafana/dashboards/", root)).filter(file => file.endsWith(".json"))) {
    const dashboard = JSON.parse(read(`infra/grafana/dashboards/${file}`));
    assert.ok(!dashboardUids.has(dashboard.uid));
    dashboardUids.add(dashboard.uid);
    assert.equal(dashboard.templating.list[0].current.value, "testing");
    assert.equal(new Set(dashboard.panels.map((panel: { id: number }) => panel.id)).size, dashboard.panels.length);
    for (const panel of dashboard.panels) {
      if (panel.datasource) assert.ok(uids.has(panel.datasource.uid));
      for (const target of panel.targets ?? []) {
        if (target.datasource) assert.ok(uids.has(target.datasource.uid));
      }
      assert.ok(panel.gridPos.x + panel.gridPos.w <= 24);
      assert.ok(panel.gridPos.h > 0);
    }
  }
  const research = JSON.parse(read("infra/grafana/dashboards/research.json"));
  assert.equal(research.time.from, "now-24h");
  assert.ok(research.panels.filter((panel: { targets?: unknown[] }) => panel.targets).every((panel: { datasource: { uid: string } }) => panel.datasource.uid === "stage-loki"));
  assert.match(read("infra/grafana/Dockerfile"), /GF_DASHBOARDS_DEFAULT_HOME_DASHBOARD_PATH=\/etc\/grafana\/dashboards\/research.json/);
});
