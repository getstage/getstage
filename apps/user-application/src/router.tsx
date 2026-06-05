import { createHashHistory, createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

const useHashHistory =
  typeof window !== "undefined" && window.location.protocol === "file:";

export const router = createRouter({
  routeTree,
  ...(useHashHistory ? { history: createHashHistory() } : {}),
  defaultPreload: "intent",
  defaultPreloadStaleTime: 0,
});
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
