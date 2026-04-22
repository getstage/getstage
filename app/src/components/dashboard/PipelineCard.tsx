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
  barGradient: string;
};

const STAGE_CATEGORIES: Record<string, { dot: string; bar: string }> = {
  research: { dot: "bg-[#9e99f8]", bar: "bg-gradient-to-r from-[#9e99f8] to-[#9e99f8]" },
  discovery: { dot: "bg-[#d6d3d1]", bar: "bg-gradient-to-r from-[#d6d3d1] to-[#d6d3d1]" },
  brief: { dot: "bg-[#9e99f8]", bar: "bg-gradient-to-r from-[#9e99f8] to-[#9e99f8]" },
  strategy: { dot: "bg-[#d6d3d1]", bar: "bg-gradient-to-r from-[#d6d3d1] to-[#d6d3d1]" },
  design: { dot: "bg-[#d6d3d1]", bar: "bg-gradient-to-r from-[#d6d3d1] to-[#d6d3d1]" },
  generate: { dot: "bg-[#d6d3d1]", bar: "bg-gradient-to-r from-[#d6d3d1] to-[#d6d3d1]" },
  delivery: { dot: "bg-[#d6d3d1]", bar: "bg-gradient-to-r from-[#d6d3d1] to-[#d6d3d1]" },
};

function categorizePhase(phaseName: string): string {
  const lower = phaseName.toLowerCase();
  for (const key of Object.keys(STAGE_CATEGORIES)) {
    if (lower.includes(key)) return key;
  }
  return lower;
}

function getStageStyle(category: string): { dot: string; bar: string } {
  return STAGE_CATEGORIES[category] ?? { dot: "bg-[#d6d3d1]", bar: "bg-[#d6d3d1]" };
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
        barGradient: style.bar,
      });
    }

    return result.sort((a, b) => b.count - a.count);
  }, [projects]);

  const totalActive = projects.filter((p) => p.status === "active").length;

  return (
    <DashboardCard
      className="h-full flex-1"
      title="Project Pipeline"
      subtitle="Active projects by stage"
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
                    className={`h-[6px] w-[6px] shrink-0 rounded-full ${stage.dotColor}`}
                  />
                  <span className="w-[72px] shrink-0 text-[13px] text-[#737373]">
                    {stage.name}
                  </span>
                  <div className="relative flex-1 overflow-hidden rounded-[6px] bg-[#f5f5f5]">
                    <div
                      className={`h-6 rounded-[6px] transition-[width] duration-300 ${stage.barGradient}`}
                      style={{ width: `${widthPct}%` }}
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[12px] font-medium text-[#737373]">
                      {stage.count} project{stage.count !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="text-[12px] font-normal text-[#737373]">
            {totalActive} active project{totalActive !== 1 ? "s" : ""} across all stages
          </div>
        </>
      ) : (
        <p className="text-[13px] text-[#737373]">No active projects.</p>
      )}
    </DashboardCard>
  );
}
