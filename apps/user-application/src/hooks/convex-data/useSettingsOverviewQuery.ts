import { useMemo } from "react";
import { useQuery } from "convex/react";
import { useDesktopAuth } from "@/lib/auth";
import { api } from "@/lib/convexApi";
import { settingsOverviewSchema, type SettingsOverview } from "@/settings/models/settings";

export type { SettingsOverview };

export function useSettingsOverviewQuery() {
  const { isAuthenticated, isLoading: isAuthLoading } = useDesktopAuth();
  const overview = useQuery(api.settings.getOverview, isAuthenticated ? {} : "skip");
  const data = useMemo<SettingsOverview | undefined>(
    () => (overview === undefined ? undefined : settingsOverviewSchema.parse(overview)),
    [overview],
  );

  return {
    data,
    isLoading: isAuthLoading || (isAuthenticated && overview === undefined),
    error: null,
  };
}
