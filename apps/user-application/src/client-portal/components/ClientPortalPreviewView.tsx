import { useEffect, useMemo, useState, type PointerEvent } from "react";
import { mockProject } from "@/project/data/projectSnapshot";
import type { Phase, Task } from "@/project/models/project";
import { WorkspaceFrame } from "@/app/WorkspaceFrame";

type PreviewStatus = "backlog" | "todo" | "in-progress" | "done" | "revision";
type PreviewTask = Omit<Task, "status"> & { status?: PreviewStatus };
type PreviewPhase = Omit<Phase, "tasks"> & { tasks: PreviewTask[] };
type BoardTask = { task: PreviewTask; phaseName: string };
type ActiveDrag = BoardTask & {
  id: string;
  width: number;
  height: number;
  pointerOffsetX: number;
  pointerOffsetY: number;
  x: number;
  y: number;
};

const COLUMNS: { key: PreviewStatus; label: string }[] = [
  { key: "backlog", label: "Backlog" },
  { key: "todo", label: "To-do" },
  { key: "in-progress", label: "In-progress" },
  { key: "done", label: "Done" },
  { key: "revision", label: "Revision" },
];

const TAG_COLORS: Record<string, string> = {
  Research: "bg-[#dcfce7] text-[#052e16]",
  Strategy: "bg-[#cffafe] text-[#083344]",
  Identity: "bg-[#dbeafe] text-[#172554]",
  Guidelines: "bg-[#f3e8ff] text-[#3b0764]",
  Submitted: "bg-[#f5f5f5] text-[#525252]",
};

export function ClientPortalPreviewView() {
  const project = mockProject;
  const phases = useMemo(() => addRevisionTasks(project.phases), [project.phases]);

  return (
    <WorkspaceFrame>
      <div className="flex-1 bg-white px-[clamp(16px,7vw,100px)] py-[clamp(20px,4vw,44px)] text-[#0a0a0a]">
      <div className="flex min-w-0 flex-col gap-[28px]">
        <div className="flex min-w-0 flex-col gap-[28px]">
          <header className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-[12px]">
            <div className="flex items-center gap-[2px]">
              <img src="/apple-touch-icon.png" alt="" className="h-[22px] w-[22px]" />
              <span className="font-heading text-[19px] font-semibold leading-[1.25] text-black">Stage</span>
            </div>
            <span className="justify-self-end whitespace-nowrap rounded-[8px] bg-[#fff7ed] px-[8px] py-[4px] text-[12px] font-medium leading-[1.5] text-[#ea580c]">
              You're in Preview Mode
            </span>
          </header>

          <div className="grid min-w-0 gap-[18px] xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
            <div className="min-w-0">
              <h1 className="text-[21px] font-semibold leading-[1.2] text-[#0a0a0a]">Website Revamp</h1>
              <p className="mt-[6px] text-[13px] font-medium leading-[1.5] text-[#525252]">Baseframe Design Studio</p>
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-x-[16px] gap-y-[10px] xl:justify-end xl:gap-x-[24px]">
              <div className="flex min-w-0 items-center gap-[12px]">
                <span className="shrink-0 text-[11px] font-medium leading-[1.5] text-[#525252]">12 completed%</span>
                <div className="grid min-w-[96px] flex-1 grid-cols-5 gap-[4px] sm:w-[176px] sm:flex-none">
                  <span className="h-[6px] rounded-[2px] bg-gradient-to-r from-[#8d87ff] to-[rgba(141,135,255,0.75)]" />
                  {Array.from({ length: 4 }).map((_, index) => (
                    <span key={index} className="h-[6px] rounded-[2px] bg-[#e7e6fd]" />
                  ))}
                </div>
              </div>
              <div className="hidden h-[24px] w-px bg-[#e5e5e5] sm:block" />
              <div className="flex items-center gap-[6px]">
                <span className="flex h-[22px] w-[22px] items-center justify-center rounded-[6px] bg-white text-[#8d87ff] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
                  <RefreshIcon />
                </span>
                <span className="text-[11px] font-medium leading-[1.5] text-[#525252]">3 Revisions remaining</span>
              </div>
            </div>
          </div>
        </div>

        <PreviewBoard phases={phases} />
      </div>
    </div>
    </WorkspaceFrame>
  );
}

