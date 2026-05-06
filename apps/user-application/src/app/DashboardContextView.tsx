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
import { useEngineStatus } from "../hooks/useEngineStatus";
import { selectedProjectContext } from "../project-context";
import { WorkspaceFrame } from "./WorkspaceFrame";

export function DashboardContextView() {
  const desktop = useDesktopBridge();
  const engineStatus = useEngineStatus();
  const openContextTasks = selectedProjectContext.tasks.filter(
    (task) => task.status !== "done",
  ).length;
  const currentPhaseLabel = selectedProjectContext.currentPhase ?? "active work";
  const dashboardSubheading = `${selectedProjectContext.projectName} is in ${currentPhaseLabel} with ${openContextTasks} open decisions ready for review.`;
  const engineState = engineStatus.data?.state ?? "starting";
  const engineStatusLabel =
    engineState === "ready"
      ? "Engine ready"
      : engineState === "failed"
        ? "Engine offline"
        : engineState === "starting"
          ? "Engine starting"
          : "Engine paused";
  const engineStatusTone =
    engineState === "ready" ? "ready" : engineState === "failed" ? "warning" : "neutral";

  useQuery({
    queryKey: ["desktop", "active-app"],
    queryFn: () => desktop.screen.getActiveApp(),
  });

  return (
    <WorkspaceFrame>
      <div className="flex-1 px-[100px] py-[44px]">
        <div className="flex flex-col gap-[44px]">
          <div className="flex flex-col gap-[18px]">
            <DashboardHeader
              engineStatusLabel={engineStatusLabel}
              engineStatusTone={engineStatusTone}
              greeting={dashboardSnapshot.greeting}
              subheading={dashboardSubheading}
            />
            <MetricGrid metrics={dashboardSnapshot.metrics} />
          </div>

          <ActivityTimelineChart points={dashboardSnapshot.chart} />

          <div className="overflow-hidden rounded-[10px] bg-[#f5f5f5] p-[2px]">
            <div className="grid grid-cols-1 gap-[2px] lg:grid-cols-2">
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
