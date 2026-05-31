import { useEffect, useMemo, useState, type PointerEvent } from "react";
import {
  useProjectMembersQuery,
  useSetTaskAssigneesMutation,
  useToggleTaskCompletionMutation,
} from "@/hooks/convex-data";
import type { ProjectMember } from "@/hooks/convex-data";
import {
  buildKanbanColumns,
  KANBAN_COLUMNS,
  type BoardTask,
  type KanbanStatus,
} from "@/lib/project/kanbanColumns";
import { getKanbanDropTargetFromPoint } from "@/lib/project/kanbanDrag";
import type { Phase } from "@/models/project/project";
import type { KanbanDragPreview } from "@/components/project/kanban/KanbanTaskCard";

export function useKanbanBoard(phases: Phase[], projectId?: string) {
  const initialColumns = useMemo(() => buildKanbanColumns(phases), [phases]);
  const membersQuery = useProjectMembersQuery(projectId);
  const setAssignees = useSetTaskAssigneesMutation();
  const toggleTaskCompletionMutation = useToggleTaskCompletionMutation();
  const [columns, setColumns] = useState(initialColumns);
  const [activeDrag, setActiveDrag] = useState<KanbanDragPreview | null>(null);
  const [assignTaskId, setAssignTaskId] = useState<string | null>(null);
  const [assignSearch, setAssignSearch] = useState("");
  const [dragOverColumn, setDragOverColumn] = useState<KanbanStatus | null>(null);
  const [dropBeforeTaskId, setDropBeforeTaskId] = useState<string | null>(null);
  const [createTaskColumn, setCreateTaskColumn] = useState<KanbanStatus | null>(null);

  useEffect(() => {
    setColumns(initialColumns);
  }, [initialColumns]);

  useEffect(() => {
    if (!activeDrag) return;
    const draggedId = activeDrag.id;

    function handlePointerMove(event: globalThis.PointerEvent) {
      setActiveDrag((current) => (current ? { ...current, x: event.clientX, y: event.clientY } : current));
      const target = getKanbanDropTargetFromPoint(event.clientX, event.clientY, draggedId);
      setDragOverColumn(target?.column ?? null);
      setDropBeforeTaskId(target?.beforeTaskId ?? null);
    }

    function handlePointerUp(event: globalThis.PointerEvent) {
      const target = getKanbanDropTargetFromPoint(event.clientX, event.clientY, draggedId);
      if (target) moveTask(draggedId, target.column, target.beforeTaskId);
      setActiveDrag(null);
      setDragOverColumn(null);
      setDropBeforeTaskId(null);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp, { once: true });
    window.addEventListener("pointercancel", handlePointerUp, { once: true });

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [activeDrag, initialColumns]);

  useEffect(() => {
    if (!assignTaskId) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setAssignTaskId(null);
        setAssignSearch("");
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [assignTaskId]);

  function moveTask(taskId: string, targetColumn: KanbanStatus, beforeTaskId?: string | null) {
    if (taskId === beforeTaskId) return;

    setColumns((current) => {
      let movingTask: BoardTask | undefined;
      const next = { ...current };

      for (const column of KANBAN_COLUMNS) {
        next[column.key] = current[column.key].filter((item) => {
          if (item.task.id === taskId) {
            movingTask = item;
            return false;
          }
          return true;
        });
      }

      if (!movingTask) return current;

      const targetItems = [...next[targetColumn]];
      const updatedTask = {
        ...movingTask,
        task: {
          ...movingTask.task,
          status: targetColumn,
          isCompleted: targetColumn === "done",
        },
      };
      const insertionIndex = beforeTaskId
        ? targetItems.findIndex((item) => item.task.id === beforeTaskId)
        : -1;

      if (insertionIndex >= 0) {
        targetItems.splice(insertionIndex, 0, updatedTask);
      } else {
        targetItems.push(updatedTask);
      }

      next[targetColumn] = targetItems;
      return next;
    });
  }

  function findBoardTask(taskId: string) {
    for (const column of KANBAN_COLUMNS) {
      const item = columns[column.key].find((columnTask) => columnTask.task.id === taskId);
      if (item) return item;
    }
    return undefined;
  }

  function startDragging(event: PointerEvent<HTMLDivElement>, taskId: string) {
    if (event.button !== 0) return;
    const item = findBoardTask(taskId);
    if (!item) return;

    const rect = event.currentTarget.getBoundingClientRect();
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();

    setActiveDrag({
      ...item,
      id: taskId,
      width: rect.width,
      height: rect.height,
      pointerOffsetX: event.clientX - rect.left,
      pointerOffsetY: event.clientY - rect.top,
      x: event.clientX,
      y: event.clientY,
    });
    setAssignTaskId(null);
    setAssignSearch("");
    setDropBeforeTaskId(null);
  }

  async function assignTask(taskId: string, member: ProjectMember) {
    try {
      await setAssignees.mutateAsync({
        taskId,
        assigneeIds: [member.userId],
      });
    } catch {
      return;
    }
    setAssignTaskId(null);
    setAssignSearch("");
  }

  function toggleTaskCompletion(taskId: string) {
    const previous = columns;
    setColumns((current) => {
      const next = { ...current };
      for (const { key } of KANBAN_COLUMNS) {
        next[key] = next[key].map((item) => {
          if (item.task.id === taskId) {
            return {
              ...item,
              task: { ...item.task, isCompleted: !item.task.isCompleted },
            };
          }
          return item;
        });
      }
      return next;
    });
    toggleTaskCompletionMutation.mutate(taskId, {
      onError: () => {
        setColumns(previous);
      },
    });
  }

  function closeAssignOverlay() {
    setAssignTaskId(null);
    setAssignSearch("");
  }

  return {
    columns,
    members: membersQuery.data,
    activeDrag,
    assignTaskId,
    assignSearch,
    dragOverColumn,
    dropBeforeTaskId,
    createTaskColumn,
    setAssignSearch,
    setAssignTaskId,
    setCreateTaskColumn,
    startDragging,
    assignTask,
    toggleTaskCompletion,
    closeAssignOverlay,
  };
}
