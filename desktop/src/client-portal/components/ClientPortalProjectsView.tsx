import { useNavigate } from "@tanstack/react-router";
import { WorkspaceFrame } from "@/app/WorkspaceFrame";
import { projectOverviewRows, type ProjectOverviewRow } from "@/project/data/projectOverviewSnapshot";
import { ClientPortalTabBar } from "./ClientPortalTabBar";
import { cn } from "@/lib/utils";

const TABLE_COLUMNS = ["Project Name", "Status", "Project Type", "Created", "Actions"];

export function ClientPortalProjectsView() {
  const navigate = useNavigate();

  return (
    <WorkspaceFrame>
      <div className="flex-1 px-[100px] py-[44px]">
        <div className="flex w-full flex-col gap-[28px]">
          <header className="flex items-end justify-between gap-[24px]">
            <div>
              <h1 className="text-[20px] font-semibold leading-[1.2] text-[#0a0a0a]">Client Portal</h1>
              <p className="mt-[8px] text-[13px] font-medium leading-[1.2] text-[#737373]">
                Create Portals for your clients to track progress
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                void navigate({
                  to: "/client-portal/$projectId/preview",
                  params: { projectId: "baseframe" },
                })
              }
              className="flex h-[32px] items-center gap-[8px] rounded-[6px] px-[10px] py-[6px] text-[13px] font-medium text-[#525252] transition-colors hover:bg-[#f5f5f5]"
            >
              Preview Portal
              <RedirectIcon />
            </button>
          </header>

          <ClientPortalTabBar activeTab="projects" />

          <PortalProjectsTable
            projects={projectOverviewRows}
            onOpenProject={(projectId) =>
              void navigate({
                to: "/project/$projectId",
                params: { projectId },
              })
            }
            onOpenPortal={(projectId) =>
              void navigate({
                to: "/client-portal/$projectId/preview",
                params: { projectId },
              })
            }
          />
        </div>
      </div>
    </WorkspaceFrame>
  );
}

function PortalProjectsTable({
  projects,
  onOpenProject,
  onOpenPortal,
}: {
  projects: ProjectOverviewRow[];
  onOpenProject: (projectId: string) => void;
  onOpenPortal: (projectId: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-[10px] bg-[#f5f5f5] p-[4px]">
      <div className="grid grid-cols-5 gap-[24px] px-[16px] py-[12px]">
        {TABLE_COLUMNS.map((column) => (
          <p key={column} className="text-[14px] font-medium leading-[1.2] text-[#0a0a0a]">
            {column}
          </p>
        ))}
      </div>
      <div className="flex flex-col gap-[24px] rounded-[8px] bg-gradient-to-b from-white to-[#fafafa] px-[16px] pb-[20px] pt-[16px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
        {projects.map((project, index) => (
          <div key={project.id} className="flex flex-col gap-[20px]">
            <div 
              role="button"
              tabIndex={0}
              onClick={() => onOpenProject(project.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onOpenProject(project.id);
                }
              }}
              className="group grid cursor-pointer grid-cols-5 items-center gap-[24px] outline-none"
            >
              <div className="flex min-w-0 items-center gap-[8px]">
                <div className="flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-full border border-[#fafafa] bg-[#171717] text-[8px] font-semibold text-white">
                  {project.logoLabel}
                </div>
                <p className="min-w-0 truncate text-[13px] font-medium leading-[1.25] text-[#171717] group-hover:underline group-focus-visible:underline">{project.name}</p>
              </div>
              <div>
                <span className="rounded-[2px] bg-[#dcfce7] px-[6px] py-[2px] text-[12px] font-normal leading-[1.25] text-[#052e16]">
                  {project.status}
                </span>
              </div>
              <p className="text-[13px] font-medium leading-[1.25] text-[#525252]">{project.type}</p>
              <p className="text-[13px] font-medium leading-[1.25] text-[#525252]">{project.created}</p>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onOpenPortal(project.id);
                }}
                className={cn(
                  "flex w-fit items-center gap-[8px] text-[13px] font-medium leading-[1.25] text-[#171717]",
                  "transition-colors hover:text-[#463fba]"
                )}
              >
                Client Portal
                <RedirectIcon />
              </button>
            </div>
            {index < projects.length - 1 ? <div className="h-px w-full bg-[#e5e5e5]" /> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function RedirectIcon() {
  return (
    <img src="/logos/dashboard/redirect.svg" alt="" aria-hidden="true" className="h-[15px] w-[15px] shrink-0" />
  );
}
