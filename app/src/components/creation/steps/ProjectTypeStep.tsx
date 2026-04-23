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
      <div className="mb-7 rounded-[12px] bg-[#F5F5F5] p-1 shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
        <div className="px-4 pb-3 pt-3 text-[13px] font-semibold text-text-primary">
          Project Type
        </div>
        <div className="grid grid-cols-3 gap-2 rounded-[8px] bg-white p-4 shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
          {PROJECT_TYPES.map((typeOption) => {
            const iconSrc = PROJECT_TYPE_ICONS[typeOption.value];
            const isSelected = projectType === typeOption.value;
            return (
              <button
                key={typeOption.value}
                type="button"
                onClick={() => onProjectTypeChange(typeOption.value)}
                className={cn(
                  "flex min-h-[72px] cursor-pointer flex-col items-center justify-center gap-2 rounded-[8px] border border-transparent bg-[#F5F5F5] px-3 py-3 text-center text-[13px] font-medium transition-all duration-150",
                  isSelected
                    ? "border-[#8D87FF] bg-[#EEEDFE] text-text-primary"
                    : "text-text-primary hover:bg-[#EFEFEF]",
                )}
              >
                {iconSrc ? (
                  <img src={iconSrc} alt="" className="h-5 w-5 shrink-0 object-contain" />
                ) : null}
                <span>{typeOption.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <PrimaryButton label="Continue" disabled={!canContinue} onClick={onContinue} />
      <BackButton onClick={onBack} />
    </div>
  );
}
