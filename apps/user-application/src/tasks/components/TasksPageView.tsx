import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import {
  useDeleteTaskMutation,
  useProjectsQuery,
  useSetTaskPriorityMutation,
  useUserTasksQuery,
} from "@/hooks/desktop-api";
import type { Task } from "@/project/models/project";
import { CreateTaskDialog } from "@/tasks/components/CreateTaskDialog";
import {
  PRIORITY_COLUMNS,
  buildPriorityColumns,
  emptyPriorityColumns,
  indexProjectsById,
  type PriorityColumns,
  type PriorityTask,
  type TaskPriority,
  type TaskPriorityColumn,
} from "@/tasks/helpers/priorityColumns";
import { cn } from "@/lib/utils";

type TaskPicker = "assignee" | "project" | null;

type ActiveDrag = PriorityTask & {
  id: string;
  width: number;
  height: number;
  pointerOffsetX: number;
  pointerOffsetY: number;
  x: number;
  y: number;
};

export type TaskAssignee = {
  name: string;
  avatarUrl: string;
};

export type TaskProject = {
  name: string;
  logoUrl: string;
};

const TASK_ASSIGNEES: TaskAssignee[] = [
  { name: "Pratik Singh", avatarUrl: "/logos/dashboard/task-assignee-pratik.png" },
  { name: "John Doe", avatarUrl: "/logos/dashboard/task-assignee-john.png" },
  { name: "Maria Zuber", avatarUrl: "/logos/dashboard/task-assignee-maria.png" },
  { name: "Nina Paul", avatarUrl: "/logos/dashboard/task-assignee-nina.png" },
];

const TASK_PROJECTS: TaskProject[] = [
  { name: "BaseFrame", logoUrl: "/logos/dashboard/task-project-logo.png" },
  { name: "Stage", logoUrl: "/logos/dashboard/task-project-logo.png" },
  { name: "Limora", logoUrl: "/logos/dashboard/task-project-logo.png" },
  { name: "Klime Studio", logoUrl: "/logos/dashboard/task-project-logo.png" },
];

function priorityForColumn(column: TaskPriority): "low" | "medium" | "high" | null {
  return column === "backlog" ? null : column;
}

