import { Outlet, createFileRoute, useMatches } from "@tanstack/react-router";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "@/lib/convexApi";
import { ClientPortalProjectsView } from "@/components/client-portal/ClientPortalProjectsView";
import { warmRouteData } from "@/lib/routeData";

export const Route = createFileRoute("/_authed/client-portal")({
  loader: async ({ context: { queryClient } }) => {
    await warmRouteData([
      queryClient.ensureQueryData(convexQuery(api.desktop.listProjects, {})),
    ]);
  },
  component: ClientPortalRoute,
});

function ClientPortalRoute() {
  const matches = useMatches();

  return matches.at(-1)?.routeId === "/_authed/client-portal"
    ? <ClientPortalProjectsView />
    : <Outlet />;
}