import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import {
  useDeleteTaskMutation,
  useProjectsQuery,
  useSetTaskPriorityMutation,
  useUserTasksQuery,
} from "@/hooks/convex-data";
import {
  PRIORITY_COLUMNS,
  buildPriorityColumns,
  emptyPriorityColumns,
  indexProjectsById,
  type PriorityColumns,
  type PriorityTask,
  type TaskPriority,
} from "@/lib/tasks/priorityColumns";
import {
  getDropTargetFromPoint,
  priorityForColumn,
} from "@/lib/tasks/taskBoardDrag";

type ActiveDrag = PriorityTask & {
  id: string;
  width: number;
  height: number;
  pointerOffsetX: number;
  pointerOffsetY: number;
  x: number;
  y: number;
};

export function useTasksBoard() {
  const tasksQuery = useUserTasksQuery({ limit: 100 });
  const projectsQuery = useProjectsQuery();
  const setPriority = useSetTaskPriorityMutation();
  const deleteTask = useDeleteTaskMutation();

  const liveColumns = useMemo<PriorityColumns>(() => {
    if (!tasksQuery.data) {
      return emptyPriorityColumns();
    }
    const projectsById = indexProjectsById(projectsQuery.data ?? []);
    return buildPriorityColumns(tasksQuery.data, projectsById);
  }, [tasksQuery.data, projectsQuery.data]);

  const [columns, setColumns] = useState<PriorityColumns>(liveColumns);
  const [activeDrag, setActiveDrag] = useState<ActiveDrag | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TaskPriority | null>(null);
  const [dropBeforeTaskId, setDropBeforeTaskId] = useState<string | null>(null);
  const dragOriginRef = useRef<{ x: number; y: number } | null>(null);
  const suppressTaskOpenRef = useRef(false);

  useEffect(() => {
    setColumns(liveColumns);
  }, [liveColumns]);

  useEffect(() => {
    if (!activeDrag) return;
    const draggedId = activeDrag.id;

    function handlePointerMove(event: globalThis.PointerEvent) {
      const origin = dragOriginRef.current;
      if (origin && Math.hypot(event.clientX - origin.x, event.clientY - origin.y) > 5) {
        suppressTaskOpenRef.current = true;
      }
      setActiveDrag((current) => (current ? { ...current, x: event.clientX, y: event.clientY } : current));
      const target = getDropTargetFromPoint(event.clientX, event.clientY, draggedId);
      setDragOverColumn(target?.column ?? null);
      setDropBeforeTaskId(target?.beforeTaskId ?? null);
    }

    function handlePointerUp(event: globalThis.PointerEvent) {
      const target = getDropTargetFromPoint(event.clientX, event.clientY, draggedId);
      if (suppressTaskOpenRef.current && target) {
        moveTask(draggedId, target.column, target.beforeTaskId);
      }
      setActiveDrag(null);
      setDragOverColumn(null);
      setDropBeforeTaskId(null);
      dragOriginRef.current = null;
      window.setTimeout(() => {
        suppressTaskOpenRef.current = false;
      }, 0);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp, { once: true });
    window.addEventListener("pointercancel", handlePointerUp, { once: true });

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [activeDrag, liveColumns]);

  function toggleTaskCompletion(taskId: string) {
    setColumns((current) => {
      const next = { ...current };
      for (const { key } of PRIORITY_COLUMNS) {
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
  }

  function findCurrentColumn(taskId: string): TaskPriority | null {
    for (const column of PRIORITY_COLUMNS) {
      if (columns[column.key].some((item) => item.task.id === taskId)) {
        return column.key;
      }
    }
    return null;
  }

  function moveTask(taskId: string, targetColumn: TaskPriority, beforeTaskId?: string | null) {
    if (taskId === beforeTaskId) return;
    const previousColumn = findCurrentColumn(taskId);

    setColumns((current) => {
      let movingTask: PriorityTask | undefined;
      const next = { ...current };

      for (const column of PRIORITY_COLUMNS) {
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
      const insertionIndex = beforeTaskId
        ? targetItems.findIndex((item) => item.task.id === beforeTaskId)
        : -1;

      if (insertionIndex >= 0) {
        targetItems.splice(insertionIndex, 0, movingTask);
      } else {
        targetItems.push(movingTask);
      }

      next[targetColumn] = targetItems;
      return next;
    });

    if (previousColumn !== targetColumn) {
      setPriority.mutate(
        { taskId, priority: priorityForColumn(targetColumn) },
        {
          onError: () => {
            setColumns(liveColumns);
          },
        },
      );
    }
  }

  function handleDeleteTask(taskId: string) {
    const previous = columns;
    setColumns((current) => {
      const next = { ...current };
      for (const column of PRIORITY_COLUMNS) {
        next[column.key] = current[column.key].filter((item) => item.task.id !== taskId);
      }
      return next;
    });
    deleteTask.mutate(taskId, {
      onError: () => {
        setColumns(previous);
      },
    });
  }

  function findTask(taskId: string) {
    for (const column of PRIORITY_COLUMNS) {
      const item = columns[column.key].find((columnTask) => columnTask.task.id === taskId);
      if (item) return item;
    }
    return undefined;
  }

  function startDragging(event: PointerEvent<HTMLDivElement>, taskId: string) {
    if (event.button !== 0) return;
    const item = findTask(taskId);
    if (!item) return;

    const rect = event.currentTarget.getBoundingClientRect();
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
    dragOriginRef.current = { x: event.clientX, y: event.clientY };
    suppressTaskOpenRef.current = false;

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
    setDropBeforeTaskId(null);
  }

  return {
    columns,
    activeDrag,
    dragOverColumn,
    dropBeforeTaskId,
    projects: projectsQuery.data ?? [],
    toggleTaskCompletion,
    handleDeleteTask,
    startDragging,
  };
}
