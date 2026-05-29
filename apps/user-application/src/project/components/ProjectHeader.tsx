import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { PROJECT_PAGE_TABS } from "../helpers/projectTabs";
import type { Phase, Project, ProjectTab } from "../models/project";
import type { ProjectModal, ProjectTimeline } from "../types/projectHeader";
import { ProjectActionsMenu } from "./header/ProjectActionsMenu";
import { ProjectActionModal } from "./header/ProjectHeaderModals";

export type { ProjectTimeline };

export function ProjectHeader({
  project,
  timeline,
  activeTab,
  onTabChange,
  onShare,
  onProjectNameSave,
  onClientNameSave,
  onTimelineSave,
  onPhasesSave,
  onPauseProject,
  onDeleteProject,
  deleteError,
}: {
  project: Project;
  timeline: ProjectTimeline;
  activeTab: ProjectTab;
  onTabChange: (tab: ProjectTab) => void;
  onShare: () => void;
  onProjectNameSave: (name: string) => void;
  onClientNameSave: (clientName: string) => void;
  onTimelineSave: (timeline: ProjectTimeline) => void;
  onPhasesSave: (phases: Phase[]) => void;
  onPauseProject: () => void;
  onDeleteProject: () => void | Promise<void>;
  deleteError?: string | null;
}) {
  const navigate = useNavigate();
  const [isProjectMenuOpen, setIsProjectMenuOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<ProjectModal | null>(null);
  const projectMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isProjectMenuOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (!projectMenuRef.current?.contains(event.target as Node)) {
        setIsProjectMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsProjectMenuOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isProjectMenuOpen]);

  function openProjectModal(modal: ProjectModal) {
    setIsProjectMenuOpen(false);
    setActiveModal(modal);
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-[14px]">
        <div className="min-w-0">
          <h1 className="max-w-[720px] truncate font-heading text-[20px] font-semibold leading-[1.2] text-[#0A0A0A]">
            {project.name}
          </h1>
          <p className="mt-2 truncate text-[13px] font-medium leading-[1.2] text-[#737373]">
            {project.clientName}
          </p>
        </div>

        <div ref={projectMenuRef} className="relative flex min-w-0 items-center justify-end gap-[6px]">
          <button
            type="button"
            onClick={onShare}
            className="inline-flex h-[27px] shrink-0 cursor-pointer items-center gap-2 rounded-[6px] bg-[#F5F5F5] py-[6px] pl-[10px] pr-3 text-[13px] font-medium leading-[1.25] text-[#262626] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-colors hover:bg-[#ECECEC]"
          >
            Share
            <img src="/logos/dashboard/share.svg" alt="" aria-hidden="true" className="h-[15px] w-[15px] shrink-0" />
          </button>

          <button
            type="button"
            onClick={() => setIsProjectMenuOpen((current) => !current)}
            className="flex h-[27px] w-[27px] cursor-pointer items-center justify-center rounded-[6px] text-[#525252] transition-colors hover:bg-[#F5F5F5]"
            aria-label="Project actions"
            aria-haspopup="menu"
            aria-expanded={isProjectMenuOpen}
          >
            <svg viewBox="0 0 16 16" fill="currentColor" className="h-[15px] w-[15px]">
              <circle cx="8" cy="3.5" r="1.15" />
              <circle cx="8" cy="8" r="1.15" />
              <circle cx="8" cy="12.5" r="1.15" />
            </svg>
          </button>

          {isProjectMenuOpen ? <ProjectActionsMenu onAction={openProjectModal} /> : null}
        </div>
      </div>

      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-[10px]">
        <div className="min-w-0 max-w-full overflow-hidden">
          <div className="project-tab-menu w-fit max-w-full overflow-x-auto rounded-[8px] bg-[#F5F5F5] p-[2px]">
            <div className="flex w-max items-start gap-[8px]">
              {PROJECT_PAGE_TABS.map((tab) => {
                const isActive = tab.key === activeTab;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => onTabChange(tab.key)}
                    className={`inline-flex shrink-0 cursor-pointer items-center gap-[8px] whitespace-nowrap rounded-[6px] py-[6px] pl-[10px] pr-[12px] text-[13px] font-medium leading-none transition-all duration-150 ${
                      isActive
                        ? "bg-gradient-to-b from-[#8D87FF] to-[#7B76DF] text-[#E5E5E5] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]"
                        : "text-[#737373] hover:bg-white"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className="h-[15px] w-[15px] shrink-0 bg-current"
                      style={{
                        WebkitMask: `url("${tab.iconSrc}") center / contain no-repeat`,
                        mask: `url("${tab.iconSrc}") center / contain no-repeat`,
                      }}
                    />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex min-w-0 items-center justify-end gap-2">
          <button
            type="button"
            onClick={() =>
              void navigate({
                to: "/client-portal/$projectId/preview",
                params: { projectId: project.id },
              })
            }
            className="inline-flex h-[27px] shrink-0 cursor-pointer items-center gap-2 rounded-[6px] px-[10px] py-[6px] text-[13px] font-medium leading-[1.25] text-[#525252] transition-colors hover:bg-[#F5F5F5]"
          >
            <span className="whitespace-nowrap">Client Portal</span>
            <img
              src="/logos/dashboard/redirect.svg"
              alt=""
              aria-hidden="true"
              className="h-[15px] w-[15px] shrink-0"
            />
          </button>
        </div>
      </div>

      {activeModal ? (
        <ProjectActionModal
          modal={activeModal}
          project={project}
          timeline={timeline}
          onProjectNameSave={onProjectNameSave}
          onClientNameSave={onClientNameSave}
          onTimelineSave={onTimelineSave}
          onPhasesSave={onPhasesSave}
          onPauseProject={onPauseProject}
          onDeleteProject={onDeleteProject}
          deleteError={deleteError}
          onClose={() => setActiveModal(null)}
        />
      ) : null}
    </section>
  );
}
