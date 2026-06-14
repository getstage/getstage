import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { CreateTaskDialog } from "@/components/tasks/CreateTaskDialog";
import { KANBAN_COLUMNS } from "@/lib/project/kanbanColumns";
import { useKanbanBoard } from "@/hooks/project/useKanbanBoard";
import type { PhaseSummary } from "@stage/data-ops";
import type { Phase } from "@/models/project/project";
import type { KanbanStatus } from "@/lib/project/kanbanColumns";
import { KanbanAssignCard } from "./KanbanAssignCard";
import { AddProjectMemberDialog } from "./AddProjectMemberDialog";
import { KanbanTaskCard } from "./KanbanTaskCard";
import { KanbanTaskSkeleton } from "./KanbanTaskSkeleton";

export function KanbanBoard({
  phases,
  phaseOptions = [],
  projectId,
  projectName = "Project Name",
}: {
  phases: Phase[];
  phaseOptions?: PhaseSummary[];
  projectId?: string;
  projectName?: string;
}) {
  const navigate = useNavigate();
  const board = useKanbanBoard(phases, projectId);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);

  return (
    <div className="relative">
      {board.assignTaskId ? (
        <button
          type="button"
          aria-label="Close assign task"
          className="fixed inset-0 z-20 cursor-default bg-transparent"
          onClick={board.closeAssignOverlay}
        />
      ) : null}
      <div className="grid grid-cols-1 gap-1 overflow-visible rounded-[10px] bg-[#F5F5F5] p-1 md:grid-cols-2 xl:grid-cols-4">
        {KANBAN_COLUMNS.map((col) => (
          <section
            key={col.key}
            data-kanban-column={col.key}
            className={`flex min-w-0 flex-col gap-1 rounded-[8px] transition-colors ${
              board.dragOverColumn === col.key && board.activeDrag ? "bg-white/35" : ""
            }`}
          >
            <div className={`flex items-center justify-between rounded-[8px] px-4 py-3 ${col.key === "done" ? "opacity-50" : ""}`}>
              <h3 className="text-[14px] font-medium leading-[1.2] text-[#0A0A0A]">{col.label}</h3>
              <button
                type="button"
                onClick={() => board.setCreateTaskColumn(col.key)}
                className="flex h-[18px] w-[18px] cursor-pointer items-center justify-center rounded-[4px] bg-gradient-to-b from-white to-[#FAFAFA] text-[#A3A3A3] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-colors hover:text-[#525252]"
                aria-label={`Add ${col.label} task`}
              >
                <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="h-[14px] w-[14px]">
                  <path d="M6 2v8M2 6h8" />
                </svg>
              </button>
            </div>
            <div className="flex flex-col gap-1">
              {board.columns[col.key].map(({ task, phaseName }) => {
                const isDragging = board.activeDrag?.id === task.id;

                if (isDragging) {
                  return board.dragOverColumn ? null : <KanbanTaskSkeleton key={task.id} />;
                }

                return (
                  <div key={task.id} className="relative" data-kanban-task-id={task.id}>
                    {board.activeDrag && board.dragOverColumn === col.key && board.dropBeforeTaskId === task.id ? (
                      <KanbanTaskSkeleton />
                    ) : null}
                    <KanbanTaskCard
                      task={task}
                      phaseName={phaseName}
                      dimmed={col.key === "done"}
                      onPointerDown={(event) => board.startDragging(event, task.id)}
                      onAssign={() => {
                        board.setAssignTaskId((current) => (current === task.id ? null : task.id));
                        board.setAssignSearch("");
                      }}
                      onToggle={() => board.toggleTaskCompletion(task.id)}
                      onOpen={() =>
                        void navigate({
                          to: "/tasks/$taskId",
                          params: { taskId: task.id },
                          search: { from: "project", projectId },
                        })
                      }
                    />
                    {board.assignTaskId === task.id ? (
                      <KanbanAssignCard
                        members={board.members}
                        search={board.assignSearch}
                        onSearchChange={board.setAssignSearch}
                        onAssign={(member) => void board.assignTask(task.id, member)}
                        onAddMember={() => {
                          board.closeAssignOverlay();
                          setIsAddMemberOpen(true);
                        }}
                      />
                    ) : null}
                  </div>
                );
              })}
              {board.columns[col.key].length === 0 && (
                <div className="rounded-[8px] bg-white/50 p-4 text-center text-[12px] text-[#737373]">No tasks</div>
              )}
              {board.activeDrag && board.dragOverColumn === col.key && board.dropBeforeTaskId === null ? (
                <KanbanTaskSkeleton />
              ) : null}
            </div>
          </section>
        ))}
      </div>
      {board.createTaskColumn && projectId ? (
        <CreateTaskDialog
          projects={[]}
          phases={phaseOptions}
          initialProjectId={projectId}
          initialPhaseId={
            phaseOptions.find((phase) => phase.status === "active")?.id ?? phaseOptions[0]?.id
          }
          initialBoardStatus={board.createTaskColumn as KanbanStatus}
          projectLabel={projectName}
          lockProject
          onClose={() => board.setCreateTaskColumn(null)}
        />
      ) : null}
      {projectId ? (
        <AddProjectMemberDialog
          projectId={projectId}
          open={isAddMemberOpen}
          onOpenChange={setIsAddMemberOpen}
        />
      ) : null}
      {board.activeDrag ? (
        <div
          className="pointer-events-none fixed z-[9999]"
          style={{
            left: board.activeDrag.x - board.activeDrag.pointerOffsetX,
            top: board.activeDrag.y - board.activeDrag.pointerOffsetY,
            width: board.activeDrag.width,
            height: board.activeDrag.height,
          }}
        >
          <KanbanTaskCard task={board.activeDrag.task} phaseName={board.activeDrag.phaseName} dragging />
        </div>
      ) : null}
    </div>
  );
}
