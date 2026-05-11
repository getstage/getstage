import { useQuery } from "@tanstack/react-query";
import { useMutation as useConvexMutation, useQuery as useConvexQuery } from "convex/react";
import { useEffect, useMemo, useState } from "react";
import { OnboardingModal, type OnboardingSubmission } from "../components/onboarding/OnboardingModal";
import { ActivityTimelineChart } from "../dashboard/components/ActivityTimelineChart";
import { DashboardHeader, type DashboardPeriod } from "../dashboard/components/DashboardHeader";
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
  buildSidebarProjectsFromSummaries,
} from "../dashboard/helpers/projectContextDashboard";
import { useProjectsQuery } from "../hooks/desktop-api";
import { useDesktopBridge } from "../hooks/useDesktopBridge";
import { useEngineStatus } from "../hooks/useEngineStatus";
import { useSelectedProjectContext } from "../hooks/useSelectedProjectContext";
import { useDesktopAuth } from "../lib/auth";
import { api } from "../lib/convexApi";
import { WorkspaceFrame } from "./WorkspaceFrame";

const DEFAULT_DASHBOARD_PERIOD: DashboardPeriod = "This month";

function getPeriodRange(period: DashboardPeriod, now = Date.now()) {
  const date = new Date(now);
  const startOfToday = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const dayMs = 24 * 60 * 60 * 1000;

  switch (period) {
    case "Today":
      return { start: startOfToday, end: startOfToday + dayMs };
    case "Yesterday":
      return { start: startOfToday - dayMs, end: startOfToday };
    case "This week": {
      const day = date.getDay();
      const mondayOffset = day === 0 ? -6 : 1 - day;
      const start = startOfToday + mondayOffset * dayMs;
      return { start, end: start + 7 * dayMs };
    }
    case "This month":
      return {
        start: new Date(date.getFullYear(), date.getMonth(), 1).getTime(),
        end: new Date(date.getFullYear(), date.getMonth() + 1, 1).getTime(),
      };
    case "This year":
      return {
        start: new Date(date.getFullYear(), 0, 1).getTime(),
        end: new Date(date.getFullYear() + 1, 0, 1).getTime(),
      };
    case "30 days":
      return { start: now - 30 * dayMs, end: now + dayMs };
    case "6 months":
      return { start: new Date(date.getFullYear(), date.getMonth() - 6, date.getDate()).getTime(), end: now + dayMs };
    case "12 months":
      return { start: new Date(date.getFullYear() - 1, date.getMonth(), date.getDate()).getTime(), end: now + dayMs };
    case "All time":
      return null;
  }
}

function isInPeriod(timestamp: number | undefined, period: DashboardPeriod) {
  if (!timestamp) return false;
  const range = getPeriodRange(period);
  return !range || (timestamp >= range.start && timestamp < range.end);
}

