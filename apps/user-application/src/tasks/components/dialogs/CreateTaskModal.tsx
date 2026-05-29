import { useEffect, useState, type ReactNode } from "react";
import { TASK_ASSIGNEES, TASK_PROJECTS } from "@/tasks/data/fixtures/taskPickerFixtures";
import type { TaskAssignee, TaskPicker, TaskProject } from "@/tasks/types/taskModal";
import { cn } from "@/lib/utils";

export type { TaskAssignee, TaskProject };

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
                    onClick={() => setActivePicker((current) => (current === "assignee" ? null : "assignee"))}
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
                      setActivePicker((current) => (current === "project" ? null : "project"));
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
  children: ReactNode;
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
