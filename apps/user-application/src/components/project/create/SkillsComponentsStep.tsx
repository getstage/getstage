import {
  COMPONENT_PACK_CATALOG,
  DISCOVER_SKILL_CATALOG,
} from "@/lib/settings/skillsCatalog";
import { CatalogMultiSelect } from "../SkillsComponentsSelect";
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
      description="Select skills and components to use in this project"
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
        <FormCard>
          <CatalogMultiSelect
            label="Skills"
            placeholder="Select one or multiple skills"
            options={DISCOVER_SKILL_CATALOG}
            selectedIds={skillIds}
            onChange={onSkillIdsChange}
          />
          <CatalogMultiSelect
            label="Components"
            placeholder="Select one or multiple components"
            options={COMPONENT_PACK_CATALOG}
            selectedIds={componentPackIds}
            onChange={onComponentPackIdsChange}
          />
        </FormCard>

        <ContinueButton />
      </form>
    </CreateProjectStepShell>
  );
}
