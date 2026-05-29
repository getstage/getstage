import type { PointerEvent } from "react";
import { PRIORITY_COLUMNS, type PriorityTask, type TaskPriority } from "@/tasks/helpers/priorityColumns";
import { PriorityTaskCard } from "./PriorityTaskCard";
import { TaskSkeleton } from "./TaskSkeleton";
import { cn } from "@/lib/utils";

export function TasksPriorityBoard({
  columns,
  activeDrag,
  dragOverColumn,
  dropBeforeTaskId,
  onOpenTask,
  onToggleTask,
  onDeleteTask,
  onStartDragging,
}: {
  columns: Record<TaskPriority, PriorityTask[]>;
  activeDrag: (PriorityTask & {
    id: string;
    width: number;
    height: number;
    pointerOffsetX: number;
    pointerOffsetY: number;
    x: number;
    y: number;
  }) | null;
  dragOverColumn: TaskPriority | null;
  dropBeforeTaskId: string | null;
  onOpenTask: (taskId: string) => void;
  onToggleTask: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onStartDragging: (event: PointerEvent<HTMLDivElement>, taskId: string) => void;
}) {
  return (
    <div className="relative">
      <div className="grid grid-cols-1 gap-1 overflow-visible rounded-[10px] bg-[#F5F5F5] p-1 md:grid-cols-2 xl:grid-cols-4">
        {PRIORITY_COLUMNS.map((column) => (
          <section
            key={column.key}
            data-task-priority-column={column.key}
            className={cn(
              "flex min-w-0 flex-col gap-1 rounded-[8px] transition-colors",
              activeDrag && dragOverColumn === column.key && "bg-white/35",
            )}
          >
            <div className="flex min-w-0 items-center justify-between gap-[10px] rounded-[8px] px-[clamp(12px,2vw,16px)] py-3">
              <h2 className="min-w-0 truncate text-[14px] font-medium leading-[1.2] text-[#0A0A0A]">
                {column.label}
              </h2>
              <span className="shrink-0 text-[12px] font-medium leading-none text-[#A3A3A3]">
                {columns[column.key].length}
              </span>
            </div>
            <div className="flex min-h-[84px] flex-col gap-1">
              {columns[column.key].map((item) => {
                const isDragging = activeDrag?.id === item.task.id;

                if (isDragging) {
                  return dragOverColumn ? null : (
                    <TaskSkeleton key={item.task.id} height={activeDrag.height} />
                  );
                }

                return (
                  <div key={item.task.id} className="relative" data-priority-task-id={item.task.id}>
                    {activeDrag && dragOverColumn === column.key && dropBeforeTaskId === item.task.id ? (
                      <TaskSkeleton height={activeDrag.height} />
                    ) : null}
                    <PriorityTaskCard
                      item={item}
                      onOpen={() => onOpenTask(item.task.id)}
                      onPointerDown={(event) => onStartDragging(event, item.task.id)}
                      onToggle={() => onToggleTask(item.task.id)}
                      onDelete={() => onDeleteTask(item.task.id)}
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
  );
}
