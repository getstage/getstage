import { FREE_PLAN_PROJECT_LIMIT } from "@/lib/constants";
import type { DashboardTaskEntry } from "@/components/dashboard/dashboardTypes";
import type { Phase, Project, Task } from "@/types";

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

function sortPhases(phases: Phase[]) {
  return [...phases].sort((a, b) => a.order - b.order);
}

function sortTasks(tasks: Task[]) {
  return [...tasks].sort((a, b) => a.order - b.order);
}

function toTaskEntries(project: Project, phase: Phase, tasks: Task[]) {
  return sortTasks(tasks)
    .filter((task) => !task.isCompleted)
    .map((task) => ({
      task,
      phase,
      project,
    }));
}

function getProjectTaskBuckets(project: Project) {
  const phases = sortPhases(project.phases);
  if (phases.length === 0) {
    return { immediate: [] as DashboardTaskEntry[], later: [] as DashboardTaskEntry[] };
  }

  let phaseIndex = phases.findIndex((phase) => phase.status === "active");
  if (phaseIndex === -1) {
    phaseIndex = phases.findIndex((phase) => phase.status === "upcoming");
  }
  if (phaseIndex === -1) {
    phaseIndex = phases.findIndex((phase) => phase.tasks.some((task) => !task.isCompleted));
  }
  if (phaseIndex === -1) {
    return { immediate: [] as DashboardTaskEntry[], later: [] as DashboardTaskEntry[] };
  }

  let currentIndex = phaseIndex;
  let immediate: DashboardTaskEntry[] = [];

  while (currentIndex < phases.length && immediate.length === 0) {
    const phase = phases[currentIndex];
    if (!phase) {
      break;
    }
    immediate = toTaskEntries(project, phase, phase.tasks);
    if (immediate.length === 0) {
      currentIndex += 1;
    }
  }

  if (immediate.length === 0) {
    return { immediate: [] as DashboardTaskEntry[], later: [] as DashboardTaskEntry[] };
  }

  const later = phases.slice(currentIndex + 1).flatMap((phase) => toTaskEntries(project, phase, phase.tasks));

  return { immediate, later };
}

function takeRoundRobin(queues: DashboardTaskEntry[][], limit: number) {
  const workingQueues = queues
    .map((queue) => [...queue])
    .filter((queue) => queue.length > 0);
  const selected: DashboardTaskEntry[] = [];

  while (selected.length < limit && workingQueues.some((queue) => queue.length > 0)) {
    for (const queue of workingQueues) {
      const next = queue.shift();
      if (!next) {
        continue;
      }
      selected.push(next);
      if (selected.length >= limit) {
        break;
      }
    }
  }

  return selected;
}

function buildUpcomingTasks(projects: Project[], limit = 3) {
  const now = Date.now();
  const runningProjects = projects
    .filter(
      (project) =>
        project.status === "active" &&
        project.startDate <= now &&
        project.endDate >= now,
    )
    .sort((a, b) => a.endDate - b.endDate || a.startDate - b.startDate || a.createdAt - b.createdAt);
  const queuedActiveProjects = projects
    .filter(
      (project) =>
        project.status === "active" &&
        (project.startDate > now || project.endDate < now),
    )
    .sort((a, b) => a.endDate - b.endDate || a.startDate - b.startDate || a.createdAt - b.createdAt);
  const standbyProjects = projects
    .filter((project) => project.status === "paused")
    .sort((a, b) => a.endDate - b.endDate || a.startDate - b.startDate || a.createdAt - b.createdAt);

  const runningBuckets = runningProjects.map(getProjectTaskBuckets);
  const queuedActiveBuckets = queuedActiveProjects.map(getProjectTaskBuckets);
  const standbyBuckets = standbyProjects.map(getProjectTaskBuckets);

  const upcoming = [
    ...takeRoundRobin(runningBuckets.map((bucket) => bucket.immediate), limit),
  ];

  if (upcoming.length < limit) {
    upcoming.push(
      ...takeRoundRobin(
        runningBuckets.map((bucket) => bucket.later),
        limit - upcoming.length,
      ),
    );
  }

  if (upcoming.length < limit) {
    upcoming.push(
      ...takeRoundRobin(
        queuedActiveBuckets.map((bucket) => bucket.immediate),
        limit - upcoming.length,
      ),
    );
  }

  if (upcoming.length < limit) {
    upcoming.push(
      ...takeRoundRobin(
        queuedActiveBuckets.map((bucket) => bucket.later),
        limit - upcoming.length,
      ),
    );
  }

  if (upcoming.length < limit) {
    upcoming.push(
      ...takeRoundRobin(
        standbyBuckets.map((bucket) => bucket.immediate),
        limit - upcoming.length,
      ),
    );
  }

  if (upcoming.length < limit) {
    upcoming.push(
      ...takeRoundRobin(
        standbyBuckets.map((bucket) => bucket.later),
        limit - upcoming.length,
      ),
    );
  }

  return upcoming.slice(0, limit);
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
    upcomingTasks: buildUpcomingTasks(projects),
    recentActivity: [...taskEntries]
      .sort((a, b) => b.task.updatedAt - a.task.updatedAt)
      .slice(0, 3),
    dockProjects: projects
      .filter((project) => project.status === "active" && project.endDate > Date.now())
      .slice(0, 6),
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
