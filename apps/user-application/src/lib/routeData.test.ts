import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { warmRouteData } from "./routeData";

/** A query that only settles a few microtasks from now — no wall-clock delay. */
function afterMicrotasks(work: () => void): Promise<void> {
  return Promise.resolve()
    .then(() => Promise.resolve())
    .then(() => Promise.resolve())
    .then(work);
}

describe("warmRouteData", () => {
  test("a failed query does not take the route down", async () => {
    // The regression: one rejected Convex query threw out of the route loader and
    // replaced the whole app with the "Stage needs a quick refresh" screen.
    await warmRouteData([Promise.reject(new Error("convex socket not ready"))]);
  });

  test("one failure does not discard the queries beside it", async () => {
    let healthySettled = false;

    await warmRouteData([
      Promise.reject(new Error("offline")),
      afterMicrotasks(() => {
        healthySettled = true;
      }),
    ]);

    assert.equal(healthySettled, true);
  });

  test("waits for every query before the route paints", async () => {
    // Without awaiting, the route would paint empty and flash once data lands — the
    // exact flash the loaders exist to prevent.
    let settled = false;

    await warmRouteData([
      afterMicrotasks(() => {
        settled = true;
      }),
    ]);

    assert.equal(settled, true, "route painted before its data settled");
  });
});
