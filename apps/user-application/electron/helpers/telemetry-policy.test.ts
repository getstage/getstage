import assert from "node:assert/strict";
import test from "node:test";
import { PRODUCTION_CONVEX_URL, TESTING_CONVEX_URL, telemetryChannel } from "./telemetry-policy";

test("Testing backend reports on the testing channel", () => {
  assert.equal(telemetryChannel({ explicit: undefined, convexUrl: TESTING_CONVEX_URL }), "testing");
  assert.equal(telemetryChannel({ explicit: undefined, convexUrl: `${TESTING_CONVEX_URL}/` }), "testing");
});

test("Production backend reports on the production channel", () => {
  assert.equal(telemetryChannel({ explicit: undefined, convexUrl: PRODUCTION_CONVEX_URL }), "production");
});

test("other backends and explicit opt-out stay off", () => {
  assert.equal(telemetryChannel({ explicit: undefined, convexUrl: "https://other.convex.cloud" }), undefined);
  assert.equal(telemetryChannel({ explicit: undefined, convexUrl: undefined }), undefined);
  assert.equal(telemetryChannel({ explicit: "0", convexUrl: PRODUCTION_CONVEX_URL }), undefined);
});
