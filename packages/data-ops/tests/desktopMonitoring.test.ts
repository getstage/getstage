import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const desktop = vi.hoisted(() => ({ packaged: false, testing: false }));
vi.mock("../../../apps/user-application/node_modules/electron/index.js", () => ({
  app: {
    get isPackaged() { return desktop.packaged; },
    getVersion: () => "0.2.55",
  },
}));
vi.mock("../../../apps/user-application/electron/helpers/build-channel", () => ({
  get IS_TESTING_BUILD() { return desktop.testing; },
}));
import { getSidecarEnv } from "../../../apps/user-application/electron/helpers/sidecar";

beforeEach(() => {
  vi.stubGlobal("process", { ...process, getSystemVersion: () => "26.0" });
  desktop.packaged = false;
  desktop.testing = false;
  for (const key of ["CONVEX_URL", "VITE_CONVEX_URL", "STAGE_TELEMETRY_ENABLED"]) {
    vi.stubEnv(key, undefined);
  }
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("local Testing diagnostics", () => {
  it("enables a normal local dev launch against Testing", () => {
    const env = getSidecarEnv(48221);
    expect(env.STAGE_TELEMETRY_ENABLED).toBe("1");
    expect(env.STAGE_TELEMETRY_CHANNEL).toBe("testing");
    expect(env.CONVEX_URL).toBe("https://reliable-bullfrog-917.convex.cloud");
  });

  it("honors explicit local opt-out", () => {
    vi.stubEnv("STAGE_TELEMETRY_ENABLED", "0");
    expect(getSidecarEnv(48221).STAGE_TELEMETRY_ENABLED).toBe("0");
  });

  it.each(["https://production.convex.cloud", "", "https://other-testing.convex.cloud"])(
    "never enables diagnostics for another backend: %s", (url) => {
      vi.stubEnv("CONVEX_URL", url);
      vi.stubEnv("STAGE_TELEMETRY_ENABLED", "1");
      expect(getSidecarEnv(48221).STAGE_TELEMETRY_ENABLED).toBe("0");
    },
  );

  it("uses the renderer backend when CONVEX_URL is absent", () => {
    vi.stubEnv("VITE_CONVEX_URL", "https://production.convex.cloud");
    expect(getSidecarEnv(48221).STAGE_TELEMETRY_ENABLED).toBe("0");
  });

  it("blocks packaged production even with explicit opt-in and Testing backend", () => {
    desktop.packaged = true;
    vi.stubEnv("CONVEX_URL", "https://reliable-bullfrog-917.convex.cloud");
    vi.stubEnv("STAGE_TELEMETRY_ENABLED", "1");
    expect(getSidecarEnv(48221).STAGE_TELEMETRY_ENABLED).toBe("0");
  });

  it("keeps packaged Testing opt-in only", () => {
    desktop.packaged = true;
    desktop.testing = true;
    vi.stubEnv("CONVEX_URL", "https://reliable-bullfrog-917.convex.cloud");
    expect(getSidecarEnv(48221).STAGE_TELEMETRY_ENABLED).toBe("0");
    vi.stubEnv("STAGE_TELEMETRY_ENABLED", "1");
    expect(getSidecarEnv(48221).STAGE_TELEMETRY_ENABLED).toBe("1");
  });
});
