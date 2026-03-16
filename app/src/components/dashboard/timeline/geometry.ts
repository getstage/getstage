import {
  DAY_MS,
  KERNEL,
  MARKER_EDGE_INSET,
  MARKER_SIZE,
  MAX_ELEVATION,
  SAMPLES,
} from "@/components/dashboard/timeline/constants";
import type {
  CurveSample,
  MarkerGroup,
  PositionedProject,
  TimelineHorizon,
} from "@/components/dashboard/timeline/types";
import type { Project } from "@/types";

export function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function startOfDay(timestamp: number) {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function endOfDay(timestamp: number) {
  const date = new Date(timestamp);
  date.setHours(23, 59, 59, 999);
  return date.getTime();
}

function addDays(timestamp: number, days: number) {
  const date = new Date(timestamp);
  date.setDate(date.getDate() + days);
  return date.getTime();
}

function addMonths(timestamp: number, months: number) {
  const date = new Date(timestamp);
  date.setMonth(date.getMonth() + months);
  return date.getTime();
}

function startOfMonth(timestamp: number) {
  const date = new Date(timestamp);
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function endOfMonth(timestamp: number) {
  const date = new Date(timestamp);
  date.setMonth(date.getMonth() + 1, 0);
  date.setHours(23, 59, 59, 999);
  return date.getTime();
}

function startOfYear(timestamp: number) {
  const date = new Date(timestamp);
  date.setMonth(0, 1);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function endOfYear(timestamp: number) {
  const date = new Date(timestamp);
  date.setMonth(11, 31);
  date.setHours(23, 59, 59, 999);
  return date.getTime();
}

function startOfWeekMonday(timestamp: number) {
  const date = new Date(startOfDay(timestamp));
  const day = date.getDay();
  const offset = (day + 6) % 7;
  date.setDate(date.getDate() - offset);
  return date.getTime();
}

export function dateToPercent(dateTimestamp: number, startTimestamp: number, endTimestamp: number) {
  const range = Math.max(endTimestamp - startTimestamp, DAY_MS);
  return clamp(((dateTimestamp - startTimestamp) / range) * 100, 0, 100);
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function countToHeight(count: number) {
  const levels: Array<[number, number]> = [
    [0, 0],
    [1, 0.2],
    [2, 0.45],
    [3, 0.65],
    [4, 0.8],
  ];

  if (count <= 0) {
    return 0;
  }

  if (count >= 4) {
    return levels[levels.length - 1]![1] * MAX_ELEVATION;
  }

  for (let index = 0; index < levels.length - 1; index += 1) {
    const start = levels[index];
    const end = levels[index + 1];
    if (!start || !end) {
      continue;
    }

    if (count <= end[0]) {
      const progress = (count - start[0]) / (end[0] - start[0]);
      return (start[1] + progress * (end[1] - start[1])) * MAX_ELEVATION;
    }
  }

  return levels[levels.length - 1]![1] * MAX_ELEVATION;
}

function activityAt(
  frac: number,
  startTimestamp: number,
  rangeMs: number,
  projects: Project[],
) {
  const time = startTimestamp + frac * rangeMs;
  const kernelMs = KERNEL * rangeMs;

  let count = 0;
  for (const project of projects) {
    count +=
      smoothstep(project.startDate - kernelMs, project.startDate + kernelMs, time) *
      (1 - smoothstep(project.endDate - kernelMs, project.endDate + kernelMs, time));
  }

  return count;
}

export function generateCurve(startTimestamp: number, endTimestamp: number, projects: Project[]) {
  const rangeMs = Math.max(endTimestamp - startTimestamp, DAY_MS);
  const points: CurveSample[] = [];

  for (let index = 0; index <= SAMPLES; index += 1) {
    const frac = index / SAMPLES;
    const activity = activityAt(frac, startTimestamp, rangeMs, projects);
    points.push({ frac, h: countToHeight(activity) });
  }

  return points;
}

export function curveYAt(frac: number, points: CurveSample[]) {
  if (points.length === 0) {
    return 0;
  }

  const indexFloat = clamp(frac, 0, 1) * SAMPLES;
  const index = Math.min(Math.floor(indexFloat), SAMPLES - 1);
  const mix = indexFloat - index;
  const first = points[index]?.h ?? 0;
  const second = points[Math.min(index + 1, SAMPLES)]?.h ?? first;

  return first + (second - first) * mix;
}

export function pointsToPath(points: CurveSample[], width: number) {
  if (points.length === 0) {
    return "";
  }

  const coordinates = points.map((point) => ({
    x: point.frac * width,
    y: 160 - point.h,
  }));

  let path = `M ${coordinates[0]!.x.toFixed(1)} ${coordinates[0]!.y.toFixed(1)}`;

  for (let index = 0; index < coordinates.length - 1; index += 1) {
    const p0 = coordinates[Math.max(0, index - 1)]!;
    const p1 = coordinates[index]!;
    const p2 = coordinates[index + 1]!;
    const p3 = coordinates[Math.min(coordinates.length - 1, index + 2)]!;

    path += ` C ${(p1.x + (p2.x - p0.x) / 6).toFixed(1)} ${(p1.y + (p2.y - p0.y) / 6).toFixed(1)}, ${(p2.x - (p3.x - p1.x) / 6).toFixed(1)} ${(p2.y - (p3.y - p1.y) / 6).toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }

  return path;
}

export function getViewRange(projects: Project[], horizon: TimelineHorizon, nowTimestamp: number) {
  const today = startOfDay(nowTimestamp);

  switch (horizon) {
    case "today":
      return { start: today, end: endOfDay(today) };
    case "yesterday": {
      const yesterday = addDays(today, -1);
      return { start: yesterday, end: endOfDay(yesterday) };
    }
    case "thisWeek": {
      const weekStart = startOfWeekMonday(today);
      const weekEnd = endOfDay(addDays(weekStart, 6));
      return { start: weekStart, end: weekEnd };
    }
    case "thisMonth":
      return { start: startOfMonth(today), end: endOfMonth(today) };
    case "thisYear":
      return { start: startOfYear(today), end: endOfYear(today) };
    case "30d":
      return { start: addDays(today, -15), end: endOfDay(addDays(today, 14)) };
    case "6m":
      return {
        start: startOfDay(addMonths(today, -3)),
        end: endOfDay(addMonths(today, 3)),
      };
    case "12m":
      return {
        start: startOfDay(addMonths(today, -6)),
        end: endOfDay(addMonths(today, 6)),
      };
    case "all":
    default:
      if (projects.length === 0) {
        return {
          start: addDays(today, -30),
          end: endOfDay(addDays(today, 30)),
        };
      }

      return {
        start: startOfDay(Math.min(...projects.map((project) => project.startDate)) - 90 * DAY_MS),
        end: endOfDay(Math.max(...projects.map((project) => project.endDate)) + 90 * DAY_MS),
      };
  }
}

export function getGroupingThreshold(horizon: TimelineHorizon, width: number) {
  const minPctDistance = ((MARKER_SIZE + 6) / Math.max(width, 1)) * 100;
  if (horizon === "thisYear" || horizon === "12m" || horizon === "all") {
    return Math.max(1.5, minPctDistance);
  }
  if (horizon === "thisWeek" || horizon === "today" || horizon === "yesterday") {
    return Math.max(8, minPctDistance);
  }
  return Math.max(2, minPctDistance);
}

export function groupProjects(
  positioned: PositionedProject[],
  threshold: number,
  curve: CurveSample[],
): MarkerGroup[] {
  const used = new Set<number>();
  const groups: MarkerGroup[] = [];

  for (let index = 0; index < positioned.length; index += 1) {
    if (used.has(index)) {
      continue;
    }

    const base = positioned[index];
    if (!base) {
      continue;
    }

    const group: PositionedProject[] = [base];
    used.add(index);

    for (let inner = index + 1; inner < positioned.length; inner += 1) {
      if (used.has(inner)) {
        continue;
      }

      const candidate = positioned[inner];
      if (!candidate) {
        continue;
      }

      if (Math.abs(candidate.pct - base.pct) <= threshold) {
        group.push(candidate);
        used.add(inner);
      }
    }

    const avgPct =
      group.reduce((total, item) => total + item.pct, 0) / Math.max(group.length, 1);
    const curveTop = 160 - curveYAt(avgPct / 100, curve);

    groups.push({
      key: group.map((item) => item.project.id).join("-"),
      pct: avgPct,
      curveTop,
      items: group,
    });
  }

  return groups;
}

export function getMarkerEdgeInset(width: number) {
  return Math.min(MARKER_EDGE_INSET, Math.max(0, width / 2 - 1));
}
