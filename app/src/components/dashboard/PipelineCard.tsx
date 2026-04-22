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

const STAGE_CATEGORIES: Record<string, { dot: string; barGradient: string }> = {
  research: { dot: "bg-accent", barGradient: "from-[#9e99f8] via-[rgba(158,153,248,0.75)] to-[#9e99f8]" },
  discovery: { dot: "bg-[#d6d3d1]", barGradient: "from-[#d6d3d1] via-[rgba(214,211,209,0.75)] to-[#d6d3d1]" },
  brief: { dot: "bg-accent", barGradient: "from-[#9e99f8] via-[rgba(158,153,248,0.75)] to-[#9e99f8]" },
  strategy: { dot: "bg-[#3B82F6]", barGradient: "from-[#3B82F6] via-[rgba(59,130,246,0.75)] to-[#3B82F6]" },
  design: { dot: "bg-[#22C55E]", barGradient: "from-[#22C55E] via-[rgba(34,197,94,0.75)] to-[#22C55E]" },
  generate: { dot: "bg-[#22C55E]", barGradient: "from-[#22C55E] via-[rgba(34,197,94,0.75)] to-[#22C55E]" },
  delivery: { dot: "bg-[#D4890A]", barGradient: "from-[#D4890A] via-[rgba(212,137,10,0.75)] to-[#D4890A]" },
};

function categorizePhase(phaseName: string): string {
  const lower = phaseName.toLowerCase();
  for (const key of Object.keys(STAGE_CATEGORIES)) {
    if (lower.includes(key)) return key;
  }
  return lower;
}

function getStageStyle(category: string): { dot: string; barGradient: string } {
  return STAGE_CATEGORIES[category] ?? { dot: "bg-border", barGradient: "from-[#d6d3d1] via-[rgba(214,211,209,0.75)] to-[#d6d3d1]" };
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
        fillColor: style.barGradient,
      });
    }

    return result.sort((a, b) => b.count - a.count);
  }, [projects]);

  const totalActive = projects.filter((p) => p.status === "active").length;

  return (
    <DashboardCard
      className="h-full"
      title="Project Pipeline"
      subtitle="Active projects by stage"
      action={<CardTab label="This Month" onClick={onOpenAllProjects} />}
    >
      {stages.length > 0 ? (
        <>
          <div className="flex flex-col gap-5">
            {stages.map((stage) => (
              <div key={stage.name} className="flex flex-col gap-2.5">
                <div className="flex items-center gap-2">
                  <span
                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${stage.dotColor}`}
                  />
                  <span className="text-[13px] font-medium leading-[1.2] text-text-primary">
                    {stage.name}
                  </span>
                </div>
                <div
                  className={`h-[19px] w-full rounded-[4px] bg-gradient-to-r ${stage.fillColor}`}
                />
              </div>
            ))}
          </div>
          <div className="mt-6 text-[12px] text-text-secondary">
            {totalActive} active project{totalActive !== 1 ? "s" : ""} across all stages
          </div>
        </>
      ) : (
        <p className="text-[13px] text-text-secondary">No active projects.</p>
      )}
    </DashboardCard>
  );
}
