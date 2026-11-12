import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import type { ProjectCategory } from "@stage/data-ops/contracts";
import type {
  SaveClientProfileInput,
  SaveProjectProfileInput,
} from "@/hooks/project";
import { ClientPortalButton, ProjectTabBar, ProjectTitle } from "@stage/project-ui/project";
import type { Phase, Project, ProjectTab } from "@/models/project/project";
import type { ProjectModal, ProjectTimeline } from "@/types/project/projectHeader";
import { ProjectActionsMenu } from "./header/ProjectActionsMenu";
import { ProjectActionModal } from "./header/ProjectHeaderModals";

export type { ProjectTimeline };

export function ProjectHeader({
  project,
  projectImageUrl,
  projectCategoryLabel,
  projectCategory,
  clientAvatarUrl,
  timeline,
  activeTab,
  onTabChange,
  onExport,
  onShare,
  onSaveProjectProfile,
  onSaveClientProfile,
  onSaveTimeline,
  onSavePhases,
  enabledSteps,
  onSaveWorkflow,
  onPauseProject,
  onCompleteProject,
  onDeleteProject,
  onPrepareProjectMarkerUpload,
  onPrepareClientAvatarUpload,
  modalError,
  deleteError,
}: {
  project: Project;
  projectCategoryLabel?: string;
  projectCategory?: ProjectCategory;
  projectImageUrl?: string;
  clientAvatarUrl?: string;
  timeline: ProjectTimeline;
  activeTab: ProjectTab;
  onTabChange: (tab: ProjectTab) => void;
  onExport: (opts?: { step?: "sections" | "skills" }) => void;
  onShare: () => void;
  onSaveProjectProfile: (input: SaveProjectProfileInput) => Promise<void>;
  onSaveClientProfile: (input: SaveClientProfileInput) => Promise<void>;
  onSaveTimeline: (timeline: ProjectTimeline) => Promise<void>;
  onSavePhases: (phases: Phase[], deleteTasksInRemovedPhases?: boolean) => Promise<void>;
  enabledSteps: readonly string[];
  onSaveWorkflow: (enabledSteps: string[]) => Promise<void>;
  onPauseProject: () => Promise<void>;
  onCompleteProject: () => Promise<void>;
  onDeleteProject: () => Promise<void>;
  onPrepareProjectMarkerUpload: (file: File) => Promise<{ file: File; previewUrl: string }>;
  onPrepareClientAvatarUpload: (file: File) => Promise<{ file: File; previewUrl: string }>;
  modalError: string | null;
  deleteError: string | null;
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
    <section className="project-detail-header">
      <div className="project-header-primary grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-[14px]">
        <ProjectTitle name={project.name} clientName={project.clientName} categoryLabel={projectCategoryLabel} />

        <div ref={projectMenuRef} className="project-header-actions relative flex min-w-0 items-center justify-end gap-[6px]">
          <button
            type="button"
            onClick={() => onExport({ step: "sections" })}
            className="project-export-action inline-flex h-[27px] shrink-0 cursor-pointer items-center rounded-[6px] bg-[#F5F5F5] py-[6px] px-3 text-[13px] font-medium leading-[1.25] text-[#262626] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-colors hover:bg-[#ECECEC]"
          >
            Export
          </button>
          <button
            type="button"
            onClick={onShare}
            className="project-share-action inline-flex h-[27px] shrink-0 cursor-pointer items-center gap-2 rounded-[6px] bg-[#F5F5F5] py-[6px] pl-[10px] pr-3 text-[13px] font-medium leading-[1.25] text-[#262626] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-colors hover:bg-[#ECECEC]"
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

          {isProjectMenuOpen ? <ProjectActionsMenu projectStatus={project.status} onAction={openProjectModal} /> : null}
        </div>
      </div>

      <div className="project-header-secondary grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-[10px]">
        <div className="project-header-tabs min-w-0 max-w-full overflow-hidden">
          <ProjectTabBar enabledSteps={enabledSteps} category={projectCategory} activeTab={activeTab} onTabChange={onTabChange} />
        </div>

        <div className="project-header-portal flex min-w-0 items-center justify-end gap-2">
          <ClientPortalButton
            onClick={() => void navigate({ to: "/client-portal/$projectId/preview", params: { projectId: project.id } })}
          />
        </div>
      </div>

      {activeModal ? (
        <ProjectActionModal
          modal={activeModal}
          project={project}
          projectImageUrl={projectImageUrl}
          clientAvatarUrl={clientAvatarUrl}
          timeline={timeline}
          onSaveProjectProfile={onSaveProjectProfile}
          onSaveClientProfile={onSaveClientProfile}
          onSaveTimeline={onSaveTimeline}
          onSavePhases={onSavePhases}
          enabledSteps={enabledSteps}
          onSaveWorkflow={onSaveWorkflow}
          onPauseProject={onPauseProject}
          onCompleteProject={onCompleteProject}
          onDeleteProject={onDeleteProject}
          onPrepareProjectMarkerUpload={onPrepareProjectMarkerUpload}
          onPrepareClientAvatarUpload={onPrepareClientAvatarUpload}
          modalError={modalError}
          deleteError={deleteError}
          onClose={() => setActiveModal(null)}
        />
      ) : null}
    </section>
  );
}
