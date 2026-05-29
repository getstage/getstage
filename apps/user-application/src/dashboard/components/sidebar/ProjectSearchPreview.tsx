import type { RefObject } from "react";
import type { DashboardProject } from "../../models/dashboard";

export function ProjectSearchPreviewItem({
  project,
  onOpenProject,
}: {
  project: DashboardProject;
  onOpenProject: (projectId: string) => void;
}) {
  const meta = [project.clientName, project.phaseName].filter(Boolean).join(" • ");

  return (
    <button
      type="button"
      role="option"
      aria-selected={false}
      onClick={() => onOpenProject(project.id)}
      className="flex min-h-[42px] w-full cursor-pointer items-center gap-[8px] rounded-[6px] px-[8px] py-[6px] text-left outline-none transition-colors hover:bg-[#F5F5F5]"
    >
      <ProjectAvatar project={project} />
      <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
        <span className="truncate text-[13px] font-medium leading-[1.25] text-[#171717]">
          {project.name}
        </span>
        {meta ? (
          <span className="truncate text-[12px] font-medium leading-[1.25] text-[#737373]">
            {meta}
          </span>
        ) : null}
      </span>
    </button>
  );
}

export function ProjectSearchPreview({
  projects,
  query,
  onOpenProject,
  onViewAllProjects,
}: {
  projects: DashboardProject[];
  query: string;
  onOpenProject: (projectId: string) => void;
  onViewAllProjects: () => void;
}) {
  return (
    <div
      className="absolute left-0 top-[38px] z-50 w-full rounded-[8px] bg-[#F5F5F5] p-[4px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]"
      role="listbox"
      aria-label="Project search results"
    >
      <div className="rounded-[6px] bg-white p-[4px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
        <div className="px-[8px] pb-[6px] pt-[4px]">
          <p className="truncate text-[12px] font-medium leading-[1.25] text-[#737373]">
            {projects.length > 0 ? "Matching projects" : `No projects for "${query.trim()}"`}
          </p>
        </div>

        {projects.length > 0 ? (
          <div className="flex flex-col gap-[2px]">
            {projects.map((project) => (
              <ProjectSearchPreviewItem
                key={project.id}
                project={project}
                onOpenProject={onOpenProject}
              />
            ))}
          </div>
        ) : (
          <button
            type="button"
            onClick={onViewAllProjects}
            className="flex h-[34px] w-full cursor-pointer items-center rounded-[6px] px-[8px] text-left text-[13px] font-medium leading-none text-[#171717] outline-none transition-colors hover:bg-[#F5F5F5]"
          >
            View all projects
          </button>
        )}
      </div>
    </div>
  );
}

export function CompactProjectSearchDialog({
  refEl,
  inputRef,
  query,
  projects,
  hasQuery,
  onQueryChange,
  onOpenProject,
  onViewAllProjects,
  onClose,
}: {
  refEl: RefObject<HTMLDivElement | null>;
  inputRef: RefObject<HTMLInputElement | null>;
  query: string;
  projects: DashboardProject[];
  hasQuery: boolean;
  onQueryChange: (query: string) => void;
  onOpenProject: (projectId: string) => void;
  onViewAllProjects: () => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/10 p-[24px] backdrop-blur-[5px]"
      role="dialog"
      aria-modal="true"
      aria-label="Search projects"
      onClick={onClose}
    >
      <div
        ref={refEl}
        className="w-full max-w-[516px] rounded-[12px] bg-[#F5F5F5] p-[4px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="rounded-[8px] bg-white p-[12px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
          <label className="flex h-[34px] w-full items-center gap-[8px] rounded-[6px] bg-[#F5F5F5] px-[12px] text-[#525252] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
            <img
              src="/logos/dashboard/search.svg"
              alt=""
              aria-hidden="true"
              className="h-[15px] w-[15px] shrink-0"
            />
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Search projects..."
              aria-label="Search projects"
              className="min-w-0 flex-1 bg-transparent p-0 text-[12px] font-medium leading-[1.25] text-[#525252] outline-none placeholder:text-[#525252]"
            />
          </label>

          <div className="mt-[8px] px-[4px] pb-[4px]">
            <p className="truncate text-[12px] font-medium leading-[1.25] text-[#737373]">
              {hasQuery
                ? projects.length > 0
                  ? "Matching projects"
                  : `No projects for "${query.trim()}"`
                : "Recent projects"}
            </p>
          </div>

          <div className="flex max-h-[240px] flex-col gap-[2px] overflow-y-auto">
            {projects.length > 0 ? (
              projects.map((project) => (
                <ProjectSearchPreviewItem
                  key={project.id}
                  project={project}
                  onOpenProject={onOpenProject}
                />
              ))
            ) : (
              <button
                type="button"
                onClick={onViewAllProjects}
                className="flex h-[34px] w-full cursor-pointer items-center rounded-[6px] px-[8px] text-left text-[13px] font-medium leading-none text-[#171717] outline-none transition-colors hover:bg-[#F5F5F5]"
              >
                View all projects
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProjectAvatar({ project }: { project: DashboardProject }) {
  if (project.projectImageUrl) {
    return (
      <img
        src={project.projectImageUrl}
        alt=""
        aria-hidden="true"
        className="h-[24px] w-[24px] shrink-0 rounded-full object-cover"
      />
    );
  }

  return (
    <div
      className="flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-full text-[10px] font-medium text-white"
      style={{ background: project.accentColor }}
    >
      {project.logoLabel}
    </div>
  );
}
