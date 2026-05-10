import type {
  ProjectContext,
  ProjectContextTask,
  ProjectSummary,
} from "@stage/data-ops";
import type {
  DashboardChartPoint,
  DashboardMetric,
  DashboardPipelineStage,
  DashboardProject,
  DashboardRevenue,
  DashboardTask,
} from "../models/dashboard";

const DAY_MS = 24 * 60 * 60 * 1000;
const EMPTY_CHART_DAYS = 8;
const PRIMARY_ACCENT = "#8782F5";
const MUTED_ACCENT = "#d6d3d1";

function getInitials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "S";
}

function formatChartLabel(timestamp: number) {
  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "short",
  }).format(timestamp).toUpperCase();
}

function getTaskTimestamp(task: ProjectContextTask, fallback: number) {
  return task.updatedAt ?? fallback;
}

function toDashboardTask(context: ProjectContext, task: ProjectContextTask): DashboardTask {
  return {
    id: task.id,
    title: task.title,
    projectName: context.projectName,
    updatedAt: task.updatedAt ?? context.updatedAt,
    isCompleted: task.status === "done",
  };
}

export function buildSidebarProjectsFromProjectContext(
  context: ProjectContext | null,
): DashboardProject[] {
  if (!context) {
    return [];
  }

  return [
    {
      id: context.projectId,
      name: context.projectName,
      logoLabel: getInitials(context.projectName),
      accentColor: PRIMARY_ACCENT,
    },
  ];
}

export function buildSidebarProjectsFromSummaries(
  summaries: ProjectSummary[],
): DashboardProject[] {
  return summaries.map((project) => ({
    id: project.id,
    name: project.name,
    logoLabel: getInitials(project.name),
    accentColor: PRIMARY_ACCENT,
    projectImageUrl: project.projectImageUrl,
  }));
}

export function buildDashboardMetrics(
  context: ProjectContext | null,
  options?: { activeProjectCount?: number },
): DashboardMetric[] {
  const tasks = context?.tasks ?? [];
  const openTasks = tasks.filter((task) => task.status !== "done").length;
  const completedTasks = tasks.filter((task) => task.status === "done").length;
  const totalTasks = tasks.length;
  const progress = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);
  const activeProjectCount =
    options?.activeProjectCount ?? (context ? 1 : 0);

  return [
    {
      id: "active",
      icon: "/logos/dashboard/radio.svg",
      value: String(activeProjectCount),
      label: "Active Projects",
    },
    {
      id: "due",
      icon: "/logos/dashboard/bell.svg",
      value: String(openTasks),
      label: "Tasks Due",
    },
    {
      id: "done",
      icon: "/logos/dashboard/check.svg",
      value: String(completedTasks),
      label: "Completed",
    },
    {
      id: "process",
      icon: "/logos/dashboard/calculator.svg",
      value: `${progress}%`,
      label: "Avg. Process",
    },
  ];
}

export function buildDashboardChart(context: ProjectContext | null): DashboardChartPoint[] {
  const now = Date.now();
  const start = now - (EMPTY_CHART_DAYS - 1) * DAY_MS;
  const points = Array.from({ length: EMPTY_CHART_DAYS }, (_, index) => {
    const timestamp = start + index * DAY_MS;
    return {
      dayStart: new Date(timestamp).setHours(0, 0, 0, 0),
      label: formatChartLabel(timestamp),
      value: 0,
    };
  });

  if (!context) {
    return points.map(({ label, value }) => ({ label, value }));
  }

  for (const task of context.tasks) {
    const timestamp = getTaskTimestamp(task, context.updatedAt);
    const dayStart = new Date(timestamp).setHours(0, 0, 0, 0);
    const point = points.find((candidate) => candidate.dayStart === dayStart);

    if (point) {
      point.value += 1;
    }
  }

  return points.map(({ label, value }) => ({ label, value }));
}

export function buildDashboardTasks(context: ProjectContext | null) {
  const tasks = context?.tasks ?? [];
  const dashboardTasks = tasks.map((task) => toDashboardTask(context as ProjectContext, task));

  return {
    recentActivity: [...dashboardTasks]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 3),
    upcomingTasks: dashboardTasks
      .filter((task) => !task.isCompleted)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 3),
  };
}

export function buildDashboardPipeline(context: ProjectContext | null): DashboardPipelineStage[] {
  if (!context) {
    return [];
  }

  const phaseNames = Array.from(
    new Set(context.tasks.map((task) => task.phaseName).filter(Boolean)),
  ) as string[];
  const fallbackPhase = context.currentPhase ? [context.currentPhase] : [];

  return (phaseNames.length > 0 ? phaseNames : fallbackPhase).map((phaseName) => {
    const isCurrent = phaseName === context.currentPhase;

    return {
      id: phaseName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      label: phaseName,
      accentColor: isCurrent ? PRIMARY_ACCENT : MUTED_ACCENT,
      barColor: isCurrent
        ? "linear-gradient(90deg, #8782F5 0%, rgba(135, 130, 245, 0.72) 55%, #8782F5 100%)"
        : "linear-gradient(90deg, #d6d3d1 0%, rgba(214, 211, 209, 0.72) 55%, #d6d3d1 100%)",
    };
  });
}

export function buildDashboardRevenue(context: ProjectContext | null): DashboardRevenue {
  return {
    outstanding: context ? "Not synced" : "-",
    received: context ? "Not synced" : "-",
    note: context
      ? "Billing data is not included in this desktop project context yet."
      : "Connect Stage to load live project data.",
  };
}
