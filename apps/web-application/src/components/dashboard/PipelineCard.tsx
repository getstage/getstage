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
      action={<CardTab label="This Month" onClick={onOpenAllProjects} />}
    >
      {stages.length > 0 ? (
        <>
          <div className="flex flex-col gap-[20px]">
            {stages.map((stage) => (
              <div key={stage.name} className="flex flex-col gap-[10px]">
                <div className="flex items-center gap-[8px]">
                  <span
                    className={`h-[6px] w-[6px] shrink-0 rounded-full ${stage.dotColor}`}
                  />
                  <span className="text-[13px] font-medium leading-[1.2] text-[#0a0a0a]">
                    {stage.name}
                  </span>
                </div>
                <div
                  className={`h-[19px] w-full rounded-[4px] ${stage.barGradient}`}
                />
              </div>
            ))}
          </div>
          <p className="mt-[24px] text-[12px] font-normal leading-[1.5] text-[#737373]">
            {totalActive} active project{totalActive !== 1 ? "s" : ""} across all stages
          </p>
        </>
      ) : (
        <p className="text-[13px] text-[#737373]">No active projects.</p>
      )}
    </DashboardCard>
  );
}
