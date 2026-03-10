import { BackButton, PrimaryButton, StepDots } from "@/components/creation/CreationChrome";
import { PROJECT_TYPES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { WorkflowStep } from "@/hooks/useProjectCreation";
import type { ProjectType } from "@/types";

type ProjectTypeStepProps = {
  projectType: ProjectType | null;
  canContinue: boolean;
  currentIndex: number;
  steps: WorkflowStep[];
  onProjectTypeChange: (value: ProjectType) => void;
  onContinue: () => void;
  onBack: () => void;
};

export function ProjectTypeStep({
  projectType,
  canContinue,
  currentIndex,
  steps,
  onProjectTypeChange,
  onContinue,
  onBack,
}: ProjectTypeStepProps) {
  return (
    <div>
      <h2 className="mb-2 text-center font-heading text-[24px] font-semibold tracking-[-0.4px] text-text-primary">
        What is the primary project type?
      </h2>
      <p className="mb-8 text-center text-[15px] leading-[1.5] text-text-secondary">
        Pick the closest match for the roadmap. You can still work across multiple disciplines.
      </p>

      <div className="mb-7 grid grid-cols-2 gap-2">
        {PROJECT_TYPES.map((typeOption) => (
          <button
            key={typeOption.value}
            type="button"
            onClick={() => onProjectTypeChange(typeOption.value)}
            className={cn(
              "cursor-pointer rounded-[10px] border-[1.5px] px-4 py-3 text-center text-[14px] font-medium transition-all duration-150",
              projectType === typeOption.value
                ? "border-accent bg-[rgba(135,130,245,0.08)] text-accent"
                : "border-transparent bg-input-bg text-text-primary hover:bg-[#EFEFEF]",
            )}
          >
            {typeOption.label}
          </button>
        ))}
      </div>

      <PrimaryButton label="Continue" disabled={!canContinue} onClick={onContinue} />
      <BackButton onClick={onBack} />
      <StepDots steps={steps} currentIndex={currentIndex} />
    </div>
  );
}