export function TasksPageView() {
  const navigate = useNavigate();
  const tasksQuery = useUserTasksQuery({ limit: 100 });
  const projectsQuery = useProjectsQuery();
  const setPriority = useSetTaskPriorityMutation();
  const deleteTask = useDeleteTaskMutation();

  const liveColumns = useMemo<PriorityColumns>(() => {
    if (!tasksQuery.data) {
      return emptyPriorityColumns();
    }
    const projectsById = indexProjectsById(projectsQuery.data ?? []);
    return buildPriorityColumns(tasksQuery.data, projectsById);
  }, [tasksQuery.data, projectsQuery.data]);

  const [columns, setColumns] = useState<PriorityColumns>(liveColumns);

  useEffect(() => {
    setColumns(liveColumns);
  }, [liveColumns]);
  const [activeDrag, setActiveDrag] = useState<ActiveDrag | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TaskPriority | null>(null);
  const [dropBeforeTaskId, setDropBeforeTaskId] = useState<string | null>(null);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const dragOriginRef = useRef<{ x: number; y: number } | null>(null);
  const suppressTaskOpenRef = useRef(false);

  useEffect(() => {
    if (!activeDrag) return;
    const draggedId = activeDrag.id;

    function handlePointerMove(event: globalThis.PointerEvent) {
      const origin = dragOriginRef.current;
      if (origin && Math.hypot(event.clientX - origin.x, event.clientY - origin.y) > 5) {
        suppressTaskOpenRef.current = true;
      }
      setActiveDrag((current) => current ? { ...current, x: event.clientX, y: event.clientY } : current);
      const target = getDropTargetFromPoint(event.clientX, event.clientY, draggedId);
      setDragOverColumn(target?.column ?? null);
      setDropBeforeTaskId(target?.beforeTaskId ?? null);
    }

    function handlePointerUp(event: globalThis.PointerEvent) {
      const target = getDropTargetFromPoint(event.clientX, event.clientY, draggedId);
      if (suppressTaskOpenRef.current && target) moveTask(draggedId, target.column, target.beforeTaskId);
      setActiveDrag(null);
      setDragOverColumn(null);
      setDropBeforeTaskId(null);
      dragOriginRef.current = null;
      window.setTimeout(() => {
        suppressTaskOpenRef.current = false;
      }, 0);
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

  function toggleTaskCompletion(taskId: string) {
    setColumns((current) => {
      const next = { ...current };
      for (const { key } of PRIORITY_COLUMNS) {
        next[key] = next[key].map((item) => {
          if (item.task.id === taskId) {
            return {
              ...item,
              task: { ...item.task, isCompleted: !item.task.isCompleted },
            };
          }
          return item;
        });
      }
      return next;
    });
  }

  function findCurrentColumn(taskId: string): TaskPriority | null {
    for (const column of PRIORITY_COLUMNS) {
      if (columns[column.key].some((item) => item.task.id === taskId)) {
        return column.key;
      }
    }
    return null;
  }

  function moveTask(taskId: string, targetColumn: TaskPriority, beforeTaskId?: string | null) {
    if (taskId === beforeTaskId) return;
    const previousColumn = findCurrentColumn(taskId);

    setColumns((current) => {
      let movingTask: PriorityTask | undefined;
      const next = { ...current };

      for (const column of PRIORITY_COLUMNS) {
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
      const updatedTask = movingTask;
      const insertionIndex = beforeTaskId
        ? targetItems.findIndex((item) => item.task.id === beforeTaskId)
        : -1;

      if (insertionIndex >= 0) {
        targetItems.splice(insertionIndex, 0, updatedTask);
      } else {
        targetItems.push(updatedTask);
      }

      next[targetColumn] = targetItems;
      return next;
    });

    if (previousColumn !== targetColumn) {
      setPriority.mutate(
        { taskId, priority: priorityForColumn(targetColumn) },
        {
          onError: () => {
            // revert local move; the live query will replay the truth on the
            // next refetch, but reverting now keeps the UI honest immediately.
            setColumns(liveColumns);
          },
        },
      );
    }
  }

  function handleDeleteTask(taskId: string) {
    const previous = columns;
    setColumns((current) => {
      const next = { ...current };
      for (const column of PRIORITY_COLUMNS) {
        next[column.key] = current[column.key].filter((item) => item.task.id !== taskId);
      }
      return next;
    });
    deleteTask.mutate(taskId, {
      onError: () => {
        setColumns(previous);
      },
    });
  }

  function findTask(taskId: string) {
    for (const column of PRIORITY_COLUMNS) {
      const item = columns[column.key].find((columnTask) => columnTask.task.id === taskId);
      if (item) return item;
    }
    return undefined;
  }

  function getColumnFromPoint(x: number, y: number): TaskPriority | null {
    const element = document.elementFromPoint(x, y);
    const columnElement = element?.closest<HTMLElement>("[data-task-priority-column]");
    const candidate = columnElement?.dataset.taskPriorityColumn;
    const match = PRIORITY_COLUMNS.find((column) => column.key === candidate);
    return match?.key ?? null;
  }

  function getDropTargetFromPoint(x: number, y: number, draggedId: string) {
    const column = getColumnFromPoint(x, y);
    if (!column) return null;

    const taskElements = Array.from(
      document.querySelectorAll<HTMLElement>(`[data-task-priority-column="${column}"] [data-priority-task-id]`),
    );
    const beforeElement = taskElements.find((element) => {
      if (element.dataset.priorityTaskId === draggedId) return false;
      const rect = element.getBoundingClientRect();
      return y < rect.top + rect.height / 2;
    });

    return {
      column,
      beforeTaskId: beforeElement?.dataset.priorityTaskId ?? null,
    };
  }

  function startDragging(event: PointerEvent<HTMLDivElement>, taskId: string) {
    if (event.button !== 0) return;
    const item = findTask(taskId);
    if (!item) return;

    const rect = event.currentTarget.getBoundingClientRect();
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
    dragOriginRef.current = { x: event.clientX, y: event.clientY };
    suppressTaskOpenRef.current = false;

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
    setDropBeforeTaskId(null);
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
                        return dragOverColumn ? null : <TaskSkeleton key={item.task.id} height={activeDrag.height} />;
                      }

                      return (
                        <div key={item.task.id} className="relative" data-priority-task-id={item.task.id}>
                          {activeDrag && dragOverColumn === column.key && dropBeforeTaskId === item.task.id ? (
                            <TaskSkeleton height={activeDrag.height} />
                          ) : null}
                          <PriorityTaskCard
                            item={item}
                            onOpen={() => {
                              void navigate({
                                to: "/tasks/$taskId",
                                params: { taskId: item.task.id },
                                search: { from: "tasks", projectId: undefined },
                              });
                            }}
                            onPointerDown={(event) => startDragging(event, item.task.id)}
                            onToggle={() => toggleTaskCompletion(item.task.id)}
                            onDelete={() => handleDeleteTask(item.task.id)}
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

          {isCreateTaskOpen ? (
            <CreateTaskDialog
              projects={projectsQuery.data ?? []}
              onClose={() => setIsCreateTaskOpen(false)}
            />
          ) : null}
        </motion.div>
      </div>
  );
}

export function CreateTaskModal({
  onClose,
  onCreateTask,
  initialProject,
  lockProject = false,
}: {
  onClose: () => void;
  onCreateTask: (task: {
    title: string;
    description: string;
    assignee: TaskAssignee;
    project: TaskProject;
  }) => void;
  initialProject?: TaskProject;
  lockProject?: boolean;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedAssignee, setSelectedAssignee] = useState<TaskAssignee>(TASK_ASSIGNEES[0]);
  const [selectedProject, setSelectedProject] = useState<TaskProject>(initialProject ?? TASK_PROJECTS[0]);
  const [activePicker, setActivePicker] = useState<TaskPicker>(null);
  const trimmedTitle = title.trim();
  const trimmedDescription = description.trim();

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/10 px-[16px] py-[20px] backdrop-blur-[2px]">
      <button
        type="button"
        aria-label="Close create task"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-task-title"
        className="relative z-[81] flex max-h-[calc(100dvh-40px)] w-full max-w-[780px] flex-col overflow-y-auto rounded-[12px] bg-[#f5f5f5] p-[4px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]"
      >
        <div className="flex w-full items-center justify-between px-[12px] pb-[12px] pt-[8px]">
          <h2 id="create-task-title" className="text-[13px] font-semibold leading-[1.5] text-[#0a0a0a]">
            Create New Task
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close create task"
            className="flex h-[16px] w-[16px] cursor-pointer items-center justify-center text-[#0a0a0a]"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="rounded-[8px] bg-white p-[12px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
          <div className="flex flex-col gap-[24px]">
            <label className="flex flex-col gap-[8px]">
              <span className="text-[13px] font-medium leading-none text-[#171717]">Task Title</span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="ex. Product Design Review"
                className="h-[36px] w-full rounded-[6px] bg-[#f5f5f5] px-[12px] text-[12px] font-medium leading-none text-[#171717] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] outline-none placeholder:text-[#525252]"
              />
            </label>

            <label className="flex flex-col gap-[8px]">
              <span className="text-[13px] font-medium leading-none text-[#171717]">Task Description</span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="ex. Product Design Review"
                className="h-[229px] w-full resize-none rounded-[6px] bg-[#f5f5f5] px-[12px] py-[10px] text-[12px] font-medium leading-none text-[#171717] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] outline-none placeholder:text-[#525252]"
              />
            </label>

            <div className="flex flex-col gap-[8px]">
              <p className="text-[13px] font-medium leading-none text-[#171717]">Upload Files</p>
              <button
                type="button"
                className="flex w-fit max-w-full cursor-pointer items-center gap-[10px] rounded-[6px] bg-[#f5f5f5] py-[10px] pl-[12px] pr-[72px] text-[12px] font-medium leading-none text-[#525252] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] transition-colors hover:bg-[#eeeeee] max-[520px]:pr-[24px]"
              >
                <img src="/logos/dashboard/upload.svg" alt="" aria-hidden="true" className="h-[16px] w-[16px] shrink-0" />
                Select 1 or more files.
              </button>
            </div>

            <div className="flex min-w-0 flex-col gap-[12px] sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 flex-wrap items-center gap-[8px]">
                <div className="relative">
                  <TaskMetaButton
                    icon="/logos/dashboard/clientportal.svg"
                    label={selectedAssignee.name || "Assignee"}
                    onClick={() => setActivePicker((current) => current === "assignee" ? null : "assignee")}
                  />
                  {activePicker === "assignee" ? (
                    <AssigneePicker
                      selectedAssignee={selectedAssignee}
                      onSelect={(assignee) => {
                        setSelectedAssignee(assignee);
                        setActivePicker(null);
                      }}
                    />
                  ) : null}
                </div>

                <div className="relative">
                  <TaskMetaButton
                    icon="/logos/dashboard/project.svg"
                    label={selectedProject.name || "Project"}
                    disabled={lockProject}
                    onClick={() => {
                      if (lockProject) return;
                      setActivePicker((current) => current === "project" ? null : "project");
                    }}
                  />
                  {activePicker === "project" && !lockProject ? (
                    <ProjectPicker
                      selectedProject={selectedProject}
                      onSelect={(project) => {
                        setSelectedProject(project);
                        setActivePicker(null);
                      }}
                    />
                  ) : null}
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  onCreateTask({
                    title: trimmedTitle || "Product Design Review",
                    description: trimmedDescription || "Product Design Review",
                    assignee: selectedAssignee,
                    project: selectedProject,
                  })
                }
                className="inline-flex h-[30px] shrink-0 cursor-pointer items-center justify-center rounded-[6px] border border-[rgba(158,153,248,0.75)] bg-gradient-to-b from-[#7b76df] to-[#463fba] py-[6px] pl-[10px] pr-[12px] text-[13px] font-medium leading-none text-[#fafafa] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-opacity hover:opacity-90"
                style={{ textShadow: "0px 0.5px 1.5px rgba(0,0,0,0.15)" }}
              >
                Create Task
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function TaskMetaButton({
  icon,
  label,
  disabled = false,
  onClick,
}: {
  icon: string;
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex h-[31px] cursor-pointer items-center gap-[6px] rounded-[6px] bg-[#f5f5f5] py-[6px] pl-[10px] pr-[12px] text-[13px] font-medium leading-[1.25] text-[#262626]/80 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-colors hover:bg-[#eeeeee] disabled:cursor-default disabled:hover:bg-[#f5f5f5]"
    >
      <span
        aria-hidden="true"
        className="h-[14px] w-[14px] shrink-0 bg-[#525252]"
        style={{
          mask: `url(${icon}) center / contain no-repeat`,
          WebkitMask: `url(${icon}) center / contain no-repeat`,
        }}
      />
      <span className="max-w-[132px] truncate">{label}</span>
    </button>
  );
}

function AssigneePicker({
  selectedAssignee,
  onSelect,
}: {
  selectedAssignee: TaskAssignee;
  onSelect: (assignee: TaskAssignee) => void;
}) {
  return (
    <TaskPickerPanel searchPlaceholder="Search Assignee">
      {TASK_ASSIGNEES.map((assignee) => (
        <TaskPickerItem
          key={assignee.name}
          imageUrl={assignee.avatarUrl}
          label={assignee.name}
          selected={assignee.name === selectedAssignee.name}
          onSelect={() => onSelect(assignee)}
        />
      ))}
    </TaskPickerPanel>
  );
}

function ProjectPicker({
  selectedProject,
  onSelect,
}: {
  selectedProject: TaskProject;
  onSelect: (project: TaskProject) => void;
}) {
  return (
    <TaskPickerPanel searchPlaceholder="Search Project">
      {TASK_PROJECTS.map((project) => (
        <TaskPickerItem
          key={project.name}
          imageUrl={project.logoUrl}
          label={project.name}
          selected={project.name === selectedProject.name}
          onSelect={() => onSelect(project)}
        />
      ))}
    </TaskPickerPanel>
  );
}

function TaskPickerPanel({
  searchPlaceholder,
  children,
}: {
  searchPlaceholder: string;
  children: React.ReactNode;
}) {
  return (
    <div className="absolute bottom-[39px] left-0 z-[90] flex w-[212px] flex-col rounded-[8px] border-2 border-[rgba(0,0,0,0.05)] bg-gradient-to-b from-white to-[#fafafa] p-[12px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
      <div className="flex flex-col gap-[8px]">
        <input
          placeholder={searchPlaceholder}
          className="h-[27px] w-full rounded-[4px] bg-[#f5f5f5] px-[8px] pb-[5px] pt-[4px] text-[12px] font-medium leading-none text-[#262626] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] outline-none placeholder:text-[#525252]"
        />
        <div className="flex w-[188px] flex-col items-start">{children}</div>
      </div>
    </div>
  );
}

function TaskPickerItem({
  imageUrl,
  label,
  selected,
  onSelect,
}: {
  imageUrl: string;
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full cursor-pointer items-center gap-[8px] rounded-[6px] px-[8px] py-[6px] text-left text-[12px] font-medium leading-none text-[#262626] transition-colors hover:bg-[#f5f5f5]",
        selected && "bg-[#f5f5f5]",
      )}
    >
      <img src={imageUrl} alt="" className="h-[18px] w-[18px] shrink-0 rounded-full object-cover" />
      <span className="truncate">{label}</span>
    </button>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="h-[16px] w-[16px]">
      <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function PriorityTaskCard({
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
          ? "cursor-grabbing shadow-[0_8px_22px_rgba(10,10,10,0.14)]"
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
            onClick={(e) => {
              e.stopPropagation();
              onToggle?.();
            }}
            onPointerDown={(e) => e.stopPropagation()}
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
          {item.task.content}
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

function TaskSkeleton({ height }: { height?: number }) {
  return (
    <div
      style={{ height }}
      className={cn(
        "rounded-[8px] border border-dashed border-[#AFA9FF] bg-gradient-to-b from-white to-[#FAFAFA] opacity-60 shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]",
        !height && "h-[88px]",
      )}
    />
  );
}

function ArrowLeftIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="h-4 w-4">
      <path d="M10 3.5 5.5 8l4.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 8h7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
