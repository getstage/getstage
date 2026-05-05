import { useEffect, useMemo, useState, type PointerEvent } from "react";
import { Avatar } from "@/components/ui/Avatar";
import type { Phase, Task } from "../models/project";

type KanbanStatus = "backlog" | "todo" | "in-progress" | "done";

const COLUMNS: { key: KanbanStatus; label: string }[] = [
  { key: "backlog", label: "Backlog" },
  { key: "todo", label: "To-do" },
  { key: "in-progress", label: "In-progress" },
  { key: "done", label: "Done" },
];

const PHASE_TAG_COLORS: Record<string, { bg: string; text: string }> = {
  Research: { bg: "bg-[#DCFCE7]", text: "text-[#052E16]" },
  Strategy: { bg: "bg-[#CFFAFE]", text: "text-[#083344]" },
  Identity: { bg: "bg-[#DBEAFE]", text: "text-[#172554]" },
  Guidelines: { bg: "bg-[#F3E8FF]", text: "text-[#3B0764]" },
  Design: { bg: "bg-[#F3E8FF]", text: "text-[#3B0764]" },
  Development: { bg: "bg-[#DBEAFE]", text: "text-[#172554]" },
  Delivery: { bg: "bg-[#F5F5F5]", text: "text-[#525252]" },
  Launch: { bg: "bg-[#DCFCE7]", text: "text-[#052E16]" },
  Testing: { bg: "bg-[#CFFAFE]", text: "text-[#083344]" },
  Discovery: { bg: "bg-[#CFFAFE]", text: "text-[#083344]" },
};

const DEFAULT_TAG_COLOR = { bg: "bg-[#F5F5F5]", text: "text-[#525252]" };

type BoardTask = { task: Task; phaseName: string };
type ActiveDrag = BoardTask & {
  id: string;
  width: number;
  height: number;
  pointerOffsetX: number;
  pointerOffsetY: number;
  x: number;
  y: number;
};

