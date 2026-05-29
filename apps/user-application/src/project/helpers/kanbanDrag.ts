import { KANBAN_COLUMNS, type KanbanStatus } from "./kanbanColumns";

export function getKanbanColumnFromPoint(x: number, y: number): KanbanStatus | null {
  const element = document.elementFromPoint(x, y);
  const columnElement = element?.closest<HTMLElement>("[data-kanban-column]");
  const status = columnElement?.dataset.kanbanColumn;
  const match = KANBAN_COLUMNS.find((column) => column.key === status);
  return match?.key ?? null;
}

export function getKanbanDropTargetFromPoint(x: number, y: number, draggedId: string) {
  const column = getKanbanColumnFromPoint(x, y);
  if (!column) return null;

  const taskElements = Array.from(
    document.querySelectorAll<HTMLElement>(`[data-kanban-column="${column}"] [data-kanban-task-id]`),
  );
  const beforeElement = taskElements.find((element) => {
    if (element.dataset.kanbanTaskId === draggedId) return false;
    const rect = element.getBoundingClientRect();
    return y < rect.top + rect.height / 2;
  });

  return {
    column,
    beforeTaskId: beforeElement?.dataset.kanbanTaskId ?? null,
  };
}
