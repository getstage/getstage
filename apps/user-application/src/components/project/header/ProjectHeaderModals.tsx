import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { StageDatePicker } from "@/components/ui/StageDatePicker";
import { AVATAR_ACCEPT, PROJECT_MARKER_ACCEPT } from "@/lib/r2Uploads";
import type {
  SaveClientProfileInput,
  SaveProjectProfileInput,
} from "@/hooks/project";
import type { Phase, Project } from "@/models/project/project";
import type { ProjectModal, ProjectTimeline } from "@/types/project/projectHeader";

export function ProjectActionModal({
  modal,
  project,
  projectImageUrl,
  clientAvatarUrl,
  timeline,
  onSaveProjectProfile,
  onSaveClientProfile,
  onSaveTimeline,
  onSavePhases,
  onPauseProject,
  onCompleteProject,
  onDeleteProject,
  onPrepareProjectMarkerUpload,
  onPrepareClientAvatarUpload,
  modalError,
  deleteError,
  onClose,
}: {
  modal: ProjectModal;
  project: Project;
  projectImageUrl?: string;
  clientAvatarUrl?: string;
  timeline: ProjectTimeline;
  onSaveProjectProfile: (input: SaveProjectProfileInput) => Promise<void>;
  onSaveClientProfile: (input: SaveClientProfileInput) => Promise<void>;
  onSaveTimeline: (timeline: ProjectTimeline) => Promise<void>;
  onSavePhases: (phases: Phase[], deleteTasksInRemovedPhases?: boolean) => Promise<void>;
  onPauseProject: () => Promise<void>;
  onCompleteProject: () => Promise<void>;
  onDeleteProject: () => Promise<void>;
  onPrepareProjectMarkerUpload: (file: File) => Promise<{ file: File; previewUrl: string }>;
  onPrepareClientAvatarUpload: (file: File) => Promise<{ file: File; previewUrl: string }>;
  modalError: string | null;
  deleteError: string | null;
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
            mode="project"
            title="Edit Project Name"
            fieldLabel="Project Name"
            fieldValue={project.name}
            photoLabel="Project Photo"
            imageUrl={projectImageUrl}
            accept={PROJECT_MARKER_ACCEPT}
            onPrepareUpload={onPrepareProjectMarkerUpload}
            onSave={onSaveProjectProfile}
            error={modalError}
            onClose={onClose}
          />
        ) : null}
        {modal === "client" ? (
          <ProfileEditModal
            mode="client"
            title="Edit Client Details"
            fieldLabel="Client Name"
            fieldValue={project.clientName}
            photoLabel="Client Photo"
            imageUrl={clientAvatarUrl}
            accept={AVATAR_ACCEPT}
            onPrepareUpload={onPrepareClientAvatarUpload}
            onSave={onSaveClientProfile}
            error={modalError}
            onClose={onClose}
          />
        ) : null}
        {modal === "timeline" ? (
          <TimelineModal timeline={timeline} onSave={onSaveTimeline} error={modalError} onClose={onClose} />
        ) : null}
        {modal === "phases" ? (
          <PhasesModal project={project} onSave={onSavePhases} error={modalError} onClose={onClose} />
        ) : null}
        {modal === "pause" ? (
          <ConfirmModal
            title={
              project.status === "paused"
                ? "Are you sure you want to unpause Project?"
                : "Are you sure you want to pause Project?"
            }
            description={
              project.status === "paused"
                ? "Unpausing the project will resume active progress updates so work can continue normally."
                : "Pausing the project will stop active progress updates until you resume it. You can come back and continue work whenever you're ready."
            }
            confirmLabel={project.status === "paused" ? "Unpause Project" : "Pause Project"}
            projectName={project.name}
            projectImageUrl={projectImageUrl ?? project.projectImageUrl}
            onConfirm={onPauseProject}
            error={modalError}
            onClose={onClose}
          />
        ) : null}
        {modal === "complete" ? (
          <ConfirmModal
            title="Mark this project as completed?"
            description="The project status will change to Completed. You can still open tasks and files, but the project will no longer show as active on your dashboard."
            confirmLabel="Complete Project"
            projectName={project.name}
            projectImageUrl={projectImageUrl ?? project.projectImageUrl}
            onConfirm={onCompleteProject}
            error={modalError}
            onClose={onClose}
          />
        ) : null}
        {modal === "delete" ? (
          <ConfirmModal
            destructive
            title="Are you sure you want to delete Project?"
            description="Deleting the project is a permanent action, and once it's gone, you won't be able to retrieve it. Please double-check that you truly want to continue with this decision."
            confirmLabel="Delete Project"
            projectName={project.name}
            projectImageUrl={projectImageUrl ?? project.projectImageUrl}
            onConfirm={onDeleteProject}
            error={deleteError}
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
  isSubmitting = false,
  onAction,
  onClose,
}: {
  title: string;
  children: ReactNode;
  action: string;
  disabled?: boolean;
  isSubmitting?: boolean;
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
          disabled={disabled || isSubmitting}
          className="flex w-full cursor-pointer items-center justify-center rounded-[6px] border border-[rgba(158,153,248,0.75)] bg-gradient-to-b from-[#7B76DF] to-[#463FBA] py-[10px] pl-[10px] pr-[12px] text-[13px] font-medium leading-none text-[#FAFAFA] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] disabled:cursor-default disabled:opacity-50"
        >
          {isSubmitting ? "Saving…" : action}
        </button>
      </div>
    </div>
  );
}