export function DashboardContextView() {
  const desktop = useDesktopBridge();
  const desktopAuth = useDesktopAuth();
  const engineStatus = useEngineStatus();
  const selectedProject = useSelectedProjectContext();
  const projectsQuery = useProjectsQuery();
  const [selectedPeriod, setSelectedPeriod] = useState<DashboardPeriod>(DEFAULT_DASHBOARD_PERIOD);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const onboardingState = useConvexQuery(
    api.onboarding.getState,
    desktopAuth.isAuthenticated ? {} : "skip",
  );
  const completeOnboarding = useConvexMutation(api.onboarding.completeOnboarding);
  const selectedProjectContext = selectedProject.isFallback ? null : selectedProject.context;
  const openContextTasks = selectedProjectContext?.tasks.filter(
    (task) => task.status !== "done",
  ).length ?? 0;
  const currentPhaseLabel = selectedProjectContext?.currentPhase ?? "active work";
  const activeProjectCount = (projectsQuery.data ?? []).filter(
    (project) => project.status === "active",
  ).length;
  const dashboardSubheading = selectedProjectContext
    ? `${selectedProjectContext.projectName} is in ${currentPhaseLabel} with ${openContextTasks} open decisions ready for review.`
    : selectedProject.isLoading || projectsQuery.isLoading
      ? "Loading live project data."
      : activeProjectCount > 0
        ? `You have ${activeProjectCount} active ${activeProjectCount === 1 ? "project" : "projects"}. Open one to load live context.`
        : "Connect Stage to load live project data.";
  const dashboardMetrics = buildDashboardMetrics(selectedProjectContext, {
    activeProjectCount,
  });
  const dashboardChart = buildDashboardChart(selectedProjectContext, selectedPeriod);
  const dashboardTasks = buildDashboardTasks(selectedProjectContext);
  const periodDashboardTasks = useMemo(() => ({
    upcomingTasks: dashboardTasks.upcomingTasks.filter((task) => isInPeriod(task.dueDate ?? task.updatedAt, selectedPeriod)),
    recentActivity: dashboardTasks.recentActivity.filter((task) => isInPeriod(task.updatedAt, selectedPeriod)),
  }), [dashboardTasks.recentActivity, dashboardTasks.upcomingTasks, selectedPeriod]);
  const dashboardPipeline = buildDashboardPipeline(selectedProjectContext);
  const dashboardRevenue = buildDashboardRevenue(selectedProjectContext);
  const timelineProjects = projectsQuery.data?.length
    ? buildSidebarProjectsFromSummaries(projectsQuery.data)
    : buildSidebarProjectsFromProjectContext(selectedProjectContext);
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

  const session = useQuery({
    queryKey: ["desktop", "auth", "session", "dashboard-onboarding"],
    queryFn: () => desktop.auth.getSession(),
    retry: false,
  });

  useEffect(() => {
    if (!desktopAuth.isAuthenticated) {
      setOnboardingOpen(false);
      return;
    }

    if (onboardingState === undefined) {
      return;
    }

    setOnboardingOpen(!onboardingState.isCompleted);
  }, [desktopAuth.isAuthenticated, onboardingState]);

  function handleOnboardingComplete(submission: OnboardingSubmission) {
    setOnboardingOpen(false);
    void completeOnboarding({
      workCategory: submission.fieldOfWork,
    }).catch((error) => {
      console.error("Could not persist desktop onboarding state", error);
    });
  }

  return (
    <>
      <WorkspaceFrame>
        <div className="flex-1 px-[clamp(16px,7vw,100px)] py-[clamp(20px,4vw,44px)]">
          <div className="flex flex-col gap-[clamp(24px,4vw,44px)]">
            <div className="flex flex-col gap-[clamp(14px,2vw,18px)]">
              <DashboardHeader
                engineStatusLabel={engineStatusLabel}
                engineStatusTone={engineStatusTone}
                greeting="Good Morning."
                subheading={dashboardSubheading}
                selectedPeriod={selectedPeriod}
                onPeriodChange={setSelectedPeriod}
              />
              <MetricGrid metrics={dashboardMetrics} />
            </div>

            <ActivityTimelineChart
              points={dashboardChart}
              projects={timelineProjects}
              tasks={[...periodDashboardTasks.upcomingTasks, ...periodDashboardTasks.recentActivity]}
              period={selectedPeriod}
            />

            <div className="overflow-hidden rounded-[10px] bg-[#f5f5f5] p-[2px]">
              <div className="grid grid-cols-1 gap-[2px] xl:grid-cols-2">
                <UpcomingTasksCard tasks={periodDashboardTasks.upcomingTasks} period={selectedPeriod} />
                <RecentActivityCard entries={periodDashboardTasks.recentActivity} period={selectedPeriod} />
                <ProjectPipelineCard stages={dashboardPipeline} period={selectedPeriod} />
                <RevenueOverviewCard revenue={dashboardRevenue} period={selectedPeriod} />
              </div>
            </div>
          </div>
        </div>
      </WorkspaceFrame>

      <OnboardingModal
        open={onboardingOpen}
        userName={session.data?.name?.split(" ")[0]}
        onComplete={handleOnboardingComplete}
      />
    </>
  );
}
