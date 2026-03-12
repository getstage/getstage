import { FREE_PLAN_PROJECT_LIMIT } from "@/lib/constants";
import type { DashboardTaskEntry } from "@/components/dashboard/dashboardTypes";
import type { Project } from "@/types";

export type PreviewStage = "onboarding" | "paywall" | "preview";

export function buildTaskEntries(projects: Project[]): DashboardTaskEntry[] {
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

export function buildDashboardMetrics(projects: Project[]) {
  const taskEntries = buildTaskEntries(projects);
  const activeProjects = projects.filter((project) => project.status === "active").length;
  const tasksDue = taskEntries.filter((entry) => !entry.task.isCompleted).length;
  const completed = taskEntries.filter((entry) => entry.task.isCompleted).length;
  const avgProgress =
    taskEntries.length > 0 ? Math.round((completed / taskEntries.length) * 100) : 0;

  return {
    taskEntries,
    activeProjects,
    tasksDue,
    completed,
    avgProgress,
    upcomingTasks: taskEntries
      .filter((entry) => !entry.task.isCompleted)
      .sort((a, b) => a.task.createdAt - b.task.createdAt)
      .slice(0, 3),
    recentActivity: [...taskEntries]
      .sort((a, b) => b.task.updatedAt - a.task.updatedAt)
      .slice(0, 3),
    dockProjects: projects.slice(0, 6),
  };
}

export function getPreviewFlags({
  isLoading,
  userPlan,
  onboardingCompleted,
  projectsLength,
  previewStage,
}: {
  isLoading: boolean;
  userPlan?: string;
  onboardingCompleted?: boolean;
  projectsLength: number;
  previewStage: PreviewStage;
}) {
  const previewFlowActive = !isLoading && userPlan !== "pro" && onboardingCompleted !== true;
  const previewEligible = previewFlowActive && projectsLength === 0;

  return {
    previewFlowActive,
    previewEligible,
    shouldShowPreviewExperience:
      previewFlowActive && (projectsLength === 0 || previewStage !== "preview"),
    hasReachedFreeProjectLimit:
      userPlan !== "pro" && projectsLength >= FREE_PLAN_PROJECT_LIMIT,
  };
}
