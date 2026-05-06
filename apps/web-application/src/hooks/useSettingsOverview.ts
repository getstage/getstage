import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { api, convex } from "@/lib/convex";
import { convexQueryKeys } from "@/lib/queryKeys";

export function useSettingsOverview() {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: convexQueryKeys.settingsOverview,
    queryFn: () => convex.query(api.settings.getOverview, {}),
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 5,
  });
}
