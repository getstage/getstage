import { projectContextSchema, type ProjectContext } from "@stage/data-ops";
import { fetchDesktopApiJson } from "./helpers/desktop-api";
import type { DesktopAuthController } from "./auth";

type ApiProjectSummary = {
  id: string;
  name: string;
  clientName?: string;
  status?: string;
  updatedAt?: number;
};

type ApiPhaseSummary = {
  id: string;
  name: string;
  status: "completed" | "active" | "upcoming";
  updatedAt?: number;
};

type ApiTaskSummary = {
  id: string;
  title: string;
  isCompleted: boolean;
  updatedAt?: number;
};

type ProjectsResponse = {
  projects: ApiProjectSummary[];
};

type PhasesResponse = {
  phases: ApiPhaseSummary[];
};

type TasksResponse = {
  tasks: ApiTaskSummary[];
};

function chooseSelectedProject(projects: ApiProjectSummary[]) {
  return projects.find((project) => project.status === "active") ?? projects[0] ?? null;
}

function buildProjectContext(args: {
  phases: ApiPhaseSummary[];
  project: ApiProjectSummary;
  tasksByPhaseId: Map<string, ApiTaskSummary[]>;
}): ProjectContext {
  const currentPhase = args.phases.find((phase) => phase.status === "active");

  return projectContextSchema.parse({
    apiVersion: "v1",
    clientName: args.project.clientName,
    currentPhase: currentPhase?.name,
    projectId: args.project.id,
    projectName: args.project.name,
    tasks: args.phases.flatMap((phase) =>
      (args.tasksByPhaseId.get(phase.id) ?? []).map((task) => ({
        id: task.id,
        phaseName: phase.name,
        status: task.isCompleted
          ? "done"
          : phase.status === "active"
            ? "in_progress"
            : "todo",
        title: task.title,
        updatedAt: task.updatedAt,
      })),
    ),
    updatedAt: args.project.updatedAt ?? Date.now(),
  });
}

export async function getSelectedProjectContext(
  authController: DesktopAuthController,
): Promise<ProjectContext | null> {
  const accessToken = await authController.getAccessToken();

  if (!accessToken) {
    return null;
  }

  const { projects } = await fetchDesktopApiJson<ProjectsResponse>({
    accessToken,
    path: "/projects",
  });
  const project = chooseSelectedProject(projects);

  if (!project) {
    return null;
  }

  const { phases } = await fetchDesktopApiJson<PhasesResponse>({
    accessToken,
    path: `/projects/${encodeURIComponent(project.id)}/phases`,
  });
  const tasksByPhaseId = new Map<string, ApiTaskSummary[]>();

  await Promise.all(
    phases.map(async (phase) => {
      const { tasks } = await fetchDesktopApiJson<TasksResponse>({
        accessToken,
        path: `/phases/${encodeURIComponent(phase.id)}/tasks`,
      });
      tasksByPhaseId.set(phase.id, tasks);
    }),
  );

  return buildProjectContext({ phases, project, tasksByPhaseId });
}
