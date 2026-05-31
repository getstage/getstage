import { timelineFormSchema } from "@/models/project/createProject";
import {
  ContinueButton,
  CreateProjectStepShell,
  DateInput,
  Field,
  FormCard,
  FormError,
} from "./CreateProjectPrimitives";

export function TimelineStep({
  startDate,
  endDate,
  error,
  onStartDateChange,
  onEndDateChange,
  onContinue,
}: {
  startDate: string;
  endDate: string;
  error: string | null;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onContinue: () => void;
}) {
  const canContinue = timelineFormSchema.safeParse({ startDate, endDate }).success;

  return (
    <CreateProjectStepShell
      title="Project timeline"
      description="When does this project start and end?"
      activeStepIndex={3}
      headerGapClassName="gap-[24px]"
      descriptionClassName="w-full"
    >
      <form
        className="flex w-full flex-col items-start gap-[12px]"
        onSubmit={(event) => {
          event.preventDefault();
          onContinue();
        }}
      >
        <FormCard title="Timeline">
          <div className="flex w-full items-start gap-[16px]">
            <Field label="Start">
              <DateInput
                value={startDate}
                onChange={onStartDateChange}
                ariaLabel="Project start date"
              />
            </Field>

            <Field label="End">
              <DateInput
                value={endDate}
                onChange={onEndDateChange}
                ariaLabel="Project end date"
              />
            </Field>
          </div>
        </FormCard>

        {error ? <FormError>{error}</FormError> : null}
        <ContinueButton disabled={!canContinue} />
      </form>
    </CreateProjectStepShell>
  );
}
