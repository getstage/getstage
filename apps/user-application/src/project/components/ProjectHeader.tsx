import { useEffect, useRef, useState } from "react";
import type { Project, ProjectTab } from "../models/project";

type ProjectModal = "name" | "client" | "timeline" | "phases" | "pause" | "delete";

const PAGE_TABS: { key: ProjectTab; label: string; iconSrc: string }[] = [
  { key: "overview", label: "Overview", iconSrc: "/logos/dashboard/overview.svg" },
  { key: "research", label: "Research", iconSrc: "/logos/dashboard/research.svg" },
  { key: "strategy", label: "Strategy", iconSrc: "/logos/dashboard/strategy.svg" },
  { key: "moodboard", label: "Moodboard", iconSrc: "/logos/dashboard/moodboard.svg" },
  { key: "flows", label: "Flows", iconSrc: "/logos/dashboard/flows.svg" },
  { key: "wireframes", label: "Generate", iconSrc: "/logos/dashboard/generate.svg" },
  { key: "assets", label: "Assets", iconSrc: "/logos/dashboard/assets.svg" },
];

export function ProjectHeader({
  project,
  activeTab,
  onTabChange,
  onShare,
}: {
  project: Project;
  activeTab: ProjectTab;
  onTabChange: (tab: ProjectTab) => void;
  onShare: () => void;
}) {
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

  function closeProjectMenu() {
    setIsProjectMenuOpen(false);
  }

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
              {PAGE_TABS.map((tab) => {
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
          onClose={() => setActiveModal(null)}
        />
      ) : null}
    </section>
  );
}

function ProjectActionsMenu({ onAction }: { onAction: (modal: ProjectModal) => void }) {
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

function ProjectActionModal({
  modal,
  project,
  onClose,
}: {
  modal: ProjectModal;
  project: Project;
  onClose: () => void;
}) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/10 p-6 backdrop-blur-[5px]"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div onClick={(event) => event.stopPropagation()}>
        {modal === "name" ? (
          <ProfileEditModal
            title="Edit Project Name"
            fieldLabel="Project Name"
            fieldValue={project.name}
            photoLabel="Project Photo"
            onClose={onClose}
          />
        ) : null}
        {modal === "client" ? (
          <ProfileEditModal
            title="Edit Client Details"
            fieldLabel="Client Name"
            fieldValue={project.clientName}
            photoLabel="Client Photo"
            onClose={onClose}
          />
        ) : null}
        {modal === "timeline" ? <TimelineModal onClose={onClose} /> : null}
        {modal === "phases" ? <PhasesModal project={project} onClose={onClose} /> : null}
        {modal === "pause" ? (
          <ConfirmModal
            title="Are you sure you want to pause Project?"
            description="Pausing the project will stop active progress updates until you resume it. You can come back and continue work whenever you're ready."
            confirmLabel="Pause Project"
            onClose={onClose}
          />
        ) : null}
        {modal === "delete" ? (
          <ConfirmModal
            destructive
            title="Are you sure you want to delete Project?"
            description="Deleting the project is a permanent action, and once it's gone, you won't be able to retrieve it. Please double-check that you truly want to continue with this decision."
            confirmLabel="Delete Project"
            onClose={onClose}
          />
        ) : null}
      </div>
    </div>
  );
}

function ModalShell({
  title,
  children,
  action,
  disabled = false,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  action: string;
  disabled?: boolean;
  onClose: () => void;
}) {
  return (
    <div className="flex w-[min(516px,calc(100vw-48px))] flex-col items-start rounded-[12px] bg-[#F5F5F5] p-[4px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
      <div className="flex w-full items-center justify-between px-[12px] pb-[12px] pt-[8px]">
        <p className="whitespace-nowrap text-[13px] font-semibold leading-[1.5] text-[#0A0A0A]">
          {title}
        </p>
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="flex h-[16px] w-[16px] cursor-pointer items-center justify-center text-[#0A0A0A]"
        >
          <CloseIcon />
        </button>
      </div>
      <div className="flex w-full flex-col gap-[4px]">
        {children}
        <button
          type="button"
          onClick={onClose}
          disabled={disabled}
          className="flex w-full cursor-pointer items-center justify-center rounded-[6px] border border-[rgba(158,153,248,0.75)] bg-gradient-to-b from-[#7B76DF] to-[#463FBA] py-[10px] pl-[10px] pr-[12px] text-[13px] font-medium leading-none text-[#FAFAFA] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] disabled:cursor-default disabled:opacity-50"
        >
          {action}
        </button>
      </div>
    </div>
  );
}

