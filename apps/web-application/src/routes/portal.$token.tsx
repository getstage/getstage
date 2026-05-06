import { Outlet, createFileRoute, useMatches } from "@tanstack/react-router";
import { ClientPortalPage } from "@/components/portal/ClientPortalPage";

export const Route = createFileRoute("/portal/$token")({
  component: PortalRoute,
});

function PortalRoute() {
  const matches = useMatches();
  const isTaskRouteActive = matches.some(
    (match) => match.routeId === "/portal/$token/task/$taskId",
  );

  if (isTaskRouteActive) {
    return <Outlet />;
  }

  return <ClientPortalPage />;
}
