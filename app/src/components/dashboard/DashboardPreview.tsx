import { useState } from "react";
import { CardGroup } from "@/components/dashboard/CardGroup";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { DashboardTimelineSelector } from "@/components/dashboard/DashboardTimelineSelector";
import { PaymentsCard } from "@/components/dashboard/PaymentsCard";
import { RecentActivityCard } from "@/components/dashboard/RecentActivityCard";
import { Timeline, type TimelineHorizon } from "@/components/dashboard/Timeline";
import { UpcomingTasksCard } from "@/components/dashboard/UpcomingTasksCard";
import { dashboardPreviewData } from "@/components/dashboard/dashboardPreviewData";
import { getGreeting } from "@/lib/utils";

type DashboardPreviewProps = {
  greetingName: string;
  onPrimaryAction: () => void;
};

export function DashboardPreview({
  greetingName,
  onPrimaryAction,
}: DashboardPreviewProps) {
  const [timelineHorizon, setTimelineHorizon] = useState<TimelineHorizon>(
    dashboardPreviewData.defaultHorizon,
  );

  return (
    <div className="flex flex-col gap-[44px]">
      <div className="flex flex-col gap-[18px]">
        <div>
          <h1 className="text-[20px] font-semibold leading-[1.2] text-[#0a0a0a]">
            {getGreeting(greetingName)}
          </h1>
          <p className="mt-1 text-[13px] font-medium text-[#737373]">
            Here's what's happening across your projects
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <DashboardTimelineSelector
            value={timelineHorizon}
            onChange={setTimelineHorizon}
          />

          <button
            type="button"
            onClick={onPrimaryAction}
            className="inline-flex h-[34px] shrink-0 cursor-pointer items-center gap-1.5 rounded-[6px] border border-[rgba(158,153,248,0.75)] bg-gradient-to-b from-[#7b76df] to-[#463fba] px-3 text-[13px] font-medium text-white shadow-[0px_0.45px_1px_0px_rgba(10,10,10,0.25)] transition-opacity hover:opacity-90"
          >
            <img src="/logos/dashboard/plus.svg" alt="" aria-hidden="true" className="h-3 w-3 brightness-0 invert" />
            Create Project
          </button>
        </div>

        <DashboardStats {...dashboardPreviewData.stats} />
      </div>

      <div className="relative left-1/2 w-screen -translate-x-1/2">
        <Timeline
          projects={dashboardPreviewData.projects}
          horizon={timelineHorizon}
          nowTimestamp={dashboardPreviewData.nowTimestamp}
          interactive={false}
        />
      </div>

      <CardGroup className="flex flex-col gap-[2px]">
        <div className="flex gap-[2px]">
          <UpcomingTasksCard tasks={dashboardPreviewData.upcomingTasks} />
          <RecentActivityCard entries={dashboardPreviewData.recentActivity} />
        </div>
        <div className="flex gap-[2px]">
          <PaymentsCard paymentSummary={dashboardPreviewData.paymentSummary} />
        </div>
      </CardGroup>
    </div>
  );
}
