import { PencilSimpleLine, Plus, Trash } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import type { UseProjectDraftResult } from "@/features/project-creation/useProjectDraft";
import { OnboardingStepMotion, StepShell } from "../OnboardingPrimitives";

type OnboardingPhaseSelectStepProps = {
  draftState: UseProjectDraftResult;
};

export function OnboardingPhaseSelectStep({ draftState }: OnboardingPhaseSelectStepProps) {
  const { draft } = draftState;

  return (
    <OnboardingStepMotion motionKey="phase-select">
      <StepShell label="Select phases">
        <div>
          {draft.phases.map((phase, index) => (
            <div
              key={phase.id}
              draggable
              onDragStart={(event) => draftState.handleDragStart(event, phase.id)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => draftState.handleDrop(event, phase.id)}
              onDragEnd={draftState.handleDragEnd}
              className={cn(
                "flex items-center gap-3 py-2.5",
                index < draft.phases.length - 1 ? "border-b border-border-subtle" : "",
              )}
            >
              <div className="flex w-4 shrink-0 cursor-grab flex-col items-center gap-0.5 text-text-tertiary">
                <span className="h-[1.5px] w-3 rounded bg-current" />
                <span className="h-[1.5px] w-3 rounded bg-current" />
                <span className="h-[1.5px] w-3 rounded bg-current" />
              </div>
              {draftState.editingPhaseId === phase.id ? (
                <input
                  autoFocus
                  defaultValue={phase.name}
                  onBlur={(event) => {
                    draftState.renamePhase(phase.id, event.target.value);
                    draftState.setEditingPhaseId(null);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      draftState.renamePhase(phase.id, event.currentTarget.value);
                      draftState.setEditingPhaseId(null);
                    }
                    if (event.key === "Escape") {
                      draftState.setEditingPhaseId(null);
                    }
                  }}
                  className="h-8 flex-1 rounded-md border border-border bg-white px-2.5 text-[14px] text-text-primary outline-none"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => draftState.setEditingPhaseId(phase.id)}
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
                onClick={() => draftState.setEditingPhaseId(phase.id)}
                className="cursor-pointer text-text-tertiary transition-colors hover:text-text-primary"
                aria-label={`Rename ${phase.name}`}
              >
                <PencilSimpleLine size={15} weight="regular" />
              </button>

              <button
                type="button"
                onClick={() => draftState.removePhase(phase.id)}
                disabled={draft.phases.length <= 1}
                className="cursor-pointer text-text-tertiary transition-colors hover:text-destructive disabled:cursor-not-allowed disabled:opacity-40"
                aria-label={`Remove ${phase.name}`}
              >
                <Trash size={15} weight="regular" />
              </button>

              <button
                type="button"
                onClick={() => draftState.togglePhase(phase.id)}
                className={cn(
                  "relative h-5 w-9 shrink-0 cursor-pointer rounded-[10px] transition-colors focus:outline-none",
                  phase.on ? "bg-accent" : "bg-[#D9D9D9]",
                )}
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
          onClick={() => draftState.addPhase()}
          className="mt-2 inline-flex cursor-pointer items-center gap-1 text-[13px] font-medium text-accent transition-colors hover:text-accent-hover"
        >
          <Plus size={14} weight="bold" />
          Add phase
        </button>
      </StepShell>
    </OnboardingStepMotion>
  );
}
