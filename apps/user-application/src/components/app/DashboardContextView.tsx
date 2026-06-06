import { useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ActivityTimelineChart } from "@/components/dashboard/ActivityTimelineChart";
import { DashboardHeader, type DashboardPeriod } from "@/components/dashboard/DashboardHeader";
import { MetricGrid } from "@/components/dashboard/MetricGrid";
import { ProjectPipelineCard } from "@/components/dashboard/ProjectPipelineCard";
import { RecentActivityCard } from "@/components/dashboard/RecentActivityCard";
import { RevenueOverviewCard } from "@/components/dashboard/RevenueOverviewCard";
import { UpcomingTasksCard } from "@/components/dashboard/UpcomingTasksCard";
import {
  buildDashboardChart,
  buildDashboardMetricsFromSummaries,
  buildDashboardPipelineFromSummaries,
  buildDashboardRevenue,
  buildDashboardTasks,
  buildSidebarProjectsFromSummaries,
} from "@/lib/dashboard/projectContextDashboard";
import { useProjectsQuery } from "@/hooks/convex-data";

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
  const navigate = useNavigate();
  const projectsQuery = useProjectsQuery();
  const [selectedPeriod, setSelectedPeriod] = useState<DashboardPeriod>(DEFAULT_DASHBOARD_PERIOD);
  const projects = projectsQuery.data ?? [];
  const selectedProjectSummary = projects.find((project) => project.status === "active") ?? projects[0] ?? null;
  const activeProjectCount = (projectsQuery.data ?? []).filter(
    (project) => project.status === "active",
  ).length;
  const dashboardSubheading = projectsQuery.isLoading
      ? "Loading live project data."
      : selectedProjectSummary
        ? `${selectedProjectSummary.name} is ${selectedProjectSummary.progress}% complete. Open the project for tasks, artifacts, and decisions.`
      : activeProjectCount > 0
        ? `You have ${activeProjectCount} active ${activeProjectCount === 1 ? "project" : "projects"}. Open one to load live context.`
        : "Connect Stage to load live project data.";
  const dashboardMetrics = buildDashboardMetricsFromSummaries(projects);
  const dashboardChart = buildDashboardChart(null, selectedPeriod);
  const dashboardTasks = buildDashboardTasks(null);
  const projectImageByName = useMemo(
    () =>
      new Map(
        projects.map((project) => [
          project.name,
          project.projectImageUrl,
        ]),
      ),
    [projects],
  );
  const periodDashboardTasks = useMemo(() => ({
    upcomingTasks: dashboardTasks.upcomingTasks
      .filter((task) => isInPeriod(task.dueDate ?? task.updatedAt, selectedPeriod))
      .map((task) => ({
        ...task,
        projectImageUrl: task.projectImageUrl ?? projectImageByName.get(task.projectName),
      })),
    recentActivity: dashboardTasks.recentActivity
      .filter((task) => isInPeriod(task.updatedAt, selectedPeriod))
      .map((task) => ({
        ...task,
        projectImageUrl: task.projectImageUrl ?? projectImageByName.get(task.projectName),
      })),
  }), [dashboardTasks.recentActivity, dashboardTasks.upcomingTasks, projectImageByName, selectedPeriod]);
  const dashboardPipeline = buildDashboardPipelineFromSummaries(projects);
  const dashboardRevenue = buildDashboardRevenue(null);
  const timelineProjects = buildSidebarProjectsFromSummaries(projects);
  const hasNoProjects =
    !projectsQuery.isLoading &&
    !projectsQuery.error &&
    (projectsQuery.data?.length ?? 0) === 0;
  return (
    <div className="flex-1 px-[clamp(16px,7vw,100px)] py-[clamp(20px,4vw,44px)]">
      <div className="flex flex-col gap-[clamp(24px,4vw,44px)]">
        <div className="flex flex-col gap-[clamp(14px,2vw,18px)]">
          <DashboardHeader
            greeting="Good Morning."
            subheading={dashboardSubheading}
            selectedPeriod={selectedPeriod}
            onPeriodChange={setSelectedPeriod}
          />
          <MetricGrid metrics={dashboardMetrics} />
        </div>
        {hasNoProjects ? (
          <DashboardEmptyProjectsCta
            onCreateProject={() => void navigate({ to: "/projects/create" })}
          />
        ) : (
          <ActivityTimelineChart
            points={dashboardChart}
            projects={timelineProjects}
            tasks={[...periodDashboardTasks.upcomingTasks, ...periodDashboardTasks.recentActivity]}
            period={selectedPeriod}
          />
        )}

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
  );
}

function DashboardEmptyProjectsCta({
  onCreateProject,
}: {
  onCreateProject: () => void;
}) {
  return (
    <section className="flex min-h-[394px] min-w-[360px] items-center justify-center rounded-[12px] bg-[#f5f5f5] p-[4px] shadow-[0px_0.45px_0.5px_rgba(10,10,10,0.25)]">
      <div className="flex min-h-[386px] w-full flex-col items-center justify-center rounded-[8px] bg-white px-[24px] py-[44px] text-center shadow-[0px_0.45px_0.5px_rgba(10,10,10,0.25)]">
        <div className="flex h-[44px] w-[44px] items-center justify-center rounded-[8px] bg-[#f5f5f5] shadow-[0px_0.45px_1px_rgba(10,10,10,0.25)]">
          <img
            src="/logos/dashboard/projects.svg"
            alt=""
            aria-hidden="true"
            className="h-[20px] w-[20px]"
          />
        </div>

        <div className="mt-[18px] flex max-w-[360px] flex-col items-center gap-[8px]">
          <h2 className="text-[18px] font-semibold leading-[1.2] text-[#0a0a0a]">
            Create your first project
          </h2>
          <p className="text-[13px] font-medium leading-[1.5] text-[#737373]">
            Set up a project to start tracking tasks, activity, and progress from your dashboard.
          </p>
        </div>

        <button
          type="button"
          onClick={onCreateProject}
          className="mt-[24px] inline-flex h-[35px] cursor-pointer items-center justify-center gap-[6px] rounded-[6px] border border-[rgba(158,153,248,0.75)] bg-gradient-to-b from-[#7b76df] to-[#463fba] py-[8px] pl-[10px] pr-[12px] text-[13px] font-medium leading-[1.25] text-[#fafafa] shadow-[0px_0.45px_0.5px_rgba(10,10,10,0.25)] transition-opacity hover:opacity-95"
        >
          <img
            src="/logos/dashboard/plus.svg"
            alt=""
            aria-hidden="true"
            className="h-[14px] w-[14px] brightness-0 invert"
          />
          <span className="whitespace-nowrap [text-shadow:0px_0.5px_1.5px_rgba(0,0,0,0.15)]">
            Create Project
          </span>
        </button>
      </div>
    </section>
  );
}
