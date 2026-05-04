import { useQuery } from "@tanstack/react-query";
import { ActivityTimelineChart } from "../dashboard/components/ActivityTimelineChart";
import { DashboardHeader } from "../dashboard/components/DashboardHeader";
import { MetricGrid } from "../dashboard/components/MetricGrid";
import { RecentActivityCard } from "../dashboard/components/RecentActivityCard";
import { StageSidebar } from "../dashboard/components/StageSidebar";
import { UpcomingTasksCard } from "../dashboard/components/UpcomingTasksCard";
import { dashboardSnapshot } from "../dashboard/data/dashboardSnapshot";
import { useDesktopBridge } from "../hooks/useDesktopBridge";

export function DashboardContextView() {
  const desktop = useDesktopBridge();
  useQuery({
    queryKey: ["desktop", "active-app"],
    queryFn: () => desktop.screen.getActiveApp(),
  });

  return (
    <div className="flex h-screen bg-[#f5f5f5] p-[4px]">
      <div className="flex flex-1 overflow-hidden rounded-[8px] border border-[#f5f5f5] bg-white">
        {/* Sidebar */}
        <StageSidebar projects={dashboardSnapshot.projects} />

        {/* Main content */}
        <div className="flex flex-1 flex-col overflow-y-auto">
          <div className="flex-1 p-[44px]">
            <div className="flex flex-col gap-[44px]">
              {/* Header + Stats */}
              <div className="flex flex-col gap-[18px]">
                <DashboardHeader
                  greeting={dashboardSnapshot.greeting}
                  subheading={dashboardSnapshot.subheading}
                />
                <MetricGrid metrics={dashboardSnapshot.metrics} />
              </div>

              {/* Timeline chart */}
              <ActivityTimelineChart points={dashboardSnapshot.chart} />

              {/* Dashboard cards */}
              <div className="flex flex-col gap-[8px]">
                <div className="flex flex-col gap-[8px] sm:flex-row">
                  <UpcomingTasksCard tasks={dashboardSnapshot.upcomingTasks} />
                  <RecentActivityCard entries={dashboardSnapshot.recentActivity} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
