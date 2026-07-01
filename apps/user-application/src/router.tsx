import { createHashHistory, createRouter } from "@tanstack/react-router";
import { NeutralSpinner } from "@/components/app/NeutralSpinner";
import { queryClient } from "@/lib/queryClient";
import { routeTree } from "./routeTree.gen";

const useHashHistory = import.meta.env.PROD;

export const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPendingComponent: () => <NeutralSpinner />,
  defaultPreload: "intent",
  defaultPreloadStaleTime: 30_000,
  ...(useHashHistory ? { history: createHashHistory() } : {}),
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}