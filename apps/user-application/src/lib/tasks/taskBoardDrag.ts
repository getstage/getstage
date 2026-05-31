import { PRIORITY_COLUMNS, type TaskPriority } from "./priorityColumns";

export function priorityForColumn(column: TaskPriority): "low" | "medium" | "high" | null {
  return column === "backlog" ? null : column;
}

export function getColumnFromPoint(x: number, y: number): TaskPriority | null {
  const element = document.elementFromPoint(x, y);
  const columnElement = element?.closest<HTMLElement>("[data-task-priority-column]");
  const candidate = columnElement?.dataset.taskPriorityColumn;
  const match = PRIORITY_COLUMNS.find((column) => column.key === candidate);
  return match?.key ?? null;
}

export function getDropTargetFromPoint(x: number, y: number, draggedId: string) {
  const column = getColumnFromPoint(x, y);
  if (!column) return null;

  const taskElements = Array.from(
    document.querySelectorAll<HTMLElement>(`[data-task-priority-column="${column}"] [data-priority-task-id]`),
  );
  const beforeElement = taskElements.find((element) => {
    if (element.dataset.priorityTaskId === draggedId) return false;
    const rect = element.getBoundingClientRect();
    return y < rect.top + rect.height / 2;
  });

  return {
    column,
    beforeTaskId: beforeElement?.dataset.priorityTaskId ?? null,
  };
}
