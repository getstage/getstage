import type { ProjectSummary, TaskSummary } from "@stage/data-ops";
import type { Task } from "@/models/project/project";

export type TaskPriority = "high" | "medium" | "low" | "backlog";

export type TaskPriorityColumn = {
  key: TaskPriority;
  label: string;
};

export type PriorityTask = {
  task: Task;
  projectId: string;
  projectName: string;
  projectLogoUrl?: string;
};

export type PriorityColumns = Record<TaskPriority, PriorityTask[]>;

export const PRIORITY_COLUMNS: TaskPriorityColumn[] = [
  { key: "high", label: "High Priority" },
  { key: "medium", label: "Medium Priority" },
  { key: "low", label: "Low Priority" },
  { key: "backlog", label: "Backlog" },
];

export function emptyPriorityColumns(): PriorityColumns {
  return { high: [], medium: [], low: [], backlog: [] };
}

function priorityKey(priority: TaskSummary["priority"]): TaskPriority {
  if (priority === "high") return "high";
  if (priority === "medium") return "medium";
  if (priority === "low") return "low";
  return "backlog";
}

function toLocalTask(task: TaskSummary): Task {
  return {
    id: task.id,
    title: task.title,
    isCompleted: task.isCompleted,
    updatedAt: task.updatedAt,
    summary: task.summary,
    content: task.summary,
    assignees: task.assignees.map((assignee) => ({
      name: assignee.name ?? "Stage",
    })),
  };
}

export function buildPriorityColumns(
  tasks: TaskSummary[],
  projectsById: Map<string, ProjectSummary>,
): PriorityColumns {
  const columns = emptyPriorityColumns();

  for (const task of tasks) {
    const project = projectsById.get(task.projectId);
    columns[priorityKey(task.priority)].push({
      task: toLocalTask(task),
      projectId: task.projectId,
      projectName: project?.name ?? "Untitled project",
      projectLogoUrl: project?.projectImageUrl,
    });
  }

  return columns;
}

export function indexProjectsById(
  projects: ProjectSummary[],
): Map<string, ProjectSummary> {
  return new Map(projects.map((project) => [project.id, project]));
}
