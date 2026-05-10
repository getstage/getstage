import { useEffect, useMemo, useState } from "react";
import type { ProjectSummary, TaskPriority, TaskSummary } from "@stage/data-ops";
import { useCreateTaskMutation } from "@/hooks/desktop-api";

const PRIORITY_OPTIONS: Array<{ value: TaskPriority | null; label: string }> = [
  { value: null, label: "Backlog" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

type Picker = "project" | "priority" | null;

export function CreateTaskDialog({
  projects,
  initialProjectId,
  lockProject = false,
  onClose,
  onCreated,
}: {
  projects: ProjectSummary[];
  initialProjectId?: string;
  lockProject?: boolean;
  onClose: () => void;
  onCreated?: (task: TaskSummary) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState<string | undefined>(
    initialProjectId ?? projects[0]?.id,
  );
  const [priority, setPriority] = useState<TaskPriority | null>(null);
  const [picker, setPicker] = useState<Picker>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const createTask = useCreateTaskMutation();
  const trimmedTitle = title.trim();
  const isSubmittable = Boolean(trimmedTitle && projectId) && !createTask.isPending;

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === projectId),
    [projects, projectId],
  );
  const selectedPriorityLabel = useMemo(
    () => PRIORITY_OPTIONS.find((option) => option.value === priority)?.label ?? "Backlog",
    [priority],
  );

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  async function handleSubmit() {
    if (!projectId || !trimmedTitle) return;
    setSubmitError(null);
    try {
      const task = await createTask.mutateAsync({
        projectId,
        title: trimmedTitle,
        priority: priority ?? undefined,
        content: description.trim() || undefined,
      });
      onCreated?.(task);
      onClose();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Failed to create task.");
    }
  }

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
        aria-labelledby="create-task-dialog-title"
        className="relative z-[81] flex max-h-[calc(100dvh-40px)] w-full max-w-[560px] flex-col overflow-y-auto rounded-[12px] bg-[#f5f5f5] p-[4px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]"
      >
        <div className="flex items-center justify-between px-[12px] pb-[12px] pt-[8px]">
          <h2
            id="create-task-dialog-title"
            className="text-[13px] font-semibold leading-[1.5] text-[#0a0a0a]"
          >
            Create New Task
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close create task"
            className="flex h-[16px] w-[16px] cursor-pointer items-center justify-center text-[#0a0a0a]"
          >
            <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="h-[16px] w-[16px]">
              <path
                d="M4 4L12 12M12 4L4 12"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className="flex flex-col gap-[20px] rounded-[8px] bg-white p-[12px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
          <label className="flex flex-col gap-[8px]">
            <span className="text-[13px] font-medium leading-none text-[#171717]">Task title</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="ex. Product Design Review"
              className="h-[36px] w-full rounded-[6px] bg-[#f5f5f5] px-[12px] text-[12px] font-medium leading-none text-[#171717] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] outline-none placeholder:text-[#525252]"
            />
          </label>

          <label className="flex flex-col gap-[8px]">
            <span className="text-[13px] font-medium leading-none text-[#171717]">
              Description (optional)
            </span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Add detail or context for the task"
              className="h-[120px] w-full resize-none rounded-[6px] bg-[#f5f5f5] px-[12px] py-[10px] text-[12px] font-medium leading-[1.5] text-[#171717] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] outline-none placeholder:text-[#525252]"
            />
          </label>

          <div className="flex flex-wrap items-center gap-[8px]">
            <PickerButton
              label={selectedProject?.name ?? "Pick a project"}
              disabled={lockProject || projects.length === 0}
              onClick={() =>
                setPicker((current) => (current === "project" ? null : "project"))
              }
            >
              {picker === "project" ? (
                <PickerPanel>
                  {projects.length === 0 ? (
                    <p className="px-[8px] py-[6px] text-[12px] text-[#737373]">
                      No projects yet.
                    </p>
                  ) : (
                    projects.map((project) => (
                      <PickerItem
                        key={project.id}
                        label={project.name}
                        selected={project.id === projectId}
                        onSelect={() => {
                          setProjectId(project.id);
                          setPicker(null);
                        }}
                      />
                    ))
                  )}
                </PickerPanel>
              ) : null}
            </PickerButton>

            <PickerButton
              label={`Priority: ${selectedPriorityLabel}`}
              onClick={() =>
                setPicker((current) => (current === "priority" ? null : "priority"))
              }
            >
              {picker === "priority" ? (
                <PickerPanel>
                  {PRIORITY_OPTIONS.map((option) => (
                    <PickerItem
                      key={option.label}
                      label={option.label}
                      selected={option.value === priority}
                      onSelect={() => {
                        setPriority(option.value);
                        setPicker(null);
                      }}
                    />
                  ))}
                </PickerPanel>
              ) : null}
            </PickerButton>

            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={!isSubmittable}
              className="ml-auto inline-flex h-[32px] shrink-0 cursor-pointer items-center justify-center rounded-[6px] border border-[rgba(158,153,248,0.75)] bg-gradient-to-b from-[#7b76df] to-[#463fba] py-[6px] pl-[10px] pr-[12px] text-[13px] font-medium leading-none text-[#fafafa] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              style={{ textShadow: "0px 0.5px 1.5px rgba(0,0,0,0.15)" }}
            >
              {createTask.isPending ? "Creating…" : "Create Task"}
            </button>
          </div>

          {submitError ? (
            <p className="text-[12px] font-medium text-[#b91c1c]">{submitError}</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function PickerButton({
  label,
  disabled = false,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        className="flex h-[31px] cursor-pointer items-center gap-[6px] rounded-[6px] bg-[#f5f5f5] py-[6px] pl-[10px] pr-[12px] text-[13px] font-medium leading-[1.25] text-[#262626]/80 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-colors hover:bg-[#eeeeee] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="max-w-[180px] truncate">{label}</span>
      </button>
      {children}
    </div>
  );
}

function PickerPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute bottom-[39px] left-0 z-[90] flex w-[212px] flex-col rounded-[8px] border-2 border-[rgba(0,0,0,0.05)] bg-gradient-to-b from-white to-[#fafafa] p-[8px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
      {children}
    </div>
  );
}

function PickerItem({
  label,
  selected,
  onSelect,
}: {
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={
        "flex w-full cursor-pointer items-center gap-[8px] rounded-[6px] px-[8px] py-[6px] text-left text-[12px] font-medium leading-none text-[#262626] transition-colors hover:bg-[#f5f5f5]" +
        (selected ? " bg-[#f5f5f5]" : "")
      }
    >
      <span className="truncate">{label}</span>
    </button>
  );
}
