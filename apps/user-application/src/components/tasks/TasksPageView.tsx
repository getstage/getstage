import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { CreateTaskDialog } from "@/components/tasks/CreateTaskDialog";
import { TasksPriorityBoard } from "@/components/tasks/board/TasksPriorityBoard";
import { useTasksBoard } from "@/hooks/tasks/useTasksBoard";

export { CreateTaskModal, type TaskAssignee, type TaskProject } from "@/components/tasks/dialogs/CreateTaskModal";

export function TasksPageView() {
  const navigate = useNavigate();
  const board = useTasksBoard();
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);

  return (
    <div className="flex-1 px-[clamp(16px,7vw,100px)] py-[clamp(20px,4vw,44px)]">
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

        <header className="mb-7 grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-end gap-[14px]">
          <div className="min-w-0">
            <h1 className="font-heading text-[20px] font-semibold leading-[1.2] text-[#0A0A0A]">
              Tasks
            </h1>
            <p className="mt-2 max-w-[360px] text-[13px] font-medium leading-[1.35] text-[#737373]">
              See All your pending tasks in one view
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsCreateTaskOpen(true)}
            className="inline-flex h-[34px] shrink-0 cursor-pointer items-center justify-center gap-[6px] rounded-[6px] border border-[rgba(158,153,248,0.75)] bg-gradient-to-b from-[#7b76df] to-[#463fba] py-[8px] pl-[10px] pr-[12px] text-[13px] font-medium leading-none text-[#fafafa] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-opacity hover:opacity-90 max-[430px]:col-span-2 max-[430px]:w-fit"
            style={{ textShadow: "0px 0.5px 1.5px rgba(0,0,0,0.15)" }}
          >
            <img src="/logos/dashboard/plus.svg" alt="" aria-hidden="true" className="h-[14px] w-[14px] brightness-0 invert" />
            Add Task
          </button>
        </header>

        <TasksPriorityBoard
          columns={board.columns}
          activeDrag={board.activeDrag}
          dragOverColumn={board.dragOverColumn}
          dropBeforeTaskId={board.dropBeforeTaskId}
          onOpenTask={(taskId) => {
            void navigate({
              to: "/tasks/$taskId",
              params: { taskId },
              search: { from: "tasks", projectId: undefined },
            });
          }}
          onToggleTask={board.toggleTaskCompletion}
          onDeleteTask={board.handleDeleteTask}
          onStartDragging={board.startDragging}
        />

        {isCreateTaskOpen ? (
          <CreateTaskDialog
            projects={board.projects}
            onClose={() => setIsCreateTaskOpen(false)}
          />
        ) : null}
      </motion.div>
    </div>
  );
}

function ArrowLeftIcon() {
  return <img src="/logos/back.svg" alt="" aria-hidden="true" className="h-4 w-4 shrink-0" />;
}
