import { PROJECT_TYPES, PROJECT_TYPE_ICONS } from "@/lib/constants";
import type { ProjectType } from "@/types";
import { CREATE_PROJECT_TYPE_VALUES } from "@/models/project/createProject";
import {
  ContinueButton,
  CreateProjectStepShell,
  FormCard,
  PlusIcon,
  inputSurfaceClassName,
} from "./CreateProjectPrimitives";
import { cn } from "@/lib/utils";

export function ProjectTypeStep({
  selectedProjectType,
  typeOtherLabel,
  onProjectTypeChange,
  onTypeOtherLabelChange,
  onContinue,
  onStepSelect,
}: {
  selectedProjectType: ProjectType | null;
  typeOtherLabel: string;
  onProjectTypeChange: (projectType: ProjectType) => void;
  onTypeOtherLabelChange: (value: string) => void;
  onContinue: () => void;
  onStepSelect: (stepIndex: number) => void;
}) {
  const canContinue =
    selectedProjectType !== null &&
    (selectedProjectType !== "other" || typeOtherLabel.trim().length > 0);

  return (
    <CreateProjectStepShell
      title="What is the primary project type?"
      description="Pick the closest match for the roadmap. You can still work across multiple disciplines."
      activeStepIndex={2}
      headerGapClassName="gap-[24px]"
      titleClassName="w-[200px]"
      descriptionClassName="w-full"
      onStepSelect={onStepSelect}
    >
      <form
        className="flex w-full flex-col items-start gap-[12px]"
        onSubmit={(event) => {
          event.preventDefault();
          if (canContinue) onContinue();
        }}
      >
        <FormCard title="Project Type" titleWeight="semibold" bodyPaddingClassName="p-[4px]">
          <div className="flex w-full flex-col gap-[4px]">
            <div className="grid w-full grid-cols-3 gap-[4px]">
              {PROJECT_TYPES.filter(
                (option) =>
                  CREATE_PROJECT_TYPE_VALUES.includes(option.value) && option.value !== "other",
              ).map((option) => {
                const selected = option.value === selectedProjectType;
                const iconSrc = PROJECT_TYPE_ICONS[option.value];

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => onProjectTypeChange(option.value)}
                    aria-pressed={selected}
                    className={cn(
                      "flex min-w-0 cursor-pointer items-center justify-center gap-[8px] rounded-[6px] border px-[12px] py-[44px] text-[12px] font-medium leading-[1.25] transition-colors",
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
            <button
              type="button"
              onClick={() => onProjectTypeChange("other")}
              aria-pressed={selectedProjectType === "other"}
              className={cn(
                "flex w-full cursor-pointer items-center justify-center gap-[6px] rounded-[6px] border px-[12px] py-[10px] text-[12px] font-medium leading-[1.25] transition-colors",
                selectedProjectType === "other"
                  ? "border-[#dbd9fc] bg-[#e7e6fd] text-[#16115a]"
                  : "border-transparent bg-[#f5f5f5] text-[#0a0a0a] shadow-[0px_0.45px_1px_0px_rgba(10,10,10,0.25)] hover:bg-[#eeeeee]",
              )}
            >
              <PlusIcon />
              <span>Other</span>
            </button>
            {selectedProjectType === "other" ? (
              <input
                value={typeOtherLabel}
                onChange={(event) => onTypeOtherLabelChange(event.target.value)}
                placeholder="Please specify your project type..."
                aria-label="Specify project type"
                autoFocus
                className={inputSurfaceClassName}
              />
            ) : null}
          </div>
        </FormCard>

        <ContinueButton disabled={!canContinue} />
      </form>
    </CreateProjectStepShell>
  );
}
