import assert from "node:assert/strict";
import test from "node:test";
import { TESTING_CONVEX_URL, telemetryEnabled } from "./telemetry-policy";

const testing = { explicit: undefined, isPackaged: true, isTestingBuild: true, convexUrl: TESTING_CONVEX_URL };

test("installed Testing builds send telemetry by default", () => {
  assert.equal(telemetryEnabled(testing), true);
  assert.equal(telemetryEnabled({ ...testing, convexUrl: `${TESTING_CONVEX_URL}/` }), true);
});

test("local dev against Testing sends telemetry", () => {
  assert.equal(telemetryEnabled({ ...testing, isPackaged: false, isTestingBuild: false }), true);
});

test("production builds never send telemetry", () => {
  assert.equal(telemetryEnabled({ ...testing, isTestingBuild: false }), false);
  assert.equal(telemetryEnabled({ ...testing, isTestingBuild: false, explicit: "1" }), false);
});

test("other backends and explicit opt-out stay off", () => {
  assert.equal(telemetryEnabled({ ...testing, convexUrl: "https://prod.convex.cloud" }), false);
  assert.equal(telemetryEnabled({ ...testing, convexUrl: undefined }), false);
  assert.equal(telemetryEnabled({ ...testing, explicit: "0" }), false);
});
