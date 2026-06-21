import type { PointerEvent } from "react";
import type { PriorityTask } from "@/lib/tasks/priorityColumns";
import { cn } from "@/lib/utils";

export function PriorityTaskCard({
  item,
  dragging = false,
  onOpen,
  onPointerDown,
  onToggle,
  onDelete,
}: {
  item: PriorityTask;
  dragging?: boolean;
  onOpen?: () => void;
  onPointerDown?: (event: PointerEvent<HTMLDivElement>) => void;
  onToggle?: () => void;
  onDelete?: () => void;
}) {
  return (
    <div
      onPointerDown={onPointerDown}
      className={cn(
        "group/task relative select-none rounded-[8px] bg-gradient-to-b from-white to-[#FAFAFA] p-[clamp(12px,2vw,16px)] transition-[opacity,transform,box-shadow]",
        dragging
          ? "rotate-[-2deg] cursor-grabbing shadow-[0_8px_22px_rgba(10,10,10,0.14)]"
          : "cursor-grab shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] hover:shadow-[0_2px_8px_rgba(10,10,10,0.08)] active:cursor-grabbing",
      )}
    >
      {onDelete ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onDelete();
          }}
          onPointerDown={(event) => event.stopPropagation()}
          aria-label={`Delete task ${item.task.title}`}
          className="absolute right-[8px] top-[8px] flex h-[20px] w-[20px] cursor-pointer items-center justify-center rounded-[4px] text-[#A3A3A3] opacity-0 transition-opacity hover:bg-[#F5F5F5] hover:text-[#0a0a0a] group-hover/task:opacity-100 focus-visible:opacity-100"
        >
          <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="h-[14px] w-[14px]">
            <path
              d="M4 4L12 12M12 4L4 12"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </svg>
        </button>
      ) : null}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-[6px] pr-[24px]">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onToggle?.();
            }}
            onPointerDown={(event) => event.stopPropagation()}
            className={cn(
              "flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-[4px] p-[2px] transition-colors",
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
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onOpen?.();
            }}
            onPointerDown={(event) => event.stopPropagation()}
            className="min-w-0 flex-1 cursor-pointer truncate text-left text-[13px] font-medium leading-[1.25] text-[#171717] outline-none hover:underline focus-visible:underline"
          >
            {item.task.title}
          </button>
        </div>
        <p className="line-clamp-2 text-[12px] font-normal leading-[1.5] text-[#525252]">
          {item.task.summary || item.task.content}
        </p>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <img
          src={item.projectLogoUrl}
          alt=""
          aria-hidden="true"
          className="h-[18px] w-[18px] shrink-0 rounded-full object-cover"
        />
        <p className="min-w-0 flex-1 truncate text-[12px] font-medium leading-[1.25] text-[#171717]">
          {item.projectName}
        </p>
      </div>
    </div>
  );
}
