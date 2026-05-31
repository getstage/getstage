import type { ProjectModal } from "@/types/project/projectHeader";

export function ProjectActionsMenu({ onAction }: { onAction: (modal: ProjectModal) => void }) {
  return (
    <div
      className="absolute right-0 top-[35px] z-40 flex w-[212px] flex-col gap-[8px] rounded-[8px] border-2 border-[rgba(0,0,0,0.05)] bg-gradient-to-b from-white to-[#FAFAFA] p-[12px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]"
      role="menu"
      aria-label="Project actions"
    >
      <div className="flex w-full flex-col items-start">
        <ProjectActionItem onSelect={() => onAction("name")}>Edit Project Name</ProjectActionItem>
        <ProjectActionItem onSelect={() => onAction("client")}>Edit Client</ProjectActionItem>
        <ProjectActionItem onSelect={() => onAction("timeline")}>Adjust Timeline</ProjectActionItem>
        <ProjectActionItem onSelect={() => onAction("phases")}>Add or remove phases</ProjectActionItem>
      </div>

      <div className="h-px w-full bg-[#E5E5E5]" />

      <div className="flex w-full flex-col items-start">
        <ProjectActionItem onSelect={() => onAction("pause")}>Pause Project</ProjectActionItem>
      </div>

      <div className="h-px w-full bg-[#E5E5E5]" />

      <div className="flex w-full flex-col items-start">
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
      className={`flex w-full cursor-pointer items-center rounded-[6px] px-[8px] py-[6px] text-left text-[12px] font-medium leading-normal outline-none transition-colors hover:bg-[#F5F5F5] ${
        destructive ? "text-[#DC2626]" : "text-[#262626]"
      }`}
    >
      {children}
    </button>
  );
}
