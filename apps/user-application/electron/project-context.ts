import { projectContextSchema, type ProjectContext } from "@stage/data-ops";
import type { DesktopAuthController } from "./auth";
import { DesktopSessionExpiredError } from "./desktop-api/auth-failure";
import { fetchDesktopApiJson } from "./helpers/desktop-api";

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
    console.info("[stage-project-context] no desktop session token; returning fallback");
    return null;
  }

  try {
    console.info("[stage-project-context] fetching projects from Stage API");
    const { projects } = await fetchDesktopApiJson<ProjectsResponse>({
      authController,
      path: "/projects",
    });
    const project = chooseSelectedProject(projects);

    if (!project) {
      console.info("[stage-project-context] no projects returned from Stage API");
      return null;
    }

    console.info(`[stage-project-context] selected project ${project.id}`);
    const { phases } = await fetchDesktopApiJson<PhasesResponse>({
      authController,
      path: `/projects/${encodeURIComponent(project.id)}/phases`,
    });
    const tasksByPhaseId = new Map<string, ApiTaskSummary[]>();

    await Promise.all(
      phases.map(async (phase) => {
        const { tasks } = await fetchDesktopApiJson<TasksResponse>({
          authController,
          path: `/phases/${encodeURIComponent(phase.id)}/tasks`,
        });
        tasksByPhaseId.set(phase.id, tasks);
      }),
    );

    console.info(`[stage-project-context] built ProjectContext with ${phases.length} phases`);
    return buildProjectContext({ phases, project, tasksByPhaseId });
  } catch (error) {
    if (error instanceof DesktopSessionExpiredError) {
      console.info("[stage-project-context] desktop session expired; returning fallback");
      return null;
    }
    throw error;
  }
}
