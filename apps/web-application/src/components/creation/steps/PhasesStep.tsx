import type { DragEvent } from "react";
import { Plus } from "@phosphor-icons/react";
import { BackButton, PrimaryButton } from "@/components/creation/CreationChrome";
import { cn } from "@/lib/utils";
import type { PhaseItem, WorkflowStep } from "@/hooks/useProjectCreation";

type PhasesStepProps = {
  phases: PhaseItem[];
  editingPhaseId: string | null;
  canContinue: boolean;
  currentIndex: number;
  steps: WorkflowStep[];
  onEditingPhaseIdChange: (phaseId: string | null) => void;
  onTogglePhase: (phaseId: string) => void;
  onAddPhase: () => void;
  onRenamePhase: (phaseId: string, name: string) => void;
  onRemovePhase: (phaseId: string) => void;
  onDragStart: (event: DragEvent<HTMLDivElement>, phaseId: string) => void;
  onDrop: (event: DragEvent<HTMLDivElement>, targetId: string) => void;
  onDragEnd: () => void;
  onContinue: () => void;
  onBack: () => void;
};

export function PhasesStep({
  phases,
  editingPhaseId,
  canContinue,
  currentIndex: _currentIndex,
  steps: _steps,
  onEditingPhaseIdChange,
  onTogglePhase,
  onAddPhase,
  onRenamePhase,
  onRemovePhase,
  onDragStart,
  onDrop,
  onDragEnd,
  onContinue,
  onBack,
}: PhasesStepProps) {
  return (
    <div>
      <h2 className="mb-2 text-center font-heading text-[24px] font-semibold tracking-[-0.4px] text-text-primary">
        Select phases
      </h2>
      <p className="mb-8 text-center text-[15px] leading-normal text-text-secondary">
        Rename, remove, toggle, or reorder the phases you want.
      </p>

      <div className="mb-3">
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
              index < phases.length - 1 && "border-b border-border-subtle",
            )}
          >
            <div className="flex w-4 shrink-0 cursor-grab flex-col items-center gap-0.5 text-text-tertiary">
              <span className="h-[1.5px] w-3 rounded bg-current" />
              <span className="h-[1.5px] w-3 rounded bg-current" />
              <span className="h-[1.5px] w-3 rounded bg-current" />
            </div>

            {editingPhaseId === phase.id ? (
              <input
                autoFocus
                defaultValue={phase.name}
                onBlur={(event) => {
                  onRenamePhase(phase.id, event.target.value);
                  onEditingPhaseIdChange(null);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    onRenamePhase(phase.id, event.currentTarget.value);
                    onEditingPhaseIdChange(null);
                  }
                  if (event.key === "Escape") {
                    onEditingPhaseIdChange(null);
                  }
                }}
                className="h-7 flex-1 rounded-md border border-border bg-white px-2 text-[14px] text-text-primary outline-none"
              />
            ) : (
              <button
                type="button"
                onClick={() => onEditingPhaseIdChange(phase.id)}
                className={cn(
                  "flex-1 cursor-pointer text-left text-[14px]",
                  phase.on ? "text-text-primary" : "text-text-tertiary",
                )}
              >
                {phase.name}
              </button>
            )}

            <button
              type="button"
              onClick={() => onRemovePhase(phase.id)}
              disabled={phases.length <= 1}
              className="cursor-pointer text-[12px] font-medium text-text-tertiary transition-colors hover:text-destructive disabled:cursor-not-allowed disabled:opacity-40"
            >
              Remove
            </button>

            <button
              type="button"
              onClick={() => onTogglePhase(phase.id)}
              className={cn(
                "relative h-5 w-9 shrink-0 cursor-pointer rounded-[10px] transition-colors",
                phase.on ? "bg-accent" : "bg-[#D9D9D9]",
              )}
              aria-label={`Toggle ${phase.name}`}
            >
              <span
                className={cn(
                  "absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all",
                  phase.on ? "left-[18px]" : "left-0.5",
                )}
              />
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onAddPhase}
        className="mb-7 inline-flex cursor-pointer items-center gap-1 text-[13px] font-medium text-accent transition-colors hover:text-accent-hover"
      >
        <Plus size={14} weight="bold" />
        Add phase
      </button>

      <PrimaryButton label="Continue" disabled={!canContinue} onClick={onContinue} />
      <BackButton onClick={onBack} />
    </div>
  );
}
