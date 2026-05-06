import {
  projectContextSchema,
  type ProjectContext,
  type ProjectContextAsset,
  type ProjectContextTask,
} from "@stage/data-ops";

export type DesktopConvexTaskSelection = {
  id: string;
  title: string;
  isCompleted: boolean;
  content?: string;
  updatedAt?: number;
};

export type DesktopConvexPhaseSelection = {
  id: string;
  name: string;
  status: "completed" | "active" | "upcoming";
  tasks: DesktopConvexTaskSelection[];
};

export type DesktopConvexAssetSelection = {
  id: string;
  name: string;
  kind: ProjectContextAsset["kind"];
  url?: string;
  summary?: string;
};

export type DesktopConvexProjectSelection = {
  id: string;
  name: string;
  clientName?: string;
  brief?: string;
  strategy?: string;
  visualDirection?: string;
  phases: DesktopConvexPhaseSelection[];
  assets?: DesktopConvexAssetSelection[];
  updatedAt: number;
};

function toProjectContextTask(
  phase: DesktopConvexPhaseSelection,
  task: DesktopConvexTaskSelection,
): ProjectContextTask {
  return {
    id: task.id,
    title: task.title,
    phaseName: phase.name,
    status: task.isCompleted ? "done" : phase.status === "active" ? "in_progress" : "todo",
    description: task.content,
    updatedAt: task.updatedAt,
  };
}

export function buildProjectContextFromConvexSelection(
  project: DesktopConvexProjectSelection,
): ProjectContext {
  const currentPhase = project.phases.find((phase) => phase.status === "active");

  return projectContextSchema.parse({
    apiVersion: "v1",
    projectId: project.id,
    projectName: project.name,
    clientName: project.clientName,
    brief: project.brief,
    strategy: project.strategy,
    visualDirection: project.visualDirection,
    currentPhase: currentPhase?.name,
    tasks: project.phases.flatMap((phase) =>
      phase.tasks.map((task) => toProjectContextTask(phase, task)),
    ),
    assets: project.assets ?? [],
    updatedAt: project.updatedAt,
  });
}
