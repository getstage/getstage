import {
  BAR_GAP,
  BAR_MAX_HEIGHT,
  DAY_MS,
  DATE_LABEL_FORMATTER,
  MARKER_EDGE_INSET,
  MARKER_SIZE,
} from "@/components/dashboard/timeline/constants";
import type {
  BarSegment,
  DateLabel,
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

function getBucketSize(horizon: TimelineHorizon): number {
  switch (horizon) {
    case "today":
    case "yesterday":
      return DAY_MS / 4;
    case "thisWeek":
      return DAY_MS;
    case "thisMonth":
    case "30d":
      return DAY_MS;
    case "thisYear":
    case "6m":
      return 7 * DAY_MS;
    case "12m":
    case "all":
      return 14 * DAY_MS;
  }
}

function countActiveProjects(projects: Project[], bucketStart: number, bucketEnd: number): number {
  let count = 0;
  for (const project of projects) {
    if (project.startDate <= bucketEnd && project.endDate >= bucketStart) {
      count += 1;
    }
  }
  return count;
}

export function generateBars({
  start,
  end,
  projects,
  width,
  horizon,
}: {
  start: number;
  end: number;
  projects: Project[];
  width: number;
  horizon: TimelineHorizon;
}): { bars: BarSegment[]; maxCount: number } {
  const bucketSize = getBucketSize(horizon);
  const rangeMs = Math.max(end - start, DAY_MS);
  const bars: BarSegment[] = [];
  let maxCount = 0;

  let cursor = start;
  while (cursor < end) {
    const bucketEnd = Math.min(cursor + bucketSize, end);
    const count = countActiveProjects(projects, cursor, bucketEnd);
    if (count > maxCount) {
      maxCount = count;
    }

    const startPct = (cursor - start) / rangeMs;
    const endPct = (bucketEnd - start) / rangeMs;
    const x = startPct * width + BAR_GAP / 2;
    const barWidth = Math.max((endPct - startPct) * width - BAR_GAP, 1);

    bars.push({
      bucketStart: cursor,
      bucketEnd,
      count,
      height: 0,
      x,
      width: barWidth,
    });

    cursor = bucketEnd;
  }

  const effectiveMax = Math.max(maxCount, 1);
  for (const bar of bars) {
    bar.height = bar.count > 0
      ? Math.max(BAR_MAX_HEIGHT * 0.08, (bar.count / effectiveMax) * BAR_MAX_HEIGHT)
      : 0;
  }

  return { bars, maxCount };
}

export function generateDateLabels({
  start,
  end,
  width,
  horizon,
}: {
  start: number;
  end: number;
  width: number;
  horizon: TimelineHorizon;
}): DateLabel[] {
  const rangeMs = Math.max(end - start, DAY_MS);
  const labels: DateLabel[] = [];

  let labelInterval: number;
  switch (horizon) {
    case "today":
    case "yesterday":
      labelInterval = DAY_MS / 4;
      break;
    case "thisWeek":
      labelInterval = DAY_MS;
      break;
    case "thisMonth":
    case "30d":
      labelInterval = 7 * DAY_MS;
      break;
    case "thisYear":
    case "6m":
      labelInterval = 30 * DAY_MS;
      break;
    case "12m":
    case "all":
      labelInterval = 60 * DAY_MS;
      break;
  }

  let cursor = start;
  while (cursor <= end) {
    const pct = (cursor - start) / rangeMs;
    const x = pct * width;
    labels.push({
      label: DATE_LABEL_FORMATTER.format(new Date(cursor)),
      x,
    });
    cursor += labelInterval;
  }

  return labels;
}

export function barTopAt(pct: number, bars: BarSegment[], width: number): number {
  if (bars.length === 0) return BAR_MAX_HEIGHT;
  const x = pct * width / 100;
  for (const bar of bars) {
    if (x >= bar.x && x <= bar.x + bar.width) {
      return BAR_MAX_HEIGHT - bar.height;
    }
  }
  return BAR_MAX_HEIGHT;
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
  bars: BarSegment[],
  width: number,
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
    const barTop = barTopAt(avgPct, bars, width);

    groups.push({
      key: group.map((item) => item.key).join("-"),
      pct: avgPct,
      barTop,
      items: group,
    });
  }

  return groups;
}

export function getMarkerEdgeInset(width: number) {
  return Math.min(MARKER_EDGE_INSET, Math.max(0, width / 2 - 1));
}
