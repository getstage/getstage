import { useEffect, useState, type ReactNode } from "react";
import { StageDatePicker } from "@/components/ui/StageDatePicker";
import type { Phase, Project } from "../../models/project";
import type { ProjectModal, ProjectTimeline } from "../../types/projectHeader";

export function ProjectActionModal({
  modal,
  project,
  timeline,
  onProjectNameSave,
  onClientNameSave,
  onTimelineSave,
  onPhasesSave,
  onPauseProject,
  onDeleteProject,
  deleteError,
  onClose,
}: {
  modal: ProjectModal;
  project: Project;
  timeline: ProjectTimeline;
  onProjectNameSave: (name: string) => void;
  onClientNameSave: (clientName: string) => void;
  onTimelineSave: (timeline: ProjectTimeline) => void;
  onPhasesSave: (phases: Phase[]) => void;
  onPauseProject: () => void;
  onDeleteProject: () => void | Promise<void>;
  deleteError?: string | null;
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
            onSave={onProjectNameSave}
            onClose={onClose}
          />
        ) : null}
        {modal === "client" ? (
          <ProfileEditModal
            title="Edit Client Details"
            fieldLabel="Client Name"
            fieldValue={project.clientName}
            photoLabel="Client Photo"
            onSave={onClientNameSave}
            onClose={onClose}
          />
        ) : null}
        {modal === "timeline" ? (
          <TimelineModal timeline={timeline} onSave={onTimelineSave} onClose={onClose} />
        ) : null}
        {modal === "phases" ? (
          <PhasesModal project={project} onSave={onPhasesSave} onClose={onClose} />
        ) : null}
        {modal === "pause" ? (
          <ConfirmModal
            title="Are you sure you want to pause Project?"
            description="Pausing the project will stop active progress updates until you resume it. You can come back and continue work whenever you're ready."
            confirmLabel="Pause Project"
            projectImageUrl={project.projectImageUrl}
            onConfirm={onPauseProject}
            onClose={onClose}
          />
        ) : null}
        {modal === "delete" ? (
          <ConfirmModal
            destructive
            title="Are you sure you want to delete Project?"
            description="Deleting the project is a permanent action, and once it's gone, you won't be able to retrieve it. Please double-check that you truly want to continue with this decision."
            confirmLabel="Delete Project"
            error={deleteError}
            projectImageUrl={project.projectImageUrl}
            onConfirm={onDeleteProject}
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
  onAction,
  onClose,
}: {
  title: string;
  children: ReactNode;
  action: string;
  disabled?: boolean;
  onAction: () => void;
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
          onClick={onAction}
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
  onSave,
  onClose,
}: {
  title: string;
  fieldLabel: string;
  fieldValue: string;
  photoLabel: string;
  onSave: (value: string) => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState(fieldValue);
  const canSave = value.trim().length > 0;

  function save() {
    if (!canSave) return;
    onSave(value.trim());
    onClose();
  }

  return (
    <ModalShell title={title} action="Save" disabled={!canSave} onAction={save} onClose={onClose}>
      <div className="flex w-full flex-col gap-[24px] rounded-[8px] bg-white p-[12px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
        <FieldBlock label={fieldLabel}>
          <input
            value={value}
            onChange={(event) => setValue(event.target.value)}
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

function TimelineModal({
  timeline,
  onSave,
  onClose,
}: {
  timeline: ProjectTimeline;
  onSave: (timeline: ProjectTimeline) => void;
  onClose: () => void;
}) {
  const [start, setStart] = useState(timeline.start);
  const [end, setEnd] = useState(timeline.end);

  useEffect(() => {
    setStart(timeline.start);
    setEnd(timeline.end);
  }, [timeline.start, timeline.end]);

  function save() {
    onSave({ start, end });
    onClose();
  }

  return (
    <ModalShell title="Edit Timeline Details" action="Save" onAction={save} onClose={onClose}>
      <div className="flex w-full flex-col rounded-[8px] bg-white p-[16px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
        <div className="flex w-full flex-col gap-[24px]">
          <FieldBlock label="Start">
            <DateInput value={start} onChange={setStart} />
          </FieldBlock>
          <FieldBlock label="End">
            <DateInput value={end} onChange={setEnd} />
          </FieldBlock>
        </div>
      </div>
    </ModalShell>
  );
}

function PhasesModal({
  project,
  onSave,
  onClose,
}: {
  project: Project;
  onSave: (phases: Phase[]) => void;
  onClose: () => void;
}) {
  const [isAddingPhase, setIsAddingPhase] = useState(false);
  const [phaseName, setPhaseName] = useState("");
  const [phases, setPhases] = useState<Phase[]>(project.phases);
  const canSave = !isAddingPhase || phaseName.trim().length > 0;

  function removePhase(phaseId: string) {
    setPhases((current) => current.filter((phase) => phase.id !== phaseId));
  }

  function save() {
    const nextPhases = phaseName.trim()
      ? [
          ...phases,
          {
            id: `phase-${Date.now()}`,
            name: phaseName.trim(),
            status: "upcoming" as const,
            tasks: [],
          },
        ]
      : phases;

    onSave(nextPhases);
    onClose();
  }

  return (
    <ModalShell title="Add or Remove Phases" action="Save" disabled={!canSave} onAction={save} onClose={onClose}>
      <div className="flex w-full flex-col rounded-[8px] bg-white p-[12px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
        <div className="flex w-full flex-col gap-[8px]">
          <div className="flex w-full flex-col gap-[4px]">
            {phases.map((phase) => (
              <div
                key={phase.id}
                className="flex w-full items-center justify-between rounded-[4px] bg-[#F5F5F5] px-[12px] py-[10px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]"
              >
                <p className="text-[13px] font-medium leading-none text-[#171717]">{phase.name}</p>
                <button
                  type="button"
                  aria-label={`Remove ${phase.name}`}
                  onClick={() => removePhase(phase.id)}
                  className="text-[#EF4444]"
                >
                  <TrashIcon />
                </button>
              </div>
            ))}
            {isAddingPhase ? (
              <input
                autoFocus
                value={phaseName}
                onChange={(event) => setPhaseName(event.target.value)}
                placeholder="Enter Phase name"
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
  projectImageUrl,
  destructive = false,
  error = null,
  onConfirm,
  onClose,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  projectImageUrl?: string;
  destructive?: boolean;
  error?: string | null;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function confirm() {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirm();
      onClose();
    } catch {
      // Parent sets error message; keep modal open.
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex w-[min(509px,calc(100vw-48px))] flex-col gap-[44px] rounded-[8px] bg-white p-[20px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
      <div className="flex w-full flex-col gap-[20px]">
        <img
          src={projectImageUrl ?? "/images/project-modals/delete-logo.svg"}
          alt=""
          aria-hidden="true"
          className="h-[32px] w-[32px] rounded-full object-cover"
        />
        <div className="flex w-full flex-col gap-[4px] text-[#171717]">
          <p className="text-[15px] font-semibold leading-none">{title}</p>
          <p className="max-w-[381px] text-[12px] font-normal leading-[1.5]">{description}</p>
          {error ? <p className="text-[12px] font-medium leading-[1.5] text-[#b91c1c]">{error}</p> : null}
        </div>
      </div>
      <div className="flex w-full items-center gap-[8px]">
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className="rounded-[6px] bg-[#F5F5F5] px-[16px] py-[8px] text-[12px] font-medium leading-none text-[#171717] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => void confirm()}
          disabled={isSubmitting}
          className={`rounded-[6px] border py-[8px] pl-[10px] pr-[12px] text-[13px] font-medium leading-none text-[#FAFAFA] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] disabled:opacity-50 ${
            destructive
              ? "border-[#F87171] bg-gradient-to-b from-[#EF4444] to-[#DC2626]"
              : "border-[rgba(158,153,248,0.75)] bg-gradient-to-b from-[#7B76DF] to-[#463FBA]"
          }`}
        >
          {isSubmitting ? "Deleting…" : confirmLabel}
        </button>
      </div>
    </div>
  );
}

function FieldBlock({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex w-full flex-col gap-[8px]">
      <span className="text-[13px] font-medium leading-none text-[#171717]">{label}</span>
      {children}
    </label>
  );
}

function DateInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <StageDatePicker
      value={value}
      onChange={onChange}
      ariaLabel="Project timeline date"
    />
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
