import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { usePlatform } from "../platform";
import { api } from "@stage/data-ops/convex/api";
import { settingsOverviewSchema, type SettingsOverview } from "../settings/model";

export type { SettingsOverview };

export function useSettingsOverviewQuery() {
  const { isAuthenticated, isLoading: isAuthLoading } = usePlatform().session;
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