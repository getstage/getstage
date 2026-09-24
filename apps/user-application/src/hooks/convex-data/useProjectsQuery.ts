import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { projectSummarySchema, type ProjectSummary } from "@stage/data-ops";
import { z } from "zod";
import { useDesktopAuth } from "@/lib/auth";
import { api } from "@/lib/convexApi";
import { useActiveSpace } from "@/hooks/workspace/useActiveSpace";

const projectListSchema = z.array(projectSummarySchema);

export function useProjectsQuery() {
  const { isAuthenticated, isLoading: isAuthLoading } = useDesktopAuth();
  const { spaces, spacesReady, activeId } = useActiveSpace();
  const { data: projects, isPending } = useQuery(
    convexQuery(api.desktop.listProjects, isAuthenticated ? {} : "skip"),
  );
  const data = useMemo<ProjectSummary[] | undefined>(() => {
    if (projects === undefined) return undefined;
    const parsed = projectListSchema.parse(projects);
    if (!spacesReady || spaces.length < 2 || !activeId) return parsed;
    return parsed.filter((project) => !project.ownerUserId || project.ownerUserId === activeId);
  }, [activeId, projects, spaces.length, spacesReady]);

  return {
    data,
    isLoading: isAuthLoading || (isAuthenticated && isPending),
    error: null,
  };
}