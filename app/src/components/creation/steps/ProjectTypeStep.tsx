import { Package } from "@phosphor-icons/react";
import { BackButton, PrimaryButton } from "@/components/creation/CreationChrome";
import { PROJECT_TYPES, PROJECT_TYPE_ICONS } from "@/lib/constants";
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
  currentIndex: _currentIndex,
  steps: _steps,
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
        {PROJECT_TYPES.map((typeOption) => {
          const iconSrc = PROJECT_TYPE_ICONS[typeOption.value];
          const isSelected = projectType === typeOption.value;
          return (
            <button
              key={typeOption.value}
              type="button"
              onClick={() => onProjectTypeChange(typeOption.value)}
              className={cn(
                "flex cursor-pointer items-center justify-center gap-2 rounded-[10px] border-[1.5px] px-4 py-3 text-center text-[14px] font-medium transition-all duration-150",
                isSelected
                  ? "border-accent bg-[rgba(135,130,245,0.08)] text-accent"
                  : "border-transparent bg-input-bg text-text-primary hover:bg-[#EFEFEF]",
              )}
            >
              {iconSrc ? (
                <img src={iconSrc} alt="" className="h-4 w-4 shrink-0 object-contain" />
              ) : typeOption.value === "packaging" ? (
                <Package size={16} weight="regular" className="shrink-0" />
              ) : null}
              <span>{typeOption.label}</span>
            </button>
          );
        })}
      </div>

      <PrimaryButton label="Continue" disabled={!canContinue} onClick={onContinue} />
      <BackButton onClick={onBack} />
    </div>
  );
}
