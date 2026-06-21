import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import {
  useProjectMembersQuery,
  useSetTaskAssigneesMutation,
  useSetTaskKanbanColumnMutation,
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
  const setKanbanColumn = useSetTaskKanbanColumnMutation();
  const toggleTaskCompletionMutation = useToggleTaskCompletionMutation();
  const [columns, setColumns] = useState(initialColumns);
  const [activeDrag, setActiveDrag] = useState<KanbanDragPreview | null>(null);
  const [assignTaskId, setAssignTaskId] = useState<string | null>(null);
  const [assignSearch, setAssignSearch] = useState("");
  const [dragOverColumn, setDragOverColumn] = useState<KanbanStatus | null>(null);
  const [dropBeforeTaskId, setDropBeforeTaskId] = useState<string | null>(null);
  const [createTaskColumn, setCreateTaskColumn] = useState<KanbanStatus | null>(null);
  const dragOriginRef = useRef<{ x: number; y: number } | null>(null);
  const suppressTaskOpenRef = useRef(false);
  const pendingDragCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    setColumns(initialColumns);
  }, [initialColumns]);

  useEffect(() => () => pendingDragCleanupRef.current?.(), []);

  useEffect(() => {
    if (!activeDrag) return;
    const draggedId = activeDrag.id;

    function handlePointerMove(event: globalThis.PointerEvent) {
      const origin = dragOriginRef.current;
      if (origin && Math.hypot(event.clientX - origin.x, event.clientY - origin.y) > 5) {
        suppressTaskOpenRef.current = true;
      }
      setActiveDrag((current) => (current ? { ...current, x: event.clientX, y: event.clientY } : current));
      const target = getKanbanDropTargetFromPoint(event.clientX, event.clientY, draggedId);
      setDragOverColumn(target?.column ?? null);
      setDropBeforeTaskId(target?.beforeTaskId ?? null);
    }

    function handlePointerUp(event: globalThis.PointerEvent) {
      const target = getKanbanDropTargetFromPoint(event.clientX, event.clientY, draggedId);
      if (suppressTaskOpenRef.current && target) moveTask(draggedId, target.column, target.beforeTaskId);
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
    const previous = columns;

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

    setKanbanColumn.mutate(
      { taskId, boardStatus: targetColumn },
      {
        onError: () => {
          setColumns(previous);
        },
      },
    );
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
    const origin = { x: event.clientX, y: event.clientY };
    dragOriginRef.current = origin;
    suppressTaskOpenRef.current = false;
    pendingDragCleanupRef.current?.();

    const cleanup = () => {
      window.removeEventListener("pointermove", activateDrag);
      window.removeEventListener("pointerup", cancelPendingDrag);
      window.removeEventListener("pointercancel", cancelPendingDrag);
      pendingDragCleanupRef.current = null;
    };
    const cancelPendingDrag = () => {
      cleanup();
      dragOriginRef.current = null;
    };
    const activateDrag = (moveEvent: globalThis.PointerEvent) => {
      if (Math.hypot(moveEvent.clientX - origin.x, moveEvent.clientY - origin.y) <= 5) return;
      cleanup();
      moveEvent.preventDefault();
      suppressTaskOpenRef.current = true;
      setActiveDrag({
        ...item,
        id: taskId,
        width: rect.width,
        height: rect.height,
        pointerOffsetX: origin.x - rect.left,
        pointerOffsetY: origin.y - rect.top,
        x: moveEvent.clientX,
        y: moveEvent.clientY,
      });
      setDropBeforeTaskId(null);
    };

    window.addEventListener("pointermove", activateDrag);
    window.addEventListener("pointerup", cancelPendingDrag, { once: true });
    window.addEventListener("pointercancel", cancelPendingDrag, { once: true });
    pendingDragCleanupRef.current = cleanup;
    setAssignTaskId(null);
    setAssignSearch("");
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
    shouldSuppressTaskOpen: () => suppressTaskOpenRef.current,
  };
}
