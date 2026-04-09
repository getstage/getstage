import { useMemo } from "react";
import type { Phase } from "@/types";

type PhaseNavigationProps = {
  phases: Phase[];
  activePhaseId: string;
  onSelect: (phaseId: string) => void;
};

function formatDateShort(ms: number): string {
  const d = new Date(ms);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

export function PhaseNavigation({
  phases,
  activePhaseId,
  onSelect,
}: PhaseNavigationProps) {
  const dateLabels = useMemo(() => {
    const tasks = phases.flatMap((ph) => ph.tasks);
    const dueDates = tasks
      .map((t) => t.dueDate)
      .filter((d): d is number => d !== undefined && d > 0)
      .sort((a, b) => a - b);

    if (dueDates.length === 0) return [];

    const first = dueDates[0]!;
    const last = dueDates[dueDates.length - 1]!;
    const range = last - first;

    if (range <= 0) return [formatDateShort(first)];

    const labels: string[] = [formatDateShort(first)];
    const steps = Math.min(3, Math.max(1, Math.floor(range / (7 * 24 * 60 * 60 * 1000))));
    for (let i = 1; i < steps; i++) {
      labels.push(formatDateShort(first + (range * i) / steps));
    }
    labels.push(formatDateShort(last));
    return labels;
  }, [phases]);

  return (
    <section className="mt-16 px-0 py-12 sm:mt-20 sm:py-12">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-8">
        {/* Timeline bar */}
        <div className="flex h-16 w-full overflow-hidden rounded-[14px] bg-border-subtle">
          {phases.map((phase, index) => {
            const done = phase.tasks.filter((t) => t.isCompleted).length;
            const total = phase.tasks.length;
            const isCompleted = phase.status === "completed";
            const isActive = phase.status === "active";
            const isSelected = activePhaseId === phase.id;
            const progressPct = total > 0 ? Math.round((done / total) * 100) : 0;

            let bgStyle: string;
            if (isCompleted) {
              bgStyle = "bg-accent";
            } else if (isActive) {
              bgStyle = "";
            } else {
              bgStyle = "bg-border-subtle";
            }

            const isFirst = index === 0;
            const isLast = index === phases.length - 1;
            const roundedClasses = `${isFirst ? "rounded-l-[14px]" : ""} ${isLast ? "rounded-r-[14px]" : ""}`;

            return (
              <button
                key={phase.id}
                type="button"
                onClick={() => onSelect(phase.id)}
                aria-pressed={isSelected}
                className={`relative flex flex-1 cursor-pointer items-center justify-center gap-2 overflow-hidden transition-all duration-150 hover:brightness-[0.94] ${roundedClasses} ${bgStyle} ${
                  isSelected ? "z-[2]" : ""
                }`}
                style={
                  isActive
                    ? {
                        background: `linear-gradient(90deg, var(--color-accent) 0%, var(--color-accent) ${progressPct}%, rgba(135,130,245,0.15) ${progressPct}%, rgba(135,130,245,0.15) 100%)`,
                      }
                    : undefined
                }
              >
                <span
                  className={`whitespace-nowrap text-[13px] font-medium ${
                    isCompleted || isActive
                      ? "text-white/90"
                      : "text-text-tertiary"
                  }`}
                >
                  {phase.name}
                </span>
                <span
                  className={`text-[11px] ${
                    isCompleted || isActive
                      ? "text-white/60"
                      : "text-text-tertiary"
                  }`}
                >
                  {done}/{total}
                </span>
              </button>
            );
          })}
        </div>

        {/* Date labels */}
        {dateLabels.length > 0 && (
          <div className="flex justify-between px-1 pt-3">
            {dateLabels.map((label, i) => (
              <span key={i} className="text-[11px] text-text-secondary">
                {label}
              </span>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