type ProfileEditModalProps = {
  title: string;
  fieldLabel: string;
  fieldValue: string;
  photoLabel: string;
  imageUrl?: string;
  accept: string;
  error: string | null;
  onPrepareUpload: (file: File) => Promise<{ file: File; previewUrl: string }>;
  onClose: () => void;
} & (
  | {
      mode: "project";
      onSave: (input: SaveProjectProfileInput) => Promise<void>;
    }
  | {
      mode: "client";
      onSave: (input: SaveClientProfileInput) => Promise<void>;
    }
);

function ProfileEditModal(props: ProfileEditModalProps) {
  const {
    title,
    fieldLabel,
    fieldValue,
    photoLabel,
    imageUrl,
    accept,
    error,
    onPrepareUpload,
    onClose,
    mode,
    onSave,
  } = props;

  const [value, setValue] = useState(fieldValue);
  const [previewUrl, setPreviewUrl] = useState<string | null>(imageUrl ?? null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [imageRemoved, setImageRemoved] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canSave = value.trim().length > 0;
  const fallbackAccentColor = "#8782F5";

  useEffect(() => {
    setValue(fieldValue);
    setPreviewUrl(imageUrl ?? null);
    setPendingFile(null);
    setImageRemoved(false);
  }, [fieldValue, imageUrl]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    void onPrepareUpload(file)
      .then((prepared) => {
        setPendingFile(prepared.file);
        setPreviewUrl(prepared.previewUrl);
        setImageRemoved(false);
      })
      .finally(() => {
        event.target.value = "";
      });
  }

  function handleRemoveImage() {
    setPendingFile(null);
    setPreviewUrl(null);
    setImageRemoved(true);
  }

  async function save() {
    if (!canSave || isSubmitting) return;
    setIsSubmitting(true);
    try {
      if (mode === "project") {
        await onSave({
          name: value.trim(),
          previewImageUrl: previewUrl,
          pendingImageFile: pendingFile,
          imageRemoved,
          currentImageUrl: imageUrl,
        });
      } else {
        await onSave({
          clientName: value.trim(),
          previewAvatarUrl: previewUrl,
          pendingAvatarFile: pendingFile,
          avatarRemoved: imageRemoved,
          currentAvatarUrl: imageUrl,
        });
      }
      onClose();
    } catch {
      // Parent sets error; keep modal open.
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ModalShell
      title={title}
      action="Save"
      disabled={!canSave}
      isSubmitting={isSubmitting}
      onAction={() => void save()}
      onClose={onClose}
    >
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
            {previewUrl ? (
              <img
                src={previewUrl}
                alt=""
                aria-hidden="true"
                className="h-[40px] w-[40px] shrink-0 rounded-full object-cover"
              />
            ) : (
              mode === "project" ? (
                <div
                  className="flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-full text-[12px] font-medium text-white"
                  style={{ background: fallbackAccentColor }}
                >
                  {getInitials(value)}
                </div>
              ) : (
                <div className="flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-full bg-[#E5E5E5] text-[12px] font-medium text-[#525252]">
                  {value.trim().charAt(0).toUpperCase() || "?"}
                </div>
              )
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept={accept}
              className="hidden"
              onChange={handleFileChange}
            />
            <div className="flex min-w-0 flex-1 items-center justify-between overflow-hidden rounded-[6px] px-[12px] py-[6px]">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-[6px] text-[12px] font-medium leading-none text-[#525252]"
              >
                <img src="/logos/dashboard/upload.svg" alt="" aria-hidden="true" className="h-[16px] w-[16px]" />
                Reupload
              </button>
              <button
                type="button"
                onClick={handleRemoveImage}
                disabled={!previewUrl && !imageUrl}
                className="text-[12px] font-medium leading-none text-[#EF4444] disabled:opacity-40"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
        {error ? <p className="text-[12px] font-medium text-[#b91c1c]">{error}</p> : null}
      </div>
    </ModalShell>
  );
}

function TimelineModal({
  timeline,
  onSave,
  error,
  onClose,
}: {
  timeline: ProjectTimeline;
  onSave: (timeline: ProjectTimeline) => Promise<void>;
  error: string | null;
  onClose: () => void;
}) {
  const [start, setStart] = useState(timeline.start);
  const [end, setEnd] = useState(timeline.end);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setStart(timeline.start);
    setEnd(timeline.end);
  }, [timeline.end, timeline.start]);

  async function save() {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onSave({ start, end });
      onClose();
    } catch {
      // Parent sets error; keep modal open.
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ModalShell
      title="Edit Timeline Details"
      action="Save"
      isSubmitting={isSubmitting}
      onAction={() => void save()}
      onClose={onClose}
    >
      <div className="flex w-full flex-col rounded-[8px] bg-white p-[16px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
        <div className="flex w-full flex-col gap-[24px]">
          <FieldBlock label="Start">
            <DateInput value={start} onChange={setStart} />
          </FieldBlock>
          <FieldBlock label="End">
            <DateInput value={end} onChange={setEnd} />
          </FieldBlock>
        </div>
        {error ? <p className="mt-[12px] text-[12px] font-medium text-[#b91c1c]">{error}</p> : null}
      </div>
    </ModalShell>
  );
}

function PhasesModal({
  project,
  onSave,
  error,
  onClose,
}: {
  project: Project;
  onSave: (phases: Phase[], deleteTasksInRemovedPhases?: boolean) => Promise<void>;
  error: string | null;
  onClose: () => void;
}) {
  const [isAddingPhase, setIsAddingPhase] = useState(false);
  const [phaseName, setPhaseName] = useState("");
  const [phases, setPhases] = useState<Phase[]>(project.phases);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingPhases, setPendingPhases] = useState<Phase[] | null>(null);
  const canSave = !isAddingPhase || phaseName.trim().length > 0;

  useEffect(() => {
    setPhases(project.phases);
  }, [project.phases]);

  function removePhase(phaseId: string) {
    setPhases((current) => current.filter((phase) => phase.id !== phaseId));
  }

  async function submit(nextPhases: Phase[], deleteTasksInRemovedPhases = false) {
    setIsSubmitting(true);
    try {
      await onSave(nextPhases, deleteTasksInRemovedPhases);
      onClose();
    } catch {
      // Parent sets error; keep modal open.
    } finally {
      setIsSubmitting(false);
    }
  }

  async function save() {
    if (!canSave || isSubmitting) return;
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

    const nextIds = new Set(nextPhases.map((phase) => phase.id));
    const removedTaskCount = project.phases
      .filter((phase) => !nextIds.has(phase.id))
      .reduce((total, phase) => total + phase.tasks.length, 0);

    if (removedTaskCount > 0) {
      setPendingPhases(nextPhases);
      return;
    }

    await submit(nextPhases);
  }

  if (pendingPhases) {
    const nextIds = new Set(pendingPhases.map((phase) => phase.id));
    const removedPhases = project.phases.filter((phase) => !nextIds.has(phase.id));
    const removedTaskCount = removedPhases.reduce((total, phase) => total + phase.tasks.length, 0);

    return (
      <ConfirmModal
        destructive
        title="Delete phases and their tasks?"
        description={`Deleting ${removedPhases.length} phase${removedPhases.length === 1 ? "" : "s"} will permanently delete ${removedTaskCount} task${removedTaskCount === 1 ? "" : "s"} and their attachments.`}
        confirmLabel="Delete Phases and Tasks"
        projectName={project.name}
        projectImageUrl={project.projectImageUrl}
        onConfirm={() => submit(pendingPhases, true)}
        error={error}
        onClose={() => setPendingPhases(null)}
      />
    );
  }

  return (
    <ModalShell
      title="Add or Remove Phases"
      action="Save"
      disabled={!canSave}
      isSubmitting={isSubmitting}
      onAction={() => void save()}
      onClose={onClose}
    >
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
                  className="flex h-[14px] w-[14px] shrink-0 cursor-pointer items-center justify-center"
                >
                  <img src="/logos/trash.svg" alt="" aria-hidden="true" className="h-[14px] w-[14px]" />
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
        {error ? <p className="mt-[12px] text-[12px] font-medium text-[#b91c1c]">{error}</p> : null}
      </div>
    </ModalShell>
  );
}

function ConfirmModal({
  title,
  description,
  confirmLabel,
  projectName,
  projectImageUrl,
  destructive = false,
  error = null,
  onConfirm,
  onClose,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  projectName: string;
  projectImageUrl?: string;
  destructive?: boolean;
  error?: string | null;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fallbackAccentColor = "#8782F5";
  const resolvedProjectImageUrl =
    typeof projectImageUrl === "string" && projectImageUrl.trim().length > 0
      ? projectImageUrl.trim()
      : null;
  const [displayImageUrl, setDisplayImageUrl] = useState<string | null>(resolvedProjectImageUrl);

  useEffect(() => {
    setDisplayImageUrl(resolvedProjectImageUrl);
  }, [resolvedProjectImageUrl]);

  async function confirm() {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onConfirm();
      onClose();
    } catch {
      // Parent sets error; keep modal open.
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex w-[min(509px,calc(100vw-48px))] flex-col gap-[44px] rounded-[8px] bg-white p-[20px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
      <div className="flex w-full flex-col gap-[20px]">
        {displayImageUrl ? (
          <img
            src={displayImageUrl}
            alt=""
            aria-hidden="true"
            className="h-[32px] w-[32px] rounded-full object-cover"
            onError={() => setDisplayImageUrl(null)}
          />
        ) : (
          <div
            aria-hidden="true"
            className="flex h-[32px] w-[32px] items-center justify-center rounded-full text-[12px] font-medium text-white"
            style={{ background: fallbackAccentColor }}
          >
            {getInitials(projectName)}
          </div>
        )}
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
          {isSubmitting ? (destructive ? "Deleting…" : "Working…") : confirmLabel}
        </button>
      </div>
    </div>
  );
}

function getInitials(value: string) {
  const words = value
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return "?";
  return words
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
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
