import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
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
  nowTimestamp?: number;
}

export type TimelineHorizon =
  | "today"
  | "yesterday"
  | "thisWeek"
  | "thisMonth"
  | "thisYear"
  | "30d"
  | "6m"
  | "12m"
  | "all";

type TickGranularity = "day" | "week" | "month";

type TimelineTick = {
  key: string;
  timestamp: number;
  label: string;
  x: number;
};

type PositionedProject = {
  project: Project;
  row: number;
  left: number;
  width: number;
  currentPhase: string;
};

type CurveMarker = {
  key: string;
  project: Project;
  x: number;
  ratio: number;
};

type PackedRows = {
  projects: Array<{ project: Project; row: number }>;
  rowCount: number;
};

type HoverState = {
  projectId: string;
  x: number;
  y: number;
  blockProgress: number;
};

type CurvePoint = {
  x: number;
  y: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const SIDE_PADDING_DAYS = 2;
const BLOCK_HEIGHT = 52;
const ROW_GAP = 10;
const MAX_VISIBLE_ROWS = 5;
const ROW_VIEWPORT_TOP_PADDING = 6;
const ROW_VIEWPORT_BOTTOM_PADDING = 10;
const TRACK_SIDE_INSET = 24;
const EDGE_FADE_WIDTH = 64;
const EDGE_SAFE_PADDING = EDGE_FADE_WIDTH + 12;
const CURVE_BAND_HEIGHT = 112;
const CURVE_TO_ROWS_GAP = 16;
const CURVE_TOP_INSET = 10;
const CURVE_BOTTOM_INSET = 26;
const AXIS_TOP_GAP = 20;
const LABEL_TOP_GAP = 12;
const AXIS_LABEL_ZONE_HEIGHT = 22;
const TOOLTIP_WIDTH = 286;
const RECENT_TASK_WINDOW_MS = 48 * 60 * 60 * 1000;
const NON_HOVER_FADE_MULTIPLIER = 0.35;
const MAX_CURVE_MARKERS = 5;

const CURVE_PROFILE: Array<{ x: number; y: number }> = [
  { x: 0, y: 0.93 },
  { x: 2, y: 0.9 },
  { x: 4, y: 0.86 },
  { x: 8, y: 0.83 },
  { x: 10, y: 0.7 },
  { x: 14, y: 0.68 },
  { x: 20, y: 0.68 },
  { x: 26, y: 0.68 },
  { x: 30, y: 0.58 },
  { x: 36, y: 0.57 },
  { x: 42, y: 0.48 },
  { x: 48, y: 0.52 },
  { x: 54, y: 0.6 },
  { x: 60, y: 0.6 },
  { x: 66, y: 0.6 },
  { x: 70, y: 0.72 },
  { x: 74, y: 0.62 },
  { x: 78, y: 0.7 },
  { x: 82, y: 0.7 },
  { x: 86, y: 0.84 },
  { x: 92, y: 0.84 },
  { x: 98, y: 0.84 },
  { x: 100, y: 0.89 },
];

const DAY_TICK_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

const MONTH_TICK_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
});

const TOOLTIP_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function buildSmoothPath(points: CurvePoint[]) {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0]!.x},${points[0]!.y}`;

  let path = `M ${points[0]!.x},${points[0]!.y}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const p0 = points[index - 1] ?? points[index]!;
    const p1 = points[index]!;
    const p2 = points[index + 1]!;
    const p3 = points[index + 2] ?? p2;

    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;

    path += ` C ${c1x.toFixed(2)},${c1y.toFixed(2)} ${c2x.toFixed(2)},${c2y.toFixed(2)} ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`;
  }

  return path;
}

