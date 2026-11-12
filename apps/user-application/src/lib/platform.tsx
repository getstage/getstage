import { useMemo, type ReactNode } from "react";
import { PlatformProvider, type AppDestination, type StagePlatform } from "@stage/project-ui/platform";
import { useDesktopAuth } from "@/lib/auth";
import { openExternalLink } from "@/lib/settings/openExternalLink";
import { router } from "@/router";

// Where the shared screens' links go in Stage for Mac.
const DESTINATIONS = {
  dashboard: { to: "/" },
  plans: { to: "/subscriptions" },
  "plans-for-teams": { to: "/subscriptions", search: { from: "teams" } },
  "settings-billing": { to: "/settings/billing" },
  "settings-team": { to: "/settings/team" },
} as const satisfies Record<AppDestination, unknown>;

export function MacPlatformProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useDesktopAuth();
  const value = useMemo<StagePlatform>(() => ({
    kind: "desktop",
    session: { isAuthenticated, isLoading },
    openExternal: openExternalLink,
    navigate: (destination) => void router.navigate(DESTINATIONS[destination]),
  }), [isAuthenticated, isLoading]);
  return <PlatformProvider value={value}>{children}</PlatformProvider>;
}