function addRevisionTasks(phases: Phase[]): PreviewPhase[] {
  return [
    ...phases,
    {
      id: "revision",
      name: "Submitted",
      status: "active" as const,
      tasks: [
        {
          id: "revision-1",
          title: "Complete kickoff questionnaire",
          content: "Here comes the project/task description, can contain 2-3 lines at max.",
          status: "revision",
          isCompleted: false,
          updatedAt: Date.now(),
        },
        {
          id: "revision-2",
          title: "Complete kickoff questionnaire",
          content: "Here comes the project/task description, can contain 2-3 lines at max.",
          status: "revision",
          isCompleted: false,
          updatedAt: Date.now(),
        },
      ],
    },
  ];
}

function buildColumns(phases: PreviewPhase[]): Record<PreviewStatus, BoardTask[]> {
  const grouped: Record<PreviewStatus, BoardTask[]> = {
    backlog: [],
    todo: [],
    "in-progress": [],
    done: [],
    revision: [],
  };

  for (const phase of phases) {
    for (const task of phase.tasks) {
      const status = task.status === "revision" ? "revision" : task.status ?? (task.isCompleted ? "done" : "todo");
      if (status in grouped) grouped[status as PreviewStatus].push({ task, phaseName: phase.name });
    }
  }

  return grouped;
}

