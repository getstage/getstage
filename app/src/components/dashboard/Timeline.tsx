import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Link } from "@tanstack/react-router";
import { gsap } from "gsap";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { Avatar } from "@/components/ui/Avatar";
import type { Project } from "@/types";

gsap.registerPlugin(DrawSVGPlugin);

interface TimelineProps {
  projects: Project[];
  horizon?: TimelineHorizon;
}

export type TimelineHorizon =
  | "today"
  | "yesterday"
  | "this-week"
  | "this-month"
  | "this-year"
  | "30-days"
  | "6-months"
  | "12-months"
  | "all-time";

type CurveSample = {
  frac: number;
  h: number;
};

type TickGranularity = "day" | "week" | "month";

type TimelineTick = {
  key: string;
  ts: number;
  x: number;
  label: string;
};

type PositionedProject = {
  project: Project;
  pct: number;
};

type MarkerGroup = {
  key: string;
  pct: number;
  curveTop: number;
  items: PositionedProject[];
};

type TrackingState = {
  x: number;
  curveTop: number;
  dateFull: string;
  activeProjects: Project[];
  tipLeft: number;
  tipTop: number;
  tipWidth: number;
};

type ProfileHoverState = {
  projectId: string;
  x: number;
  y: number;
  progress: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const CURVE_HEIGHT = 160;
const AXIS_ZONE_HEIGHT = 56;
const TIMELINE_HEIGHT = CURVE_HEIGHT + AXIS_ZONE_HEIGHT;
const MARKER_SIZE = 36;
const MARKER_RADIUS = MARKER_SIZE / 2;
const MARKER_EDGE_INSET = MARKER_RADIUS + 4;
const MAX_ELEVATION = 75;
const SAMPLES = 120;
const KERNEL = 0.025;
const TOOLTIP_WIDTH = 286;
const TRACKING_TOOLTIP_WIDTH = 220;
const MIN_TICK_LABEL_GAP = 92;
const RECENT_TASK_WINDOW_MS = 48 * 60 * 60 * 1000;

const SHORT_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

const FULL_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const MONTH_LABEL_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
});

function clamp(value: number, min: number, max: number) {
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
  const date = new Date(startOfDay(timestamp));
  date.setDate(1);
  return date.getTime();
}

function startOfWeekMonday(timestamp: number) {
  const date = new Date(startOfDay(timestamp));
  const day = date.getDay();
  const offset = (day + 6) % 7;
  date.setDate(date.getDate() - offset);
  return date.getTime();
}

