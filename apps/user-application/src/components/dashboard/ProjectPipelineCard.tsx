import { CardTab, DashboardCard } from "./DashboardCard";
import type { DashboardPeriod } from "./DashboardHeader";
import type { DashboardPipelineStage } from "@/models/dashboard/dashboard";

export function ProjectPipelineCard({
  stages,
  period,
}: {
  stages: DashboardPipelineStage[];
  period: DashboardPeriod;
}) {
  return (
    <DashboardCard
      className="h-full flex-1"
      title="Project Pipeline"
      subtitle="Active projects by stage"
      action={<CardTab label={period} />}
    >
      {stages.length > 0 ? (
        <div className="flex w-full flex-col gap-[20px]">
          {stages.map((stage) => (
            <div key={stage.id} className="flex w-full flex-col gap-[10px]">
              <div className="flex items-center gap-[8px]">
                <span
                  aria-hidden="true"
                  className="h-[6px] w-[6px] shrink-0 rounded-full"
                  style={{ background: stage.accentColor }}
                />
                <p className="text-[13px] font-medium leading-[1.2] text-[#0a0a0a]">
                  {stage.label}
                </p>
              </div>
              <div
                className="h-[19px] w-full rounded-[4px]"
                style={{ background: stage.barColor }}
              />
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[13px] text-[#737373]">No synced project stages.</p>
      )}
      <p className="text-[12px] font-normal leading-[1.5] text-[#737373]">
        {stages.length} synced stage{stages.length !== 1 ? "s" : ""}
      </p>
    </DashboardCard>
  );
}
