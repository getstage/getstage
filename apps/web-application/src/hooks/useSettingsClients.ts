import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { api, convex } from "@/lib/convex";
import { convexQueryKeys } from "@/lib/queryKeys";

export type SettingsClient = {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  projectCount: number;
};

export function useSettingsClients(enabled = true) {
  const { isAuthenticated } = useAuth();

  const query = useQuery({
    queryKey: convexQueryKeys.settingsClients,
    queryFn: () => convex.query(api.clients.listForCurrentUser, {}),
    enabled: isAuthenticated && enabled,
    staleTime: 1000 * 60 * 5,
  });

  return {
    clients: (query.data ?? []) as SettingsClient[],
    isLoading: query.isLoading,
  };
}
