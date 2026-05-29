import { ConvexReactClient } from "convex/react";
import { api } from "@stage/data-ops/convex/api";

const convexUrl = import.meta.env.VITE_CONVEX_URL;

if (!convexUrl) {
  throw new Error("Missing VITE_CONVEX_URL in the app environment.");
}

export const convex = new ConvexReactClient(convexUrl);
export { api };
