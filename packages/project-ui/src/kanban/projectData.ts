import type { PhaseSummary, TaskSummary } from "@stage/data-ops";
import type { Phase, Task } from "./model";

// `desktop.getProjectData` rows → board phases and tasks.
export function mapTask(task: TaskSummary): Task {
  return {
    id: task.id,
    title: task.title,
    summary: task.summary,
    content: task.summary,
    hasContent: task.hasContent,
    boardStatus: task.boardStatus ?? undefined,
    isCompleted: task.isCompleted,
    updatedAt: task.updatedAt,
    assignees: task.assignees.map((assignee) => ({
      name: assignee.name ?? "Stage",
    })),
  };
}

export function mapPhase(phase: PhaseSummary, tasks: TaskSummary[]): Phase {
  const sortedTasks = [...tasks].sort((a, b) => a.order - b.order);
  return {
    id: phase.id,
    name: phase.name,
    status: phase.status,
    tasks: sortedTasks.map(mapTask),
  };
}
