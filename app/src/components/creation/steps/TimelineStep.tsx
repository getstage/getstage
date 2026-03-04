import { BackButton, PrimaryButton, StepDots } from "@/components/creation/CreationChrome";
import type { WorkflowStep } from "@/hooks/useProjectCreation";

type TimelineStepProps = {
  canContinue: boolean;
  currentIndex: number;
  steps: WorkflowStep[];
  startDate: string;
  endDate: string;
  continueLabel: string;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onContinue: () => void;
  onBack: () => void;
};

export function TimelineStep({
  canContinue,
  currentIndex,
  steps,
  startDate,
  endDate,
  continueLabel,
  onStartDateChange,
  onEndDateChange,
  onContinue,
  onBack,
}: TimelineStepProps) {
  return (
    <div>
      <h2 className="mb-2 text-center font-heading text-[24px] font-semibold tracking-[-0.4px] text-text-primary">
        Project timeline
      </h2>
      <p className="mb-8 text-center text-[15px] leading-[1.5] text-text-secondary">
        When does this project start and end?
      </p>

      <div className="mb-7 flex gap-3">
        <DateField label="Start date" value={startDate} onChange={onStartDateChange} />
        <DateField label="End date" value={endDate} onChange={onEndDateChange} />
      </div>

      <PrimaryButton label={continueLabel} disabled={!canContinue} onClick={onContinue} />
      <BackButton onClick={onBack} />
      <StepDots steps={steps} currentIndex={currentIndex} />
    </div>
  );
}

type DateFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

function DateField({ label, value, onChange }: DateFieldProps) {
  return (
    <div className="flex-1">
      <label className="mb-1.5 block text-[13px] font-medium text-text-primary">{label}</label>
      <input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-[10px] border border-transparent bg-input-bg px-[14px] py-3 text-[14px] text-text-primary outline-none transition-all duration-200 focus:border-border focus:bg-white"
      />
    </div>
  );
}
