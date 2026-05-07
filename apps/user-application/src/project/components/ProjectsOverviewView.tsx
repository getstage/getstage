import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { WorkspaceFrame } from "@/app/WorkspaceFrame";
import { cn } from "@/lib/utils";
import { projectOverviewRows } from "../data/projectOverviewSnapshot";
import type { ProjectOverviewRow } from "../data/projectOverviewSnapshot";

const TABLE_COLUMNS = [
  "Project Name",
  "Status",
  "Project Type",
  "Created",
  "Actions",
];

export function ProjectsOverviewView() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const filteredProjects = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return projectOverviewRows;

    return projectOverviewRows.filter((project) =>
      [project.name, project.type, project.status, project.created]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [query]);

  return (
    <WorkspaceFrame>
      <div className="flex-1 px-[clamp(16px,7vw,100px)] py-[clamp(20px,4vw,44px)]">
        <div className="flex w-full flex-col gap-[28px]">
          <header className="flex w-full items-end justify-between">
            <div className="flex min-w-0 flex-1 flex-col gap-[8px]">
              <h1 className="text-[20px] font-semibold leading-[1.2] text-[#0a0a0a]">
                Projects
              </h1>
              <p className="text-[13px] font-medium leading-[1.2] text-[#737373]">
                See all your live projects here
              </p>
            </div>
          </header>

          <div className="flex w-full flex-col gap-[12px]">
            <div className="flex w-full flex-col gap-[10px] md:flex-row md:items-center md:justify-between">
              <label className="flex h-[35px] w-full items-center gap-[8px] overflow-hidden rounded-[6px] bg-[#f5f5f5] px-[12px] text-[#525252] shadow-[0px_0.45px_1px_0px_rgba(10,10,10,0.25)] md:max-w-[320px]">
                <img
                  src="/logos/dashboard/search.svg"
                  alt=""
                  aria-hidden="true"
                  className="h-[15px] w-[15px] shrink-0"
                />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search Project"
                  aria-label="Search project"
                  className="min-w-0 flex-1 bg-transparent p-0 text-[12px] font-medium leading-[1.25] text-[#525252] outline-none placeholder:text-[#525252]"
                />
              </label>

              <button
                type="button"
                onClick={() => void navigate({ to: "/projects/create" })}
                className="flex h-[35px] shrink-0 cursor-pointer items-center justify-center gap-[6px] rounded-[6px] border border-[rgba(158,153,248,0.75)] bg-gradient-to-b from-[#7b76df] to-[#463fba] py-[8px] pl-[10px] pr-[12px] text-[13px] font-medium leading-[1.25] text-[#fafafa] shadow-[0px_0.45px_0.5px_0px_rgba(10,10,10,0.25)]"
              >
                <img
                  src="/logos/dashboard/plus.svg"
                  alt=""
                  aria-hidden="true"
                  className="h-[14px] w-[14px] brightness-0 invert"
                />
                <span className="whitespace-nowrap [text-shadow:0px_0.5px_1.5px_rgba(0,0,0,0.15)]">
                  Create Project
                </span>
              </button>
            </div>

            <ProjectsTable
              projects={filteredProjects}
              onOpenProject={(projectId) =>
                void navigate({
                  to: "/project/$projectId",
                  params: { projectId },
                })
              }
              onOpenProjectDetails={(projectId) =>
                void navigate({
                  to: "/project/$projectId/details",
                  params: { projectId },
                })
              }
            />
          </div>
        </div>
      </div>
    </WorkspaceFrame>
  );
}

