import { useState } from "react";
import { useQuery as useConvexQuery } from "convex/react";
import { Helmet } from "react-helmet-async";
import { Link } from "@tanstack/react-router";
import { Plus } from "@phosphor-icons/react";
import { motion } from "motion/react";
import { DashboardEmptyState } from "@/components/dashboard/DashboardEmptyState";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { DashboardTimelineSelector } from "@/components/dashboard/DashboardTimelineSelector";
import { PaymentsCard } from "@/components/dashboard/PaymentsCard";
import { ProjectDock } from "@/components/dashboard/ProjectDock";
import { RecentActivityCard } from "@/components/dashboard/RecentActivityCard";
import { Timeline, type TimelineHorizon } from "@/components/dashboard/Timeline";
import { UpcomingTasksCard } from "@/components/dashboard/UpcomingTasksCard";
import type { DashboardTaskEntry } from "@/components/dashboard/dashboardTypes";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/convex";
import { getGreeting } from "@/lib/utils";
import type { Project } from "@/types";

export function DashboardPage() {
  const [timelineHorizon, setTimelineHorizon] = useState<TimelineHorizon>("thisMonth");
  const { user } = useAuth();
  const dashboardData = useConvexQuery(api.dashboard.getOverview, {});
  const isLoading = dashboardData === undefined;
  const projects = dashboardData?.projects ?? [];
  const greetingName = user?.name?.split(" ")[0] ?? "there";
  const greeting = getGreeting(greetingName);

  const taskEntries = buildTaskEntries(projects);
  const activeProjects = projects.filter((project) => project.status === "active").length;
  const tasksDue = taskEntries.filter((entry) => !entry.task.isCompleted).length;
  const completed = taskEntries.filter((entry) => entry.task.isCompleted).length;
  const avgProgress =
    taskEntries.length > 0 ? Math.round((completed / taskEntries.length) * 100) : 0;
  const upcomingTasks = taskEntries
    .filter((entry) => !entry.task.isCompleted)
    .sort((a, b) => a.task.createdAt - b.task.createdAt)
    .slice(0, 3);
  const recentActivity = [...taskEntries]
    .sort((a, b) => b.task.updatedAt - a.task.updatedAt)
    .slice(0, 3);
  const dockProjects = projects.slice(0, 6);

  return (
    <>
      <Helmet>
        <title>Dashboard — Stage</title>
      </Helmet>

      <div className="min-h-[calc(100vh-64px)]">
        <div className="mx-auto max-w-[1200px] px-6 pt-3 sm:px-10 lg:px-14">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="min-w-[320px]"
          >
            <h1 className="font-heading text-[20px] leading-[1.2] font-medium tracking-[-0.2px] text-text-primary">
              {greeting}
            </h1>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <DashboardTimelineSelector
                value={timelineHorizon}
                onChange={setTimelineHorizon}
              />

              <Link to="/new-project" className="shrink-0">
                <Button className="h-[34px] rounded-[7px] px-3 text-[13px]">
                  <Plus size={11} weight="bold" aria-hidden="true" />
                  New Project
                </Button>
              </Link>
            </div>

            <DashboardStats
              activeProjects={activeProjects}
              tasksDue={tasksDue}
              completed={completed}
              avgProgress={avgProgress}
            />
          </motion.div>
        </div>

        {isLoading ? (
          <div className="relative left-1/2 mt-0 w-screen -translate-x-1/2">
            <div className="mx-auto h-[360px] max-w-[1400px] animate-pulse rounded-[28px] border border-border-subtle bg-white/70" />
          </div>
        ) : projects.length > 0 ? (
          <div className="relative left-1/2 mt-0 w-screen -translate-x-1/2">
            <Timeline projects={projects} horizon={timelineHorizon} />
          </div>
        ) : (
          <div className="mx-auto mt-6 max-w-[1200px] px-6 sm:mt-8 sm:px-10 lg:px-14">
            <DashboardEmptyState />
          </div>
        )}

        {projects.length > 0 ? (
          <div className="mx-auto max-w-[1200px] px-6 pb-[120px] sm:px-10 lg:px-14">
            <div className="mt-8 space-y-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <UpcomingTasksCard tasks={upcomingTasks} />
                <RecentActivityCard entries={recentActivity} />
              </div>

              <PaymentsCard
                paymentSummary={dashboardData?.paymentSummary ?? null}
              />
            </div>
          </div>
        ) : null}

        <ProjectDock projects={dockProjects} />
      </div>
    </>
  );
}

function buildTaskEntries(projects: Project[]): DashboardTaskEntry[] {
  return projects.flatMap((project) =>
    project.phases.flatMap((phase) =>
      phase.tasks.map((task) => ({
        task,
        phase,
        project,
      })),
    ),
  );
}
