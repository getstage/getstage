import {
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { DesktopShell } from "./app/DesktopShell";
import { DashboardContextView } from "./app/DashboardContextView";
import { ProjectDetailView } from "./project/components/ProjectDetailView";
import { SettingsPageView } from "./settings/components/SettingsPageView";

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

const projectRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/project/$projectId",
  component: ProjectDetailView,
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
  component: () => <SettingsPageView initialTab="profile" />,
});

const billingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings/billing",
  component: () => <SettingsPageView initialTab="billing" />,
});

const clientsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings/clients",
  component: () => <SettingsPageView initialTab="clients" />,
});

const developerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings/developer",
  component: () => <SettingsPageView initialTab="developer" />,
});

const accountRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings/account",
  component: () => <SettingsPageView initialTab="account" />,
});

const portalRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings/portal",
  component: () => <SettingsPageView initialTab="portal" />,
});

const integrationsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/integrations",
  component: () => <SettingsPageView initialTab="integrations" />,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  projectRoute,
  settingsRoute,
  billingRoute,
  clientsRoute,
  developerRoute,
  accountRoute,
  portalRoute,
  integrationsRoute,
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
