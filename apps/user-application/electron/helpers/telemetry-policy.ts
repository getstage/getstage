export const TESTING_CONVEX_URL = "https://reliable-bullfrog-917.convex.cloud";
export const PRODUCTION_CONVEX_URL = "https://quirky-snail-763.convex.cloud";

export type TelemetryChannel = "testing" | "production";

// Research telemetry goes to Grafana, labelled with the backend the app talks to:
// Testing (local dev and Testing builds) or Production. Any other backend sends nothing,
// and STAGE_TELEMETRY_ENABLED="0" always opts out.
export function telemetryChannel({ explicit, convexUrl }: { explicit: string | undefined; convexUrl: string | undefined }): TelemetryChannel | undefined {
  if (explicit?.trim() === "0") return undefined;
  const url = convexUrl?.trim().replace(/\/$/, "");
  if (url === TESTING_CONVEX_URL) return "testing";
  if (url === PRODUCTION_CONVEX_URL) return "production";
  return undefined;
}
