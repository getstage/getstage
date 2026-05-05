import {
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { DesktopShell } from "./app/DesktopShell";
import { DashboardContextView } from "./app/DashboardContextView";
import { ClientPortalPreviewView } from "./client-portal/components/ClientPortalPreviewView";
import { ClientPortalProjectsView } from "./client-portal/components/ClientPortalProjectsView";
import { CreateProjectView } from "./project/components/CreateProjectView";
import { ProjectDetailView } from "./project/components/ProjectDetailView";
import { ProjectDetailsView } from "./project/components/ProjectDetailsView";
import { ProjectsOverviewView } from "./project/components/ProjectsOverviewView";
import { SettingsPageView } from "./settings/components/SettingsPageView";
import { TasksPageView } from "./tasks/components/TasksPageView";

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

const projectDetailsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/project/$projectId/details",
  component: ProjectDetailsView,
});

const projectsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/projects",
  component: ProjectsOverviewView,
});

const tasksRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/tasks",
  component: TasksPageView,
});

const createProjectRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/projects/create",
  component: CreateProjectView,
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

const clientPortalRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/client-portal",
  component: ClientPortalProjectsView,
});

const clientPortalPreviewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/client-portal/$projectId/preview",
  component: ClientPortalPreviewView,
});

const integrationsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/integrations",
  component: () => <SettingsPageView initialTab="integrations" />,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  projectsRoute,
  tasksRoute,
  createProjectRoute,
  projectDetailsRoute,
  projectRoute,
  settingsRoute,
  billingRoute,
  clientsRoute,
  developerRoute,
  accountRoute,
  portalRoute,
  clientPortalRoute,
  clientPortalPreviewRoute,
  integrationsRoute,
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
