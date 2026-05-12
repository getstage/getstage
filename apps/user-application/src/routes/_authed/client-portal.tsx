import { Outlet, createFileRoute, useMatches } from "@tanstack/react-router";
import { ClientPortalProjectsView } from "@/client-portal/components/ClientPortalProjectsView";

export const Route = createFileRoute("/_authed/client-portal")({
  component: ClientPortalRoute,
});

function ClientPortalRoute() {
  const matches = useMatches();

  return matches.at(-1)?.routeId === "/_authed/client-portal"
    ? <ClientPortalProjectsView />
    : <Outlet />;
}
