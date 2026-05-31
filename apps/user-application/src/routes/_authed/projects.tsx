import { Outlet, createFileRoute, useMatches } from "@tanstack/react-router";
import { ProjectsOverviewView } from "@/components/project/ProjectsOverviewView";

export const Route = createFileRoute("/_authed/projects")({
  component: ProjectsRoute,
});

function ProjectsRoute() {
  const matches = useMatches();

  return matches.at(-1)?.routeId === "/_authed/projects" ? <ProjectsOverviewView /> : <Outlet />;
}
