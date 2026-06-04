import { useMemo } from "react";
import { useQuery } from "convex/react";
import {
  phaseSummarySchema,
  projectDetailSchema,
  taskSummarySchema,
  type PhaseSummary,
  type ProjectDetail,
  type TaskSummary,
} from "@stage/data-ops";
import { z } from "zod";
import { useDesktopAuth } from "@/lib/auth";
import { api } from "@/lib/convexApi";
import type { Phase, Project, Task } from "@/models/project/project";

const EMPTY_PHASES: PhaseSummary[] = [];
const EMPTY_TASKS_BY_PHASE: { [phaseId: string]: TaskSummary[] } = {};

const phaseListSchema = z.array(phaseSummarySchema);
const taskListSchema = z.array(taskSummarySchema);
const liveProjectDataSchema = z.object({
  project: projectDetailSchema,
  phases: phaseListSchema,
  tasks: taskListSchema,
});

type LiveProjectData = {
  project: ProjectDetail;
  phases: PhaseSummary[];
  tasksByPhaseId: { [phaseId: string]: TaskSummary[] };
};

function mapTask(task: TaskSummary): Task {
  return {
    id: task.id,
    title: task.title,
    content: undefined,
    boardStatus: task.boardStatus ?? undefined,
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
  tasksByPhaseId: { [phaseId: string]: TaskSummary[] };
  isLoading: boolean;
  isNotFound: boolean;
  error: unknown;
};

type UseLiveProjectOptions = {
  enabled?: boolean;
};

export function useLiveProject(
  projectId: string | undefined,
  options: UseLiveProjectOptions = {},
): UseLiveProjectResult {
  const { enabled = true } = options;
  const { isAuthenticated, isLoading: isAuthLoading } = useDesktopAuth();
  const rawProjectData = useQuery(
    api.desktop.getProjectData,
    isAuthenticated && enabled && projectId ? { projectId } : "skip",
  );
  const liveData = useMemo(() => {
    if (!rawProjectData) {
      return null;
    }
    const parsed = liveProjectDataSchema.parse(rawProjectData);
    const tasksByPhaseId: { [phaseId: string]: TaskSummary[] } = {};
    for (const task of parsed.tasks) {
      tasksByPhaseId[task.phaseId] = [...(tasksByPhaseId[task.phaseId] ?? []), task];
    }
    return {
      project: parsed.project,
      phases: parsed.phases,
      tasksByPhaseId,
    };
  }, [rawProjectData]);

  const isLoading =
    isAuthLoading ||
    (isAuthenticated && enabled && Boolean(projectId) && rawProjectData === undefined);
  const isNotFound =
    isAuthenticated && enabled && Boolean(projectId) && rawProjectData === null;
  const error = isNotFound ? new Error("Project not found.") : null;

  const project = useMemo<Project | null>(() => {
    if (!liveData) {
      return null;
    }
    return mapProject(liveData);
  }, [liveData]);

  return {
    project,
    detail: liveData?.project ?? null,
    phases: liveData?.phases ?? EMPTY_PHASES,
    tasksByPhaseId: liveData?.tasksByPhaseId ?? EMPTY_TASKS_BY_PHASE,
    isLoading,
    isNotFound,
    error,
  };
}
