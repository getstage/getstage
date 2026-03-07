import { useState } from "react";
import { Plus } from "@phosphor-icons/react";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { DashboardTimelineSelector } from "@/components/dashboard/DashboardTimelineSelector";
import { PaymentsCard } from "@/components/dashboard/PaymentsCard";
import { ProjectDock } from "@/components/dashboard/ProjectDock";
import { RecentActivityCard } from "@/components/dashboard/RecentActivityCard";
import { Timeline, type TimelineHorizon } from "@/components/dashboard/Timeline";
import { UpcomingTasksCard } from "@/components/dashboard/UpcomingTasksCard";
import { dashboardPreviewData } from "@/components/dashboard/dashboardPreviewData";
import { Button } from "@/components/ui/Button";
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
    <div className="min-h-[calc(100vh-64px)]">
      <div className="mx-auto max-w-[1200px] px-6 pt-3 sm:px-10 lg:px-14">
        <div className="min-w-[320px]">
          <h1 className="font-heading text-[20px] leading-[1.2] font-medium tracking-[-0.2px] text-text-primary">
            {getGreeting(greetingName)}
          </h1>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <DashboardTimelineSelector
              value={timelineHorizon}
              onChange={setTimelineHorizon}
            />

            <Button className="h-[34px] rounded-[7px] px-3 text-[13px]" onClick={onPrimaryAction}>
              <Plus size={11} weight="bold" aria-hidden="true" />
              New Project
            </Button>
          </div>

          <DashboardStats {...dashboardPreviewData.stats} />
        </div>
      </div>

      <div className="relative left-1/2 mt-0 w-screen -translate-x-1/2">
        <Timeline
          projects={dashboardPreviewData.projects}
          horizon={timelineHorizon}
          nowTimestamp={dashboardPreviewData.nowTimestamp}
          interactive={false}
        />
      </div>

      <div className="mx-auto max-w-[1200px] px-6 pb-[120px] sm:px-10 lg:px-14">
        <div className="mt-8 space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <UpcomingTasksCard tasks={dashboardPreviewData.upcomingTasks} />
            <RecentActivityCard entries={dashboardPreviewData.recentActivity} />
          </div>

          <PaymentsCard paymentSummary={dashboardPreviewData.paymentSummary} />
        </div>
      </div>

      <ProjectDock projects={dashboardPreviewData.projects.slice(0, 6)} interactive={false} />
    </div>
  );
}