function ProfileEditModal({
  title,
  fieldLabel,
  fieldValue,
  photoLabel,
  onClose,
}: {
  title: string;
  fieldLabel: string;
  fieldValue: string;
  photoLabel: string;
  onClose: () => void;
}) {
  return (
    <ModalShell title={title} action="Save" onClose={onClose}>
      <div className="flex w-full flex-col gap-[24px] rounded-[8px] bg-white p-[12px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
        <FieldBlock label={fieldLabel}>
          <input
            defaultValue={fieldValue}
            className="w-full rounded-[6px] bg-[#F5F5F5] px-[12px] py-[10px] text-[12px] font-medium leading-none text-[#525252] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] outline-none"
          />
        </FieldBlock>
        <div className="flex w-full flex-col gap-[12px]">
          <p className="text-[13px] font-medium leading-none text-[#171717]">{photoLabel}</p>
          <div className="flex w-full items-center gap-[8px]">
            <img
              src="/images/project-modals/avatar.png"
              alt=""
              aria-hidden="true"
              className="h-[40px] w-[40px] shrink-0 rounded-full object-cover"
            />
            <div className="flex min-w-0 flex-1 items-center justify-between overflow-hidden rounded-[6px] px-[12px] py-[6px]">
              <button type="button" className="flex items-center gap-[6px] text-[12px] font-medium leading-none text-[#525252]">
                <img src="/logos/dashboard/upload.svg" alt="" aria-hidden="true" className="h-[16px] w-[16px]" />
                Reupload
              </button>
              <button type="button" className="text-[12px] font-medium leading-none text-[#EF4444]">
                Remove
              </button>
            </div>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}

function TimelineModal({ onClose }: { onClose: () => void }) {
  return (
    <ModalShell title="Edit Timeline Details" action="Save" onClose={onClose}>
      <div className="flex w-full flex-col rounded-[8px] bg-white p-[16px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
        <div className="flex w-full flex-col gap-[24px]">
          <FieldBlock label="Start">
            <DateInput />
          </FieldBlock>
          <FieldBlock label="End">
            <DateInput />
          </FieldBlock>
        </div>
      </div>
    </ModalShell>
  );
}

function PhasesModal({ project, onClose }: { project: Project; onClose: () => void }) {
  const [isAddingPhase, setIsAddingPhase] = useState(false);
  const visiblePhases = project.phases.slice(0, 4);

  return (
    <ModalShell title="Add or Remove Phases" action="Save" disabled={isAddingPhase} onClose={onClose}>
      <div className="flex w-full flex-col rounded-[8px] bg-white p-[12px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
        <div className="flex w-full flex-col gap-[8px]">
          <div className="flex w-full flex-col gap-[4px]">
            {visiblePhases.map((phase) => (
              <div
                key={phase.id}
                className="flex w-full items-center justify-between rounded-[4px] bg-[#F5F5F5] px-[12px] py-[10px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]"
              >
                <p className="text-[13px] font-medium leading-none text-[#171717]">{phase.name}</p>
                <button type="button" aria-label={`Remove ${phase.name}`} className="text-[#EF4444]">
                  <TrashIcon />
                </button>
              </div>
            ))}
            {isAddingPhase ? (
              <input
                autoFocus
                defaultValue="Enter Phase name"
                className="w-full rounded-[4px] bg-[#F5F5F5] px-[12px] py-[10px] text-[13px] font-medium leading-none text-[#171717] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] outline-none"
              />
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => setIsAddingPhase(true)}
            disabled={isAddingPhase}
            className="flex h-[32px] items-center gap-[8px] rounded-[6px] py-[6px] text-[13px] font-medium leading-none text-[#525252] disabled:opacity-50"
          >
            <img src="/logos/dashboard/plus.svg" alt="" aria-hidden="true" className="h-[15px] w-[15px]" />
            Add a phase
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

function ConfirmModal({
  title,
  description,
  confirmLabel,
  destructive = false,
  onClose,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  onClose: () => void;
}) {
  return (
    <div className="flex w-[min(509px,calc(100vw-48px))] flex-col gap-[44px] rounded-[8px] bg-white p-[20px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
      <div className="flex w-full flex-col gap-[20px]">
        <img src="/images/project-modals/delete-logo.png" alt="" aria-hidden="true" className="h-[32px] w-[32px] rounded-full" />
        <div className="flex w-full flex-col gap-[4px] text-[#171717]">
          <p className="text-[15px] font-semibold leading-none">{title}</p>
          <p className="max-w-[381px] text-[12px] font-normal leading-[1.5]">{description}</p>
        </div>
      </div>
      <div className="flex w-full items-center gap-[8px]">
        <button
          type="button"
          onClick={onClose}
          className="rounded-[6px] bg-[#F5F5F5] px-[16px] py-[8px] text-[12px] font-medium leading-none text-[#171717] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onClose}
          className={`rounded-[6px] border py-[8px] pl-[10px] pr-[12px] text-[13px] font-medium leading-none text-[#FAFAFA] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] ${
            destructive
              ? "border-[#F87171] bg-gradient-to-b from-[#EF4444] to-[#DC2626]"
              : "border-[rgba(158,153,248,0.75)] bg-gradient-to-b from-[#7B76DF] to-[#463FBA]"
          }`}
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  );
}

function FieldBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex w-full flex-col gap-[8px]">
      <span className="text-[13px] font-medium leading-none text-[#171717]">{label}</span>
      {children}
    </label>
  );
}

function DateInput() {
  return (
    <div className="flex w-full items-center justify-between overflow-hidden rounded-[6px] bg-[#F5F5F5] px-[12px] py-[10px] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
      <input
        placeholder="DD/MM/YYYY"
        className="min-w-0 flex-1 bg-transparent text-[12px] font-medium leading-none text-[#525252] outline-none placeholder:text-[#525252]"
      />
      <img src="/logos/dashboard/calendar.svg" alt="" aria-hidden="true" className="h-[16px] w-[16px] shrink-0" />
    </div>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="h-[16px] w-[16px]">
      <path d="M4.25 4.25l7.5 7.5M11.75 4.25l-7.5 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 14 14" fill="none" aria-hidden="true" className="h-[14px] w-[14px]">
      <path d="M4.75 3.5V2.75c0-.55.45-1 1-1h2.5c.55 0 1 .45 1 1v.75M2.75 3.5h8.5M10.5 3.5l-.45 7.22c-.04.62-.55 1.11-1.17 1.11H5.12c-.62 0-1.13-.49-1.17-1.11L3.5 3.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
