import { Outlet, createFileRoute, useMatches } from "@tanstack/react-router";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "@/lib/convexApi";
import { SettingsPageView } from "@/components/settings/SettingsPageView";

export const Route = createFileRoute("/_authed/settings")({
  loader: async ({ context: { queryClient } }) => {
    await Promise.all([
      queryClient.ensureQueryData(convexQuery(api.settings.getOverview, {})),
      queryClient.ensureQueryData(convexQuery(api.clients.listForCurrentUser, {})),
    ]);
  },
  component: SettingsRoute,
});

function SettingsRoute() {
  const matches = useMatches();

  return matches.at(-1)?.routeId === "/_authed/settings"
    ? <SettingsPageView initialTab="profile" />
    : <Outlet />;
}