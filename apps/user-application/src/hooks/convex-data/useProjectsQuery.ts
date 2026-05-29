import { useMemo } from "react";
import { useQuery } from "convex/react";
import { projectSummarySchema, type ProjectSummary } from "@stage/data-ops";
import { z } from "zod";
import { useDesktopAuth } from "@/lib/auth";
import { api } from "@/lib/convexApi";
import { mockProjectSummaries } from "@/project/data/projectSnapshot";

const projectListSchema = z.array(projectSummarySchema);

export function useProjectsQuery(options?: { includeMocks?: boolean }) {
  const { isAuthenticated, isLoading: isAuthLoading } = useDesktopAuth();
  const projects = useQuery(api.desktop.listProjects, isAuthenticated ? {} : "skip");
  const data = useMemo<ProjectSummary[] | undefined>(
    () => projects === undefined ? undefined : projectListSchema.parse(projects),
    [projects],
  );
  const includeMocks = options?.includeMocks ?? false;
  const projectsWithMocks = useMemo<ProjectSummary[] | undefined>(() => {
    if (!includeMocks) {
      return data;
    }
    if (!isAuthenticated) {
      return mockProjectSummaries;
    }
    if (!data) {
      return undefined;
    }
    const liveIds = new Set(data.map((project) => project.id));
    return [
      ...mockProjectSummaries.filter((project) => !liveIds.has(project.id)),
      ...data,
    ];
  }, [data, includeMocks, isAuthenticated]);

  return {
    data: projectsWithMocks,
    isLoading: isAuthLoading || (isAuthenticated && projects === undefined),
    error: null,
  };
}
