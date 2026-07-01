import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { useDesktopAuth } from "@/lib/auth";
import { api } from "@/lib/convexApi";
import { settingsOverviewSchema, type SettingsOverview } from "@/models/settings/settings";

export type { SettingsOverview };

export function useSettingsOverviewQuery() {
  const { isAuthenticated, isLoading: isAuthLoading } = useDesktopAuth();
  const { data: overview, isPending } = useQuery(
    convexQuery(api.settings.getOverview, isAuthenticated ? {} : "skip"),
  );
  const data = useMemo<SettingsOverview | undefined>(
    () => (overview === undefined ? undefined : settingsOverviewSchema.parse(overview)),
    [overview],
  );

  return {
    data,
    isLoading: isAuthLoading || (isAuthenticated && isPending),
    error: null,
  };
}