function dateToPercent(dateTimestamp: number, startTimestamp: number, endTimestamp: number) {
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

  if (count <= 0) return 0;
  if (count >= 4) return levels[levels.length - 1]![1] * MAX_ELEVATION;

  for (let index = 0; index < levels.length - 1; index += 1) {
    const start = levels[index];
    const end = levels[index + 1];
    if (!start || !end) continue;
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

function generateCurve(startTimestamp: number, endTimestamp: number, projects: Project[]) {
  const rangeMs = Math.max(endTimestamp - startTimestamp, DAY_MS);
  const points: CurveSample[] = [];

  for (let index = 0; index <= SAMPLES; index += 1) {
    const frac = index / SAMPLES;
    const activity = activityAt(frac, startTimestamp, rangeMs, projects);
    points.push({ frac, h: countToHeight(activity) });
  }

  return points;
}

function curveYAt(frac: number, points: CurveSample[]) {
  if (points.length === 0) return 0;

  const indexFloat = clamp(frac, 0, 1) * SAMPLES;
  const index = Math.min(Math.floor(indexFloat), SAMPLES - 1);
  const mix = indexFloat - index;

  const first = points[index]?.h ?? 0;
  const second = points[Math.min(index + 1, SAMPLES)]?.h ?? first;
  return first + (second - first) * mix;
}

function pointsToPath(points: CurveSample[], width: number) {
  if (points.length === 0) return "";

  const coordinates = points.map((point) => ({
    x: point.frac * width,
    y: CURVE_HEIGHT - point.h,
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

function getTickGranularity(startTimestamp: number, endTimestamp: number): TickGranularity {
  const totalDays = Math.max((endTimestamp - startTimestamp) / DAY_MS, 1);
  if (totalDays < 30) return "day";
  if (totalDays <= 90) return "week";
  return "month";
}

function getTickLabel(timestamp: number, granularity: TickGranularity) {
  if (granularity === "month") {
    return MONTH_LABEL_FORMATTER.format(new Date(timestamp));
  }

  return SHORT_DATE_FORMATTER.format(new Date(timestamp));
}

function buildTicks(
  startTimestamp: number,
  endTimestamp: number,
  width: number,
  granularity: TickGranularity,
): TimelineTick[] {
  if (width <= 0) return [];

  const rawTicks: number[] = [];
  let cursor = startTimestamp;

  if (granularity === "day") {
    cursor = startOfDay(startTimestamp);
    if (cursor < startTimestamp) {
      cursor = addDays(cursor, 1);
    }
    while (cursor <= endTimestamp) {
      rawTicks.push(cursor);
      cursor = addDays(cursor, 1);
    }
  } else if (granularity === "week") {
    cursor = startOfWeekMonday(startTimestamp);
    if (cursor < startTimestamp) {
      cursor = addDays(cursor, 7);
    }
    while (cursor <= endTimestamp) {
      rawTicks.push(cursor);
      cursor = addDays(cursor, 7);
    }
  } else {
    cursor = startOfMonth(startTimestamp);
    if (cursor < startTimestamp) {
      cursor = startOfMonth(addMonths(cursor, 1));
    }
    while (cursor <= endTimestamp) {
      rawTicks.push(cursor);
      cursor = startOfMonth(addMonths(cursor, 1));
    }
  }

  if (rawTicks.length === 0) return [];

  const maxTickCount = Math.max(3, Math.floor(width / MIN_TICK_LABEL_GAP));
  const samplingStep = Math.max(1, Math.ceil(rawTicks.length / maxTickCount));
  const sampledTicks: number[] = [];

  for (let index = 0; index < rawTicks.length; index += 1) {
    if (index === 0 || index === rawTicks.length - 1 || index % samplingStep === 0) {
      const ts = rawTicks[index];
      if (ts !== undefined) {
        sampledTicks.push(ts);
      }
    }
  }

  const uniqueTicks = Array.from(new Set(sampledTicks));
  return uniqueTicks.map((ts) => ({
    key: `${granularity}-${ts}`,
    ts,
    x: (dateToPercent(ts, startTimestamp, endTimestamp) / 100) * width,
    label: getTickLabel(ts, granularity),
  }));
}

function getViewRange(projects: Project[], horizon: TimelineHorizon) {
  const now = Date.now();
  const today = startOfDay(now);

  const fallbackStart = addDays(today, -30);
  const fallbackEnd = addDays(today, 30);

  if (projects.length === 0) {
    return {
      start: fallbackStart,
      end: endOfDay(fallbackEnd),
    };
  }

  const earliestStart = Math.min(...projects.map((project) => project.startDate));
  const latestEnd = Math.max(...projects.map((project) => project.endDate));

  switch (horizon) {
    case "today":
      return { start: today, end: endOfDay(today) };
    case "yesterday": {
      const yesterday = addDays(today, -1);
      return { start: yesterday, end: endOfDay(yesterday) };
    }
    case "this-week": {
      const weekStart = startOfWeekMonday(today);
      const weekEnd = endOfDay(addDays(weekStart, 6));
      return { start: weekStart, end: weekEnd };
    }
    case "this-month":
      return {
        start: startOfDay(earliestStart),
        end: endOfDay(latestEnd),
      };
    case "this-year": {
      const current = new Date(today);
      const start = new Date(current.getFullYear(), 0, 1).getTime();
      const end = endOfDay(new Date(current.getFullYear(), 11, 31).getTime());
      return { start, end };
    }
    case "30-days":
      return {
        start: addDays(today, -30),
        end: endOfDay(today),
      };
    case "6-months":
      return {
        start: startOfDay(addMonths(today, -6)),
        end: endOfDay(today),
      };
    case "12-months":
      return {
        start: startOfDay(addMonths(today, -12)),
        end: endOfDay(today),
      };
    case "all-time":
    default:
      return {
        start: startOfDay(earliestStart - 90 * DAY_MS),
        end: endOfDay(latestEnd + 90 * DAY_MS),
      };
  }
}

function getGroupingThreshold(horizon: TimelineHorizon, width: number) {
  const minPctDistance = ((MARKER_SIZE + 6) / Math.max(width, 1)) * 100;
  if (horizon === "this-year" || horizon === "12-months" || horizon === "all-time") {
    return Math.max(1.5, minPctDistance);
  }
  if (horizon === "this-week" || horizon === "today" || horizon === "yesterday") {
    return Math.max(8, minPctDistance);
  }
  return Math.max(2, minPctDistance);
}

function groupProjects(
  positioned: PositionedProject[],
  threshold: number,
  curve: CurveSample[],
): MarkerGroup[] {
  const used = new Set<number>();
  const groups: MarkerGroup[] = [];

  for (let index = 0; index < positioned.length; index += 1) {
    if (used.has(index)) continue;

    const base = positioned[index];
    if (!base) continue;

    const group: PositionedProject[] = [base];
    used.add(index);

    for (let inner = index + 1; inner < positioned.length; inner += 1) {
      if (used.has(inner)) continue;
      const candidate = positioned[inner];
      if (!candidate) continue;
      if (Math.abs(candidate.pct - base.pct) <= threshold) {
        group.push(candidate);
        used.add(inner);
      }
    }

    const avgPct =
      group.reduce((total, item) => total + item.pct, 0) / Math.max(group.length, 1);
    const curveTop = CURVE_HEIGHT - curveYAt(avgPct / 100, curve);

    groups.push({
      key: group.map((item) => item.project.id).join("-"),
      pct: avgPct,
      curveTop,
      items: group,
    });
  }

  return groups;
}

function markerOpacity(project: Project, hoveredProjectId: string | null) {
  if (hoveredProjectId && project.id !== hoveredProjectId) return 0.2;
  if (project.status === "completed") return 0.3;
  return 1;
}

function getPhasesByOrder(project: Project) {
  return [...project.phases].sort((a, b) => a.order - b.order);
}

function getPhaseAtProgress(project: Project, progress: number) {
  const phases = getPhasesByOrder(project);
  if (phases.length === 0) return null;

  const normalizedProgress = clamp(progress, 0, 1);
  const phaseIndex = Math.min(phases.length - 1, Math.floor(normalizedProgress * phases.length));
  return phases[phaseIndex] ?? phases[phases.length - 1] ?? null;
}

function getCurrentPhaseName(project: Project) {
  const active = project.phases.find((phase) => phase.status === "active");
  if (active) return active.name;

  const upcoming = project.phases.find((phase) => phase.status === "upcoming");
  if (upcoming && project.status !== "completed") return upcoming.name;

  return project.phases[project.phases.length - 1]?.name ?? "Phase";
}

export function Timeline({ projects, horizon = "this-month" }: TimelineProps) {
  const gradientId = useId().replace(/:/g, "");
  const regionRef = useRef<HTMLDivElement | null>(null);
  const curveLineRef = useRef<SVGPathElement | null>(null);
  const curveFillRef = useRef<SVGPathElement | null>(null);
  const [regionWidth, setRegionWidth] = useState(0);
  const [profileHover, setProfileHover] = useState<ProfileHoverState | null>(null);
  const [tracking, setTracking] = useState<TrackingState | null>(null);
  const hoveredProjectId = profileHover?.projectId ?? null;

  useEffect(() => {
    const element = regionRef.current;
    if (!element) return;

    const updateWidth = () => {
      setRegionWidth(Math.round(element.getBoundingClientRect().width));
    };

    updateWidth();

    const observer = new ResizeObserver(updateWidth);
    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  const layout = useMemo(() => {
    const width = Math.max(regionWidth, 1);
    const view = getViewRange(projects, horizon);
    const rangeMs = Math.max(view.end - view.start, DAY_MS);
    const tickGranularity = getTickGranularity(view.start, view.end);
    const ticks = buildTicks(view.start, view.end, width, tickGranularity);
    const curve = generateCurve(view.start, view.end, projects);
    const curvePath = pointsToPath(curve, width);
    const fillPath = `${curvePath} L ${width.toFixed(1)} ${CURVE_HEIGHT} L 0 ${CURVE_HEIGHT} Z`;

    const visibleProjects = projects
      .filter((project) => project.startDate <= view.end && project.endDate >= view.start)
      .sort((a, b) => a.startDate - b.startDate);

    const positioned = visibleProjects.map((project) => {
      const displayDate = Math.min(project.endDate, view.end);
      const pct = dateToPercent(displayDate, view.start, view.end);
      return { project, pct };
    });

    const threshold = getGroupingThreshold(horizon, width);
    const groups = groupProjects(positioned, threshold, curve);
    const edgeInset = Math.min(MARKER_EDGE_INSET, Math.max(0, width / 2 - 1));
    const labelPadding = Math.min(28, width / 2);
    const labelMax = Math.max(labelPadding, width - labelPadding);

    const todayPct = dateToPercent(Date.now(), view.start, view.end);
    const showToday = todayPct > 0 && todayPct < 100;
    const todayFrac = todayPct / 100;
    const todayX = showToday ? (todayPct / 100) * width : null;

    return {
      width,
      start: view.start,
      end: view.end,
      rangeMs,
      tickGranularity,
      ticks,
      curve,
      curvePath,
      fillPath,
      visibleProjects,
      groups,
      edgeInset,
      todayX,
      todayLabelX: todayX !== null ? clamp(todayX, labelPadding, labelMax) : null,
      todayCurveTop: showToday ? CURVE_HEIGHT - curveYAt(todayFrac, curve) : null,
    };
  }, [horizon, projects, regionWidth]);

  useLayoutEffect(() => {
    const line = curveLineRef.current;
    const fill = curveFillRef.current;
    const region = regionRef.current;
    if (!line || !fill || !region) return;

    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const context = gsap.context(() => {
      const markers = gsap.utils.toArray<HTMLElement>("[data-curve-marker]");

      gsap.set(line, { drawSVG: "0% 0%" });
      gsap.set(fill, { opacity: 0 });

      const timeline = gsap.timeline({ defaults: { ease: "sine.out" } });
      timeline.to(line, { drawSVG: "0% 100%", duration: 1 });
      timeline.to(fill, { opacity: 1, duration: 0.4 }, 0.72);

      if (markers.length > 0) {
        timeline.fromTo(
          markers,
          { opacity: 0.88, scale: 0.96 },
          {
            opacity: 1,
            scale: 1,
            duration: 0.45,
            stagger: { each: 0.04, from: "center" },
          },
          0.35,
        );
      }
    }, region);

    return () => {
      context.revert();
    };
  }, [layout.curvePath, layout.groups.length]);

  const handleMouseMove = (clientX: number) => {
    const region = regionRef.current;
    if (!region || hoveredProjectId) return;

    const bounds = region.getBoundingClientRect();
    const x = clamp(clientX - bounds.left, 0, layout.width);
    const frac = layout.width <= 0 ? 0 : x / layout.width;
    const elevation = curveYAt(frac, layout.curve);
    const curveTop = CURVE_HEIGHT - elevation;
    const dateTimestamp = layout.start + layout.rangeMs * frac;

    const activeProjects = layout.visibleProjects.filter(
      (project) => project.startDate <= dateTimestamp && project.endDate >= dateTimestamp,
    );

    const tipWidth = Math.min(TRACKING_TOOLTIP_WIDTH, Math.max(120, layout.width - 16));
    const tipHalf = tipWidth / 2;
    const tipMin = Math.min(tipHalf + 8, Math.max(8, layout.width / 2));
    const tipMax = Math.max(tipMin, layout.width - tipHalf - 8);

    setTracking({
      x,
      curveTop,
      dateFull: FULL_DATE_FORMATTER.format(new Date(dateTimestamp)),
      activeProjects,
      tipLeft: clamp(x, tipMin, tipMax),
      tipTop: Math.max(0, curveTop - 16),
      tipWidth,
    });
  };

  const handleMarkerEnter = (
    project: Project,
    markerX: number,
    markerTop: number,
    markerTimestamp: number,
  ) => {
    setTracking(null);

    const projectDuration = Math.max(project.endDate - project.startDate, 1);
    const progress = clamp(
      (markerTimestamp - project.startDate) / projectDuration,
      0,
      1,
    );

    setProfileHover({
      projectId: project.id,
      x: markerX,
      y: markerTop + MARKER_RADIUS,
      progress,
    });
  };

  const clearMarkerHover = (projectId: string) => {
    setProfileHover((current) => (current?.projectId === projectId ? null : current));
  };

  const profileHoverDetails = useMemo(() => {
    if (!profileHover) return null;

    const project = layout.visibleProjects.find((entry) => entry.id === profileHover.projectId);
    if (!project) return null;

    const phaseAtCursor = getPhaseAtProgress(project, profileHover.progress);
    const tasks = [...(phaseAtCursor?.tasks ?? [])].sort((a, b) => a.order - b.order);
    const visibleTasks = tasks.slice(0, 5);
    const overflowCount = Math.max(0, tasks.length - visibleTasks.length);

    const projectDuration = Math.max(project.endDate - project.startDate, 0);
    const hoveredTimestamp = project.startDate + projectDuration * profileHover.progress;
    const tooltipDate = FULL_DATE_FORMATTER.format(new Date(hoveredTimestamp));

    const tooltipWidth = Math.min(TOOLTIP_WIDTH, Math.max(120, layout.width - 16));
    const tooltipHeight = 96 + visibleTasks.length * 18 + (overflowCount > 0 ? 18 : 0);
    const leftMax = Math.max(8, layout.width - tooltipWidth - 8);
    const left = clamp(profileHover.x + 18, 8, leftMax);
    const maxTop = Math.max(4, CURVE_HEIGHT - tooltipHeight - 4);
    const top = clamp(profileHover.y - tooltipHeight - 12, 4, maxTop);

    return {
      projectName: project.name,
      phaseName: phaseAtCursor?.name ?? getCurrentPhaseName(project),
      tasks: visibleTasks,
      overflowCount,
      tooltipDate,
      left,
      top,
      width: tooltipWidth,
    };
  }, [layout.visibleProjects, layout.width, profileHover]);

  return (
    <section className="relative flex min-h-[35vh] items-center justify-center px-4 pb-[84px] pt-[50px]">
      <div
        ref={regionRef}
        className="relative w-full"
        style={{ height: `${TIMELINE_HEIGHT}px` }}
        onMouseMove={(event) => handleMouseMove(event.clientX)}
        onMouseLeave={() => {
          setTracking(null);
          setProfileHover(null);
        }}
      >
        <svg className="pointer-events-none absolute inset-0 z-0 h-full w-full" aria-hidden>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(135,130,245,0.25)" />
              <stop offset="100%" stopColor="rgba(135,130,245,0)" />
            </linearGradient>
          </defs>

          <path ref={curveFillRef} d={layout.fillPath} fill={`url(#${gradientId})`} />
          <path
            ref={curveLineRef}
            d={layout.curvePath}
            fill="none"
            stroke="#8782F5"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
        </svg>

        <div
          className="pointer-events-none absolute left-0 z-[1] h-px w-full bg-border-subtle"
          style={{ top: `${CURVE_HEIGHT}px` }}
        />

        {layout.ticks.map((tick) => (
          layout.todayX !== null && Math.abs(tick.x - layout.todayX) < 1.5 ? null : (
            <div
              key={`tick-line-${tick.key}`}
              className="pointer-events-none absolute z-[1] w-px bg-border-subtle/80"
              style={{
                left: `${tick.x}px`,
                top: `${CURVE_HEIGHT - 10}px`,
                height: "20px",
              }}
            />
          )
        ))}

        {layout.ticks.map((tick) => {
          if (layout.todayX !== null && Math.abs(tick.x - layout.todayX) < 28) {
            return null;
          }

          const labelPadding = Math.min(28, layout.width / 2);
          const labelMax = Math.max(labelPadding, layout.width - labelPadding);
          const labelX = clamp(tick.x, labelPadding, labelMax);

          return (
            <div
              key={`tick-label-${tick.key}`}
              className="pointer-events-none absolute z-[2] -translate-x-1/2 text-[12px] text-text-secondary"
              style={{ left: `${labelX}px`, top: `${CURVE_HEIGHT + 18}px` }}
            >
              {tick.label}
            </div>
          );
        })}

        {layout.todayX !== null ? (
          <div
            className="pointer-events-none absolute top-0 z-[2] w-px -translate-x-1/2"
            style={{
              left: `${layout.todayX}px`,
              height: `${TIMELINE_HEIGHT}px`,
              backgroundColor: "rgba(59,175,218,0.34)",
            }}
          />
        ) : null}

        {layout.todayX !== null && layout.todayCurveTop !== null ? (
          <>
            {layout.todayLabelX !== null ? (
              <div
                className="pointer-events-none absolute z-[3] -translate-x-1/2 text-[12px] font-medium"
                style={{
                  left: `${layout.todayLabelX}px`,
                  top: `${CURVE_HEIGHT + 18}px`,
                  color: "var(--color-cyan)",
                }}
              >
                Today
              </div>
            ) : null}
            <div
              className="pointer-events-none absolute z-[3] h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{
                left: `${layout.todayX}px`,
                top: `${layout.todayCurveTop}px`,
                backgroundColor: "rgba(59,175,218,0.72)",
              }}
            />
          </>
        ) : null}

        {layout.groups.map((group) => {
          const groupLeft = clamp(
            (group.pct / 100) * layout.width,
            layout.edgeInset,
            layout.width - layout.edgeInset,
          );
          const markerTop = group.curveTop - MARKER_RADIUS;
          const markerTimestamp = layout.start + layout.rangeMs * (group.pct / 100);
          const visibleItems = group.items.slice(0, 3);
          const overflow = Math.max(group.items.length - visibleItems.length, 0);

          if (group.items.length === 1) {
            const item = group.items[0];
            if (!item) return null;

            return (
              <Link
                key={group.key}
                to="/project/$id"
                params={{ id: item.project.id }}
                data-curve-marker
                className="absolute z-[6] block h-9 w-9 -translate-x-1/2 overflow-hidden rounded-full border-2 border-white shadow-[0_0_0_2.5px_#8782F5] transition-[transform,box-shadow,opacity] duration-200 hover:scale-110 hover:shadow-[0_0_0_2.5px_#8782F5,0_3px_12px_rgba(26,26,46,0.12)]"
                style={{
                  left: `${groupLeft}px`,
                  top: `${markerTop}px`,
                  opacity: markerOpacity(item.project, hoveredProjectId),
                  filter: item.project.status === "completed" ? "grayscale(100%)" : "none",
                }}
                onMouseEnter={() =>
                  handleMarkerEnter(item.project, groupLeft, markerTop, markerTimestamp)
                }
                onMouseLeave={() => clearMarkerHover(item.project.id)}
              >
                <Avatar
                  name={item.project.clientName}
                  src={item.project.clientAvatarUrl}
                  size="md"
                  className="h-full w-full text-[11px]"
                />
              </Link>
            );
          }

          return (
            <div
              key={group.key}
              className="group absolute z-[6] -translate-x-1/2"
              style={{ left: `${groupLeft}px`, top: `${markerTop}px` }}
            >
              <div className="flex flex-col items-center">
                {visibleItems.map((item, index) => (
                  <Link
                    key={item.project.id}
                    to="/project/$id"
                    params={{ id: item.project.id }}
                    data-curve-marker
                    className={`relative block h-9 w-9 overflow-hidden rounded-full border-2 border-white shadow-[0_0_0_2.5px_#8782F5] transition-[margin,transform,box-shadow,opacity] duration-200 hover:scale-110 hover:shadow-[0_0_0_2.5px_#8782F5,0_3px_12px_rgba(26,26,46,0.12)] ${
                      index > 0 ? "-mt-8 group-hover:mt-2" : ""
                    }`}
                    style={{
                      zIndex: visibleItems.length - index,
                      opacity: markerOpacity(item.project, hoveredProjectId),
                      filter: item.project.status === "completed" ? "grayscale(100%)" : "none",
                    }}
                    onMouseEnter={() =>
                      handleMarkerEnter(item.project, groupLeft, markerTop, markerTimestamp)
                    }
                    onMouseLeave={() => clearMarkerHover(item.project.id)}
                  >
                    <Avatar
                      name={item.project.clientName}
                      src={item.project.clientAvatarUrl}
                      size="md"
                      className="h-full w-full text-[11px]"
                    />
                  </Link>
                ))}

                {overflow > 0 ? (
                  <div className="relative -mt-8 flex h-9 w-9 items-center justify-center rounded-full border-[2.5px] border-white bg-border text-[11px] font-medium text-text-secondary transition-[margin,opacity] duration-200 group-hover:mt-2">
                    +{overflow}
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}

        {profileHover ? (
          <>
            <div
              className="pointer-events-none absolute top-0 z-[3] w-px -translate-x-1/2 bg-accent/26 transition-opacity duration-200"
              style={{ left: `${profileHover.x}px`, height: `${TIMELINE_HEIGHT}px` }}
            />
            <div
              className="pointer-events-none absolute z-[3] h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/65"
              style={{ left: `${profileHover.x}px`, top: `${profileHover.y}px` }}
            />
          </>
        ) : null}

        {tracking && !hoveredProjectId ? (
          <>
            <div
              className="pointer-events-none absolute top-0 z-[3] w-px -translate-x-1/2 bg-accent/26"
              style={{ left: `${tracking.x}px`, height: `${TIMELINE_HEIGHT}px` }}
            />
            <div
              className="pointer-events-none absolute z-[3] h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/72"
              style={{ left: `${tracking.x}px`, top: `${tracking.curveTop}px` }}
            />
            {tracking.activeProjects.length > 0 ? (
              <div
                className="pointer-events-none absolute z-[15] -translate-x-1/2 -translate-y-full rounded-[12px] border border-border bg-white px-4 py-3 shadow-[0_4px_20px_rgba(0,0,0,0.08)]"
                style={{
                  left: `${tracking.tipLeft}px`,
                  top: `${tracking.tipTop}px`,
                  width: `${tracking.tipWidth}px`,
                }}
              >
                <p className="mb-1.5 text-[12px] text-text-secondary">{tracking.dateFull}</p>
                <p className="mb-2 text-[14px] font-medium text-text-primary">
                  Active projects: {tracking.activeProjects.length}
                </p>
                <div className="space-y-1.5">
                  {tracking.activeProjects.slice(0, 5).map((project) => (
                    <p
                      key={`tracking-${project.id}`}
                      className="flex items-center gap-2 text-[13px] text-text-primary"
                    >
                      <Avatar
                        name={project.clientName}
                        src={project.clientAvatarUrl}
                        size="sm"
                        className="h-4 w-4 text-[9px]"
                      />
                      <span className="truncate">{project.name}</span>
                    </p>
                  ))}
                </div>
              </div>
            ) : null}
          </>
        ) : null}

        <AnimatePresence>
          {profileHoverDetails ? (
            <motion.aside
              initial={{ opacity: 0, y: 4 }}
              animate={{
                opacity: 1,
                y: 0,
                transition: { duration: 0.15, delay: 0.15 },
              }}
              exit={{ opacity: 0, y: 2, transition: { duration: 0.15 } }}
              className="pointer-events-none absolute z-30 rounded-[12px] border border-border bg-white px-4 py-3 text-text-primary shadow-[0_4px_16px_rgba(0,0,0,0.08)]"
              style={{
                left: `${profileHoverDetails.left}px`,
                top: `${profileHoverDetails.top}px`,
                width: `${profileHoverDetails.width}px`,
              }}
            >
              <p className="text-[12px] text-text-secondary">{profileHoverDetails.tooltipDate}</p>
              <p className="mt-1 truncate text-[15px] font-medium text-text-primary">
                {profileHoverDetails.projectName}
              </p>
              <p className="mt-1 truncate text-[13px] text-text-secondary">
                {profileHoverDetails.phaseName}
              </p>

              <div className="mt-2.5 border-t border-border-subtle pt-2">
                {profileHoverDetails.tasks.length > 0 ? (
                  profileHoverDetails.tasks.map((task) => {
                    const isRecentlyAdded =
                      !task.isCompleted &&
                      Date.now() - task.createdAt <= RECENT_TASK_WINDOW_MS;
                    return (
                      <p
                        key={task.id}
                        className={`truncate py-0.5 text-[12px] ${
                          task.isCompleted ? "text-text-secondary" : "text-text-primary"
                        }`}
                      >
                        <span className="mr-1">{task.isCompleted ? "☑" : "☐"}</span>
                        {task.title}
                        {isRecentlyAdded ? <span className="ml-1 text-accent/70">●</span> : null}
                      </p>
                    );
                  })
                ) : (
                  <p className="text-[12px] text-text-secondary">No tasks in this phase.</p>
                )}

                {profileHoverDetails.overflowCount > 0 ? (
                  <p className="mt-0.5 text-[12px] text-text-secondary">
                    +{profileHoverDetails.overflowCount} more
                  </p>
                ) : null}
              </div>
            </motion.aside>
          ) : null}
        </AnimatePresence>
      </div>
    </section>
  );
}
