import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import type { ProjectSummary } from "@stage/data-ops";
import { CreateTaskDialog } from "@/components/tasks/CreateTaskDialog";
import { DeleteTaskModal } from "@/components/tasks/DeleteTaskModal";
import { TasksPriorityBoard } from "@/components/tasks/board/TasksPriorityBoard";
import { useProjectPhasesQuery } from "@/hooks/convex-data";
import { useTasksBoard } from "@/hooks/tasks/useTasksBoard";
import { PRIORITY_COLUMNS, type PriorityColumns, type PriorityTask } from "@/lib/tasks/priorityColumns";
import { cn } from "@/lib/utils";

export { CreateTaskModal, type TaskAssignee, type TaskProject } from "@/components/tasks/dialogs/CreateTaskModal";

export function TasksPageView() {
  const navigate = useNavigate();
  const board = useTasksBoard();
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [taskPendingDelete, setTaskPendingDelete] = useState<PriorityTask | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [createTaskProjectId, setCreateTaskProjectId] = useState<string | undefined>();
  const createTaskPhasesQuery = useProjectPhasesQuery(createTaskProjectId);

  const visibleColumns = useMemo<PriorityColumns>(() => {
    if (!selectedProjectId) return board.columns;

    return PRIORITY_COLUMNS.reduce((next, column) => {
      next[column.key] = board.columns[column.key].filter((item) => item.projectId === selectedProjectId);
      return next;
    }, {} as PriorityColumns);
  }, [board.columns, selectedProjectId]);

  useEffect(() => {
    if (!selectedProjectId) return;
    if (!board.projects.some((project) => project.id === selectedProjectId)) {
      setSelectedProjectId(null);
    }
  }, [board.projects, selectedProjectId]);

  function confirmDeleteTask() {
    if (!taskPendingDelete) return;
    board.handleDeleteTask(taskPendingDelete.task.id);
    setTaskPendingDelete(null);
  }

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
          <div className="flex min-w-0 items-center justify-end gap-[8px] max-[560px]:col-span-2 max-[560px]:justify-start">
            <ProjectFilterDropdown
              projects={board.projects}
              selectedProjectId={selectedProjectId}
              onSelect={setSelectedProjectId}
            />
            <button
              type="button"
              onClick={() => {
                setCreateTaskProjectId(selectedProjectId ?? board.projects[0]?.id);
                setIsCreateTaskOpen(true);
              }}
              className="inline-flex h-[34px] shrink-0 cursor-pointer items-center justify-center gap-[6px] rounded-[6px] border border-[rgba(158,153,248,0.75)] bg-gradient-to-b from-[#7b76df] to-[#463fba] py-[8px] pl-[10px] pr-[12px] text-[13px] font-medium leading-none text-[#fafafa] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-opacity hover:opacity-90"
              style={{ textShadow: "0px 0.5px 1.5px rgba(0,0,0,0.15)" }}
            >
              <img src="/logos/dashboard/plus.svg" alt="" aria-hidden="true" className="h-[14px] w-[14px] brightness-0 invert" />
              Add Task
            </button>
          </div>
        </header>

        <TasksPriorityBoard
          columns={visibleColumns}
          activeDrag={board.activeDrag}
          dragOverColumn={board.dragOverColumn}
          dropBeforeTaskId={board.dropBeforeTaskId}
          onOpenTask={(taskId) => {
            if (board.shouldSuppressTaskOpen()) return;
            void navigate({
              to: "/tasks/$taskId",
              params: { taskId },
              search: { from: "tasks", projectId: undefined },
            });
          }}
          onToggleTask={board.toggleTaskCompletion}
          onDeleteTask={setTaskPendingDelete}
          onStartDragging={board.startDragging}
        />

        {isCreateTaskOpen ? (
          <CreateTaskDialog
            projects={board.projects}
            phases={createTaskPhasesQuery.data ?? []}
            phasesLoading={createTaskPhasesQuery.isLoading}
            initialProjectId={selectedProjectId ?? undefined}
            onProjectChange={setCreateTaskProjectId}
            onClose={() => setIsCreateTaskOpen(false)}
          />
        ) : null}
        {taskPendingDelete ? (
          <DeleteTaskModal
            onCancel={() => setTaskPendingDelete(null)}
            onDelete={confirmDeleteTask}
          />
        ) : null}
      </motion.div>
    </div>
  );
}

