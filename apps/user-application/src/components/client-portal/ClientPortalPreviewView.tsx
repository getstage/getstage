import { useEffect, useMemo, useState, type PointerEvent } from "react";
import { useNavigate, useParams } from "@tanstack/react-router";
import { parseConvexId } from "@stage/data-ops";
import { useLiveProject } from "@/hooks/project";
import { useSettingsOverviewQuery } from "@/hooks/convex-data";
import type { Phase, Task } from "@/models/project/project";

type PreviewStatus = "backlog" | "todo" | "in-progress" | "done" | "revision";
type PreviewTask = Omit<Task, "status"> & { status?: PreviewStatus };
type PreviewPhase = Omit<Phase, "tasks"> & { tasks: PreviewTask[] };
type BoardTask = { task: PreviewTask; phaseName: string };
type PendingRevisionMove = {
  taskId: string;
  targetColumn: PreviewStatus;
  beforeTaskId?: string | null;
} | null;
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
  const navigate = useNavigate();
  const { projectId } = useParams({ from: "/_authed/client-portal/$projectId/preview" });
  const convexProjectId = parseConvexId<"projects">(projectId);
  const live = useLiveProject(projectId, { enabled: convexProjectId !== null });
  const settingsOverview = useSettingsOverviewQuery();
  const portalBranding = settingsOverview.data?.portalBranding;
  const phases = live.project?.phases ?? [];
  const progress = live.detail?.progress ?? 0;
  const completedSegments = Math.min(5, Math.max(0, Math.round(progress / 20)));

  if (!convexProjectId) {
    return (
      <PreviewState
        title="Project not found"
        message="This preview link does not point to a live project."
        actionLabel="Back to Client Portal"
        onAction={() => void navigate({ to: "/client-portal" })}
      />
    );
  }

  if (live.isLoading) {
    return <PreviewState title="Loading preview..." message="Fetching live project data." />;
  }

  if (live.isNotFound || !live.project || !live.detail) {
    return (
      <PreviewState
        title="Project not found"
        message="We could not load this project for preview."
        actionLabel="Back to Client Portal"
        onAction={() => void navigate({ to: "/client-portal" })}
      />
    );
  }

  return (
    <div className="flex-1 bg-white px-[clamp(16px,7vw,100px)] py-[clamp(20px,4vw,44px)] text-[#0a0a0a]">
      <div className="flex min-w-0 flex-col gap-[28px]">
        <div className="flex min-w-0 flex-col gap-[28px]">
          <header className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-[12px]">
            <div className="flex items-center gap-[8px]">
              {portalBranding?.logoUrl ? (
                <img src={portalBranding.logoUrl} alt="" className="h-[22px] w-[22px] rounded-full object-cover" />
              ) : (
                <img src="/apple-touch-icon.png" alt="" className="h-[22px] w-[22px]" />
              )}
              <span className="font-heading text-[19px] font-semibold leading-[1.25] text-black">Stage</span>
            </div>
            <span className="justify-self-end whitespace-nowrap rounded-[8px] bg-[#fff7ed] px-[8px] py-[4px] text-[12px] font-medium leading-[1.5] text-[#ea580c]">
              You're in Preview Mode
            </span>
          </header>

          <div className="grid min-w-0 gap-[18px] xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
            <div className="min-w-0">
              <h1 className="text-[21px] font-semibold leading-[1.2] text-[#0a0a0a]">{live.project.name}</h1>
              <p className="mt-[6px] text-[13px] font-medium leading-[1.5] text-[#525252]">
                {live.project.clientName}
              </p>
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-x-[16px] gap-y-[10px] xl:justify-end xl:gap-x-[24px]">
              <div className="flex min-w-0 items-center gap-[12px]">
                <span className="shrink-0 text-[11px] font-medium leading-[1.5] text-[#525252]">
                  {progress}% completed
                </span>
                <div className="grid min-w-[96px] flex-1 grid-cols-5 gap-[4px] sm:w-[176px] sm:flex-none">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <span
                      key={index}
                      className="h-[6px] rounded-[2px]"
                      style={{
                        background:
                          index < completedSegments
                            ? portalBranding?.accentColor ?? "#8d87ff"
                            : "#e7e6fd",
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <PreviewBoard phases={phases} />
      </div>
    </div>
  );
}

function PreviewState({
  title,
  message,
  actionLabel,
  onAction,
}: {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <p className="text-[18px] font-semibold text-[#0a0a0a]">{title}</p>
      <p className="max-w-[360px] text-[13px] font-medium text-[#525252]">{message}</p>
      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="rounded-[8px] bg-[#0a0a0a] px-4 py-2 text-[13px] font-medium text-white"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
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
      const status =
        task.status === "revision"
          ? "revision"
          : task.boardStatus ?? task.status ?? (task.isCompleted ? "done" : "todo");
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
  const [pendingRevisionMove, setPendingRevisionMove] = useState<PendingRevisionMove>(null);
  const [isRevisionDetailsOpen, setIsRevisionDetailsOpen] = useState(false);

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
      if (target?.column === "revision") {
        setPendingRevisionMove({ taskId: draggedId, targetColumn: target.column, beforeTaskId: target.beforeTaskId });
      } else if (target) {
        moveTask(draggedId, target.column, target.beforeTaskId);
      }
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
                    <PreviewTaskCard
                      task={task}
                      phaseName={phaseName}
                      onPointerDown={(event) => startDragging(event, task.id)}
                      onRevisionDetails={() => setIsRevisionDetailsOpen(true)}
                    />
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
      {pendingRevisionMove ? (
        <RequestRevisionModal
          onClose={() => setPendingRevisionMove(null)}
          onRequest={() => {
            moveTask(pendingRevisionMove.taskId, pendingRevisionMove.targetColumn, pendingRevisionMove.beforeTaskId);
            setPendingRevisionMove(null);
          }}
        />
      ) : null}
      {isRevisionDetailsOpen ? <RevisionDetailsModal onClose={() => setIsRevisionDetailsOpen(false)} /> : null}
    </div>
  );
}

function PreviewTaskCard({
  task,
  phaseName,
  dragging = false,
  onPointerDown,
  onRevisionDetails,
}: {
  task: PreviewTask;
  phaseName: string;
  dragging?: boolean;
  onPointerDown?: (event: PointerEvent<HTMLDivElement>) => void;
  onRevisionDetails?: () => void;
}) {
  const isRevision = task.status === "revision";
  if (isRevision) {
    return (
      <div
        onPointerDown={onPointerDown}
        className={`select-none rounded-[8px] bg-gradient-to-b from-white to-[#fafafa] p-[16px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] ${dragging ? "cursor-grabbing shadow-[0_8px_22px_rgba(10,10,10,0.14)]" : "cursor-grab active:cursor-grabbing"}`}
      >
        <div className="flex flex-col gap-[12px]">
          <span className="w-fit rounded-[2px] bg-[#f5f5f5] px-[6px] py-[2px] text-[12px] font-normal leading-none text-[#525252]">
            Submitted
          </span>
          <div className="flex flex-col gap-[12px]">
            <div className="flex flex-col gap-[4px]">
              <span className="min-w-0 text-left text-[13px] font-medium leading-none text-[#171717]">
                {task.title}
              </span>
              {task.content?.trim() ? (
                <p className="text-[12px] font-normal leading-[1.5] text-[#525252]">
                  {task.content.trim()}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onRevisionDetails?.();
              }}
              onPointerDown={(event) => event.stopPropagation()}
              className="flex h-[16px] w-[16px] cursor-pointer items-center justify-center"
              aria-label="View revision details"
            >
              <MaskedIcon src="/logos/dashboard/revision.svg" className="h-[16px] w-[16px] bg-[#737373]" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onPointerDown={onPointerDown}
      className={`select-none rounded-[8px] bg-gradient-to-b from-white to-[#fafafa] p-[clamp(12px,2vw,16px)] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] ${dragging ? "cursor-grabbing shadow-[0_8px_22px_rgba(10,10,10,0.14)]" : "cursor-grab active:cursor-grabbing"}`}
    >
      <div className="flex flex-col gap-[12px]">
        <span className={`w-fit rounded-[2px] px-[6px] py-[2px] text-[12px] font-normal leading-[1.25] ${isRevision ? TAG_COLORS.Submitted : TAG_COLORS[phaseName] ?? TAG_COLORS.Submitted}`}>
          {isRevision ? "Submitted" : phaseName}
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
            <span className="min-w-0 flex-1 text-left text-[13px] font-medium leading-[1.25] text-[#171717]">
              {task.title}
            </span>
          </div>
          {task.content?.trim() ? (
            <p className="text-[12px] font-normal leading-[1.5] text-[#525252]">
              {task.content.trim()}
            </p>
          ) : null}
        </div>
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

function RequestRevisionModal({ onClose, onRequest }: { onClose: () => void; onRequest: () => void }) {
  return (
    <RevisionOverlay onClose={onClose}>
      <section role="dialog" aria-modal="true" aria-labelledby="request-revision-title" className="relative z-[91] flex w-full max-w-[516px] flex-col rounded-[12px] bg-[#f5f5f5] p-[4px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
        <div className="px-[12px] pb-[12px] pt-[8px]">
          <h2 id="request-revision-title" className="text-[13px] font-medium leading-[1.5] text-[#0a0a0a]">Request Revision</h2>
        </div>
        <div className="flex flex-col gap-[4px]">
          <div className="flex flex-col gap-[16px] rounded-[8px] bg-white p-[12px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
            <RevisionTextArea label="Describe Revision Changes" />
            <RevisionTextArea label="Additional Notes" />
            <div className="flex flex-col gap-[8px]">
              <p className="text-[13px] font-medium leading-none text-[#171717]">Upload Resources/Documents</p>
              <button type="button" className="flex w-[282px] max-w-full items-start gap-[12px] rounded-[6px] bg-[#f5f5f5] py-[10px] pl-[12px] pr-[44px] text-left shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
                <MaskedIcon src="/logos/dashboard/upload-from-device.svg" className="h-[16px] w-[16px] shrink-0 bg-[#525252]" />
                <span className="flex flex-col gap-[6px] text-[12px] font-medium leading-none">
                  <span className="text-[#262626]">Upload Document</span>
                  <span className="text-[#737373]">PDF, DOCX, PPT etc.</span>
                </span>
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={onRequest}
            className="flex w-full items-center justify-center gap-[8px] rounded-[6px] border border-[rgba(158,153,248,0.75)] bg-gradient-to-b from-[#7b76df] to-[#463fba] py-[10px] pl-[10px] pr-[12px] text-[13px] font-medium leading-none text-[#fafafa] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]"
            style={{ textShadow: "0px 0.5px 1.5px rgba(0,0,0,0.15)" }}
          >
            Request Revision
            <ArrowRightIcon />
          </button>
        </div>
      </section>
    </RevisionOverlay>
  );
}

function RevisionDetailsModal({ onClose }: { onClose: () => void }) {
  return (
    <RevisionOverlay onClose={onClose}>
      <section role="dialog" aria-modal="true" aria-labelledby="revision-details-title" className="relative z-[91] flex w-full max-w-[516px] flex-col rounded-[12px] bg-[#f5f5f5] p-[4px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
        <div className="px-[12px] pb-[12px] pt-[8px]">
          <h2 id="revision-details-title" className="text-[13px] font-medium leading-[1.5] text-[#0a0a0a]">Revision Details</h2>
        </div>
        <div className="flex flex-col gap-[32px] rounded-[8px] bg-white p-[12px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
          <RevisionInfo label="Describe Revision Changes">
            Can you please update the content on this page? It’s still the old version.
          </RevisionInfo>
          <RevisionInfo label="Additional Notes">N/A</RevisionInfo>
          <div className="flex flex-col gap-[8px]">
            <p className="text-[13px] font-medium leading-none text-[#171717]">Upload Resources/Documents</p>
            <div className="flex flex-col gap-[4px]">
              <RevisionFileRow />
              <RevisionFileRow />
            </div>
          </div>
        </div>
      </section>
    </RevisionOverlay>
  );
}

function RevisionOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/10 px-[16px] py-[20px] backdrop-blur-[2px]">
      <button type="button" aria-label="Close revision modal" className="absolute inset-0 cursor-default" onClick={onClose} />
      {children}
    </div>
  );
}

function RevisionTextArea({ label }: { label: string }) {
  return (
    <label className="flex flex-col gap-[8px]">
      <span className="text-[13px] font-medium leading-none text-[#171717]">{label}</span>
      <textarea placeholder="Type here..." className="h-[67px] w-full resize-none rounded-[6px] bg-[#f5f5f5] px-[12px] py-[10px] text-[12px] font-medium leading-none text-[#171717] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] outline-none placeholder:text-[#525252]" />
    </label>
  );
}

function RevisionInfo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-[8px] text-[13px] font-medium leading-none">
      <p className="text-[#171717]">{label}</p>
      <p className="text-[#525252]">{children}</p>
    </div>
  );
}

function RevisionFileRow() {
  return (
    <div className="flex items-center justify-between rounded-[8px] bg-[#f5f5f5] p-[8px]">
      <div className="flex min-w-0 items-center gap-[8px]">
        <MaskedIcon src="/logos/dashboard/upload-from-device.svg" className="h-[20px] w-[20px] shrink-0 bg-[#525252]" />
        <p className="truncate text-[13px] font-medium leading-none text-[#171717]">Example.fig</p>
      </div>
      <p className="shrink-0 text-[12px] font-medium leading-none text-[#737373]">2.3MB</p>
    </div>
  );
}

function ArrowRightIcon() {
  return <svg className="h-[16px] w-[16px]" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3.5 8h9M9 4.5 12.5 8 9 11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function MaskedIcon({ src, className }: { src: string; className: string }) {
  return (
    <span
      aria-hidden="true"
      className={className}
      style={{
        mask: `url(${src}) center / contain no-repeat`,
        WebkitMask: `url(${src}) center / contain no-repeat`,
      }}
    />
  );
}
