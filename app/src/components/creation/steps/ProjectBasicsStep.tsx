import type { ChangeEvent, RefObject } from "react";
import { PrimaryButton } from "@/components/creation/CreationChrome";
import { Avatar } from "@/components/ui/Avatar";
import { PROJECT_MARKER_ACCEPT } from "@/lib/r2Uploads";
import type { WorkflowStep } from "@/hooks/useProjectCreation";

type ProjectBasicsStepProps = {
  projectName: string;
  projectImage: string | null;
  canContinue: boolean;
  currentIndex: number;
  steps: WorkflowStep[];
  projectImageInputRef: RefObject<HTMLInputElement | null>;
  onProjectNameChange: (value: string) => void;
  onProjectImageChange: (value: string | null) => void;
  onProjectImageFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onContinue: () => void;
};

export function ProjectBasicsStep({
  projectName,
  projectImage,
  canContinue,
  currentIndex: _currentIndex,
  steps: _steps,
  projectImageInputRef,
  onProjectNameChange,
  onProjectImageChange,
  onProjectImageFileChange,
  onContinue,
}: ProjectBasicsStepProps) {
  return (
    <div>
      <h2 className="mb-2 text-center font-heading text-[24px] font-semibold tracking-[-0.4px] text-text-primary">
        New project
      </h2>
      <p className="mb-8 text-center text-[15px] leading-normal text-text-secondary">
        Let&apos;s set it up. This only takes a minute.
      </p>

      <div className="mb-4">
        <label className="mb-1.5 block text-[13px] font-medium text-text-primary">
          Project name
        </label>
        <input
          type="text"
          value={projectName}
          onChange={(event) => onProjectNameChange(event.target.value)}
          placeholder="Website Redesign"
          autoFocus
          className="w-full rounded-[10px] border border-transparent bg-input-bg px-4 py-3 text-[15px] text-text-primary outline-none transition-all duration-200 placeholder:text-text-tertiary focus:border-border focus:bg-white"
        />
      </div>

      <div className="mb-6">
        <label className="mb-1.5 block text-[13px] font-medium text-text-primary">
          Project image <span className="font-normal text-text-tertiary">- optional</span>
        </label>

        <div className="flex items-center gap-4 rounded-[12px] border border-border-subtle bg-white px-4 py-4">
          <div className="shrink-0">
            <Avatar
              name={projectName.trim() || "Project"}
              src={projectImage ?? undefined}
              size="lg"
              variant="project"
              className="border border-border-subtle"
            />
          </div>

          <div className="min-w-0 space-y-1">
            <button
              type="button"
              onClick={() => projectImageInputRef.current?.click()}
              className="block cursor-pointer bg-transparent p-0 text-left text-[13px] text-text-secondary transition-colors hover:text-accent"
            >
              {projectImage ? "Replace photo" : "Upload photo"}
            </button>
            <button
              type="button"
              onClick={() => onProjectImageChange(null)}
              disabled={!projectImage}
              className="block cursor-pointer bg-transparent p-0 text-left text-[13px] text-text-secondary transition-colors hover:text-destructive disabled:cursor-not-allowed disabled:opacity-40"
            >
              Remove
            </button>
          </div>
        </div>

        <input
          ref={projectImageInputRef}
          type="file"
          accept={PROJECT_MARKER_ACCEPT}
          className="hidden"
          onChange={onProjectImageFileChange}
        />
      </div>

      <PrimaryButton label="Continue" disabled={!canContinue} onClick={onContinue} />
    </div>
  );
}