function PreviewBoard({ phases }: { phases: PreviewPhase[] }) {
  const initialColumns = useMemo(() => buildColumns(phases), [phases]);
  const [columns, setColumns] = useState(initialColumns);
  const [activeDrag, setActiveDrag] = useState<ActiveDrag | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<PreviewStatus | null>(null);
  const [dropBeforeTaskId, setDropBeforeTaskId] = useState<string | null>(null);

  useEffect(() => setColumns(initialColumns), [initialColumns]);

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

  function moveTask(taskId: string, targetColumn: PreviewStatus, beforeTaskId?: string | null) {
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
      const insertionIndex = beforeTaskId ? targetItems.findIndex((item) => item.task.id === beforeTaskId) : -1;
      const updatedTask = { ...movingTask, task: { ...movingTask.task, status: targetColumn, isCompleted: targetColumn === "done" } };
      if (insertionIndex >= 0) targetItems.splice(insertionIndex, 0, updatedTask);
      else targetItems.push(updatedTask);
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

  function getDropTargetFromPoint(x: number, y: number, draggedId: string) {
    const element = document.elementFromPoint(x, y);
    const columnElement = element?.closest<HTMLElement>("[data-preview-column]");
    const status = columnElement?.dataset.previewColumn;
    if (!COLUMNS.some((column) => column.key === status)) return null;
    const column = status as PreviewStatus;
    const taskElements = Array.from(document.querySelectorAll<HTMLElement>(`[data-preview-column="${column}"] [data-preview-task-id]`));
    const beforeElement = taskElements.find((taskElement) => {
      if (taskElement.dataset.previewTaskId === draggedId) return false;
      const rect = taskElement.getBoundingClientRect();
      return y < rect.top + rect.height / 2;
    });
    return { column, beforeTaskId: beforeElement?.dataset.previewTaskId ?? null };
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
  }

  return (
    <div className="relative min-w-0 rounded-[10px] bg-[#f5f5f5] p-[4px]">
      <div className="grid grid-cols-1 gap-[4px] overflow-visible md:grid-cols-2 xl:grid-cols-5">
        {COLUMNS.map((column) => (
          <section key={column.key} data-preview-column={column.key} className={`min-w-0 ${dragOverColumn === column.key && activeDrag ? "rounded-[8px] bg-white/40" : ""}`}>
            <div className="flex min-w-0 items-center justify-between gap-[10px] rounded-[8px] px-[clamp(12px,2vw,16px)] py-[12px]">
              <h2 className="min-w-0 truncate text-[14px] font-medium leading-[1.2] text-[#0a0a0a]">{column.label}</h2>
              <span className="shrink-0 text-[12px] font-medium leading-none text-[#a3a3a3]">
                {columns[column.key].length}
              </span>
            </div>
            <div className="flex min-h-[84px] flex-col gap-[4px]">
              {columns[column.key].map(({ task, phaseName }) => {
                const isDragging = activeDrag?.id === task.id;
                if (isDragging) return dragOverColumn ? null : <TaskSkeleton key={task.id} height={activeDrag?.height} />;
                return (
                  <div key={task.id} data-preview-task-id={task.id}>
                    {activeDrag && dragOverColumn === column.key && dropBeforeTaskId === task.id ? <TaskSkeleton height={activeDrag?.height} /> : null}
                    <PreviewTaskCard task={task} phaseName={phaseName} onPointerDown={(event) => startDragging(event, task.id)} />
                  </div>
                );
              })}
              {activeDrag && dragOverColumn === column.key && dropBeforeTaskId === null ? <TaskSkeleton height={activeDrag?.height} /> : null}
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
          <PreviewTaskCard task={activeDrag.task} phaseName={activeDrag.phaseName} dragging />
        </div>
      ) : null}
    </div>
  );
}

function PreviewTaskCard({ task, phaseName, dragging = false, onPointerDown }: { task: PreviewTask; phaseName: string; dragging?: boolean; onPointerDown?: (event: PointerEvent<HTMLDivElement>) => void }) {
  const isRevision = task.status === "revision";
  return (
    <div
      onPointerDown={onPointerDown}
      className={`select-none rounded-[8px] bg-gradient-to-b from-white to-[#fafafa] p-[clamp(12px,2vw,16px)] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] ${dragging ? "cursor-grabbing shadow-[0_8px_22px_rgba(10,10,10,0.14)]" : "cursor-grab active:cursor-grabbing"}`}
    >
      <div className="flex flex-col gap-[12px]">
        <span className={`w-fit rounded-[2px] px-[6px] py-[2px] text-[12px] font-normal leading-[1.25] ${TAG_COLORS[phaseName] ?? TAG_COLORS.Submitted}`}>
          {phaseName}
        </span>
        <div className="flex flex-col gap-[4px]">
          <div className="flex items-start gap-[6px]">
            {!isRevision ? (
              <button
                type="button"
                className={`mt-[1px] flex h-[16px] w-[16px] shrink-0 cursor-pointer items-center justify-center rounded-[4px] border-none outline-none ${
                  task.isCompleted ? "bg-[#0a0a0a] text-white" : "bg-[#d4d4d4] text-transparent"
                }`}
              >
                {task.isCompleted ? <CheckIcon /> : null}
              </button>
            ) : null}
            <p className="min-w-0 flex-1 text-[13px] font-medium leading-[1.25] text-[#171717]">{task.title}</p>
          </div>
          <p className="text-[12px] font-normal leading-[1.5] text-[#525252]">
            {task.content || "Here comes the project/task description, can contain 2-3 lines at max."}
          </p>
        </div>
        {isRevision ? <MessageIcon /> : null}
      </div>
    </div>
  );
}

function TaskSkeleton({ height }: { height?: number }) {
  return <div className="rounded-[8px] border border-dashed border-[#afa9ff] bg-white/60" style={{ height: height ?? 118 }} />;
}

function CheckIcon() {
  return <svg className="h-[12px] w-[12px]" viewBox="0 0 12 12" fill="none"><path d="M2.5 6 5 8.5 9.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function RefreshIcon() {
  return <svg className="h-[14px] w-[14px]" viewBox="0 0 16 16" fill="none"><path d="M12.5 8a4.5 4.5 0 1 1-1.32-3.18M12.5 3.5v3h-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function MessageIcon() {
  return <svg className="h-[16px] w-[16px] text-[#737373]" viewBox="0 0 16 16" fill="none"><path d="M4 4.5h8v6H7l-3 2v-8Z" fill="currentColor" /></svg>;
}
