import type { ProjectModal } from "@/types/project/projectHeader";
import type { ProjectStatus } from "@stage/data-ops";

export function ProjectActionsMenu({
  projectStatus,
  onAction,
}: {
  projectStatus: ProjectStatus;
  onAction: (modal: ProjectModal) => void;
}) {
  const pauseLabel = projectStatus === "paused" ? "Unpause Project" : "Pause Project";

  return (
    <div
      className="absolute right-0 top-[35px] z-40 flex w-[190px] flex-col rounded-[10px] border border-[#E5E5E5] bg-white p-[8px] shadow-[0_18px_42px_rgba(10,10,10,0.12),0_0.45px_0.5px_rgba(10,10,10,0.25)]"
      role="menu"
      aria-label="Project actions"
    >
      <div className="flex w-full flex-col items-start gap-[2px]">
        <ProjectActionItem onSelect={() => onAction("name")}>Edit Project Name</ProjectActionItem>
        <ProjectActionItem onSelect={() => onAction("client")}>Edit Client</ProjectActionItem>
        <ProjectActionItem onSelect={() => onAction("timeline")}>Adjust Timeline</ProjectActionItem>
        <ProjectActionItem onSelect={() => onAction("phases")}>Add or remove phases</ProjectActionItem>
        <ProjectActionItem onSelect={() => onAction("workflow")}>Edit Workflow</ProjectActionItem>
        <ProjectActionItem onSelect={() => onAction("skills")}>
          Edit Skills &amp; Components
        </ProjectActionItem>
      </div>

      <div className="mt-[2px] flex w-full flex-col items-start gap-[2px] border-t border-[#E5E5E5] pt-[2px]">
        <ProjectActionItem onSelect={() => onAction("pause")}>{pauseLabel}</ProjectActionItem>
        {projectStatus !== "completed" ? (
          <ProjectActionItem onSelect={() => onAction("complete")}>Complete Project</ProjectActionItem>
        ) : null}
      </div>

      <div className="mt-[2px] flex w-full flex-col items-start border-t border-[#E5E5E5] pt-[2px]">
        <ProjectActionItem destructive onSelect={() => onAction("delete")}>
          Delete Project
        </ProjectActionItem>
      </div>
    </div>
  );
}

function ProjectActionItem({
  children,
  destructive = false,
  onSelect,
}: {
  children: string;
  destructive?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onSelect}
      className={`flex h-[28px] w-full cursor-pointer items-center rounded-[6px] px-[10px] text-left text-[12px] font-medium leading-[1.25] outline-none transition-colors hover:bg-[#F5F5F5] ${
        destructive ? "text-[#DC2626]" : "text-[#262626]"
      }`}
    >
      {children}
    </button>
  );
}
