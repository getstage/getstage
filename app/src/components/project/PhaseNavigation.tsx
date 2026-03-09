import { Check } from "@phosphor-icons/react";
import type { Phase } from "@/types";

type PhaseNavigationProps = {
  phases: Phase[];
  activePhaseId: string;
  onSelect: (phaseId: string) => void;
};

export function PhaseNavigation({
  phases,
  activePhaseId,
  onSelect,
}: PhaseNavigationProps) {
  return (
    <section className="timeline-scrollbar-hidden mt-12 overflow-x-auto pb-4 sm:mt-16">
      <div className="mx-auto flex min-w-[760px] max-w-[1080px] items-center px-4 sm:px-0">
        {phases.map((phase, index) => (
          <div key={phase.id} className="flex min-w-0 flex-1 items-center">
            <PhaseNode
              phase={phase}
              selected={activePhaseId === phase.id}
              onClick={() => onSelect(phase.id)}
            />
            {index < phases.length - 1 ? (
              <div
                className={`h-px min-w-[28px] flex-1 ${
                  phase.status === "completed" ? "bg-accent/45" : "bg-border-subtle"
                }`}
              />
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}

type PhaseNodeProps = {
  phase: Phase;
  selected: boolean;
  onClick: () => void;
};

function PhaseNode({ phase, selected, onClick }: PhaseNodeProps) {
  const done = phase.tasks.filter((task) => task.isCompleted).length;
  const total = phase.tasks.length;
  const isCompleted = phase.status === "completed";
  const isActive = phase.status === "active";
  const isUpcoming = phase.status === "upcoming";
  const isSelectedActive = selected && isActive;
  const isSelectedOther = selected && !isActive;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`flex min-w-[106px] shrink-0 cursor-pointer flex-col items-center gap-2 rounded-[18px] border border-transparent px-3 py-4 text-center transition-all duration-200 sm:min-w-[120px] ${
        isSelectedActive
          ? "bg-accent"
          : isSelectedOther
            ? "border-accent/15 bg-accent/8"
            : "hover:bg-bg-subtle"
      }`}
    >
      <span
        className={`h-3 w-3 rounded-full ${
          isSelectedActive
            ? "bg-white"
            : isCompleted || isActive
              ? "bg-accent"
              : "border border-[#D9D9D9] bg-transparent"
        }${isActive && !selected ? " animate-pulse" : ""}`}
      />
      <span
        className={`text-[13px] ${
          isSelectedActive
            ? "font-medium text-white"
            : isUpcoming
              ? "text-text-tertiary"
              : isCompleted
                ? "text-text-secondary"
                : "font-medium text-text-primary"
        }`}
      >
        {phase.name}
      </span>

      {isCompleted && !selected ? (
        <Check size={12} weight="bold" className="text-accent" />
      ) : (
        <span
          className={`text-[11px] ${
            isSelectedActive
              ? "text-white/80"
              : isUpcoming
                ? "text-[#D0D0D0]"
                : isSelectedOther
                  ? "text-text-secondary"
                  : "text-text-tertiary"
          }`}
        >
          {done} of {total}
        </span>
      )}
    </button>
  );
}
