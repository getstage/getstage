import assert from "node:assert/strict";
import { test } from "node:test";
import worker from "../worker/index.ts";

test("hosted assets fail closed and require the approved Grafana testing admin", async () => {
  const original = globalThis.fetch;
  let assetReads = 0;
  let limitAllowed = true;
  let user: unknown = { login: "werner", isGrafanaAdmin: true };
  let authStatus = 200;
  const env = {
    ASSETS: { async fetch() { assetReads++; return new Response("private audit", { headers: { "Content-Type": "text/html" } }); } },
    GRAFANA_AUTH_ORIGIN: "https://grafana-testing-038e.up.railway.app",
    MONITORING_ALLOWED_LOGIN: "werner",
    AUTH_RATE_LIMITER: { async limit() { return { success: limitAllowed }; } },
  };
  let sequence = 0;
  const request = (pathname = "/", username = "werner") => new Request(`https://stage-monitoring-testing.example.com${pathname}`, {
    headers: { Authorization: `Basic ${Buffer.from(`${username}:local-only-testing-password-${sequence++}`).toString("base64")}` },
  });
  globalThis.fetch = async (input, init) => {
    assert.equal(String(input), `${env.GRAFANA_AUTH_ORIGIN}/api/user`);
    assert.equal(init?.redirect, "manual");
    return Response.json(user, { status: authStatus });
  };
  try {
    for (const pathname of ["/", "/assets/private.js", "/fonts/inter.woff2", "/logos/stage.svg"]) {
      const response = await worker.fetch(new Request(`https://stage-monitoring-testing.example.com${pathname}`), env);
      assert.equal(response.status, 401);
      assert.match(response.headers.get("WWW-Authenticate") ?? "", /Stage Monitoring Testing/);
    }
    assert.equal(assetReads, 0);
    assert.equal((await worker.fetch(request(), { ...env, GRAFANA_AUTH_ORIGIN: "http://grafana-testing.example.com" })).status, 503);
    assert.equal((await worker.fetch(request(), { ...env, AUTH_RATE_LIMITER: undefined })).status, 503);
    assert.equal((await worker.fetch(request("/", "adrien"), env)).status, 401);
    authStatus = 401;
    assert.equal((await worker.fetch(request(), env)).status, 401);
    authStatus = 200; user = { login: "werner", isGrafanaAdmin: false };
    assert.equal((await worker.fetch(request(), env)).status, 401);
    user = { login: "other", isGrafanaAdmin: true };
    assert.equal((await worker.fetch(request(), env)).status, 401);
    user = { login: "werner", isGrafanaAdmin: true }; limitAllowed = false;
    assert.equal((await worker.fetch(request(), env)).status, 429);
    assert.equal(assetReads, 0);
    limitAllowed = true;
    const accepted = request();
    const response = await worker.fetch(accepted, env);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("Cache-Control"), "no-store");
    assert.equal(response.headers.get("X-Robots-Tag"), "noindex, nofollow");
    assert.match(response.headers.get("Content-Security-Policy") ?? "", /frame-ancestors 'none'/);
    assert.equal(assetReads, 1);
    globalThis.fetch = async () => { throw new Error("Must use the short-lived verified grant."); };
    assert.equal((await worker.fetch(accepted, env)).status, 200);
    assert.equal(assetReads, 2);
  } finally { globalThis.fetch = original; }
});
