import type { ChangeEvent, ReactNode, RefObject } from "react";
import { PrimaryButton } from "@/components/creation/CreationChrome";
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

const ICON_SRC = {
  download: "/logos/download.svg",
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
      <div className="mb-6">
        <SectionShell label="Basic Details">
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-text-primary">
              Project name
            </label>
            <input
              type="text"
              value={projectName}
              onChange={(event) => onProjectNameChange(event.target.value)}
              placeholder="Baseframe"
              autoFocus
              className="w-full rounded-[6px] border border-transparent bg-[#F5F5F5] px-3 py-2.5 text-[13px] font-medium text-text-primary shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] outline-none transition-all duration-200 placeholder:text-text-tertiary focus:border-border focus:bg-white"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-text-primary">
              Project Image <span className="font-normal text-text-tertiary">(Optional)</span>
            </label>
            <button
              type="button"
              onClick={() => projectImageInputRef.current?.click()}
              className="flex w-full cursor-pointer items-center gap-3 rounded-[6px] bg-[#F5F5F5] px-3 py-2.5 text-left shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] transition-colors hover:bg-[#EFEFEF]"
            >
              <img src={ICON_SRC.download} alt="" className="h-4 w-4 shrink-0 opacity-70" />
              <span className="text-[13px] font-medium text-text-secondary">
                {projectImage ? "Replace document" : "Upload Document"}
              </span>
            </button>
            {projectImage ? (
              <button
                type="button"
                onClick={() => onProjectImageChange(null)}
                className="mt-2 cursor-pointer bg-transparent p-0 text-[12px] text-text-secondary transition-colors hover:text-destructive"
              >
                Remove document
              </button>
            ) : null}
            <input
              ref={projectImageInputRef}
              type="file"
              accept={PROJECT_MARKER_ACCEPT}
              className="hidden"
              onChange={onProjectImageFileChange}
            />
          </div>
        </SectionShell>
      </div>

      <PrimaryButton label="Continue" disabled={!canContinue} onClick={onContinue} />
    </div>
  );
}

function SectionShell({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[12px] bg-[#F5F5F5] p-1 shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
      <div className="px-4 pb-3 pt-3 text-[13px] font-semibold text-text-primary">{label}</div>
      <div className="space-y-4 rounded-[8px] bg-white p-4 shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
        {children}
      </div>
    </div>
  );
}