function startOfDay(timestamp: number) {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function startOfWeekMonday(timestamp: number) {
  const date = new Date(startOfDay(timestamp));
  const day = date.getDay();
  const offset = (day + 6) % 7;
  date.setDate(date.getDate() - offset);
  return date.getTime();
}

function startOfMonth(timestamp: number) {
  const date = new Date(startOfDay(timestamp));
  date.setDate(1);
  return date.getTime();
}

function startOfYear(timestamp: number) {
  const date = new Date(startOfDay(timestamp));
  date.setMonth(0, 1);
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

function getProjectSpanBounds(projects: Project[], nowTimestamp: number) {
  const today = startOfDay(nowTimestamp);

  if (projects.length === 0) {
    return { start: today, end: today + DAY_MS };
  }

  const earliestStart = Math.min(today, ...projects.map((project) => project.startDate));
  const latestEnd = Math.max(today, ...projects.map((project) => project.endDate));

  const start = startOfDay(earliestStart - SIDE_PADDING_DAYS * DAY_MS);
  const end = startOfDay(latestEnd + SIDE_PADDING_DAYS * DAY_MS);
  return {
    start,
    end: Math.max(end, start + DAY_MS),
  };
}

function getTimelineBounds(
  projects: Project[],
  horizon: TimelineHorizon,
  nowTimestamp: number,
) {
  const spanBounds = getProjectSpanBounds(projects, nowTimestamp);

  if (horizon === "all") {
    return spanBounds;
  }

  const today = startOfDay(nowTimestamp);

  if (horizon === "today") {
    return { start: today, end: today + DAY_MS };
  }

  if (horizon === "yesterday") {
    return { start: today - DAY_MS, end: today };
  }

  if (horizon === "thisWeek") {
    const start = startOfWeekMonday(today);
    return { start, end: start + 7 * DAY_MS };
  }

  if (horizon === "thisMonth") {
    const start = startOfMonth(today);
    return { start, end: addMonths(start, 1) };
  }

  if (horizon === "thisYear") {
    const start = startOfYear(today);
    return { start, end: addMonths(start, 12) };
  }

  const horizonDays = horizon === "30d" ? 30 : horizon === "6m" ? 180 : 365;
  const start = today - horizonDays * DAY_MS;
  const end = today + DAY_MS;

  return {
    start,
    end: Math.max(end, start + DAY_MS),
  };
}

function getTickGranularity(totalDays: number): TickGranularity {
  if (totalDays < 30) return "day";
  if (totalDays <= 90) return "week";
  return "month";
}

function getPixelsPerDay(totalDays: number) {
  if (totalDays < 30) return 56;
  if (totalDays <= 90) return 28;
  return 14;
}

function formatTickLabel(timestamp: number, granularity: TickGranularity) {
  if (granularity === "month") {
    return MONTH_TICK_FORMATTER.format(new Date(timestamp));
  }
  return DAY_TICK_FORMATTER.format(new Date(timestamp));
}

function buildTicks(start: number, end: number, granularity: TickGranularity) {
  const ticks: Array<{ key: string; timestamp: number; label: string }> = [];

  let cursor: number;
  let step: (value: number) => number;

  if (granularity === "day") {
    cursor = startOfDay(start);
    step = (value) => addDays(value, 1);
  } else if (granularity === "week") {
    cursor = startOfWeekMonday(start);
    step = (value) => addDays(value, 7);
  } else {
    cursor = startOfMonth(start);
    step = (value) => addMonths(value, 1);
  }

  while (cursor < start) {
    cursor = step(cursor);
  }

  while (cursor <= end) {
    ticks.push({
      key: `${granularity}-${cursor}`,
      timestamp: cursor,
      label: formatTickLabel(cursor, granularity),
    });
    cursor = step(cursor);
  }

  if (ticks.length === 0 || ticks[0]?.timestamp !== start) {
    ticks.unshift({
      key: `boundary-${start}`,
      timestamp: start,
      label: formatTickLabel(start, granularity),
    });
  }

  if (ticks[ticks.length - 1]?.timestamp !== end) {
    ticks.push({
      key: `boundary-${end}`,
      timestamp: end,
      label: formatTickLabel(end, granularity),
    });
  }

  return ticks;
}

function packRows(projects: Project[]): PackedRows {
  const rowEndTimes: number[] = [];
  const sortedProjects = [...projects].sort((a, b) => {
    if (a.startDate !== b.startDate) return a.startDate - b.startDate;
    return a.endDate - b.endDate;
  });

  const packed = sortedProjects.map((project) => {
    let row = -1;

    for (let index = 0; index < rowEndTimes.length; index += 1) {
      const rowEnd = rowEndTimes[index];
      if (rowEnd !== undefined && project.startDate > rowEnd) {
        row = index;
        break;
      }
    }

    if (row === -1) {
      row = rowEndTimes.length;
      rowEndTimes.push(project.endDate);
    } else {
      const existingEnd = rowEndTimes[row] ?? project.endDate;
      rowEndTimes[row] = Math.max(existingEnd, project.endDate);
    }

    return { project, row };
  });

  return {
    projects: packed,
    rowCount: rowEndTimes.length,
  };
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

function getBaseBlockOpacity(project: Project) {
  if (project.status === "completed") return 0.62;
  if (project.status === "paused") return 0.82;
  return 1;
}

function getRenderedBlockOpacity(
  project: Project,
  hoveredProjectId: string | null,
  isHovered: boolean,
) {
  const base = getBaseBlockOpacity(project);
  if (!hoveredProjectId) return base;
  if (isHovered) return 1;
  return Math.max(0.18, base * NON_HOVER_FADE_MULTIPLIER);
}

function getProjectStatusPriority(status: Project["status"]) {
  if (status === "active") return 0;
  if (status === "paused") return 1;
  return 2;
}

function getCurveYAtRatio(ratio: number, topY: number, bottomY: number) {
  const normalizedX = clamp(ratio, 0, 1) * 100;
  const verticalRange = Math.max(bottomY - topY, 1);

  const firstPoint = CURVE_PROFILE[0];
  if (firstPoint && normalizedX <= firstPoint.x) {
    return topY + verticalRange * firstPoint.y;
  }

  for (let index = 1; index < CURVE_PROFILE.length; index += 1) {
    const previous = CURVE_PROFILE[index - 1];
    const current = CURVE_PROFILE[index];
    if (!previous || !current) continue;

    if (normalizedX <= current.x) {
      const segmentLength = Math.max(current.x - previous.x, 1);
      const progress = (normalizedX - previous.x) / segmentLength;
      const y = previous.y + (current.y - previous.y) * progress;
      return topY + verticalRange * y;
    }
  }

  const lastPoint = CURVE_PROFILE[CURVE_PROFILE.length - 1];
  return topY + verticalRange * (lastPoint?.y ?? 1);
}

export function Timeline({
  projects,
  horizon = "all",
  nowTimestamp = Date.now(),
}: TimelineProps) {
  const gradientId = useId().replace(/:/g, "");
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const curveLineRef = useRef<SVGPathElement | null>(null);
  const curveAreaRef = useRef<SVGPathElement | null>(null);
  const lastAutoPositionKeyRef = useRef<string | null>(null);
  const [hoverState, setHoverState] = useState<HoverState | null>(null);
  const [viewportWidth, setViewportWidth] = useState(0);

  useEffect(() => {
    const element = viewportRef.current;
    if (!element) return;

    const setWidth = () => {
      setViewportWidth(Math.round(element.getBoundingClientRect().width));
    };

    setWidth();

    const observer = new ResizeObserver(() => {
      setWidth();
    });
    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  const layout = useMemo(() => {
    const bounds = getTimelineBounds(projects, horizon, nowTimestamp);
    const rangeMs = Math.max(bounds.end - bounds.start, DAY_MS);
    const totalDays = Math.max(1, Math.ceil(rangeMs / DAY_MS));
    const granularity = getTickGranularity(totalDays);
    const measuredViewportWidth = Math.max(viewportWidth, 0);
    const viewportPlotWidth = Math.max(measuredViewportWidth - EDGE_SAFE_PADDING * 2, 0);
    const targetPlotWidth = Math.max(860, totalDays * getPixelsPerDay(totalDays));
    const plotWidth = Math.max(viewportPlotWidth, targetPlotWidth);
    const timelineWidth = plotWidth + EDGE_SAFE_PADDING * 2;
    const drawableWidth = Math.max(plotWidth - TRACK_SIDE_INSET * 2, 1);

    const toX = (timestamp: number) => {
      const ratio = (timestamp - bounds.start) / rangeMs;
      return (
        EDGE_SAFE_PADDING + TRACK_SIDE_INSET + clamp(ratio * drawableWidth, 0, drawableWidth)
      );
    };

    const ticks: TimelineTick[] = buildTicks(bounds.start, bounds.end, granularity).map((tick) => ({
      ...tick,
      x: toX(tick.timestamp),
    }));

    const visibleProjects = projects.filter(
      (project) => project.endDate >= bounds.start && project.startDate <= bounds.end,
    );
    const packed = packRows(visibleProjects);
    const positionedProjects: PositionedProject[] = packed.projects.map((entry) => {
      const clampedStart = clamp(entry.project.startDate, bounds.start, bounds.end);
      const clampedEnd = clamp(entry.project.endDate, bounds.start, bounds.end);
      const left = toX(clampedStart);
      const right = toX(clampedEnd + DAY_MS);
      return {
        project: entry.project,
        row: entry.row,
        left,
        width: Math.max(right - left, 44),
        currentPhase: getCurrentPhaseName(entry.project),
      };
    });

    const now = nowTimestamp;
    const todayX = now >= bounds.start && now <= bounds.end ? toX(now) : null;
    const markers: CurveMarker[] = visibleProjects
      .map((project) => {
        const clampedStart = clamp(project.startDate, bounds.start, bounds.end);
        const clampedEnd = clamp(project.endDate, bounds.start, bounds.end);
        const midpoint = clampedStart + (clampedEnd - clampedStart) / 2;
        return {
          key: project.id,
          project,
          midpoint,
        };
      })
      .sort((a, b) => {
        const priorityDiff =
          getProjectStatusPriority(a.project.status) - getProjectStatusPriority(b.project.status);
        if (priorityDiff !== 0) return priorityDiff;

        const distanceDiff = Math.abs(a.midpoint - now) - Math.abs(b.midpoint - now);
        if (distanceDiff !== 0) return distanceDiff;

        return a.project.startDate - b.project.startDate;
      })
      .slice(0, MAX_CURVE_MARKERS)
      .map((marker) => ({
        key: marker.key,
        project: marker.project,
        x: toX(marker.midpoint),
        ratio: (marker.midpoint - bounds.start) / rangeMs,
      }));

    return {
      rowCount: packed.rowCount,
      timelineWidth,
      ticks,
      projects: positionedProjects,
      markers,
      todayX,
    };
  }, [horizon, nowTimestamp, projects, viewportWidth]);

  const rowPitch = BLOCK_HEIGHT + ROW_GAP;
  const rowCount = Math.max(layout.rowCount, 1);
  const visibleRows = Math.min(rowCount, MAX_VISIBLE_ROWS);
  const rowsViewportHeight =
    visibleRows * rowPitch -
    ROW_GAP +
    ROW_VIEWPORT_TOP_PADDING +
    ROW_VIEWPORT_BOTTOM_PADDING;
  const rowsContentHeight =
    rowCount * rowPitch -
    ROW_GAP +
    ROW_VIEWPORT_TOP_PADDING +
    ROW_VIEWPORT_BOTTOM_PADDING;
  const rowsTop = CURVE_BAND_HEIGHT + CURVE_TO_ROWS_GAP;
  const axisY = rowsTop + rowsViewportHeight + AXIS_TOP_GAP;
  const contentHeight = axisY + LABEL_TOP_GAP + AXIS_LABEL_ZONE_HEIGHT;
  const curve = useMemo(() => {
    const startX = EDGE_SAFE_PADDING;
    const endX = Math.max(layout.timelineWidth - EDGE_SAFE_PADDING, startX + 1);
    const width = endX - startX;
    const topY = CURVE_TOP_INSET;
    const bottomY = CURVE_BAND_HEIGHT - CURVE_BOTTOM_INSET;

    const points = CURVE_PROFILE.map((point) => ({
      x: startX + width * (point.x / 100),
      y: getCurveYAtRatio(point.x / 100, topY, bottomY),
    }));

    const linePath = buildSmoothPath(points);
    const areaPath = `${linePath} L ${endX.toFixed(2)},${CURVE_BAND_HEIGHT.toFixed(2)} L ${startX.toFixed(2)},${CURVE_BAND_HEIGHT.toFixed(2)} Z`;

    return { linePath, areaPath, topY, bottomY };
  }, [layout.timelineWidth]);
  const curveMarkers = useMemo(
    () =>
      layout.markers.map((marker) => ({
        ...marker,
        y: getCurveYAtRatio(marker.ratio, curve.topY, curve.bottomY),
      })),
    [curve.bottomY, curve.topY, layout.markers],
  );
  const renderedTicks = useMemo(() => {
    const baseTicks = layout.ticks.filter((tick) => !tick.key.startsWith("boundary-"));
    return baseTicks.reduce<TimelineTick[]>((accumulator, tick) => {
      const previous = accumulator[accumulator.length - 1];
      if (!previous || Math.abs(tick.x - previous.x) >= 16) {
        accumulator.push(tick);
      }
      return accumulator;
    }, []);
  }, [layout.ticks]);
  const renderedTickLabels = useMemo(() => {
    const todayX = layout.todayX;
    if (todayX === null) return renderedTicks;
    return renderedTicks.filter((tick) => Math.abs(tick.x - todayX) > 28);
  }, [layout.todayX, renderedTicks]);
  const autoPositionKey = useMemo(() => {
    const projectSignature = projects
      .map((project) => `${project.id}:${project.startDate}:${project.endDate}:${project.status}`)
      .join("|");
    return `${horizon}|${viewportWidth}|${projectSignature}`;
  }, [horizon, projects, viewportWidth]);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    if (viewportWidth <= 0) return;
    if (lastAutoPositionKeyRef.current === autoPositionKey) return;

    const viewportClientWidth = Math.round(viewport.getBoundingClientRect().width);
    const maxScroll = Math.max(layout.timelineWidth - viewportClientWidth, 0);
    if (maxScroll <= 0) {
      lastAutoPositionKeyRef.current = autoPositionKey;
      return;
    }

    const now = nowTimestamp;
    const pickNearestByTime = (entries: PositionedProject[]) =>
      entries.reduce<PositionedProject | null>((closest, current) => {
        if (!closest) return current;

        const closestMidpoint =
          closest.project.startDate + (closest.project.endDate - closest.project.startDate) / 2;
        const currentMidpoint =
          current.project.startDate + (current.project.endDate - current.project.startDate) / 2;
        return Math.abs(currentMidpoint - now) < Math.abs(closestMidpoint - now)
          ? current
          : closest;
      }, null);

    const nearestActive = pickNearestByTime(
      layout.projects.filter((entry) => entry.project.status === "active"),
    );
    const nearestProject = nearestActive ?? pickNearestByTime(layout.projects);
    const fallbackX = EDGE_SAFE_PADDING + TRACK_SIDE_INSET;
    const nearestProjectX = nearestProject
      ? nearestProject.left + nearestProject.width / 2
      : null;
    const focusX = layout.todayX ?? nearestProjectX ?? fallbackX;
    const targetScroll = clamp(focusX - viewportClientWidth * 0.5, 0, maxScroll);

    viewport.scrollLeft = targetScroll;
    lastAutoPositionKeyRef.current = autoPositionKey;
  }, [autoPositionKey, layout.projects, layout.timelineWidth, layout.todayX, nowTimestamp, viewportWidth]);

  useLayoutEffect(() => {
    if (!contentRef.current) return;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const context = gsap.context(() => {
      const curveLine = curveLineRef.current;
      const curveArea = curveAreaRef.current;
      const tickLines = gsap.utils.toArray<HTMLElement>("[data-timeline-tick]");
      const markerNodes = gsap.utils.toArray<HTMLElement>("[data-curve-marker]");
      const blockNodes = gsap.utils.toArray<HTMLElement>("[data-timeline-block]");

      if (curveArea) {
        gsap.set(curveArea, { opacity: 0.45 });
      }

      if (curveLine) {
        gsap.set(curveLine, { drawSVG: "0% 0%" });
      }

      if (markerNodes.length > 0) {
        gsap.set(markerNodes, { transformOrigin: "50% 50%", willChange: "transform,opacity" });
      }
      if (blockNodes.length > 0) {
        gsap.set(blockNodes, { willChange: "transform,opacity" });
      }

      const timeline = gsap.timeline({ defaults: { ease: "sine.out" } });

      if (curveArea) {
        timeline.to(curveArea, { opacity: 1, duration: 0.62 }, 0.16);
      }

      if (curveLine) {
        timeline.to(curveLine, { drawSVG: "0% 100%", duration: 1.1, ease: "sine.out" }, 0);
      }

      if (tickLines.length > 0) {
        timeline.fromTo(
          tickLines,
          { opacity: 0.45 },
          { opacity: 1, duration: 0.5, stagger: 0.016 },
          0.26,
        );
      }

      if (markerNodes.length > 0) {
        timeline.fromTo(
          markerNodes,
          { opacity: 0.88, scale: 0.985 },
          {
            opacity: 1,
            scale: 1,
            duration: 0.62,
            ease: "sine.out",
            stagger: { each: 0.06, from: "center" },
          },
          0.48,
        );
      }

      if (blockNodes.length > 0) {
        timeline.fromTo(
          blockNodes,
          { opacity: 0.9, scale: 0.992 },
          {
            opacity: 1,
            scale: 1,
            duration: 0.64,
            ease: "sine.out",
            stagger: { each: 0.045, from: "start" },
          },
          0.28,
        );
      }

      timeline.add(() => {
        if (markerNodes.length > 0) {
          gsap.set(markerNodes, { clearProps: "willChange" });
        }
        if (blockNodes.length > 0) {
          gsap.set(blockNodes, { clearProps: "willChange" });
        }
      });
    }, contentRef);

    return () => {
      context.revert();
    };
  }, [curve.linePath, curveMarkers.length, horizon, layout.projects.length, layout.ticks.length, layout.timelineWidth]);

  const hoveredProjectId = hoverState?.projectId ?? null;

  const hoverDetails = useMemo(() => {
    if (!hoverState) return null;

    const entry = layout.projects.find((projectEntry) => projectEntry.project.id === hoverState.projectId);
    if (!entry) return null;

    const phaseAtCursor = getPhaseAtProgress(entry.project, hoverState.blockProgress);
    const tasks = [...(phaseAtCursor?.tasks ?? [])].sort((a, b) => a.order - b.order);
    const visibleTasks = tasks.slice(0, 5);
    const overflowCount = Math.max(0, tasks.length - visibleTasks.length);

    const projectDuration = Math.max(entry.project.endDate - entry.project.startDate, 0);
    const hoveredTimestamp = entry.project.startDate + projectDuration * hoverState.blockProgress;
    const tooltipDate = TOOLTIP_DATE_FORMATTER.format(new Date(hoveredTimestamp));

    const tooltipHeight = 96 + visibleTasks.length * 18 + (overflowCount > 0 ? 18 : 0);
    const tooltipLeft = clamp(hoverState.x + 18, 12, layout.timelineWidth - TOOLTIP_WIDTH - 12);
    const maxTooltipTop = Math.max(12, axisY - tooltipHeight - 8);
    const tooltipTop = clamp(hoverState.y - tooltipHeight - 12, 12, maxTooltipTop);

    return {
      projectName: entry.project.name,
      phaseName: phaseAtCursor?.name ?? entry.currentPhase,
      tasks: visibleTasks,
      overflowCount,
      tooltipDate,
      left: tooltipLeft,
      top: tooltipTop,
    };
  }, [axisY, hoverState, layout.projects, layout.timelineWidth]);

  const handleProjectHover = (
    event: ReactMouseEvent<HTMLAnchorElement>,
    entry: PositionedProject,
  ) => {
    const rect = contentRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = clamp(event.clientX - rect.left, 0, layout.timelineWidth);
    const y = clamp(event.clientY - rect.top, 0, axisY);
    const blockProgress = clamp((x - entry.left) / Math.max(entry.width, 1), 0, 1);

    setHoverState({
      projectId: entry.project.id,
      x,
      y,
      blockProgress,
    });
  };

  const handleMarkerHover = (
    marker: {
      project: Project;
      x: number;
      y: number;
    },
  ) => {
    const entry = layout.projects.find((projectEntry) => projectEntry.project.id === marker.project.id);
    if (!entry) return;

    const markerProgress = clamp((marker.x - entry.left) / Math.max(entry.width, 1), 0, 1);
    setHoverState({
      projectId: entry.project.id,
      x: marker.x,
      y: clamp(marker.y, 0, axisY),
      blockProgress: markerProgress,
    });
  };

  return (
    <section
      className="relative h-[60vh] max-h-[760px]"
      style={{ minHeight: `${Math.max(440, contentHeight + 26)}px` }}
    >
      <div className="h-full px-6 sm:px-10 lg:px-14">
        <div className="relative h-full">
          <div
            ref={viewportRef}
            className="timeline-scrollbar-hidden h-full overflow-x-auto overflow-y-hidden"
            onMouseLeave={() => setHoverState(null)}
            onScroll={() => setHoverState(null)}
          >
            <div
              ref={contentRef}
              className="relative min-w-full"
              style={{ width: `${layout.timelineWidth}px`, height: `${contentHeight}px` }}
            >
              <svg className="pointer-events-none absolute inset-0 z-0 h-full w-full" aria-hidden>
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0.03" />
                  </linearGradient>
                </defs>
                <path ref={curveAreaRef} d={curve.areaPath} fill={`url(#${gradientId})`} />
                <path
                  ref={curveLineRef}
                  d={curve.linePath}
                  fill="none"
                  stroke="var(--color-accent)"
                  strokeOpacity="0.65"
                  strokeWidth="1.25"
                />
              </svg>

              {renderedTicks.map((tick) => (
                <div
                  key={`tick-line-${tick.key}`}
                  data-timeline-tick
                  className="pointer-events-none absolute top-0 z-0 w-px bg-border-subtle"
                  style={{
                    left: `${tick.x}px`,
                    top: `${rowsTop}px`,
                    height: `${Math.max(axisY - rowsTop, 1)}px`,
                  }}
                />
              ))}

              {curveMarkers.map((marker) => (
                <Link
                  key={`curve-marker-${marker.key}`}
                  to="/project/$id"
                  params={{ id: marker.project.id }}
                  className="absolute z-[14] block -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${marker.x}px`, top: `${marker.y}px` }}
                  onMouseEnter={() => handleMarkerHover(marker)}
                  onMouseMove={() => handleMarkerHover(marker)}
                  onMouseLeave={() => {
                    setHoverState((current) =>
                      current?.projectId === marker.project.id ? null : current,
                    );
                  }}
                >
                  <div
                    data-curve-marker
                    className="overflow-hidden rounded-full border-2 border-accent bg-white shadow-[0_2px_8px_rgba(26,26,46,0.08)]"
                    style={{
                      opacity: getRenderedBlockOpacity(
                        marker.project,
                        hoveredProjectId,
                        hoveredProjectId === marker.project.id,
                      ),
                    }}
                  >
                    <Avatar
                      name={marker.project.clientName}
                      src={marker.project.clientAvatarUrl}
                      size="sm"
                      className="block h-6 w-6 text-[10px]"
                    />
                  </div>
                </Link>
              ))}

              {hoverState && (
                <>
                  <div
                    className="pointer-events-none absolute top-0 z-30 w-px bg-accent/30 transition-opacity duration-200"
                    style={{ left: `${hoverState.x}px`, height: `${axisY}px` }}
                  />
                  <div
                    className="pointer-events-none absolute z-30 h-2 w-2 -translate-x-1/2 rounded-full bg-accent/55"
                    style={{ left: `${hoverState.x}px`, top: `${axisY - 3}px` }}
                  />
                </>
              )}

              {layout.todayX !== null && (
                <>
                  <div
                    className="pointer-events-none absolute top-0 z-20 w-px bg-cyan/55"
                    style={{ left: `${layout.todayX}px`, height: `${axisY}px` }}
                  >
                    <div className="absolute left-1/2 top-full mt-1 -translate-x-1/2 text-[12px] font-medium text-cyan">
                      Today
                    </div>
                  </div>
                  <div
                    className="pointer-events-none absolute z-20 h-2 w-2 -translate-x-1/2 rounded-full bg-cyan/70"
                    style={{ left: `${layout.todayX}px`, top: `${axisY - 3}px` }}
                  />
                </>
              )}

              <div
                className="absolute left-0 w-full overflow-y-auto pr-1"
                style={{
                  top: `${rowsTop}px`,
                  height: `${rowsViewportHeight}px`,
                }}
                onScroll={() => setHoverState(null)}
              >
                <div className="relative" style={{ height: `${rowsContentHeight}px` }}>
                  {layout.projects.length === 0 ? (
                    <div className="flex h-full items-center justify-center">
                      <div className="rounded-[10px] border border-border-subtle bg-white px-4 py-2 text-[13px] text-text-secondary">
                        No projects in this horizon.
                      </div>
                    </div>
                  ) : (
                    layout.projects.map((entry) => {
                      const isHovered = hoveredProjectId === entry.project.id;
                      return (
                        <Link
                          key={entry.project.id}
                          to="/project/$id"
                          params={{ id: entry.project.id }}
                          className="absolute block pr-1.5 outline-none focus:outline-none focus-visible:outline-none"
                          style={{
                            left: `${entry.left}px`,
                            width: `${entry.width}px`,
                            top: `${ROW_VIEWPORT_TOP_PADDING + entry.row * rowPitch}px`,
                            height: `${BLOCK_HEIGHT}px`,
                          }}
                          onMouseEnter={(event: ReactMouseEvent<HTMLAnchorElement>) =>
                            handleProjectHover(event, entry)
                          }
                          onMouseMove={(event: ReactMouseEvent<HTMLAnchorElement>) =>
                            handleProjectHover(event, entry)
                          }
                          onMouseLeave={() => {
                            setHoverState((current) =>
                              current?.projectId === entry.project.id ? null : current,
                            );
                          }}
                        >
                          <article
                            data-timeline-block
                            className="flex h-full items-center gap-2.5 overflow-hidden rounded-[10px] border border-border-subtle bg-white px-3 shadow-[0_1px_3px_rgba(26,26,46,0.04)] transition-opacity duration-200"
                            style={{
                              opacity: getRenderedBlockOpacity(
                                entry.project,
                                hoveredProjectId,
                                isHovered,
                              ),
                            }}
                          >
                            <Avatar
                              name={entry.project.clientName}
                              src={entry.project.clientAvatarUrl}
                              size="sm"
                              className="h-6 w-6 shrink-0 text-[10px]"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[13px] font-medium text-text-primary">
                                {entry.project.name}
                              </p>
                              <p className="truncate text-[12px] text-text-secondary">
                                {entry.currentPhase}
                              </p>
                            </div>
                            {entry.project.status === "completed" && (
                              <span className="shrink-0 rounded-full bg-bg-subtle px-1.5 py-0.5 text-[10px] text-text-secondary">
                                ✓
                              </span>
                            )}
                          </article>
                        </Link>
                      );
                    })
                  )}
                </div>
              </div>

              <div
                className="pointer-events-none absolute border-t border-border"
                style={{
                  left: `${EDGE_SAFE_PADDING + TRACK_SIDE_INSET}px`,
                  right: `${EDGE_SAFE_PADDING + TRACK_SIDE_INSET}px`,
                  top: `${axisY}px`,
                }}
              />

              {renderedTickLabels.map((tick) => (
                <div
                  key={`tick-label-${tick.key}`}
                  className="pointer-events-none absolute z-10 text-[12px] text-text-secondary"
                  style={{
                    left: `${tick.x}px`,
                    top: `${axisY + LABEL_TOP_GAP}px`,
                    transform: "translateX(-50%)",
                  }}
                >
                  {tick.label}
                </div>
              ))}

              <AnimatePresence>
                {hoverDetails && (
                  <motion.aside
                    initial={{ opacity: 0, y: 4 }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      transition: { duration: 0.15, delay: 0.15 },
                    }}
                    exit={{ opacity: 0, y: 2, transition: { duration: 0.15 } }}
                    className="pointer-events-none absolute z-40 rounded-[10px] bg-[#1A1A2E] px-4 py-3 text-white shadow-[0_14px_30px_rgba(12,14,31,0.38)]"
                    style={{
                      left: `${hoverDetails.left}px`,
                      top: `${hoverDetails.top}px`,
                      width: `${TOOLTIP_WIDTH}px`,
                    }}
                  >
                    <p className="text-[11px] text-white/55">{hoverDetails.tooltipDate}</p>
                    <p className="mt-1 truncate text-[14px] font-medium text-white">
                      {hoverDetails.projectName}
                    </p>
                    <p className="mt-1 truncate text-[12px] text-white/70">
                      {hoverDetails.phaseName}
                    </p>

                    <div className="mt-2.5 border-t border-white/12 pt-2">
                      {hoverDetails.tasks.length > 0 ? (
                        hoverDetails.tasks.map((task) => {
                          const isRecentlyAdded =
                            !task.isCompleted &&
                            nowTimestamp - task.createdAt <= RECENT_TASK_WINDOW_MS;
                          return (
                            <p
                              key={task.id}
                              className={`truncate py-0.5 text-[12px] ${
                                task.isCompleted ? "text-white/45" : "text-white/85"
                              }`}
                            >
                              <span className="mr-1">{task.isCompleted ? "☑" : "☐"}</span>
                              {task.title}
                              {isRecentlyAdded && <span className="ml-1 text-[#A2A9BE]">●</span>}
                            </p>
                          );
                        })
                      ) : (
                        <p className="text-[12px] text-white/60">No tasks in this phase.</p>
                      )}

                      {hoverDetails.overflowCount > 0 && (
                        <p className="mt-0.5 text-[12px] text-white/60">
                          +{hoverDetails.overflowCount} more
                        </p>
                      )}
                    </div>
                  </motion.aside>
                )}
              </AnimatePresence>
            </div>
          </div>
          <div
            className="pointer-events-none absolute inset-y-0 left-0 z-50 bg-gradient-to-r from-bg via-bg/95 to-transparent backdrop-blur-[2px]"
            style={{ width: `${EDGE_FADE_WIDTH}px` }}
          />
          <div
            className="pointer-events-none absolute inset-y-0 right-0 z-50 bg-gradient-to-l from-bg via-bg/95 to-transparent backdrop-blur-[2px]"
            style={{ width: `${EDGE_FADE_WIDTH}px` }}
          />
        </div>
      </div>
    </section>
  );
}
