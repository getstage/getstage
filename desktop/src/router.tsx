import {
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { DesktopShell } from "./app/DesktopShell";
import { DashboardContextView } from "./app/DashboardContextView";

const rootRoute = createRootRoute({
  component: () => (
    <DesktopShell>
      <Outlet />
    </DesktopShell>
  ),
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: DashboardContextView,
});

const routeTree = rootRoute.addChildren([indexRoute]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
