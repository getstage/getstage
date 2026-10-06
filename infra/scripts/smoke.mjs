import assert from "node:assert/strict";

function endpoint(value, fallback) {
  const url = new URL(value || fallback);
  const loopback = ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname);
  assert.ok(loopback || /(?:^|[-.])testing(?:[-.]|$)/.test(url.hostname), "Only loopback or explicitly named testing hosts are permitted. Production smoke tests are disabled.");
  assert.ok(loopback || url.protocol === "https:", "Remote endpoints must use HTTPS.");
  assert.ok(["http:", "https:"].includes(url.protocol) && !url.username && !url.password, "Invalid endpoint.");
  return url.origin;
}

async function main() {
  const collector = endpoint(process.env.OTEL_COLLECTOR_URL, "http://127.0.0.1:4318");
  const grafana = endpoint(process.env.GRAFANA_URL, "http://127.0.0.1:3001");
  const token = process.env.OTEL_COLLECTOR_TOKEN;
  const password = process.env.GF_SECURITY_ADMIN_PASSWORD;
  assert.ok(token && token.length >= 32, "Set OTEL_COLLECTOR_TOKEN to a unique random secret of at least 32 characters.");
  assert.ok(password && password.length >= 16, "Set GF_SECURITY_ADMIN_PASSWORD to a unique password of at least 16 characters.");
  const grafanaAuth = `Basic ${Buffer.from(`${process.env.GF_SECURITY_ADMIN_USER || "werner"}:${password}`).toString("base64")}`;
  const request = (url, init = {}) => fetch(url, { ...init, redirect: "error", signal: AbortSignal.timeout(10000) });

  for (const signal of ["metrics", "logs"]) {
    for (const authorization of [undefined, "Bearer invalid-testing-token"]) {
      const response = await request(`${collector}/v1/${signal}`, {
        method: "POST", headers: { "Content-Type": "application/json", ...(authorization ? { Authorization: authorization } : {}) }, body: "{}",
      });
      assert.equal(response.status, 401, `${signal} must reject missing/wrong credentials.`);
      await response.text();
    }
  }
  console.log("PASS: missing and incorrect collector credentials rejected for metrics and logs.");

  const now = BigInt(Date.now()) * 1000000n;
  const attr = (key, value) => ({ key, value: { stringValue: value } });
  const metrics = { resourceMetrics: [{ resource: { attributes: [] }, scopeMetrics: [{ scope: { name: "stage-stack-smoke" }, metrics: [{
    name: "stage_observability_smoke", description: "Synthetic stack check, never application traffic", unit: "1",
    sum: { aggregationTemporality: 2, isMonotonic: true, dataPoints: [{ attributes: [attr("channel", "testing")], startTimeUnixNano: String(now - 1000000000n), timeUnixNano: String(now), asInt: "1" }] },
  }] }] }] };
  const logs = { resourceLogs: [{ resource: { attributes: [attr("source", "worker"), attr("channel", "testing"), attr("event", "run"), attr("level", "info")] }, scopeLogs: [{ scope: { name: "stage-stack-smoke" }, logRecords: [{
    timeUnixNano: String(now), observedTimeUnixNano: String(now), severityNumber: 9, severityText: "INFO",
    body: { stringValue: JSON.stringify({ marker: "sta31-stack-smoke", smoke: true, event: "run", outcome: "succeeded" }) },
  }] }] }] };
  for (const [signal, body] of [["metrics", metrics], ["logs", logs]]) {
    const response = await request(`${collector}/v1/${signal}`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
    assert.equal(response.status, 200, `Authenticated ${signal} ingest failed.`);
    const result = await response.json();
    assert.ok(!result.partialSuccess || Object.keys(result.partialSuccess).length === 0, `Collector reported a partial ${signal} failure.`);
  }
  console.log("PASS: authenticated synthetic metric and log accepted by collector.");

  for (const uid of ["stage-prometheus", "stage-loki"]) {
    const response = await request(`${grafana}/api/datasources/uid/${uid}/health`, { headers: { Authorization: grafanaAuth } });
    assert.equal(response.status, 200, `Grafana data source ${uid} health request failed.`);
    assert.equal((await response.json()).status, "OK", `Grafana data source ${uid} is not healthy.`);
  }
  const queries = [
    ["stage-prometheus", "/api/v1/query?query=stage_observability_smoke_total%7Bchannel%3D%22testing%22%7D"],
    ["stage-loki", `/loki/api/v1/query_range?query=${encodeURIComponent('{source="worker",channel="testing",event="run",level="info"} | json | marker="sta31-stack-smoke"')}&start=${now - 5000000000n}&end=${now + 30000000000n}&limit=20`],
  ];
  for (const [uid, query] of queries) {
    let found = false;
    for (let attempt = 0; attempt < 15 && !found; attempt++) {
      const response = await request(`${grafana}/api/datasources/proxy/uid/${uid}${query}`, { headers: { Authorization: grafanaAuth } });
      assert.equal(response.status, 200, `${uid} query failed.`);
      const result = await response.json();
      found = result.status === "success" && result.data?.result?.length > 0;
      if (!found) await new Promise(resolve => setTimeout(resolve, 2000));
    }
    assert.ok(found, `Synthetic data not found in ${uid}. Ingestion acceptance alone is not an end-to-end pass.`);
    console.log(`PASS: synthetic data visible through Grafana in ${uid}.`);
  }
  const dashboard = await request(`${grafana}/api/dashboards/uid/stage-health`, { headers: { Authorization: grafanaAuth } });
  assert.equal(dashboard.status, 200, "Provisioned Health dashboard missing.");
  console.log("PASS: Health dashboard provisioned. This verifies the stack, not engine instrumentation or alerts.");
}

main().catch(error => {
  console.error(`FAIL: ${error instanceof Error ? error.message : "Stack check failed"}`);
  process.exitCode = 1;
});
