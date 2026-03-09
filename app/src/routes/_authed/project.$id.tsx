import { Outlet, createFileRoute, useMatches } from "@tanstack/react-router";
import { ProjectDetailPage } from "@/components/project/ProjectDetailPage";

export const Route = createFileRoute("/_authed/project/$id")({
  component: ProjectRoute,
});

function ProjectRoute() {
  const matches = useMatches();
  const isTaskRouteActive = matches.some(
    (match) => match.routeId === "/_authed/project/$id/task/$taskId",
  );

  if (isTaskRouteActive) {
    return <Outlet />;
  }

  return <ProjectDetailPage />;
}
