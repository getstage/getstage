import { StepsIcon } from "./flowsIcons";

export function StepsPanel({
  steps,
  editing,
  onDraftStepChange,
}: {
  steps: string[];
  editing: boolean;
  onDraftStepChange: (stepIndex: number, value: string) => void;
}) {
  return (
    <div className="min-w-[360px] flex-1 rounded-[6px] bg-[#F5F5F5] p-3 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 pr-3 py-[6px] text-[13px] font-medium leading-[1.25] text-[#171717]">
          <StepsIcon />
          Steps
        </div>
        <div className="h-px w-full bg-[#E5E5E5]" />
      </div>
      <div className="flex flex-col gap-3 pt-3">
        {steps.map((step, stepIndex) => (
          <div key={`${stepIndex}-${step}`} className="flex items-center gap-3 text-[13px] font-medium leading-[1.25] text-[#171717]">
            <span className="flex min-w-[22px] shrink-0 items-center justify-center rounded-[4px] bg-[#E5E5E5] px-2 py-1 text-[12px] font-medium leading-[1.25] text-[#171717]">
              {stepIndex + 1}
            </span>
            {editing ? (
              <input
                value={step}
                onChange={(event) => onDraftStepChange(stepIndex, event.target.value)}
                className="block h-[13px] min-w-0 flex-1 appearance-none border-0 bg-transparent p-0 text-[13px] font-medium leading-[1.25] text-[#171717] outline-none placeholder:text-[#737373]"
              />
            ) : (
              <span className="min-w-0 truncate">{step}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
