import { useQuery } from "@tanstack/react-query";
import { ActivityTimelineChart } from "../dashboard/components/ActivityTimelineChart";
import { DashboardHeader } from "../dashboard/components/DashboardHeader";
import { MetricGrid } from "../dashboard/components/MetricGrid";
import { ProjectPipelineCard } from "../dashboard/components/ProjectPipelineCard";
import { RecentActivityCard } from "../dashboard/components/RecentActivityCard";
import { RevenueOverviewCard } from "../dashboard/components/RevenueOverviewCard";
import { UpcomingTasksCard } from "../dashboard/components/UpcomingTasksCard";
import { dashboardSnapshot } from "../dashboard/data/dashboardSnapshot";
import { useDesktopBridge } from "../hooks/useDesktopBridge";
import { WorkspaceFrame } from "./WorkspaceFrame";

export function DashboardContextView() {
  const desktop = useDesktopBridge();
  useQuery({
    queryKey: ["desktop", "active-app"],
    queryFn: () => desktop.screen.getActiveApp(),
  });

  return (
    <WorkspaceFrame>
      <div className="flex-1 px-[clamp(16px,7vw,100px)] py-[clamp(20px,4vw,44px)]">
        <div className="flex flex-col gap-[clamp(24px,4vw,44px)]">
          <div className="flex flex-col gap-[clamp(14px,2vw,18px)]">
            <DashboardHeader
              greeting={dashboardSnapshot.greeting}
              subheading={dashboardSnapshot.subheading}
            />
            <MetricGrid metrics={dashboardSnapshot.metrics} />
          </div>

          <ActivityTimelineChart points={dashboardSnapshot.chart} />

          <div className="overflow-hidden rounded-[10px] bg-[#f5f5f5] p-[2px]">
            <div className="grid grid-cols-1 gap-[2px] xl:grid-cols-2">
              <UpcomingTasksCard tasks={dashboardSnapshot.upcomingTasks} />
              <RecentActivityCard entries={dashboardSnapshot.recentActivity} />
              <ProjectPipelineCard stages={dashboardSnapshot.pipeline} />
              <RevenueOverviewCard revenue={dashboardSnapshot.revenue} />
            </div>
          </div>
        </div>
      </div>
    </WorkspaceFrame>
  );
}
