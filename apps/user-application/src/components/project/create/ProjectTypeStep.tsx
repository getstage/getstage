import { PROJECT_TYPES, PROJECT_TYPE_ICONS } from "@/lib/constants";
import type { ProjectType } from "@/types";
import { CREATE_PROJECT_TYPE_VALUES } from "@/models/project/createProject";
import {
  ContinueButton,
  CreateProjectStepShell,
  FormCard,
} from "./CreateProjectPrimitives";
import { cn } from "@/lib/utils";

export function ProjectTypeStep({
  selectedProjectType,
  onProjectTypeChange,
  onContinue,
}: {
  selectedProjectType: ProjectType | null;
  onProjectTypeChange: (projectType: ProjectType) => void;
  onContinue: () => void;
}) {
  return (
    <CreateProjectStepShell
      title="What is the primary project type?"
      description="Pick the closest match for the roadmap. You can still work across multiple disciplines."
      activeStepIndex={2}
      headerGapClassName="gap-[24px]"
      titleClassName="w-[200px]"
      descriptionClassName="w-full"
    >
      <form
        className="flex w-full flex-col items-start gap-[12px]"
        onSubmit={(event) => {
          event.preventDefault();
          if (selectedProjectType) onContinue();
        }}
      >
        <FormCard title="Project Type" titleWeight="semibold" bodyPaddingClassName="p-[4px]">
          <div className="grid w-full grid-cols-2 gap-[4px]">
            {PROJECT_TYPES.filter((option) => CREATE_PROJECT_TYPE_VALUES.includes(option.value)).map((option) => {
              const selected = option.value === selectedProjectType;
              const iconSrc = PROJECT_TYPE_ICONS[option.value];

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onProjectTypeChange(option.value)}
                  aria-pressed={selected}
                  className={cn(
                    "flex min-h-[74px] min-w-0 cursor-pointer items-center justify-center gap-[8px] overflow-hidden rounded-[6px] border px-[12px] py-[22px] text-[12px] font-medium leading-[1.25] transition-colors",
                    selected
                      ? "border-[#dbd9fc] bg-[#e7e6fd] text-[#16115a]"
                      : "border-transparent bg-[#f5f5f5] text-[#525252] hover:bg-[#eeeeee] hover:text-[#171717]",
                  )}
                >
                  {iconSrc ? (
                    <img src={iconSrc} alt="" className="h-4 w-4 shrink-0 opacity-80" />
                  ) : null}
                  <span className="min-w-0 truncate">{option.label}</span>
                </button>
              );
            })}
          </div>
        </FormCard>

        <ContinueButton disabled={!selectedProjectType} />
      </form>
    </CreateProjectStepShell>
  );
}
