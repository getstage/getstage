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
      <div className="flex-1 px-[clamp(16px,7vw,100px)] py-[clamp(20px,4vw,44px)]">
        <div className="flex w-full flex-col gap-[28px]">
          <header className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-end gap-[14px]">
            <div className="min-w-0">
              <h1 className="text-[20px] font-semibold leading-[1.2] text-[#0a0a0a]">Client Portal</h1>
              <p className="mt-[8px] max-w-[360px] text-[13px] font-medium leading-[1.35] text-[#737373]">
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
              className="flex h-[32px] shrink-0 items-center gap-[8px] rounded-[6px] px-[10px] py-[6px] text-[13px] font-medium text-[#525252] transition-colors hover:bg-[#f5f5f5]"
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
      <div className="hidden grid-cols-[minmax(190px,1.4fr)_minmax(92px,0.7fr)_minmax(120px,0.9fr)_minmax(98px,0.75fr)_minmax(116px,0.65fr)] gap-[20px] px-[16px] py-[12px] xl:grid">
        {TABLE_COLUMNS.map((column) => (
          <p key={column} className="text-[14px] font-medium leading-[1.2] text-[#0a0a0a]">
            {column}
          </p>
        ))}
      </div>
      <div className="flex flex-col gap-[18px] rounded-[8px] bg-gradient-to-b from-white to-[#fafafa] px-[12px] pb-[16px] pt-[12px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] xl:gap-[24px] xl:px-[16px] xl:pb-[20px] xl:pt-[16px]">
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
              className="group grid cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-[10px] gap-y-[10px] outline-none xl:grid-cols-[minmax(190px,1.4fr)_minmax(92px,0.7fr)_minmax(120px,0.9fr)_minmax(98px,0.75fr)_minmax(116px,0.65fr)] xl:gap-[20px]"
            >
              <div className="col-span-2 flex min-w-0 items-center gap-[8px] xl:col-span-1">
                <div className="flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-full border border-[#fafafa] bg-[#171717] text-[8px] font-semibold text-white">
                  {project.logoLabel}
                </div>
                <p className="min-w-0 truncate text-[13px] font-medium leading-[1.25] text-[#171717] group-hover:underline group-focus-visible:underline">{project.name}</p>
              </div>
              <div className="col-start-3 row-start-1 flex justify-end xl:col-auto xl:row-auto xl:justify-start">
                <span className="rounded-[2px] bg-[#dcfce7] px-[6px] py-[2px] text-[12px] font-normal leading-[1.25] text-[#052e16]">
                  {project.status}
                </span>
              </div>
              <p className="col-span-2 text-[12px] font-medium leading-[1.25] text-[#737373] xl:col-auto xl:text-[13px] xl:text-[#525252]"><span className="xl:hidden">Type: </span>{project.type}</p>
              <p className="text-right text-[12px] font-medium leading-[1.25] text-[#737373] xl:text-left xl:text-[13px] xl:text-[#525252]"><span className="xl:hidden">Created: </span>{project.created}</p>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onOpenPortal(project.id);
                }}
                className={cn(
                  "col-span-3 flex w-fit items-center gap-[8px] text-[13px] font-medium leading-[1.25] text-[#171717] xl:col-auto",
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
