import {
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
  useRouterState,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { DesktopShell } from "./app/DesktopShell";
import { DashboardContextView } from "./app/DashboardContextView";
import { DesktopAuthView } from "./auth/DesktopAuthView";
import { ClientPortalPreviewView } from "./client-portal/components/ClientPortalPreviewView";
import { ClientPortalProjectsView } from "./client-portal/components/ClientPortalProjectsView";
import { CreateProjectView } from "./project/components/CreateProjectView";
import { ProjectDetailView } from "./project/components/ProjectDetailView";
import { ProjectDetailsView } from "./project/components/ProjectDetailsView";
import { ProjectsOverviewView } from "./project/components/ProjectsOverviewView";
import { SettingsPageView } from "./settings/components/SettingsPageView";
import { TaskDetailsView } from "./tasks/components/TaskDetailsView";
import { TasksPageView } from "./tasks/components/TasksPageView";
import { useDesktopBridge } from "./hooks/useDesktopBridge";

const desktopSessionQueryKey = ["desktop", "auth", "session"];
const taskDetailsSearchSchema = z.object({
  from: z.union([z.literal("project"), z.literal("client-portal")]).optional(),
  projectId: z.string().optional(),
});

const rootRoute = createRootRoute({
  component: RootRoute,
});

function RootRoute() {
  const desktop = useDesktopBridge();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const session = useQuery({
    queryKey: desktopSessionQueryKey,
    queryFn: () => desktop.auth.getSession(),
    retry: false,
  });

  useEffect(() => {
    return desktop.auth.onSessionChanged(() => {
      void queryClient.invalidateQueries({ queryKey: desktopSessionQueryKey });
    });
  }, [desktop.auth, queryClient]);

  const isAuthRoute = pathname === "/auth";
  const shouldShowAuth = !isAuthRoute && (session.isLoading || !session.data?.hasAccessToken);
  const isAuthSurface = isAuthRoute || shouldShowAuth;

  return (
    <DesktopShell hideCompanion={isAuthSurface}>
      {shouldShowAuth ? <DesktopAuthView /> : <Outlet />}
    </DesktopShell>
  );
}

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: DashboardContextView,
});

const authRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/auth",
  component: DesktopAuthView,
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

const taskDetailsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/tasks/$taskId",
  validateSearch: (search: unknown) => {
    const parsedSearch = taskDetailsSearchSchema.safeParse(search);
    if (!parsedSearch.success) {
      return { from: "tasks", projectId: undefined };
    }

    return {
      from: parsedSearch.data.from ?? "tasks",
      projectId: parsedSearch.data.projectId,
    };
  },
  component: TaskDetailsView,
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

const claudeSetupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/agents/claude",
  component: () => <SettingsPageView initialTab="integrations" />,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  authRoute,
  projectsRoute,
  taskDetailsRoute,
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
  claudeSetupRoute,
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
