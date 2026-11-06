import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { CreateTaskDialog } from "@/components/tasks/CreateTaskDialog";
import { useKanbanBoard } from "@/hooks/project/useKanbanBoard";
import type { PhaseSummary } from "@stage/data-ops";
import type { Phase } from "@/models/project/project";
import { KanbanAssignCard } from "./KanbanAssignCard";
import { AddProjectMemberDialog } from "./AddProjectMemberDialog";
import { KANBAN_COLUMNS, KANBAN_GRID, KanbanColumn, type KanbanStatus } from "@stage/project-ui/kanban";
import { TaskCard } from "./TaskCard";
import { KanbanTaskSkeleton } from "./KanbanTaskSkeleton";
import { useTaskDragFeedback } from "@/hooks/useTaskDragFeedback";

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
  useTaskDragFeedback(Boolean(board.activeDrag));

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
      <div className={KANBAN_GRID}>
        {KANBAN_COLUMNS.map((col) => (
          <KanbanColumn
            key={col.key}
            columnKey={col.key}
            label={col.label}
            empty={board.columns[col.key].length === 0}
            highlighted={board.dragOverColumn === col.key && Boolean(board.activeDrag)}
            onAdd={() => board.setCreateTaskColumn(col.key)}
          >
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
                  <TaskCard
                    task={task}
                    phaseName={phaseName}
                    dimmed={col.key === "done"}
                    onPointerDown={(event) => board.startDragging(event, task.id)}
                    onAssign={() => {
                      board.setAssignTaskId((current) => (current === task.id ? null : task.id));
                      board.setAssignSearch("");
                    }}
                    onToggle={() => board.toggleTaskCompletion(task.id)}
                    onOpen={() => {
                      if (board.shouldSuppressTaskOpen()) return;
                      void navigate({
                        to: "/tasks/$taskId",
                        params: { taskId: task.id },
                        search: { from: "project", projectId },
                      })
                    }}
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
            {board.activeDrag && board.dragOverColumn === col.key && board.dropBeforeTaskId === null ? (
              <KanbanTaskSkeleton />
            ) : null}
          </KanbanColumn>
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
          <TaskCard task={board.activeDrag.task} phaseName={board.activeDrag.phaseName} dragging />
        </div>
      ) : null}
    </div>
  );
}
