import { useNavigate } from "@tanstack/react-router";
import type { ProjectSummary } from "@stage/data-ops";
import { useProjectsQuery } from "@/hooks/convex-data";
import { setProjectBackDestination } from "@/lib/projectBackDestination";
import { ClientPortalTabBar } from "./ClientPortalTabBar";
import { cn } from "@/lib/utils";

const TABLE_COLUMNS = ["Project Name", "Status", "Project Type", "Created", "Actions"];

const PROJECT_TYPE_LABEL: Record<ProjectSummary["type"], string> = {
  branding: "Branding",
  "web-design": "Web Design",
  "product-design": "Product Design",
  "app-design": "App Design",
  "web-app": "Web-App Design",
  packaging: "Packaging",
  "motion-design": "Motion Design",
  illustration: "Illustration",
  other: "Other",
};

const PROJECT_STATUS_LABEL: Record<ProjectSummary["status"], string> = {
  active: "Active",
  paused: "Paused",
  completed: "Completed",
};

function getInitial(name: string) {
  const trimmed = name.trim();
  return trimmed.length > 0 ? trimmed[0]!.toUpperCase() : "S";
}

function formatCreatedAt(timestamp: number) {
  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(timestamp));
}

export function ClientPortalProjectsView() {
  const navigate = useNavigate();
  const projectsQuery = useProjectsQuery();
  const projects = projectsQuery.data ?? [];
  const previewProjectId = projects[0]?.id;

  return (
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
              onClick={() => {
                if (!previewProjectId) return;
                void navigate({
                  to: "/client-portal/$projectId/preview",
                  params: { projectId: previewProjectId },
                });
              }}
              disabled={!previewProjectId}
              className="flex h-[32px] shrink-0 items-center gap-[8px] rounded-[6px] px-[10px] py-[6px] text-[13px] font-medium text-[#525252] transition-colors hover:bg-[#f5f5f5] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Preview Portal
              <RedirectIcon />
            </button>
          </header>

          <ClientPortalTabBar activeTab="projects" />

          <PortalProjectsTable
            projects={projects}
            isLoading={projectsQuery.isLoading}
            error={projectsQuery.error}
            onOpenProject={(projectId) =>
              {
                setProjectBackDestination({ href: "/client-portal", label: "Back to client portal" });
                void navigate({
                  to: "/project/$projectId",
                  params: { projectId },
                });
              }
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
  );
}

function PortalProjectsTable({
  projects,
  isLoading,
  error,
  onOpenProject,
  onOpenPortal,
}: {
  projects: ProjectSummary[];
  isLoading: boolean;
  error: unknown;
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
        {error ? (
          <p className="py-[4px] text-[13px] font-medium text-[#b91c1c]">
            Could not load projects. Sign in to Stage from Settings to see live projects.
          </p>
        ) : isLoading ? (
          <p className="py-[4px] text-[13px] font-medium text-[#737373]">
            Loading projects…
          </p>
        ) : projects.length === 0 ? (
          <p className="py-[4px] text-[13px] font-medium text-[#737373]">
            No projects yet.
          </p>
        ) : (
          projects.map((project, index) => {
            const initial = getInitial(project.name);
            const statusLabel = PROJECT_STATUS_LABEL[project.status];
            const typeLabel = (project.type === "other" && project.typeOtherLabel?.trim()
          ? project.typeOtherLabel.trim()
          : PROJECT_TYPE_LABEL[project.type]);
            const createdLabel = formatCreatedAt(project.startDate);

            return (
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
                    {project.projectImageUrl ? (
                      <img
                        src={project.projectImageUrl}
                        alt=""
                        className="h-[20px] w-[20px] shrink-0 rounded-full border border-[#fafafa] object-cover"
                      />
                    ) : (
                      <div className="flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-full border border-[#fafafa] bg-[#171717] text-[8px] font-semibold text-white">
                        {initial}
                      </div>
                    )}
                    <p className="min-w-0 truncate text-[13px] font-medium leading-[1.25] text-[#171717] group-hover:underline group-focus-visible:underline">
                      {project.name}
                    </p>
                  </div>
                  <div className="col-start-3 row-start-1 flex justify-end xl:col-auto xl:row-auto xl:justify-start">
                    <span className="rounded-[2px] bg-[#dcfce7] px-[6px] py-[2px] text-[12px] font-normal leading-[1.25] text-[#052e16]">
                      {statusLabel}
                    </span>
                  </div>
                  <p className="col-span-2 text-[12px] font-medium leading-[1.25] text-[#737373] xl:col-auto xl:text-[13px] xl:text-[#525252]">
                    <span className="xl:hidden">Type: </span>
                    {typeLabel}
                  </p>
                  <p className="text-right text-[12px] font-medium leading-[1.25] text-[#737373] xl:text-left xl:text-[13px] xl:text-[#525252]">
                    <span className="xl:hidden">Created: </span>
                    {createdLabel}
                  </p>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onOpenPortal(project.id);
                    }}
                    className={cn(
                      "col-span-3 flex w-fit items-center gap-[8px] text-[13px] font-medium leading-[1.25] text-[#171717] xl:col-auto",
                      "transition-colors hover:text-[#463fba]",
                    )}
                  >
                    Client Portal
                    <RedirectIcon />
                  </button>
                </div>
                {index < projects.length - 1 ? <div className="h-px w-full bg-[#e5e5e5]" /> : null}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function RedirectIcon() {
  return (
    <img src="/logos/dashboard/redirect.svg" alt="" aria-hidden="true" className="h-[15px] w-[15px] shrink-0" />
  );
}
