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
import type { DashboardPeriod } from "../components/DashboardHeader";

const DAY_MS = 24 * 60 * 60 * 1000;
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
    day: "numeric",
    month: "short",
  }).format(timestamp).toUpperCase();
}

function startOfDay(timestamp: number) {
  return new Date(timestamp).setHours(0, 0, 0, 0);
}

function addDays(timestamp: number, days: number) {
  return startOfDay(timestamp) + days * DAY_MS;
}

function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, date.getDate()).getTime();
}

function getChartWindow(period: DashboardPeriod, now = Date.now()) {
  const date = new Date(now);
  const today = startOfDay(now);

  switch (period) {
    case "Today":
      return { start: today, end: addDays(today, 1), mode: "day" as const };
    case "Yesterday":
      return { start: addDays(today, -1), end: today, mode: "day" as const };
    case "This week": {
      const day = date.getDay();
      const mondayOffset = day === 0 ? -6 : 1 - day;
      const start = addDays(today, mondayOffset);
      return { start, end: addDays(start, 7), mode: "week" as const };
    }
    case "This month":
      return {
        start: new Date(date.getFullYear(), date.getMonth(), 1).getTime(),
        end: new Date(date.getFullYear(), date.getMonth() + 1, 1).getTime(),
        mode: "month" as const,
      };
    case "This year":
      return {
        start: new Date(date.getFullYear(), 0, 1).getTime(),
        end: new Date(date.getFullYear() + 1, 0, 1).getTime(),
        mode: "year" as const,
      };
    case "30 days":
      return { start: today, end: addDays(today, 30), mode: "rolling" as const };
    case "6 months":
      return { start: today, end: addMonths(date, 6), mode: "rolling" as const };
    case "12 months":
      return { start: today, end: addMonths(date, 12), mode: "rolling" as const };
    case "All time":
      return { start: addDays(today, -30), end: addDays(today, 1), mode: "all-time" as const };
  }
}

function shouldShowChartLabel(index: number, total: number, timestamp: number, period: DashboardPeriod, isToday: boolean) {
  if (index === 0 || index === total - 1 || isToday) return true;
  const date = new Date(timestamp);

  if (period === "This year" || period === "6 months" || period === "12 months" || period === "All time") {
    return date.getDate() === 1;
  }

  if (period === "This month" || period === "30 days") {
    return index % 7 === 0;
  }

  return true;
}

function getTaskTimestamp(task: ProjectContextTask, fallback: number) {
  return (task as ProjectContextTask & { dueDate?: number }).dueDate ?? task.updatedAt ?? fallback;
}

function toDashboardTask(context: ProjectContext, task: ProjectContextTask): DashboardTask {
  return {
    id: task.id,
    title: task.title,
    projectName: context.projectName,
    dueDate: (task as ProjectContextTask & { dueDate?: number }).dueDate,
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
      phaseName: context.currentPhase,
      startDate: context.updatedAt,
      endDate: context.updatedAt,
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
    clientName: project.clientName,
    phaseName: project.type
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" "),
    startDate: project.startDate,
    endDate: project.endDate,
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

export function buildDashboardChart(
  context: ProjectContext | null,
  period: DashboardPeriod = "This month",
): DashboardChartPoint[] {
  const now = Date.now();
  const today = startOfDay(now);
  const window = getChartWindow(period, now);
  const pointCount = Math.max(1, Math.ceil((window.end - window.start) / DAY_MS));
  const points = Array.from({ length: pointCount }, (_, index) => {
    const timestamp = addDays(window.start, index);
    const isToday = timestamp === today;
    return {
      dayStart: timestamp,
      label: formatChartLabel(timestamp),
      value: 0,
      timestamp,
      isToday,
      showLabel: shouldShowChartLabel(index, pointCount, timestamp, period, isToday),
    };
  });

  if (!context) {
    return points.map(({ label, value, timestamp, isToday, showLabel }) => ({ label, value, timestamp, isToday, showLabel }));
  }

  for (const task of context.tasks) {
    const timestamp = getTaskTimestamp(task, context.updatedAt);
    const dayStart = new Date(timestamp).setHours(0, 0, 0, 0);
    const point = points.find((candidate) => candidate.dayStart === dayStart);

    if (point) {
      point.value += 1;
    }
  }

  return points.map(({ label, value, timestamp, isToday, showLabel }) => ({ label, value, timestamp, isToday, showLabel }));
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
