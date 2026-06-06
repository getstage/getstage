import { createHashHistory, createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

// Packaged Electron loads via file://; hash routing keeps "/" and "/auth" working.
const useHashHistory = import.meta.env.PROD;

export const router = createRouter({
  routeTree,
  ...(useHashHistory ? { history: createHashHistory() } : {}),
  defaultPreload: false,
  defaultPreloadStaleTime: 30_000,
});
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
