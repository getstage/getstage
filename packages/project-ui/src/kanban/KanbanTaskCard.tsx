import type { PointerEvent } from "react";
import { Avatar } from "../Avatar";
import { DEFAULT_PHASE_TAG_COLOR, PHASE_TAG_COLORS, type BoardTask } from "./columns";
import type { Task } from "./model";

const ASSIGNEE_CIRCLE = "flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-[#E5E5E5] text-[10px] font-medium text-[#221E6C]";

export function KanbanTaskCard({
  task,
  phaseName,
  description,
  assigneeAvatarUrl,
  dimmed = false,
  dragging = false,
  onPointerDown,
  onAssign,
  onToggle,
  onOpen,
}: {
  task: Task;
  phaseName: string;
  // The Mac app loads the full description and the assignee's photo; without them the card uses the task's summary.
  description?: string;
  assigneeAvatarUrl?: string;
  dimmed?: boolean;
  dragging?: boolean;
  onPointerDown?: (event: PointerEvent<HTMLDivElement>) => void;
  onAssign?: () => void;
  onToggle?: () => void;
  onOpen?: () => void;
}) {
  const tagColor = PHASE_TAG_COLORS[phaseName] ?? DEFAULT_PHASE_TAG_COLOR;
  const assignee = task.assignees?.[0];

  return (
    <div
      onPointerDown={onPointerDown}
      onClick={onOpen}
      role={onOpen ? "button" : undefined}
      tabIndex={onOpen ? 0 : undefined}
      onKeyDown={(event) => {
        if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          onOpen?.();
        }
      }}
      className={`select-none rounded-[8px] bg-gradient-to-b from-white to-[#FAFAFA] p-4 transition-[opacity,transform,box-shadow] ${
        dragging
          ? "origin-top-left rotate-[-2deg] cursor-grabbing shadow-[0_8px_22px_rgba(10,10,10,0.14)]"
          : "cursor-pointer shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] outline-none hover:shadow-[0_2px_8px_rgba(10,10,10,0.08)] focus-visible:ring-2 focus-visible:ring-[#8d87ff]"
      } ${dimmed ? "opacity-50" : ""}`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className={`inline-flex rounded-[2px] px-[6px] py-[2px] text-[12px] font-normal leading-[1.25] ${tagColor.bg} ${tagColor.text}`}>
          {phaseName}
        </span>
        {onAssign ? (
          <button
            type="button"
            draggable={false}
            onMouseDown={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onAssign();
            }}
            className={ASSIGNEE_CIRCLE}
            aria-label="Assign task"
          >
            {assignee ? (
              <Avatar name={assignee.name} src={assigneeAvatarUrl} className="h-full w-full" />
            ) : (
              <img src="/logos/dashboard/assign.svg" alt="" aria-hidden="true" className="h-[14px] w-[14px]" />
            )}
          </button>
        ) : assignee ? (
          <span className={ASSIGNEE_CIRCLE}>
            <Avatar name={assignee.name} src={assigneeAvatarUrl} className="h-full w-full" />
          </span>
        ) : null}
      </div>
      <div className="mt-3 flex flex-col gap-1">
        <div className="flex items-center gap-[6px]">
          <button
            type="button"
            disabled={!onToggle}
            aria-label={task.isCompleted ? "Mark as not done" : "Mark as done"}
            onClick={(event) => {
              event.stopPropagation();
              onToggle?.();
            }}
            onPointerDown={(event) => event.stopPropagation()}
            className={`flex h-4 w-4 shrink-0 cursor-pointer items-center disabled:cursor-default justify-center overflow-hidden rounded-[4px] p-[2px] transition-colors ${
              task.isCompleted ? "bg-[#0A0A0A] text-white" : "bg-[#D4D4D4] text-transparent enabled:hover:bg-[#A3A3A3]"
            }`}
          >
            {task.isCompleted ? (
              <svg viewBox="0 0 12 12" fill="none" className="h-3 w-3">
                <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : null}
          </button>
          <span className="min-w-0 flex-1 truncate text-left text-[13px] font-medium leading-[1.25] text-[#171717]">
            {task.title}
          </span>
        </div>
        <p className="line-clamp-2 text-[12px] font-normal leading-[1.5] text-[#525252]">
          {description || task.content?.trim() || task.summary || "No description yet."}
        </p>
        {task.revisionNote ? (
          <p className="mt-1 line-clamp-3 rounded-[6px] bg-[#FEF3E2] p-2 text-[12px] font-normal leading-[1.5] text-[#92400E]">
            Client revision: {task.revisionNote}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export type KanbanDragPreview = BoardTask & {
  id: string;
  width: number;
  height: number;
  pointerOffsetX: number;
  pointerOffsetY: number;
  x: number;
  y: number;
};
