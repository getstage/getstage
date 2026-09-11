import { SkillsComponentsPanel } from "../SkillsComponentsSelect";
import { ContinueButton, CreateProjectStepShell, FormCard } from "./CreateProjectPrimitives";

export function SkillsComponentsStep({
  skillIds,
  componentPackIds,
  onSkillIdsChange,
  onComponentPackIdsChange,
  onContinue,
  onStepSelect,
}: {
  skillIds: string[];
  componentPackIds: string[];
  onSkillIdsChange: (next: string[]) => void;
  onComponentPackIdsChange: (next: string[]) => void;
  onContinue: () => void;
  onStepSelect: (stepIndex: number) => void;
}) {
  return (
    <CreateProjectStepShell
      title="Skills & Components"
      description="Pick from skills and component libraries you have added. You can add more without leaving this step."
      activeStepIndex={4}
      headerGapClassName="gap-[24px]"
      descriptionClassName="w-full"
      onStepSelect={onStepSelect}
    >
      <form
        className="flex w-full flex-col items-start gap-[12px]"
        onSubmit={(event) => {
          event.preventDefault();
          onContinue();
        }}
      >
        <FormCard title="Skills & Components">
          <SkillsComponentsPanel
            skillIds={skillIds}
            componentPackIds={componentPackIds}
            onChange={(next) => {
              onSkillIdsChange(next.skillIds);
              onComponentPackIdsChange(next.componentPackIds);
            }}
          />
        </FormCard>

        <ContinueButton />
      </form>
    </CreateProjectStepShell>
  );
}