function ProjectsTable({
  projects,
  onOpenProject,
  onOpenProjectDetails,
}: {
  projects: ProjectOverviewRow[];
  onOpenProject: (projectId: string) => void;
  onOpenProjectDetails: (projectId: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-[10px] bg-[#f5f5f5] p-[4px]">
      <div className="hidden grid-cols-[minmax(190px,1.4fr)_minmax(92px,0.7fr)_minmax(120px,0.9fr)_minmax(98px,0.75fr)_minmax(104px,0.65fr)] gap-[20px] px-[16px] py-[12px] xl:grid">
        {TABLE_COLUMNS.map((column) => (
          <p
            key={column}
            className="text-[14px] font-medium leading-[1.2] text-[#0a0a0a]"
          >
            {column}
          </p>
        ))}
      </div>

      <div className="flex w-full flex-col gap-[18px] rounded-[8px] bg-gradient-to-b from-white to-[#fafafa] px-[12px] pb-[16px] pt-[12px] shadow-[0px_0.45px_0.5px_0px_rgba(10,10,10,0.25)] xl:gap-[24px] xl:px-[16px] xl:pb-[20px] xl:pt-[16px]">
        {projects.length > 0 ? (
          projects.map((project, index) => (
            <ProjectTableRow
              key={project.id}
              project={project}
              showDivider={index < projects.length - 1}
              onOpenProject={onOpenProject}
              onOpenProjectDetails={onOpenProjectDetails}
            />
          ))
        ) : (
          <p className="py-[4px] text-[13px] font-medium text-[#737373]">
            No projects found.
          </p>
        )}
      </div>
    </div>
  );
}

function ProjectTableRow({
  project,
  showDivider,
  onOpenProject,
  onOpenProjectDetails,
}: {
  project: ProjectOverviewRow;
  showDivider: boolean;
  onOpenProject: (projectId: string) => void;
  onOpenProjectDetails: (projectId: string) => void;
}) {
  return (
    <div className="flex flex-col gap-[20px]">
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
        className="group grid w-full cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-[10px] gap-y-[10px] text-left outline-none xl:grid-cols-[minmax(190px,1.4fr)_minmax(92px,0.7fr)_minmax(120px,0.9fr)_minmax(98px,0.75fr)_minmax(104px,0.65fr)] xl:gap-[20px]"
        aria-label={`Open ${project.name}`}
      >
        <div className="col-span-2 flex min-w-0 items-center gap-[8px] xl:col-span-1">
          <div
            className="flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-full border border-[#fafafa] text-[8px] font-semibold text-white"
            style={{ background: project.accentColor }}
          >
            {project.logoLabel}
          </div>
          <p className="min-w-0 truncate text-[13px] font-medium leading-[1.25] text-[#171717] decoration-solid group-hover:underline group-focus-visible:underline">
            {project.name}
          </p>
        </div>

        <div className="col-start-3 row-start-1 flex min-w-0 items-center justify-end xl:col-auto xl:row-auto xl:justify-start">
          <span className="rounded-[2px] bg-[#dcfce7] px-[6px] py-[2px] text-[12px] font-normal leading-[1.25] text-[#052e16]">
            {project.status}
          </span>
        </div>

        <p className="col-span-2 min-w-0 text-[12px] font-medium leading-[1.25] text-[#737373] xl:col-auto xl:text-[13px] xl:text-[#525252]">
          <span className="xl:hidden">Type: </span>
          {project.type}
        </p>

        <p className="min-w-0 text-right text-[12px] font-medium leading-[1.25] text-[#737373] xl:text-left xl:text-[13px] xl:text-[#525252]">
          <span className="xl:hidden">Created: </span>
          {project.created}
        </p>

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onOpenProjectDetails(project.id);
          }}
          className={cn(
            "col-span-3 flex min-w-0 cursor-pointer items-center gap-[8px] text-left text-[13px] font-medium leading-[1.25] text-[#171717] xl:col-auto",
            "transition-colors hover:text-[#463fba]",
          )}
          aria-label={`See details for ${project.name}`}
        >
          <span className="whitespace-nowrap">See Details</span>
          <img
            src="/logos/dashboard/redirect.svg"
            alt=""
            aria-hidden="true"
            className="h-[15px] w-[15px] shrink-0"
          />
        </button>
      </div>
      {showDivider ? <div className="h-px w-full bg-[#e5e5e5]" /> : null}
    </div>
  );
}
