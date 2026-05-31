import { Outlet, createFileRoute, useMatches } from "@tanstack/react-router";
import { ClientPortalProjectsView } from "@/components/client-portal/ClientPortalProjectsView";

export const Route = createFileRoute("/_authed/client-portal")({
  component: ClientPortalRoute,
});

function ClientPortalRoute() {
  const matches = useMatches();

  return matches.at(-1)?.routeId === "/_authed/client-portal"
    ? <ClientPortalProjectsView />
    : <Outlet />;
}
