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
        <div className="grid overflow-hidden rounded-[8px] bg-white p-1 shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] sm:grid-cols-3">
          {PROJECT_TYPES.map((option) => {
            const iconSrc = PROJECT_TYPE_ICONS[option.value];
            const selected = projectType === option.value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onProjectTypeChange(option.value)}
                className={cn(
                  "flex min-h-[86px] cursor-pointer items-center justify-center gap-2 rounded-[6px] border border-white bg-[#F5F5F5] px-3 text-[13px] font-medium transition-colors",
                  selected
                    ? "bg-[#EEEDFE] text-[#2F2A7D]"
                    : "text-[#525252] hover:bg-[#EFEFEF]",
                )}
              >
                {iconSrc ? (
                  <img src={iconSrc} alt="" className="h-4 w-4 shrink-0 opacity-80" />
                ) : null}
                <span>{option.label}</span>
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
