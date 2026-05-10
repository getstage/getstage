import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  phaseSummarySchema,
  taskSummarySchema,
  type PhaseSummary,
  type ProjectDetail,
  type TaskSummary,
} from "@stage/data-ops";
import { z } from "zod";
import { useDesktopBridge } from "@/hooks/useDesktopBridge";
import { useProjectQuery } from "@/hooks/desktop-api";
import type { Phase, Project, Task } from "../models/project";

const EMPTY_PHASES: PhaseSummary[] = [];
const EMPTY_TASKS_BY_PHASE: Record<string, TaskSummary[]> = {};

const phaseListSchema = z.array(phaseSummarySchema);
const taskListSchema = z.array(taskSummarySchema);

type LiveProjectData = {
  project: ProjectDetail;
  phases: PhaseSummary[];
  tasksByPhaseId: Record<string, TaskSummary[]>;
};

function mapTask(task: TaskSummary): Task {
  return {
    id: task.id,
    title: task.title,
    content: undefined,
    isCompleted: task.isCompleted,
    updatedAt: task.updatedAt,
    assignees: task.assignees.map((assignee) => ({
      name: assignee.name ?? "Stage",
    })),
  };
}

function mapPhase(phase: PhaseSummary, tasks: TaskSummary[]): Phase {
  const sortedTasks = [...tasks].sort((a, b) => a.order - b.order);
  return {
    id: phase.id,
    name: phase.name,
    status: phase.status,
    tasks: sortedTasks.map(mapTask),
  };
}

function mapProject(data: LiveProjectData): Project {
  const sortedPhases = [...data.phases]
    .sort((a, b) => a.order - b.order)
    .map((phase) => mapPhase(phase, data.tasksByPhaseId[phase.id] ?? []));

  return {
    id: data.project.id,
    name: data.project.name,
    clientName: data.project.clientName,
    status: data.project.status,
    projectImageUrl: data.project.projectImageUrl,
    phases: sortedPhases,
    research: {
      clientWebsite: "",
      competitors: [],
      references: [],
      brief: "",
      notes: "",
    },
    moodboard: { references: [] },
    flows: [],
    screens: [],
    assets: [],
  };
}

export type UseLiveProjectResult = {
  project: Project | null;
  detail: ProjectDetail | null;
  phases: PhaseSummary[];
  tasksByPhaseId: Record<string, TaskSummary[]>;
  isLoading: boolean;
  error: unknown;
};

export function useLiveProject(projectId: string | undefined): UseLiveProjectResult {
  const desktop = useDesktopBridge();
  const projectQuery = useProjectQuery(projectId);

  const phasesAndTasksQuery = useQuery<{
    phases: PhaseSummary[];
    tasksByPhaseId: Record<string, TaskSummary[]>;
  }>({
    queryKey: ["desktop", "api", "project", projectId, "phases-with-tasks"],
    enabled: Boolean(projectId),
    queryFn: async () => {
      if (!projectId) {
        throw new Error("Missing project id.");
      }
      const phases = phaseListSchema.parse(
        await desktop.api.listProjectPhases(projectId),
      );
      const taskEntries = await Promise.all(
        phases.map(async (phase) => {
          const tasks = taskListSchema.parse(
            await desktop.api.listPhaseTasks(phase.id),
          );
          return [phase.id, tasks] as const;
        }),
      );
      const tasksByPhaseId: Record<string, TaskSummary[]> = {};
      for (const [phaseId, tasks] of taskEntries) {
        tasksByPhaseId[phaseId] = tasks;
      }
      return { phases, tasksByPhaseId };
    },
    retry: 1,
  });

  const isLoading = projectQuery.isLoading || phasesAndTasksQuery.isLoading;
  const error = projectQuery.error ?? phasesAndTasksQuery.error;

  const project = useMemo<Project | null>(() => {
    if (!projectQuery.data || !phasesAndTasksQuery.data) {
      return null;
    }
    return mapProject({
      project: projectQuery.data,
      phases: phasesAndTasksQuery.data.phases,
      tasksByPhaseId: phasesAndTasksQuery.data.tasksByPhaseId,
    });
  }, [projectQuery.data, phasesAndTasksQuery.data]);

  return {
    project,
    detail: projectQuery.data ?? null,
    phases: phasesAndTasksQuery.data?.phases ?? EMPTY_PHASES,
    tasksByPhaseId: phasesAndTasksQuery.data?.tasksByPhaseId ?? EMPTY_TASKS_BY_PHASE,
    isLoading,
    error,
  };
}
