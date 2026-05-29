import type { DashboardProject, DashboardTask } from "../models/dashboard";

const PLOT_BASE_Y = 297;
const STEP_RADIUS = 6;
export const DAY_MS = 24 * 60 * 60 * 1000;
const AVATAR_SIZE = 24;
const AVATAR_BUBBLE_PADDING = 4;
const AVATAR_OVERLAP = 13;

export function getAvatarBubbleWidth(count: number) {
  if (count <= 0) return 0;
  return AVATAR_BUBBLE_PADDING * 2 + AVATAR_SIZE * count - AVATAR_OVERLAP * (count - 1);
}

export function buildRoundedSteppedAreaPath(
  bars: { x: number; width: number; height: number }[],
) {
  if (bars.length === 0) return "";

  const baseY = PLOT_BASE_Y;
  const first = bars[0];
  if (!first) return "";

  const firstTop = baseY - first.height;
  const commands = [`M ${first.x} ${baseY}`];
  let currentTop = firstTop;

  if (first.height > 0) {
    commands.push(`L ${first.x} ${firstTop + STEP_RADIUS}`);
    commands.push(`Q ${first.x} ${firstTop} ${first.x + STEP_RADIUS} ${firstTop}`);
  } else {
    commands.push(`L ${first.x} ${firstTop}`);
  }

  for (let index = 0; index < bars.length; index += 1) {
    const bar = bars[index];
    const nextBar = bars[index + 1];
    if (!bar) continue;

    const top = baseY - bar.height;
    const right = bar.x + bar.width;

    if (top !== currentTop) {
      commands.push(`L ${bar.x} ${currentTop}`);
      if (bar.height > 0) {
        commands.push(`L ${bar.x} ${top + STEP_RADIUS}`);
        commands.push(`Q ${bar.x} ${top} ${bar.x + STEP_RADIUS} ${top}`);
      } else {
        commands.push(`L ${bar.x} ${top}`);
      }
      currentTop = top;
    }

    if (nextBar) {
      const nextTop = baseY - nextBar.height;
      const radius = Math.min(
        STEP_RADIUS,
        bar.width / 2,
        Math.abs(nextTop - top) / 2 || STEP_RADIUS,
      );

      if (nextTop === top) {
        commands.push(`L ${right} ${top}`);
      } else {
        commands.push(`L ${right - radius} ${top}`);
        commands.push(`Q ${right} ${top} ${right} ${top + Math.sign(nextTop - top) * radius}`);
        commands.push(`L ${right} ${nextTop - Math.sign(nextTop - top) * radius}`);
        commands.push(`Q ${right} ${nextTop} ${right + radius} ${nextTop}`);
      }

      currentTop = nextTop;
    } else if (bar.height > 0) {
      commands.push(`L ${right - STEP_RADIUS} ${top}`);
      commands.push(`Q ${right} ${top} ${right} ${top + STEP_RADIUS}`);
    } else {
      commands.push(`L ${right} ${top}`);
    }
  }

  const last = bars[bars.length - 1];
  if (!last) return "";

  commands.push(`L ${last.x + last.width} ${baseY}`);
  commands.push("Z");
  return commands.join(" ");
}

export function isProjectActiveOnDay(project: DashboardProject, dayStart: number, dayEnd: number) {
  const projectStart = project.startDate ?? project.endDate;
  const projectEnd = project.endDate ?? project.startDate;
  if (!projectStart || !projectEnd) return false;

  const start = startOfDay(projectStart);
  const end = startOfDay(projectEnd) + DAY_MS;
  return start < dayEnd && end > dayStart;
}

export function startOfDay(timestamp: number) {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

export function formatProjectRange(project: DashboardProject) {
  if (!project.startDate || !project.endDate) return "Timeline";

  const start = new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
  }).format(project.startDate);
  const end = new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(project.endDate);

  return `${start} - ${end}`;
}

export function getProjectTasks(project: DashboardProject, tasks: DashboardTask[]) {
  const now = Date.now();
  return tasks
    .filter((task) => task.projectName === project.name && !task.isCompleted)
    .filter((task) => (task.dueDate ?? task.updatedAt) >= now)
    .sort((a, b) => (a.dueDate ?? a.updatedAt) - (b.dueDate ?? b.updatedAt))
    .slice(0, 3);
}
