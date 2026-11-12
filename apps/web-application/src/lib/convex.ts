import { ConvexReactClient } from "convex/react";
import { api } from "@stage/data-ops/convex/api";

const convexUrl = import.meta.env.VITE_CONVEX_URL;

if (!convexUrl) {
  throw new Error("Missing VITE_CONVEX_URL in the app environment.");
}

// No "leave page?" prompt: Stage never holds unsaved user input in a pending request (every save is explicit).
export const convex = new ConvexReactClient(convexUrl, { unsavedChangesWarning: false });
export { api };
