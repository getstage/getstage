export const TESTING_CONVEX_URL = "https://reliable-bullfrog-917.convex.cloud";

type TelemetryPolicyInput = {
  // STAGE_TELEMETRY_ENABLED from the environment; "0" opts out, anything else is ignored.
  explicit: string | undefined;
  isPackaged: boolean;
  isTestingBuild: boolean;
  convexUrl: string | undefined;
};

// Research telemetry goes to the Testing Grafana only. It is on for local dev and every
// installed Testing build (so partner runs show up), off for production builds and for
// anything not pointed at the Testing backend. "0" always opts out.
export function telemetryEnabled({ explicit, isPackaged, isTestingBuild, convexUrl }: TelemetryPolicyInput) {
  if (explicit?.trim() === "0") return false;
  if (isPackaged && !isTestingBuild) return false;
  return convexUrl?.trim().replace(/\/$/, "") === TESTING_CONVEX_URL;
}