function ArrowLeftIcon() {
  return <img src="/logos/back.svg" alt="" aria-hidden="true" className="h-4 w-4 shrink-0" />;
}

function ProjectFilterDropdown({
  projects,
  selectedProjectId,
  onSelect,
}: {
  projects: ProjectSummary[];
  selectedProjectId: string | null;
  onSelect: (projectId: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const selectedProject = projects.find((project) => project.id === selectedProjectId);
  const label = selectedProject?.name ?? "All projects";

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (!dropdownRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function chooseProject(projectId: string | null) {
    onSelect(projectId);
    setOpen(false);
  }

  return (
    <div ref={dropdownRef} className="relative min-w-0">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="inline-flex h-[34px] max-w-[220px] cursor-pointer items-center justify-between gap-[8px] rounded-[6px] bg-[#f5f5f5] py-[8px] pl-[10px] pr-[8px] text-left text-[13px] font-medium leading-none text-[#171717] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-colors hover:bg-[#eeeeee] max-[560px]:max-w-[min(220px,calc(100vw-160px))]"
      >
        <span className="flex min-w-0 items-center gap-[7px]">
          {selectedProject ? <ProjectAvatar project={selectedProject} /> : null}
          <span className="min-w-0 truncate">{label}</span>
        </span>
        <ChevronDownIcon open={open} />
      </button>

      {open ? (
        <div
          role="listbox"
          aria-label="Filter tasks by project"
          className="absolute right-0 top-[42px] z-50 w-[260px] rounded-[8px] bg-[#F5F5F5] p-[4px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] max-[560px]:left-0 max-[560px]:right-auto"
        >
          <div className="max-h-[310px] overflow-y-auto rounded-[6px] bg-white p-[4px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
            <ProjectFilterOption
              selected={!selectedProjectId}
              label="All projects"
              onSelect={() => chooseProject(null)}
            />
            <div className="my-[4px] h-px bg-[#E5E5E5]" />
            {projects.length > 0 ? (
              projects.map((project) => (
                <ProjectFilterOption
                  key={project.id}
                  selected={selectedProjectId === project.id}
                  label={project.name}
                  description={project.clientName}
                  avatar={<ProjectAvatar project={project} />}
                  onSelect={() => chooseProject(project.id)}
                />
              ))
            ) : (
              <p className="px-[8px] py-[8px] text-[12px] font-medium leading-[1.5] text-[#737373]">
                No projects yet.
              </p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ProjectFilterOption({
  selected,
  label,
  description,
  avatar,
  onSelect,
}: {
  selected: boolean;
  label: string;
  description?: string;
  avatar?: React.ReactNode;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onClick={onSelect}
      className={cn(
        "flex min-h-[34px] w-full cursor-pointer items-center gap-[8px] rounded-[6px] px-[8px] py-[6px] text-left outline-none transition-colors",
        selected ? "bg-[#F5F5F5]" : "hover:bg-[#F5F5F5]",
      )}
    >
      {avatar}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[13px] font-medium leading-[1.25] text-[#171717]">
          {label}
        </span>
        {description ? (
          <span className="mt-[2px] truncate text-[12px] font-medium leading-[1.25] text-[#737373]">
            {description}
          </span>
        ) : null}
      </span>
    </button>
  );
}

function ProjectAvatar({ project }: { project: ProjectSummary }) {
  if (project.projectImageUrl) {
    return (
      <img
        src={project.projectImageUrl}
        alt=""
        aria-hidden="true"
        className="h-[18px] w-[18px] shrink-0 rounded-full object-cover"
      />
    );
  }

  return (
    <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-[#171717] text-[10px] font-semibold uppercase text-white">
      {getProjectInitial(project.name)}
    </span>
  );
}

function getProjectInitial(name: string) {
  const trimmed = name.trim();
  return trimmed.length > 0 ? trimmed[0] : "S";
}

function ChevronDownIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className={cn("h-[14px] w-[14px] shrink-0 text-[#737373] transition-transform", open && "rotate-180")}
    >
      <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
