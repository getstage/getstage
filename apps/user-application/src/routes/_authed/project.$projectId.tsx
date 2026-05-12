import { Outlet, createFileRoute, useMatches } from "@tanstack/react-router";
import { ProjectDetailView } from "@/project/components/ProjectDetailView";

export const Route = createFileRoute("/_authed/project/$projectId")({
  component: ProjectRoute,
});

function ProjectRoute() {
  const matches = useMatches();

  return matches.at(-1)?.routeId === "/_authed/project/$projectId"
    ? <ProjectDetailView />
    : <Outlet />;
}
