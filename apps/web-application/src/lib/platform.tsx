import { useMemo, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useConvexAuth } from "convex/react";
import { PlatformProvider, type AppDestination, type StagePlatform } from "@stage/project-ui/platform";

// Where the shared screens' links go on the web.
const DESTINATIONS = {
  dashboard: { to: "/app" },
  plans: { to: "/app/plans" },
  "plans-for-teams": { to: "/app/plans", search: { from: "teams" } },
  "settings-billing": { to: "/app/settings", search: { tab: "billing" } },
  "settings-team": { to: "/app/settings", search: { tab: "team" } },
} as const satisfies Record<AppDestination, unknown>;

export function WebPlatformProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const navigate = useNavigate();
  const value = useMemo<StagePlatform>(() => ({
    kind: "web",
    session: { isAuthenticated, isLoading },
    // Stripe checkout and the customer portal return to the web app, so they open in the same tab.
    openExternal: async (url) => window.location.assign(url),
    navigate: (destination) => void navigate(DESTINATIONS[destination]),
  }), [isAuthenticated, isLoading, navigate]);
  return <PlatformProvider value={value}>{children}</PlatformProvider>;
}
