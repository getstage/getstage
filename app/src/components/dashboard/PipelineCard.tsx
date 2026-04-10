import { useMemo } from "react";
import { DashboardCard, CardTab } from "@/components/dashboard/DashboardCard";
import type { Project } from "@/types";

type PipelineCardProps = {
  projects: Project[];
  onOpenAllProjects?: () => void;
};

type PipelineStage = {
  name: string;
  count: number;
  dotColor: string;
  fillColor: string;
};

const STAGE_CATEGORIES: Record<string, { dot: string; fill: string }> = {
  research: { dot: "bg-accent", fill: "bg-accent/20" },
  discovery: { dot: "bg-accent", fill: "bg-accent/20" },
  strategy: { dot: "bg-[#3B82F6]", fill: "bg-[#3B82F6]/15" },
  design: { dot: "bg-[#22C55E]", fill: "bg-[#22C55E]/15" },
  generate: { dot: "bg-[#22C55E]", fill: "bg-[#22C55E]/15" },
  delivery: { dot: "bg-[#D4890A]", fill: "bg-[#D4890A]/15" },
};

function categorizePhase(phaseName: string): string {
  const lower = phaseName.toLowerCase();
  for (const key of Object.keys(STAGE_CATEGORIES)) {
    if (lower.includes(key)) return key;
  }
  return lower;
}

function getStageStyle(category: string): { dot: string; fill: string } {
  return STAGE_CATEGORIES[category] ?? { dot: "bg-border", fill: "bg-border-subtle" };
}

export function PipelineCard({ projects, onOpenAllProjects }: PipelineCardProps) {
  const stages = useMemo((): PipelineStage[] => {
    const activeProjects = projects.filter((p) => p.status === "active");
    const counts = new Map<string, number>();

    for (const project of activeProjects) {
      const activePhase = project.phases.find((ph) => ph.status === "active");
      if (activePhase) {
        const category = categorizePhase(activePhase.name);
        counts.set(category, (counts.get(category) ?? 0) + 1);
      }
    }

    const result: PipelineStage[] = [];

    for (const [category, count] of counts.entries()) {
      const style = getStageStyle(category);
      result.push({
        name: category.charAt(0).toUpperCase() + category.slice(1),
        count,
        dotColor: style.dot,
        fillColor: style.fill,
      });
    }

    return result.sort((a, b) => b.count - a.count);
  }, [projects]);

  const totalActive = projects.filter((p) => p.status === "active").length;

  return (
    <DashboardCard
      className="h-full"
      title="Pipeline"
      action={<CardTab label="All projects" onClick={onOpenAllProjects} />}
    >
      {stages.length > 0 ? (
        <>
          <div className="mb-5 flex flex-col gap-2.5">
            {stages.map((stage) => {
              const maxCount = Math.max(...stages.map((s) => s.count), 1);
              const widthPct = Math.max((stage.count / maxCount) * 100, 8);

              return (
                <div key={stage.name} className="flex items-center gap-3">
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${stage.dotColor}`}
                  />
                  <span className="w-[72px] shrink-0 text-[13px] text-text-secondary">
                    {stage.name}
                  </span>
                  <div className="relative flex-1 overflow-hidden rounded-[6px] bg-border-subtle">
                    <div
                      className={`h-6 rounded-[6px] transition-[width] duration-300 ${stage.fillColor}`}
                      style={{ width: `${widthPct}%` }}
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[12px] font-medium text-text-secondary">
                      {stage.count} project{stage.count !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="text-right text-[12px] text-text-tertiary">
            {totalActive} active project{totalActive !== 1 ? "s" : ""} across all stages
          </div>
        </>
      ) : (
        <p className="text-[13px] text-text-secondary">No active projects.</p>
      )}
    </DashboardCard>
  );
}
