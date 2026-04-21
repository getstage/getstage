import { CalendarBlank } from "@phosphor-icons/react";
import { BackButton, PrimaryButton } from "@/components/creation/CreationChrome";
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
  currentIndex: _currentIndex,
  steps: _steps,
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
      <div className="mb-7 rounded-[12px] bg-[#F5F5F5] p-1 shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
        <div className="px-4 pb-3 pt-3 text-[13px] font-semibold text-text-primary">Timeline</div>
        <div className="flex flex-col gap-3 rounded-[8px] bg-white p-4 shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] sm:flex-row">
          <DateField label="Start" value={startDate} onChange={onStartDateChange} />
          <DateField label="End" value={endDate} onChange={onEndDateChange} />
        </div>
      </div>

      <PrimaryButton label={continueLabel} disabled={!canContinue} onClick={onContinue} />
      <BackButton onClick={onBack} />
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
      <label className="mb-2 block text-[13px] font-semibold text-text-primary">{label}</label>
      <div className="flex items-center gap-3 rounded-[6px] bg-[#F5F5F5] px-3 py-2.5 shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
        <CalendarBlank size={16} className="shrink-0 text-text-secondary" />
        <input
          type="date"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-w-0 flex-1 bg-transparent text-[13px] font-medium text-text-secondary outline-none"
        />
      </div>
    </div>
  );
}
