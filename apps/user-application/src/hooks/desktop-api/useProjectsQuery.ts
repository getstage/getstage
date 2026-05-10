import { useMemo } from "react";
import { useQuery } from "convex/react";
import { projectSummarySchema, type ProjectSummary } from "@stage/data-ops";
import { z } from "zod";
import { useDesktopAuth } from "@/lib/auth";
import { api } from "@/lib/convexApi";

const projectListSchema = z.array(projectSummarySchema);

export function useProjectsQuery() {
  const { isAuthenticated, isLoading: isAuthLoading } = useDesktopAuth();
  const projects = useQuery(api.desktop.listProjects, isAuthenticated ? {} : "skip");
  const data = useMemo<ProjectSummary[] | undefined>(
    () => projects === undefined ? undefined : projectListSchema.parse(projects),
    [projects],
  );

  return {
    data,
    isLoading: isAuthLoading || (isAuthenticated && projects === undefined),
    error: null,
  };
}
