import { useState, type RefObject } from "react";
import { CalendarBlank, CaretRight, Trash } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { ConfirmPopover } from "@/components/ui/ConfirmPopover";
import type { Id } from "../../../convex/_generated/dataModel";
import type { Phase, Task } from "@/types";

function formatDueDate(timestamp: number): { label: string; isOverdue: boolean; isDueSoon: boolean } {
  const now = new Date();
  const due = new Date(timestamp);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const diffMs = dueDay.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { label: `${Math.abs(diffDays)}d overdue`, isOverdue: true, isDueSoon: false };
  }
  if (diffDays === 0) {
    return { label: "Due today", isOverdue: false, isDueSoon: true };
  }
  if (diffDays === 1) {
    return { label: "Due tomorrow", isOverdue: false, isDueSoon: true };
  }
  if (diffDays <= 3) {
    return { label: `Due in ${diffDays}d`, isOverdue: false, isDueSoon: true };
  }

  return {
    label: due.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    isOverdue: false,
    isDueSoon: false,
  };
}

type TaskChecklistProps = {
  phase: Phase;
  projectId: string;
  actionError: string | null;
  addTaskValue: string;
  showAddTask: boolean;
  addTaskInputRef: RefObject<HTMLInputElement | null>;
  onAddTaskValueChange: (value: string) => void;
  onShowAddTaskChange: (value: boolean) => void;
  onSubmitAddTask: () => void;
  onToggleTask: (taskId: Id<"tasks">) => void;
  onDeleteTask: (taskId: Id<"tasks">) => void;
};

export function TaskChecklist({
  phase,
  projectId,
  actionError,
  addTaskValue,
  showAddTask,
  addTaskInputRef,
  onAddTaskValueChange,
  onShowAddTaskChange,
  onSubmitAddTask,
  onToggleTask,
  onDeleteTask,
}: TaskChecklistProps) {
  const completedCount = phase.tasks.filter((task) => task.isCompleted).length;
  const [confirmingTaskId, setConfirmingTaskId] = useState<string | null>(null);

  return (
    <section className="mt-6 w-full flex-1 sm:mt-8">
      <header className="mb-5">
        <h2 className="font-heading text-[20px] font-semibold text-text-primary">
          {phase.name}
        </h2>
        <p className="text-[13px] text-text-secondary">
          {completedCount} of {phase.tasks.length} complete
        </p>
      </header>

      {actionError ? (
        <div className="mb-3 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-[13px] text-destructive">
          {actionError}
        </div>
      ) : null}

      <div>
        {phase.tasks.map((task) => (
          <TaskRow
            key={task.id}
            task={task}
            projectId={projectId}
            onToggle={() => onToggleTask(task.id as Id<"tasks">)}
            isConfirming={confirmingTaskId === task.id}
            onRequestDelete={() => setConfirmingTaskId(task.id)}
            onCancelDelete={() => setConfirmingTaskId(null)}
            onDelete={() => onDeleteTask(task.id as Id<"tasks">)}
          />
        ))}
      </div>

      {showAddTask ? (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            ref={addTaskInputRef}
            type="text"
            value={addTaskValue}
            onChange={(event) => onAddTaskValueChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void onSubmitAddTask();
              if (event.key === "Escape") {
                onShowAddTaskChange(false);
                onAddTaskValueChange("");
              }
            }}
            placeholder="Task title"
            autoFocus
            className="w-full flex-1 rounded-lg border border-border bg-white px-3 py-2 text-[14px] text-text-primary outline-none transition-colors placeholder:text-text-tertiary focus:border-accent"
          />
          <Button
            size="sm"
            onClick={() => void onSubmitAddTask()}
            disabled={addTaskValue.trim().length === 0}
            className="w-full sm:w-auto"
          >
            Add
          </Button>
          <button
            type="button"
            onClick={() => {
              onShowAddTaskChange(false);
              onAddTaskValueChange("");
            }}
            className="cursor-pointer text-left text-[13px] text-text-secondary transition-colors hover:text-text-primary sm:text-center"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            onShowAddTaskChange(true);
          }}
          className="mt-4 inline-flex cursor-pointer items-center gap-2 text-[13px] text-text-tertiary transition-colors hover:text-accent"
        >
          <span>+</span>
          Add a task...
        </button>
      )}
    </section>
  );
}

type TaskRowProps = {
  task: Task;
  projectId: string;
  onToggle: () => void;
  isConfirming: boolean;
  onRequestDelete: () => void;
  onCancelDelete: () => void;
  onDelete: () => void;
};

function TaskRow({
  task,
  projectId,
  onToggle,
  isConfirming,
  onRequestDelete,
  onCancelDelete,
  onDelete,
}: TaskRowProps) {
  const dueDateInfo = task.dueDate ? formatDueDate(task.dueDate) : null;
  const assignees = task.assignees ?? [];

  return (
    <div className="group relative flex items-center gap-3 rounded-lg border-t border-border-subtle px-3 py-2.5 first:border-t-0 hover:bg-border-subtle">
      <Checkbox checked={task.isCompleted} onCheckedChange={onToggle} />
      <Link
        to="/project/$id/task/$taskId"
        params={{ id: projectId, taskId: task.id }}
        className={`min-w-0 flex-1 text-[14px] leading-[1.45] transition-colors ${
          task.isCompleted
            ? "text-text-tertiary line-through"
            : "text-text-primary hover:text-accent"
        }`}
      >
        {task.title}
      </Link>

      <div className="flex items-center gap-2">
        {dueDateInfo && !task.isCompleted ? (
          <span
            className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ${
              dueDateInfo.isOverdue
                ? "bg-destructive/10 text-destructive"
                : dueDateInfo.isDueSoon
                  ? "bg-amber-500/10 text-amber-600"
                  : "bg-bg-subtle text-text-secondary"
            }`}
          >
            <CalendarBlank size={11} />
            {dueDateInfo.label}
          </span>
        ) : null}

        {assignees.length > 0 ? (
          <div className="flex -space-x-1.5">
            {assignees.slice(0, 3).map((assignee) => (
              <div
                key={assignee.userId}
                className="flex h-5 w-5 items-center justify-center rounded-full bg-accent/10 text-[9px] font-semibold text-accent ring-2 ring-white"
                title={assignee.name ?? assignee.email ?? "Team member"}
              >
                {(assignee.name ?? assignee.email ?? "?").charAt(0).toUpperCase()}
              </div>
            ))}
            {assignees.length > 3 ? (
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-bg-subtle text-[9px] font-medium text-text-secondary ring-2 ring-white">
                +{assignees.length - 3}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <CaretRight
        size={14}
        className="hidden text-text-tertiary opacity-0 transition-opacity group-hover:opacity-100 sm:block"
      />
      <button
        type="button"
        onClick={onRequestDelete}
        className="inline-flex h-7 w-7 items-center justify-center rounded-[6px] text-text-tertiary opacity-0 transition-all hover:bg-destructive/5 hover:text-destructive group-hover:opacity-100"
        aria-label={`Delete ${task.title}`}
        title="Delete task"
      >
        <Trash size={14} />
      </button>
      <ConfirmPopover
        open={isConfirming}
        message={`Delete "${task.title}"?`}
        onCancel={onCancelDelete}
        onConfirm={() => {
          onCancelDelete();
          onDelete();
        }}
        className="right-0 top-full mt-2"
      />
    </div>
  );
}
