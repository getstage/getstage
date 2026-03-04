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
    <section className="px-12 py-20">
      <div className="mx-auto flex max-w-[920px] items-center">
        {phases.map((phase, index) => (
          <div key={phase.id} className="flex flex-1 items-center">
            <PhaseNode
              phase={phase}
              selected={activePhaseId === phase.id}
              onClick={() => onSelect(phase.id)}
            />
            {index < phases.length - 1 ? (
              <div
                className={`h-px flex-1 ${phase.status === "completed" ? "bg-accent/45" : "bg-border"}`}
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

  const dotClass =
    phase.status === "completed"
      ? "bg-text-tertiary"
      : phase.status === "active"
        ? "bg-accent"
        : "border border-[#D9D9D9] bg-transparent";

  const textClass =
    phase.status === "upcoming"
      ? "text-text-tertiary"
      : phase.status === "completed"
        ? "text-text-secondary"
        : "text-text-primary";

  return (
    <button
      onClick={onClick}
      className={`relative flex min-w-[112px] cursor-pointer flex-col items-center gap-2 rounded-[8px] px-3 py-2 transition-colors ${
        selected && phase.status === "active" ? "bg-accent text-white" : "hover:bg-bg-subtle"
      }`}
    >
      <span
        className={`h-3 w-3 rounded-full ${selected && phase.status === "active" ? "bg-white" : dotClass}${phase.status === "active" && !selected ? " animate-pulse" : ""}`}
      />
      <span
        className={`text-[12px] ${selected && phase.status === "active" ? "font-medium text-white" : `${textClass}${phase.status === "active" ? " font-medium" : ""}`}`}
      >
        {phase.name}
      </span>
      <span
        className={`text-[11px] ${selected && phase.status === "active" ? "text-white/80" : "text-text-tertiary"}`}
      >
        {done} / {total}
      </span>
    </button>
  );
}
