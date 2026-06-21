import type { DashboardProject } from "@/models/dashboard/dashboard";
import { sidebarLabelClassName } from "@/lib/dashboard/sidebarNav";
import { cn } from "@/lib/utils";
import { SidebarRoundAvatar } from "./SidebarRoundAvatar";

export function SidebarProjectList({
  collapsed,
  projects,
  activeProjectId,
  onOpenProject,
  onCreateProject,
}: {
  collapsed: boolean;
  projects: DashboardProject[];
  activeProjectId: string;
  onOpenProject: (projectId: string) => void;
  onCreateProject: () => void;
}) {
  const labelClassName = sidebarLabelClassName(collapsed);

  return (
    <div className={cn("flex min-h-0 w-full flex-1 flex-col gap-[clamp(8px,2vh,12px)]", collapsed && "items-center")}>
      <div
        aria-hidden={collapsed}
        className={cn(
          "w-full shrink-0 items-center justify-between px-[12px] transition-[max-height,opacity,margin] duration-200 ease-out",
          collapsed ? "max-h-0 overflow-hidden opacity-0" : "max-h-[28px] overflow-visible opacity-100",
          collapsed ? "hidden" : "flex",
        )}
      >
        <div className="flex items-center gap-[8px]">
          <img
            src="/logos/dashboard/folder.svg"
            alt=""
            aria-hidden="true"
            className="h-[15px] w-[15px]"
          />
          <span className="whitespace-nowrap text-[13px] font-medium text-[#525252]">
            Projects
          </span>
        </div>
        <button
          type="button"
          onClick={onCreateProject}
          className="flex h-[20px] w-[20px] cursor-pointer items-center justify-center rounded-[4px] bg-white shadow-[0px_0.45px_0.5px_0px_rgba(10,10,10,0.25)] outline-none transition-colors hover:bg-[#fafafa]"
        >
          <img
            src="/logos/dashboard/plus.svg"
            alt="New project"
            className="h-[12px] w-[12px]"
          />
        </button>
      </div>

      <div className={cn("min-h-0 w-full flex-1 overflow-hidden", collapsed && "w-[40px]")}>
        <div
          className={cn(
            "sidebar-scroll-area flex h-full w-full flex-col gap-[clamp(4px,1.5vh,8px)] overflow-y-auto overflow-x-hidden overscroll-contain [-webkit-overflow-scrolling:touch]",
            collapsed && "items-center px-[4px]",
          )}
        >
          {projects.map((project) => {
            const isActive = activeProjectId === project.id;

            return (
              <button
                key={project.id}
                type="button"
                onClick={() => onOpenProject(project.id)}
                aria-label={project.name}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex h-[36px] shrink-0 items-center overflow-hidden outline-none transition-[width,padding,gap,background-color,box-shadow] duration-200 ease-out",
                  "cursor-pointer",
                  collapsed
                    ? "w-[32px] justify-center gap-0 rounded-[6px] px-0"
                    : "w-full justify-start gap-[8px] rounded-[6px] px-[12px]",
                  isActive
                    ? collapsed
                      ? "bg-transparent shadow-none"
                      : "bg-white shadow-[0px_0.45px_0.5px_0px_rgba(10,10,10,0.15)]"
                    : "bg-[#f5f5f5] hover:bg-[#ebebeb]",
                )}
              >
                <SidebarRoundAvatar
                  imageUrl={project.projectImageUrl}
                  label={project.name}
                  initials={project.logoLabel}
                  accentColor={project.accentColor}
                />
                <span
                  aria-hidden={collapsed}
                  className={cn(labelClassName, isActive ? "text-[#0a0a0a]" : "text-[#525252]")}
                >
                  {project.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
