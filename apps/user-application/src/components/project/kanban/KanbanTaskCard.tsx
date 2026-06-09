import type { PointerEvent } from "react";
import { useQuery as useConvexQuery } from "convex/react";
import { parseConvexTaskId } from "@stage/data-ops";
import { Avatar } from "@/components/ui/Avatar";
import { KANBAN_ASSIGNEES } from "@/data/fixtures/project/kanbanAssignees";
import { useSettingsOverviewQuery } from "@/hooks/convex-data";
import { api } from "@/lib/convexApi";
import {
  DEFAULT_PHASE_TAG_COLOR,
  PHASE_TAG_COLORS,
  type BoardTask,
} from "@/lib/project/kanbanColumns";
import type { Task } from "@/models/project/project";

export function KanbanTaskCard({
  task,
  phaseName,
  dimmed = false,
  dragging = false,
  onPointerDown,
  onAssign,
  onToggle,
  onOpen,
}: {
  task: Task;
  phaseName: string;
  dimmed?: boolean;
  dragging?: boolean;
  onPointerDown?: (event: PointerEvent<HTMLDivElement>) => void;
  onAssign?: () => void;
  onToggle?: () => void;
  onOpen?: () => void;
}) {
  const tagColor = PHASE_TAG_COLORS[phaseName] ?? DEFAULT_PHASE_TAG_COLOR;
  const settingsOverviewQuery = useSettingsOverviewQuery();
  const profile = settingsOverviewQuery.data?.profile;
  const assignee = task.assignees?.[0];
  const assigneeAvatarUrl = assignee
    ? getTaskAssigneeAvatarUrl(assignee.name, profile)
    : undefined;
  const convexTaskId = task.hasContent ? parseConvexTaskId(task.id) : null;
  const taskDetail = useConvexQuery(
    api.tasks.getDetail,
    convexTaskId ? { taskId: convexTaskId } : "skip",
  );
  const description = taskDetail?.task.content?.trim() || task.content?.trim();

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
        <span className={`inline-flex rounded-[2px] px-[6px] py-[2px] text-[12px] font-normal leading-[1.25] ${tagColor.bg} ${tagColor.text}`}>
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
          {assignee ? (
            <Avatar
              name={assignee.name}
              src={assigneeAvatarUrl}
              className="h-full w-full"
            />
          ) : (
            <img src="/logos/dashboard/assign.svg" alt="" aria-hidden="true" className="h-[14px] w-[14px]" />
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
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onOpen?.();
            }}
            onPointerDown={(event) => event.stopPropagation()}
            className="min-w-0 flex-1 cursor-pointer truncate text-left text-[13px] font-medium leading-[1.25] text-[#171717] outline-none hover:underline focus-visible:underline"
          >
            {task.title}
          </button>
        </div>
        <p className="line-clamp-2 text-[12px] font-normal leading-[1.5] text-[#525252]">
          {description || task.summary || "No description yet."}
        </p>
      </div>
    </div>
  );
}

function getTaskAssigneeAvatarUrl(
  assigneeName: string,
  profile: { name: string; email: string; avatarUrl: string | null } | undefined,
) {
  if (profile?.avatarUrl && (assigneeName === profile.name || assigneeName === profile.email)) {
    return profile.avatarUrl;
  }

  return KANBAN_ASSIGNEES.find((assignee) => assignee.name.includes(assigneeName))?.avatar;
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
