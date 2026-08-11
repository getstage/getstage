import { Outlet, createFileRoute, useMatches } from "@tanstack/react-router";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "@/lib/convexApi";
import { ProjectsOverviewView } from "@/components/project/ProjectsOverviewView";
import { warmRouteData } from "@/lib/routeData";

export const Route = createFileRoute("/_authed/projects")({
  loader: async ({ context: { queryClient } }) => {
    await warmRouteData([
      queryClient.ensureQueryData(convexQuery(api.desktop.listProjects, {})),
    ]);
  },
  component: ProjectsRoute,
});

function ProjectsRoute() {
  const matches = useMatches();

  return matches.at(-1)?.routeId === "/_authed/projects" ? <ProjectsOverviewView /> : <Outlet />;
}