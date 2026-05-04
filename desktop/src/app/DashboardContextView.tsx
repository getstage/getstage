import { useQuery } from "@tanstack/react-query";
import { ActivityTimelineChart } from "../dashboard/components/ActivityTimelineChart";
import { DashboardHeader } from "../dashboard/components/DashboardHeader";
import { MetricGrid } from "../dashboard/components/MetricGrid";
import { RecentActivityCard } from "../dashboard/components/RecentActivityCard";
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
      <div className="flex-1 p-[44px]">
        <div className="flex flex-col gap-[44px]">
          <div className="flex flex-col gap-[18px]">
            <DashboardHeader
              greeting={dashboardSnapshot.greeting}
              subheading={dashboardSnapshot.subheading}
            />
            <MetricGrid metrics={dashboardSnapshot.metrics} />
          </div>

          <ActivityTimelineChart points={dashboardSnapshot.chart} />

          <div className="flex flex-col gap-[8px]">
            <div className="flex flex-col gap-[8px] sm:flex-row">
              <UpcomingTasksCard tasks={dashboardSnapshot.upcomingTasks} />
              <RecentActivityCard entries={dashboardSnapshot.recentActivity} />
            </div>
          </div>
        </div>
      </div>
    </WorkspaceFrame>
  );
}
