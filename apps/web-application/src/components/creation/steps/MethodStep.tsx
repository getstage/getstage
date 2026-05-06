import type { DragEvent } from "react";
import { BackButton, PrimaryButton } from "@/components/creation/CreationChrome";
import { cn } from "@/lib/utils";
import type { Method, PhaseItem, WorkflowStep } from "@/hooks/useProjectCreation";

type MethodStepProps = {
  method: Method;
  phases: PhaseItem[];
  roadmap?: Array<{ name: string }>;
  canContinue: boolean;
  currentIndex: number;
  steps: WorkflowStep[];
  onMethodChange: (value: Exclude<Method, null>) => void;
  onTogglePhase: (phaseId: string) => void;
  onDragStart: (event: DragEvent<HTMLDivElement>, phaseId: string) => void;
  onDrop: (event: DragEvent<HTMLDivElement>, targetId: string) => void;
  onDragEnd: () => void;
  continueLabel?: string;
  onContinue: () => void;
  onBack: () => void;
};

export function MethodStep({
  method,
  phases,
  roadmap = [],
  canContinue,
  currentIndex: _currentIndex,
  steps: _steps,
  onMethodChange,
  onTogglePhase,
  onDragStart,
  onDrop,
  onDragEnd,
  continueLabel = "Continue",
  onContinue,
  onBack,
}: MethodStepProps) {
  const activePhases = phases.filter((phase) => phase.on);
  const previewPhases = roadmap.length > 0 ? roadmap : activePhases;

  return (
    <div>
      <div className="mb-3 rounded-[12px] bg-[#F5F5F5] p-1 shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
        <div className="px-4 pb-3 pt-3 text-[13px] font-semibold text-text-primary">
          How do you want to structure this project?
        </div>
        <div className="rounded-[8px] bg-white p-3 shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
          <RadioRow
            selected={method === "ai"}
            title="Smart Setup"
            onClick={() => onMethodChange("ai")}
          />
          <RadioRow
            selected={method === "manual"}
            title="Manual Setup"
            onClick={() => onMethodChange("manual")}
          />
        </div>
      </div>

      {method === "manual" ? (
        <div className="mb-7 rounded-[12px] bg-[#F5F5F5] p-1 shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
          <div className="rounded-[8px] bg-white p-3 shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
            <p className="mb-2 text-[13px] font-medium text-text-primary">Select Phases</p>
            {phases.map((phase, index) => (
              <div
                key={phase.id}
                draggable
                onDragStart={(event) => onDragStart(event, phase.id)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => onDrop(event, phase.id)}
                onDragEnd={onDragEnd}
                className={cn(
                  "flex items-center gap-3 py-2.5",
                  index < phases.length - 1 ? "border-b border-[#EFEFF2]" : "",
                )}
              >
                <img
                  src="/logos/dots.svg"
                  alt=""
                  className="h-4 w-4 shrink-0 cursor-grab opacity-45"
                />
                <span
                  className={cn(
                    "flex-1 text-left text-[13px] font-medium",
                    phase.on ? "text-text-primary" : "text-text-tertiary",
                  )}
                >
                  {phase.name}
                </span>
                <button
                  type="button"
                  onClick={() => onTogglePhase(phase.id)}
                  className={cn(
                    "relative h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors focus:outline-none",
                    phase.on ? "bg-[#DEDDFD]" : "bg-[#E5E5E5]",
                  )}
                  aria-label={`Toggle ${phase.name}`}
                >
                  <span
                    className={cn(
                      "absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full transition-all",
                      phase.on ? "left-[18px] bg-[#525252]" : "left-0.5 bg-[#BFBFBF]",
                    )}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : method === "ai" && previewPhases.length > 0 ? (
        <div className="mb-7 rounded-[12px] bg-[#F5F5F5] p-1 shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
          <div className="rounded-[8px] bg-white p-4 shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
            <div className="relative py-1 pl-1">
              <span
                aria-hidden
                className="absolute bottom-[18px] left-[10px] top-[18px] w-px rounded-full bg-[#A3A3A3]"
              />
              <ul className="space-y-4">
                {previewPhases.map((phase, index) => (
                  <li key={`${phase.name}-${index}`} className="relative flex items-center gap-3">
                    <span className="relative z-10 grid h-5 w-5 shrink-0 place-items-center rounded-full border-[4px] border-[#2F2B7F] bg-white" />
                    <span className="text-[15px] font-medium text-text-primary">{phase.name}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : null}

      <PrimaryButton label={continueLabel} disabled={!canContinue} onClick={onContinue} />
      <BackButton onClick={onBack} />
    </div>
  );
}

type RadioRowProps = {
  selected: boolean;
  title: string;
  onClick: () => void;
};

function RadioRow({ selected, title, onClick }: RadioRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full cursor-pointer items-center gap-3 rounded-[6px] bg-transparent px-1 py-2 text-left transition-colors hover:bg-[#F5F5F5] focus:outline-none"
    >
      <span
        className={cn(
          "grid h-5 w-5 shrink-0 place-items-center rounded-full",
          selected ? "bg-[#171717]" : "bg-[#E5E5E5]",
        )}
      >
        {selected ? <span className="h-2 w-2 rounded-full bg-white" /> : null}
      </span>
      <span className="text-[15px] font-medium text-text-primary">{title}</span>
    </button>
  );
}
