import { Outlet, createFileRoute, useMatches } from "@tanstack/react-router";
import { SettingsPageView } from "@/settings/components/SettingsPageView";

export const Route = createFileRoute("/_authed/settings")({
  component: SettingsRoute,
});

function SettingsRoute() {
  const matches = useMatches();

  return matches.at(-1)?.routeId === "/_authed/settings"
    ? <SettingsPageView initialTab="profile" />
    : <Outlet />;
}
