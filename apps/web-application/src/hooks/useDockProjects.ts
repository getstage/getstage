import { useQuery } from "@tanstack/react-query";
import type { DockProject } from "@/components/dashboard/ProjectDock";
import { useAuth } from "@/lib/auth";
import { api, convex } from "@/lib/convex";
import { convexQueryKeys } from "@/lib/queryKeys";

export function useDockProjects(): DockProject[] {
  const { isAuthenticated } = useAuth();

  const { data } = useQuery({
    queryKey: convexQueryKeys.dockProjects,
    queryFn: () => convex.query(api.projects.getDockProjects, {}),
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 5,
  });

  return data ?? [];
}