const ASSIGNEES = [
  { name: "Pratik Singh", initials: "P", bg: "#E5E5E5", color: "#221E6C", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop" },
  { name: "John Doe", initials: "J", bg: "#DCFCE7", color: "#052E16", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop" },
  { name: "Mark Zuck", initials: "M", bg: "#F3E8FF", color: "#3B0764", avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop" },
];

function getTaskStatus(task: Task, phaseStatus: string): KanbanStatus {
  if (task.status) return task.status;
  if (task.isCompleted) return "done";
  if (phaseStatus === "upcoming") return "backlog";
  if (phaseStatus === "active") return "in-progress";
  return "todo";
}

function buildColumns(phases: Phase[]): Record<KanbanStatus, BoardTask[]> {
  const grouped: Record<KanbanStatus, BoardTask[]> = {
    backlog: [],
    todo: [],
    "in-progress": [],
    done: [],
  };

  for (const phase of phases) {
    for (const task of phase.tasks) {
      const status = getTaskStatus(task, phase.status);
      grouped[status].push({ task, phaseName: phase.name });
    }
  }

  return grouped;
}

export function KanbanBoard({ phases }: { phases: Phase[] }) {
  const initialColumns = useMemo(() => buildColumns(phases), [phases]);
  const [columns, setColumns] = useState(initialColumns);
  const [activeDrag, setActiveDrag] = useState<ActiveDrag | null>(null);
  const [assignTaskId, setAssignTaskId] = useState<string | null>(null);
  const [assignSearch, setAssignSearch] = useState("");
  const [dragOverColumn, setDragOverColumn] = useState<KanbanStatus | null>(null);
  const [dropBeforeTaskId, setDropBeforeTaskId] = useState<string | null>(null);

  useEffect(() => {
    setColumns(initialColumns);
  }, [initialColumns]);

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

      for (const column of COLUMNS) {
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
    for (const column of COLUMNS) {
      const item = columns[column.key].find((columnTask) => columnTask.task.id === taskId);
      if (item) return item;
    }
    return undefined;
  }

  function getColumnFromPoint(x: number, y: number) {
    const element = document.elementFromPoint(x, y);
    const columnElement = element?.closest<HTMLElement>("[data-kanban-column]");
    const status = columnElement?.dataset.kanbanColumn;
    return COLUMNS.some((column) => column.key === status) ? status as KanbanStatus : null;
  }

  function getDropTargetFromPoint(x: number, y: number, draggedId: string) {
    const column = getColumnFromPoint(x, y);
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

  function assignTask(taskId: string, assignee: (typeof ASSIGNEES)[number]) {
    setColumns((current) => {
      const next = { ...current };

      for (const column of COLUMNS) {
        next[column.key] = current[column.key].map((item) => {
          if (item.task.id !== taskId) return item;
          return {
            ...item,
            task: {
              ...item.task,
              assignees: [{ name: assignee.name }],
            },
          };
        });
      }

      return next;
    });
    setAssignTaskId(null);
    setAssignSearch("");
  }

  function toggleTaskCompletion(taskId: string) {
    setColumns((current) => {
      const next = { ...current };
      for (const columnKey in next) {
        const key = columnKey as KanbanStatus;
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

  return (
    <div className="relative">
      {assignTaskId ? (
        <button
          type="button"
          aria-label="Close assign task"
          className="fixed inset-0 z-20 cursor-default bg-transparent"
          onClick={() => {
            setAssignTaskId(null);
            setAssignSearch("");
          }}
        />
      ) : null}
      <div className="grid grid-cols-1 gap-1 overflow-visible rounded-[10px] bg-[#F5F5F5] p-1 sm:grid-cols-2 lg:grid-cols-4">
        {COLUMNS.map((col) => (
          <section
            key={col.key}
            data-kanban-column={col.key}
            className={`flex min-w-0 flex-col gap-1 rounded-[8px] transition-colors ${
              dragOverColumn === col.key && activeDrag ? "bg-white/35" : ""
            }`}
          >
            <div className={`flex items-center justify-between rounded-[8px] px-4 py-3 ${col.key === "done" ? "opacity-50" : ""}`}>
              <h3 className="text-[14px] font-medium leading-[1.2] text-[#0A0A0A]">{col.label}</h3>
              <button
                type="button"
                className="flex h-[18px] w-[18px] cursor-pointer items-center justify-center rounded-[4px] bg-gradient-to-b from-white to-[#FAFAFA] text-[#A3A3A3] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-colors hover:text-[#525252]"
                aria-label={`Add ${col.label} task`}
              >
                <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="h-[14px] w-[14px]">
                  <path d="M6 2v8M2 6h8" />
                </svg>
              </button>
            </div>
            <div className="flex flex-col gap-1">
              {columns[col.key].map(({ task, phaseName }) => {
                const isDragging = activeDrag?.id === task.id;

                if (isDragging) {
                  return dragOverColumn ? null : <TaskSkeleton key={task.id} />;
                }

                return (
                  <div key={task.id} className="relative" data-kanban-task-id={task.id}>
                    {activeDrag && dragOverColumn === col.key && dropBeforeTaskId === task.id ? <TaskSkeleton /> : null}
                    <TaskCard
                      task={task}
                      phaseName={phaseName}
                      dimmed={col.key === "done"}
                      onPointerDown={(event) => startDragging(event, task.id)}
                      onAssign={() => {
                        setAssignTaskId((current) => current === task.id ? null : task.id);
                        setAssignSearch("");
                      }}
                      onToggle={() => toggleTaskCompletion(task.id)}
                    />
                    {assignTaskId === task.id ? (
                      <AssignTaskCard
                        search={assignSearch}
                        onSearchChange={setAssignSearch}
                        onAssign={(assignee) => assignTask(task.id, assignee)}
                      />
                    ) : null}
                  </div>
                );
              })}
              {columns[col.key].length === 0 && (
                <div className="rounded-[8px] bg-white/50 p-4 text-center text-[12px] text-[#737373]">
                  No tasks
                </div>
              )}
              {activeDrag && dragOverColumn === col.key && dropBeforeTaskId === null ? <TaskSkeleton /> : null}
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
          <TaskCard task={activeDrag.task} phaseName={activeDrag.phaseName} dragging />
        </div>
      ) : null}
    </div>
  );
}

function TaskSkeleton() {
  return (
    <div className="h-[119px] rounded-[8px] border border-dashed border-[#AFA9FF] bg-gradient-to-b from-white to-[#FAFAFA] opacity-60 shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]" />
  );
}

function TaskCard({
  task,
  phaseName,
  dimmed = false,
  dragging = false,
  onPointerDown,
  onAssign,
  onToggle,
}: {
  task: Task;
  phaseName: string;
  dimmed?: boolean;
  dragging?: boolean;
  onPointerDown?: (event: PointerEvent<HTMLDivElement>) => void;
  onAssign?: () => void;
  onToggle?: () => void;
}) {
  const tagColor = PHASE_TAG_COLORS[phaseName] ?? DEFAULT_TAG_COLOR;

  return (
    <div
      onPointerDown={onPointerDown}
      className={`select-none rounded-[8px] bg-gradient-to-b from-white to-[#FAFAFA] p-4 transition-[opacity,transform,box-shadow] ${
        dragging
          ? "cursor-grabbing shadow-[0_8px_22px_rgba(10,10,10,0.14)]"
          : "cursor-grab shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] hover:shadow-[0_2px_8px_rgba(10,10,10,0.08)] active:cursor-grabbing"
      } ${dimmed ? "opacity-50" : ""}`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className={`inline-flex rounded-[2px] px-[6px] py-[2px] text-[12px] font-normal leading-none ${tagColor.bg} ${tagColor.text}`}>
          {phaseName}
        </span>
        <button
          type="button"
          draggable={false}
          onMouseDown={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            onAssign?.();
          }}
          className="flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-[#E5E5E5] text-[10px] font-medium text-[#221E6C]"
          aria-label="Assign task"
        >
          {task.assignees?.[0] ? (
            <Avatar 
              name={task.assignees[0].name} 
              src={ASSIGNEES.find(a => a.name.includes(task.assignees![0].name))?.avatar}
              className="h-full w-full"
            />
          ) : (
            <img
              src="/logos/dashboard/assign.svg"
              alt=""
              aria-hidden="true"
              className="h-[14px] w-[14px]"
            />
          )}
        </button>
      </div>
      <div className="mt-3 flex flex-col gap-1">
        <div className="flex items-center gap-[6px]">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onToggle?.();
            }}
            onPointerDown={(event) => event.stopPropagation()}
            className={`flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-[4px] p-[2px] transition-colors ${
              task.isCompleted ? "bg-[#0A0A0A] text-white" : "bg-[#D4D4D4] text-transparent hover:bg-[#A3A3A3]"
            }`}
          >
            {task.isCompleted ? (
              <svg viewBox="0 0 12 12" fill="none" className="h-3 w-3">
                <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : null}
          </button>
          <p className="min-w-0 flex-1 truncate text-[13px] font-medium leading-none text-[#171717]">
            {task.title}
          </p>
        </div>
        <p className="line-clamp-2 text-[12px] font-normal leading-[1.5] text-[#525252]">
          {task.content || "Here comes the project/task description, can contain 2-3 lines at max."}
        </p>
      </div>
    </div>
  );
}

function AssignTaskCard({
  search,
  onSearchChange,
  onAssign,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  onAssign: (assignee: (typeof ASSIGNEES)[number]) => void;
}) {
  const filteredAssignees = ASSIGNEES.filter((assignee) =>
    assignee.name.toLowerCase().includes(search.trim().toLowerCase()),
  );

  return (
    <div
      className="absolute right-0 top-8 z-30 w-[266px] rounded-[8px] border-2 border-[rgba(0,0,0,0.05)] bg-gradient-to-b from-white to-[#FAFAFA] p-3 shadow-[0_8px_24px_rgba(10,10,10,0.12)]"
      onClick={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
      draggable={false}
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <img
            src="/logos/dashboard/assign.svg"
            alt=""
            aria-hidden="true"
            className="h-[14px] w-[14px]"
          />
          <p className="min-w-0 flex-1 text-[12px] font-medium leading-[1.5] text-[#0A0A0A]">
            Assign Task
          </p>
        </div>
        <label className="flex h-[31px] w-full cursor-text items-center gap-2 rounded-[6px] bg-[#F5F5F5] px-2 py-[6px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.15)]">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="h-[15px] w-[15px] text-[#737373]">
            <circle cx="7" cy="7" r="4" />
            <path d="m10 10 3 3" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search by name..."
            autoFocus
            className="min-w-0 flex-1 bg-transparent p-0 text-[13px] font-normal leading-none text-[#525252] outline-none placeholder:text-[#525252]"
          />
        </label>
        <div className="flex flex-col">
          {filteredAssignees.map((assignee) => (
            <button
              key={assignee.name}
              type="button"
              onClick={() => onAssign(assignee)}
              className="flex w-full cursor-pointer items-center gap-2 rounded-[6px] px-2 py-[6px] text-left transition-colors hover:bg-[#F5F5F5]"
            >
              <Avatar 
                name={assignee.name} 
                src={assignee.avatar}
                className="h-5 w-5"
              />
              <span className="text-[12px] font-medium leading-none text-[#262626]">
                {assignee.name}
              </span>
            </button>
          ))}
          {filteredAssignees.length === 0 ? (
            <div className="px-2 py-[6px] text-[12px] font-medium leading-none text-[#737373]">
              No matches
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
