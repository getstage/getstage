import { useEffect, useMemo, useState, type PointerEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { WorkspaceFrame } from "@/app/WorkspaceFrame";
import { mockProject } from "@/project/data/projectSnapshot";
import type { Task } from "@/project/models/project";
import { cn } from "@/lib/utils";

type TaskPriority = "high" | "medium" | "low" | "backlog";

type TaskPriorityColumn = {
  key: TaskPriority;
  label: string;
};

type PriorityTask = {
  task: Task;
  projectName: string;
  projectLogoUrl?: string;
};

type ActiveDrag = PriorityTask & {
  id: string;
  width: number;
  height: number;
  pointerOffsetX: number;
  pointerOffsetY: number;
  x: number;
  y: number;
};

const PRIORITY_COLUMNS: TaskPriorityColumn[] = [
  { key: "high", label: "High Priority" },
  { key: "medium", label: "Medium Priority" },
  { key: "low", label: "Low Priority" },
  { key: "backlog", label: "Backlog" },
];

const PRIORITY_SEQUENCE: TaskPriority[] = [
  "high",
  "medium",
  "low",
  "backlog",
  "high",
  "medium",
  "low",
  "backlog",
  "high",
  "low",
  "high",
];

function buildTaskColumns(): Record<TaskPriority, PriorityTask[]> {
  const grouped: Record<TaskPriority, PriorityTask[]> = {
    high: [],
    medium: [],
    low: [],
    backlog: [],
  };

  const allTasks = mockProject.phases.flatMap((phase) => phase.tasks);

  allTasks.forEach((task, index) => {
    const priority = PRIORITY_SEQUENCE[index % PRIORITY_SEQUENCE.length];
    grouped[priority].push({
      task: {
        ...task,
        title: "Complete kickoff questionnaire",
        content: task.content || "Here comes the project/task description, can contain 2-3 lines at max.",
        isCompleted: priority === "high" && grouped.high.length === 0,
      },
      projectName: "BaseFrame Product Design",
      projectLogoUrl: "/apple-touch-icon.png",
    });
  });

  return grouped;
}

export function TasksPageView() {
  const navigate = useNavigate();
  const initialColumns = useMemo(() => buildTaskColumns(), []);
  const [columns, setColumns] = useState(initialColumns);
  const [activeDrag, setActiveDrag] = useState<ActiveDrag | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TaskPriority | null>(null);
  const [dropBeforeTaskId, setDropBeforeTaskId] = useState<string | null>(null);

  useEffect(() => {
    if (!activeDrag) return;
    const draggedId = activeDrag.id;

    function handlePointerMove(event: globalThis.PointerEvent) {
      setActiveDrag((current) => current ? { ...current, x: event.clientX, y: event.clientY } : current);
      const target = getDropTargetFromPoint(event.clientX, event.clientY, draggedId);
      setDragOverColumn(target?.column ?? null);
      setDropBeforeTaskId(target?.beforeTaskId ?? null);
    }

    function handlePointerUp(event: globalThis.PointerEvent) {
      const target = getDropTargetFromPoint(event.clientX, event.clientY, draggedId);
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
  }, [activeDrag]);

  function toggleTaskCompletion(taskId: string) {
    setColumns((current) => {
      const next = { ...current };
      for (const columnKey in next) {
        const key = columnKey as TaskPriority;
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

  function moveTask(taskId: string, targetColumn: TaskPriority, beforeTaskId?: string | null) {
    if (taskId === beforeTaskId) return;

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
      const updatedTask = {
        ...movingTask,
        task: {
          ...movingTask.task,
          isCompleted: targetColumn === "high" && targetItems.length === 0,
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

  function findTask(taskId: string) {
    for (const column of PRIORITY_COLUMNS) {
      const item = columns[column.key].find((columnTask) => columnTask.task.id === taskId);
      if (item) return item;
    }
    return undefined;
  }

  function getColumnFromPoint(x: number, y: number) {
    const element = document.elementFromPoint(x, y);
    const columnElement = element?.closest<HTMLElement>("[data-task-priority-column]");
    const priority = columnElement?.dataset.taskPriorityColumn;
    return PRIORITY_COLUMNS.some((column) => column.key === priority) ? priority as TaskPriority : null;
  }

  function getDropTargetFromPoint(x: number, y: number, draggedId: string) {
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

  function startDragging(event: PointerEvent<HTMLDivElement>, taskId: string) {
    if (event.button !== 0) return;
    const item = findTask(taskId);
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
    setDropBeforeTaskId(null);
  }

  return (
    <WorkspaceFrame defaultSidebarCollapsed>
      <div className="flex-1 px-[clamp(24px,7vw,100px)] py-[44px]">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full"
        >
          <button
            type="button"
            onClick={() => void navigate({ to: "/" })}
            className="mb-6 inline-flex w-fit items-center gap-[8px] text-[13px] font-medium leading-[1.5] text-[#A3A3A3] transition-colors hover:text-[#525252]"
          >
            <ArrowLeftIcon />
            Back to dashboard
          </button>

          <header className="mb-7 flex flex-col gap-2">
            <h1 className="font-heading text-[20px] font-semibold leading-[1.2] text-[#0A0A0A]">
              Tasks
            </h1>
            <p className="text-[13px] font-medium leading-[1.2] text-[#737373]">
              See All your pending tasks in one view
            </p>
          </header>

          <div className="relative">
            <div className="grid grid-cols-1 gap-1 overflow-visible rounded-[10px] bg-[#F5F5F5] p-1 sm:grid-cols-2 xl:grid-cols-4">
              {PRIORITY_COLUMNS.map((column) => (
                <section
                  key={column.key}
                  data-task-priority-column={column.key}
                  className={cn(
                    "flex min-w-0 flex-col gap-1 rounded-[8px] transition-colors",
                    activeDrag && dragOverColumn === column.key && "bg-white/35",
                  )}
                >
                  <div className="flex items-center rounded-[8px] px-4 py-3">
                    <h2 className="text-[14px] font-medium leading-[1.2] text-[#0A0A0A]">
                      {column.label}
                    </h2>
                  </div>
                  <div className="flex min-h-[84px] flex-col gap-1">
                    {columns[column.key].map((item) => {
                      const isDragging = activeDrag?.id === item.task.id;

                      if (isDragging) {
                        return dragOverColumn ? null : <TaskSkeleton key={item.task.id} height={activeDrag.height} />;
                      }

                      return (
                        <div key={item.task.id} className="relative" data-priority-task-id={item.task.id}>
                          {activeDrag && dragOverColumn === column.key && dropBeforeTaskId === item.task.id ? (
                            <TaskSkeleton height={activeDrag.height} />
                          ) : null}
                          <PriorityTaskCard
                            item={item}
                            onPointerDown={(event) => startDragging(event, item.task.id)}
                            onToggle={() => toggleTaskCompletion(item.task.id)}
                          />
                        </div>
                      );
                    })}
                    {activeDrag && dragOverColumn === column.key && dropBeforeTaskId === null ? (
                      <TaskSkeleton height={activeDrag.height} />
                    ) : null}
                  </div>
                </section>
              ))}
            </div>

            {activeDrag ? (
              <div
                className="pointer-events-none fixed z-[9999]"
                style={{
                  left: activeDrag.x - activeDrag.pointerOffsetX,
                  top: activeDrag.y - activeDrag.pointerOffsetY,
                  width: activeDrag.width,
                  height: activeDrag.height,
                }}
              >
                <PriorityTaskCard item={activeDrag} dragging />
              </div>
            ) : null}
          </div>
        </motion.div>
      </div>
    </WorkspaceFrame>
  );
}

function PriorityTaskCard({
  item,
  dragging = false,
  onPointerDown,
  onToggle,
}: {
  item: PriorityTask;
  dragging?: boolean;
  onPointerDown?: (event: PointerEvent<HTMLDivElement>) => void;
  onToggle?: () => void;
}) {
  return (
    <div
      onPointerDown={onPointerDown}
      className={cn(
        "select-none rounded-[8px] bg-gradient-to-b from-white to-[#FAFAFA] p-4 transition-[opacity,transform,box-shadow]",
        dragging
          ? "cursor-grabbing shadow-[0_8px_22px_rgba(10,10,10,0.14)]"
          : "cursor-grab shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] hover:shadow-[0_2px_8px_rgba(10,10,10,0.08)] active:cursor-grabbing",
      )}
    >
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-[6px]">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggle?.();
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className={cn(
              "flex h-4 w-4 shrink-0 items-center justify-center overflow-hidden rounded-[4px] p-[2px] transition-colors",
              item.task.isCompleted ? "bg-[#0A0A0A] text-white" : "bg-[#D4D4D4] text-transparent hover:bg-[#A3A3A3]",
            )}
          >
            {item.task.isCompleted ? (
              <svg viewBox="0 0 12 12" fill="none" className="h-3 w-3" aria-hidden="true">
                <path
                  d="M2.5 6L5 8.5L9.5 3.5"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : null}
          </button>
          <p className="min-w-0 flex-1 truncate text-[13px] font-medium leading-none text-[#171717]">
            {item.task.title}
          </p>
        </div>
        <p className="line-clamp-2 text-[12px] font-normal leading-[1.5] text-[#525252]">
          {item.task.content}
        </p>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <img
          src={item.projectLogoUrl}
          alt=""
          aria-hidden="true"
          className="h-[18px] w-[18px] shrink-0 rounded-full object-cover"
        />
        <p className="min-w-0 flex-1 truncate text-[12px] font-medium leading-none text-[#171717]">
          {item.projectName}
        </p>
      </div>
    </div>
  );
}

function TaskSkeleton({ height }: { height?: number }) {
  return (
    <div
      style={{ height }}
      className={cn(
        "rounded-[8px] border border-dashed border-[#AFA9FF] bg-gradient-to-b from-white to-[#FAFAFA] opacity-60 shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]",
        !height && "h-[88px]",
      )}
    />
  );
}

function ArrowLeftIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="h-4 w-4">
      <path d="M10 3.5 5.5 8l4.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 8h7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
