import { ConvexReactClient } from "convex/react";

const DEFAULT_TESTING_CONVEX_URL = "https://reliable-bullfrog-917.convex.cloud";

const convexUrl =
  import.meta.env.VITE_CONVEX_URL ??
  (import.meta.env.DEV ? DEFAULT_TESTING_CONVEX_URL : undefined);

if (!convexUrl) {
  throw new Error("Missing VITE_CONVEX_URL in the desktop app environment.");
}

export const convex = new ConvexReactClient(convexUrl);
