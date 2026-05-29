import { useMemo } from "react";
import { useQuery } from "convex/react";
import { projectDetailSchema, type ProjectDetail } from "@stage/data-ops";
import { useDesktopAuth } from "@/lib/auth";
import { api } from "@/lib/convexApi";

export function useProjectQuery(projectId: string | undefined) {
  const { isAuthenticated, isLoading: isAuthLoading } = useDesktopAuth();
  const project = useQuery(
    api.desktop.getProject,
    isAuthenticated && projectId ? { projectId } : "skip",
  );
  const data = useMemo<ProjectDetail | undefined>(
    () => project === undefined || project === null ? undefined : projectDetailSchema.parse(project),
    [project],
  );

  return {
    data,
    isLoading: isAuthLoading || (isAuthenticated && Boolean(projectId) && project === undefined),
    error: null,
  };
}
