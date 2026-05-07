import { useQuery } from "@tanstack/react-query";
import { ActivityTimelineChart } from "../dashboard/components/ActivityTimelineChart";
import { DashboardHeader } from "../dashboard/components/DashboardHeader";
import { MetricGrid } from "../dashboard/components/MetricGrid";
import { ProjectPipelineCard } from "../dashboard/components/ProjectPipelineCard";
import { RecentActivityCard } from "../dashboard/components/RecentActivityCard";
import { RevenueOverviewCard } from "../dashboard/components/RevenueOverviewCard";
import { UpcomingTasksCard } from "../dashboard/components/UpcomingTasksCard";
import {
  buildDashboardChart,
  buildDashboardMetrics,
  buildDashboardPipeline,
  buildDashboardRevenue,
  buildDashboardTasks,
  buildSidebarProjectsFromProjectContext,
} from "../dashboard/helpers/projectContextDashboard";
import { useDesktopBridge } from "../hooks/useDesktopBridge";
import { useEngineStatus } from "../hooks/useEngineStatus";
import { useSelectedProjectContext } from "../hooks/useSelectedProjectContext";
import { WorkspaceFrame } from "./WorkspaceFrame";

export function DashboardContextView() {
  const desktop = useDesktopBridge();
  const engineStatus = useEngineStatus();
  const selectedProject = useSelectedProjectContext();
  const selectedProjectContext = selectedProject.isFallback ? null : selectedProject.context;
  const openContextTasks = selectedProjectContext?.tasks.filter(
    (task) => task.status !== "done",
  ).length ?? 0;
  const currentPhaseLabel = selectedProjectContext?.currentPhase ?? "active work";
  const dashboardSubheading = selectedProjectContext
    ? `${selectedProjectContext.projectName} is in ${currentPhaseLabel} with ${openContextTasks} open decisions ready for review.`
    : selectedProject.isLoading
      ? "Loading live project data."
      : "Connect Stage to load live project data.";
  const dashboardMetrics = buildDashboardMetrics(selectedProjectContext);
  const dashboardChart = buildDashboardChart(selectedProjectContext);
  const dashboardTasks = buildDashboardTasks(selectedProjectContext);
  const dashboardPipeline = buildDashboardPipeline(selectedProjectContext);
  const dashboardRevenue = buildDashboardRevenue(selectedProjectContext);
  const timelineProject = buildSidebarProjectsFromProjectContext(selectedProjectContext)[0];
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
      <div className="flex-1 px-[clamp(16px,7vw,100px)] py-[clamp(20px,4vw,44px)]">
        <div className="flex flex-col gap-[clamp(24px,4vw,44px)]">
          <div className="flex flex-col gap-[clamp(14px,2vw,18px)]">
            <DashboardHeader
              engineStatusLabel={engineStatusLabel}
              engineStatusTone={engineStatusTone}
              greeting="Good Morning."
              subheading={dashboardSubheading}
            />
            <MetricGrid metrics={dashboardMetrics} />
          </div>

          <ActivityTimelineChart points={dashboardChart} project={timelineProject} />

          <div className="overflow-hidden rounded-[10px] bg-[#f5f5f5] p-[2px]">
            <div className="grid grid-cols-1 gap-[2px] xl:grid-cols-2">
              <UpcomingTasksCard tasks={dashboardTasks.upcomingTasks} />
              <RecentActivityCard entries={dashboardTasks.recentActivity} />
              <ProjectPipelineCard stages={dashboardPipeline} />
              <RevenueOverviewCard revenue={dashboardRevenue} />
            </div>
          </div>
        </div>
      </div>
    </WorkspaceFrame>
  );
}
