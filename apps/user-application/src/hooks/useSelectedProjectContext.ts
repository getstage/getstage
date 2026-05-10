import { useMemo } from "react";
import { useQuery } from "convex/react";
import {
  phaseSummarySchema,
  projectContextSchema,
  projectDetailSchema,
  projectSummarySchema,
  summarizeProjectContext,
  taskSummarySchema,
  type ProjectContext,
} from "@stage/data-ops";
import { z } from "zod";
import { useDesktopAuth } from "@/lib/auth";
import { api } from "@/lib/convexApi";
import { buildProjectContextFromConvexSelection } from "@/project-context/convexProjectContext";
import {
  selectedProjectContext,
  selectedProjectContextSummary,
} from "../project-context";

type SelectedProjectContextResult = {
  context: ProjectContext;
  error: unknown;
  isFallback: boolean;
  isLoading: boolean;
  summary: string;
};

export function useSelectedProjectContext(): SelectedProjectContextResult {
  const { isAuthenticated, isLoading: isAuthLoading } = useDesktopAuth();
  const rawProjects = useQuery(api.desktop.listProjects, isAuthenticated ? {} : "skip");
  const projects = useMemo(
    () => rawProjects === undefined ? undefined : z.array(projectSummarySchema).parse(rawProjects),
    [rawProjects],
  );
  const selectedProjectId = projects?.find((project) => project.status === "active")?.id ?? projects?.[0]?.id;
  const rawProjectData = useQuery(
    api.desktop.getProjectData,
    isAuthenticated && selectedProjectId ? { projectId: selectedProjectId } : "skip",
  );
  const liveContext = useMemo<ProjectContext | null>(() => {
    if (!rawProjectData) {
      return null;
    }

    const parsed = z.object({
      project: projectDetailSchema,
      phases: z.array(phaseSummarySchema),
      tasks: z.array(taskSummarySchema),
    }).parse(rawProjectData);

    return projectContextSchema.parse(buildProjectContextFromConvexSelection({
      id: parsed.project.id,
      name: parsed.project.name,
      clientName: parsed.project.clientName,
      updatedAt: parsed.project.updatedAt,
      phases: parsed.phases.map((phase) => ({
        id: phase.id,
        name: phase.name,
        status: phase.status,
        tasks: parsed.tasks
          .filter((task) => task.phaseId === phase.id)
          .map((task) => ({
            id: task.id,
            title: task.title,
            isCompleted: task.isCompleted,
            updatedAt: task.updatedAt,
          })),
      })),
    }));
  }, [rawProjectData]);

  const context = liveContext ?? selectedProjectContext;
  const isLoading =
    isAuthLoading ||
    (isAuthenticated && (rawProjects === undefined || (Boolean(selectedProjectId) && rawProjectData === undefined)));
  const isFallback = !liveContext;

  return {
    context,
    error: null,
    isFallback,
    isLoading,
    summary: isFallback ? selectedProjectContextSummary : summarizeProjectContext(context),
  };
}
